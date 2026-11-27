import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface CertCache {
  certs: Record<string, string>;
  expiresAtMs: number;
}

let certCache: CertCache | null = null;

function getFirebaseProjectId(): string | null {
  const fromEnv = process.env.FIREBASE_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { projectId?: string };
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        return parsed.projectId;
      }
    }
  } catch {
    // ignore invalid config read
  }
  return null;
}

async function fetchGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && certCache.expiresAtMs > now) {
    return certCache.certs;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Unable to fetch Firebase verification certificates (${res.status}).`);
  }
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = (await res.json()) as Record<string, string>;

  certCache = {
    certs,
    expiresAtMs: now + Math.max(60, maxAgeSeconds) * 1000,
  };
  return certs;
}

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project ID is not configured on the server.');
  }

  const segments = idToken.trim().split('.');
  if (segments.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }

  const [headerB64, payloadB64, sigB64] = segments;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Firebase token header.');
  }

  const certs = await fetchGoogleCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Firebase signing certificate not found for token key ID.');
  }

  const signedContent = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const signature = Buffer.from(sigB64, 'base64url');
  const signatureValid = crypto.verify('RSA-SHA256', signedContent, certPem, signature);
  if (!signatureValid) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) {
    throw new Error('Firebase token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase token issuer mismatch.');
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Invalid Firebase subject.');
  }
  if (!payload.exp || payload.exp <= nowSeconds) {
    throw new Error('Firebase ID token has expired.');
  }
  if (!payload.iat || payload.iat > nowSeconds + 300) {
    throw new Error('Firebase ID token issued-at timestamp is invalid.');
  }
  if (!payload.email || payload.email_verified !== true) {
    throw new Error('Verified email address is required.');
  }

  return {
    uid: payload.sub,
    email: payload.email.toLowerCase().trim(),
    emailVerified: true,
    name: payload.name?.trim() || payload.email.split('@')[0] || 'SmartGrowth Member',
  };
}
