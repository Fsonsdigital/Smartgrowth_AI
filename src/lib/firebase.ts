import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  AppLanguage,
  AssessmentResultRecord,
  IndividualProfile,
  RecommendationRecord,
  SmeProfile,
  WorkspaceMode,
} from '../shared/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export { onAuthStateChanged, type FirebaseUser };

export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function clampString(val: unknown, maxLength: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLength);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function normalizeCurrency(val: unknown): string {
  if (typeof val === 'string') {
    const upper = val.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(upper)) return upper;
  }
  return 'USD';
}

function toIsoDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  if (typeof ts === 'string' && ts) return ts;
  return new Date().toISOString();
}

export interface FirestoreUserDoc {
  uid: string;
  email: string;
  fullName: string;
  activeMode: WorkspaceMode;
  currency: string;
  occupation?: string;
  city?: string;
  monthlyIncomeGoal?: number;
  emergencyFundTargetMonths?: number;
  preferredLanguage: AppLanguage;
  acceptedTerms: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PilotFeedbackItem {
  id: string;
  userId: string;
  userRole: WorkspaceMode;
  language: AppLanguage;
  usefulnessRating: number;
  recommendLikelihood: number;
  mostValuableFeature: 'health_assessment' | 'ai_growth_coach' | 'both';
  primaryUseCase: string;
  comment: string;
  createdAt: string;
}

export async function ensureFirestoreUserProfile(
  fbUser: FirebaseUser,
  preferredLanguage: AppLanguage,
  defaults?: { activeMode?: WorkspaceMode; currency?: string }
): Promise<FirestoreUserDoc | null> {
  const uid = sanitizeId(fbUser.uid);
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid,
        email: String(data.email ?? fbUser.email ?? ''),
        fullName: String(data.fullName ?? fbUser.displayName ?? 'SmartGrowth Member'),
        activeMode: data.activeMode === 'sme' ? 'sme' : 'individual',
        currency: normalizeCurrency(data.currency),
        occupation: typeof data.occupation === 'string' ? data.occupation : '',
        city: typeof data.city === 'string' ? data.city : '',
        monthlyIncomeGoal: Number(data.monthlyIncomeGoal ?? 0) || 0,
        emergencyFundTargetMonths: Number(data.emergencyFundTargetMonths ?? 3) || 3,
        preferredLanguage: data.preferredLanguage === 'ha' ? 'ha' : 'en',
        acceptedTerms: Boolean(data.acceptedTerms ?? true),
        createdAt: toIsoDate(data.createdAt),
        updatedAt: toIsoDate(data.updatedAt),
      };
    }

    const payload = {
      uid,
      email: clampString(fbUser.email ?? `${uid}@firebase.user`, 160),
      fullName: clampString(fbUser.displayName ?? 'SmartGrowth Member', 120) || 'SmartGrowth Member',
      activeMode: (defaults?.activeMode === 'sme' ? 'sme' : 'individual') as WorkspaceMode,
      currency: normalizeCurrency(defaults?.currency),
      occupation: '',
      city: '',
      monthlyIncomeGoal: 0,
      emergencyFundTargetMonths: 3,
      preferredLanguage: (preferredLanguage === 'ha' ? 'ha' : 'en') as AppLanguage,
      acceptedTerms: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return {
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFirestoreUserProfile(
  uidRaw: string,
  updates: Partial<{
    fullName: string;
    activeMode: WorkspaceMode;
    currency: string;
    occupation: string;
    city: string;
    monthlyIncomeGoal: number;
    emergencyFundTargetMonths: number;
    preferredLanguage: AppLanguage;
    acceptedTerms: boolean;
  }>
): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const path = `users/${uid}`;
  try {
    const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.fullName !== undefined) {
      cleanUpdates.fullName = clampString(updates.fullName, 120) || 'SmartGrowth Member';
    }
    if (updates.activeMode !== undefined) {
      cleanUpdates.activeMode = updates.activeMode === 'sme' ? 'sme' : 'individual';
    }
    if (updates.currency !== undefined) {
      cleanUpdates.currency = normalizeCurrency(updates.currency);
    }
    if (updates.occupation !== undefined) {
      cleanUpdates.occupation = clampString(updates.occupation, 80);
    }
    if (updates.city !== undefined) {
      cleanUpdates.city = clampString(updates.city, 80);
    }
    if (updates.monthlyIncomeGoal !== undefined) {
      cleanUpdates.monthlyIncomeGoal = Math.max(0, Number(updates.monthlyIncomeGoal) || 0);
    }
    if (updates.emergencyFundTargetMonths !== undefined) {
      cleanUpdates.emergencyFundTargetMonths = Math.max(
        1,
        Math.min(24, Math.floor(Number(updates.emergencyFundTargetMonths) || 3))
      );
    }
    if (updates.preferredLanguage !== undefined) {
      cleanUpdates.preferredLanguage = updates.preferredLanguage === 'ha' ? 'ha' : 'en';
    }
    if (updates.acceptedTerms !== undefined) {
      cleanUpdates.acceptedTerms = Boolean(updates.acceptedTerms);
    }
    await updateDoc(doc(db, 'users', uid), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveSmeToFirestore(uidRaw: string, sme: SmeProfile): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const smeId = sanitizeId(sme.id);
  const path = `users/${uid}/smes/${smeId}`;
  try {
    const ref = doc(db, 'users', uid, 'smes', smeId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        businessName: clampString(sme.businessName, 120) || 'My Business',
        sector: clampString(sme.sector, 80) || 'General Commerce',
        registrationStatus: sme.registrationStatus,
        staffCount: Math.max(1, Math.min(100000, Math.floor(Number(sme.staffCount) || 1))),
        currency: normalizeCurrency(sme.currency),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: smeId,
        userId: uid,
        businessName: clampString(sme.businessName, 120) || 'My Business',
        sector: clampString(sme.sector, 80) || 'General Commerce',
        registrationStatus: sme.registrationStatus,
        staffCount: Math.max(1, Math.min(100000, Math.floor(Number(sme.staffCount) || 1))),
        currency: normalizeCurrency(sme.currency),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAssessmentToFirestore(
  uidRaw: string,
  result: AssessmentResultRecord,
  currency: string
): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const assessmentId = sanitizeId(result.id);
  const path = `users/${uid}/assessments/${assessmentId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'assessments', assessmentId), {
      id: assessmentId,
      userId: uid,
      audience: result.audience === 'sme' ? 'sme' : 'individual',
      smeProfileId: clampString(result.smeProfileId ?? '', 128),
      calculationVersion: clampString(result.calculationVersion, 32),
      readinessTier: result.output.readinessTier,
      summaryStatement: clampString(result.output.summaryStatement, 600) || 'Assessment calculated.',
      currency: normalizeCurrency(currency),
      answers: result.answers ?? {},
      metrics: result.output.metrics ?? {},
      formulas: (result.output.formulas ?? []).slice(0, 10),
      dataQualityFlags: (result.output.dataQualityFlags ?? []).slice(0, 15).map((f) => String(f)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveRecommendationToFirestore(
  uidRaw: string,
  rec: RecommendationRecord,
  language: AppLanguage
): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const recId = sanitizeId(rec.id);
  const path = `users/${uid}/recommendations/${recId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'recommendations', recId), {
      id: recId,
      userId: uid,
      assessmentResultId: sanitizeId(rec.assessmentResultId ?? 'unknown'),
      audience: rec.audience === 'sme' ? 'sme' : 'individual',
      language: language === 'ha' ? 'ha' : 'en',
      promptVersion: clampString(rec.promptVersion, 32),
      modelName: clampString(rec.modelName, 64),
      question: clampString(rec.question ?? '', 500),
      safetyPassed: Boolean(rec.safetyPassed),
      fallbackUsed: Boolean(rec.fallbackUsed),
      fallbackReason: clampString(rec.fallbackReason ?? '', 300),
      structuredOutput: rec.structuredOutput,
      sources: (rec.sources ?? []).slice(0, 10),
      safetyFlags: (rec.safetyFlags ?? []).slice(0, 15).map((f) => String(f)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitPilotFeedbackToFirestore(
  uidRaw: string,
  payload: {
    userRole: WorkspaceMode;
    language: AppLanguage;
    usefulnessRating: number;
    recommendLikelihood: number;
    mostValuableFeature: 'health_assessment' | 'ai_growth_coach' | 'both';
    primaryUseCase: string;
    comment: string;
  }
): Promise<PilotFeedbackItem> {
  const uid = sanitizeId(uidRaw);
  const feedbackId = sanitizeId(`fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const path = `pilotFeedback/${feedbackId}`;
  try {
    const clean = {
      id: feedbackId,
      userId: uid,
      userRole: payload.userRole === 'sme' ? ('sme' as const) : ('individual' as const),
      language: payload.language === 'ha' ? ('ha' as const) : ('en' as const),
      usefulnessRating: Math.max(1, Math.min(5, Math.round(payload.usefulnessRating))),
      recommendLikelihood: Math.max(1, Math.min(5, Math.round(payload.recommendLikelihood))),
      mostValuableFeature: payload.mostValuableFeature,
      primaryUseCase: clampString(payload.primaryUseCase, 120) || 'General Financial Health',
      comment: clampString(payload.comment, 1000),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'pilotFeedback', feedbackId), clean);
    return {
      ...clean,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listPilotFeedbackForAdmin(): Promise<PilotFeedbackItem[]> {
  if (!auth.currentUser) return [];
  const path = 'pilotFeedback';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        userId: String(data.userId ?? ''),
        userRole: data.userRole === 'sme' ? 'sme' : 'individual',
        language: data.language === 'ha' ? 'ha' : 'en',
        usefulnessRating: Number(data.usefulnessRating ?? 5),
        recommendLikelihood: Number(data.recommendLikelihood ?? 5),
        mostValuableFeature:
          data.mostValuableFeature === 'health_assessment' ||
          data.mostValuableFeature === 'ai_growth_coach'
            ? data.mostValuableFeature
            : 'both',
        primaryUseCase: String(data.primaryUseCase ?? ''),
        comment: String(data.comment ?? ''),
        createdAt: toIsoDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeUserWorkspace(
  uidRaw: string,
  callbacks: {
    onProfile: (profile: IndividualProfile, mode: WorkspaceMode) => void;
    onSmes: (smes: SmeProfile[]) => void;
    onAssessments: (assessments: AssessmentResultRecord[]) => void;
    onRecommendations: (recs: RecommendationRecord[]) => void;
  }
): () => void {
  const uid = sanitizeId(uidRaw);
  if (!auth.currentUser || auth.currentUser.uid !== uidRaw) {
    return () => {};
  }

  const unsubProfile = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      callbacks.onProfile(
        {
          id: `fb_${uid}`,
          userId: uid,
          occupation: String(data.occupation ?? ''),
          city: String(data.city ?? ''),
          currency: normalizeCurrency(data.currency),
          monthlyIncomeGoal: Number(data.monthlyIncomeGoal ?? 0) || 0,
          emergencyFundTargetMonths: Number(data.emergencyFundTargetMonths ?? 3) || 3,
          updatedAt: toIsoDate(data.updatedAt),
        },
        data.activeMode === 'sme' ? 'sme' : 'individual'
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  );

  const smesQuery = query(
    collection(db, 'users', uid, 'smes'),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(20)
  );
  const unsubSmes = onSnapshot(
    smesQuery,
    (snap) => {
      const list: SmeProfile[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          ownerUserId: uid,
          businessName: String(data.businessName ?? ''),
          sector: String(data.sector ?? 'General Commerce'),
          registrationStatus:
            data.registrationStatus === 'registered' || data.registrationStatus === 'informal'
              ? data.registrationStatus
              : 'in_progress',
          staffCount: Number(data.staffCount ?? 1) || 1,
          currency: normalizeCurrency(data.currency),
          updatedAt: toIsoDate(data.updatedAt),
        };
      });
      callbacks.onSmes(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/smes`);
    }
  );

  const assessmentsQuery = query(
    collection(db, 'users', uid, 'assessments'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  const unsubAssessments = onSnapshot(
    assessmentsQuery,
    (snap) => {
      const list: AssessmentResultRecord[] = snap.docs.map((d) => {
        const data = d.data();
        const audience = data.audience === 'sme' ? 'sme' : 'individual';
        return {
          id: String(data.id ?? d.id),
          submissionId: String(data.id ?? d.id),
          userId: uid,
          smeProfileId: data.smeProfileId ? String(data.smeProfileId) : null,
          audience,
          calculationVersion: String(data.calculationVersion ?? (audience === 'sme' ? 'sme-v1.2.0' : 'ind-v1.2.0')),
          answers: (data.answers ?? {}) as Record<string, unknown>,
          output: {
            audience,
            calculationVersion: String(data.calculationVersion ?? (audience === 'sme' ? 'sme-v1.2.0' : 'ind-v1.2.0')),
            compositeScore: null,
            compositeScorePolicy: 'DISABLED_UNVALIDATED_COMPOSITE',
            readinessTier:
              data.readinessTier === 'Resilient' ||
              data.readinessTier === 'Developing' ||
              data.readinessTier === 'Vulnerable'
                ? data.readinessTier
                : 'Needs Data',
            summaryStatement: String(data.summaryStatement ?? ''),
            metrics: (data.metrics ?? {}) as Record<string, number | null>,
            formulas: Array.isArray(data.formulas) ? data.formulas : [],
            dataQualityFlags: Array.isArray(data.dataQualityFlags) ? data.dataQualityFlags : [],
          },
          createdAt: toIsoDate(data.createdAt),
        };
      });
      callbacks.onAssessments(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/assessments`);
    }
  );

  const recsQuery = query(
    collection(db, 'users', uid, 'recommendations'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  const unsubRecs = onSnapshot(
    recsQuery,
    (snap) => {
      const list: RecommendationRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          userId: uid,
          assessmentResultId: data.assessmentResultId ? String(data.assessmentResultId) : null,
          audience: data.audience === 'sme' ? 'sme' : 'individual',
          promptVersion: String(data.promptVersion ?? 'coach-v1.3.0'),
          modelName: String(data.modelName ?? 'gemini-4-hydrogen'),
          question: data.question ? String(data.question) : null,
          structuredOutput: data.structuredOutput,
          sources: Array.isArray(data.sources) ? data.sources : [],
          safetyPassed: Boolean(data.safetyPassed ?? true),
          safetyFlags: Array.isArray(data.safetyFlags) ? data.safetyFlags : [],
          fallbackUsed: Boolean(data.fallbackUsed ?? false),
          fallbackReason: data.fallbackReason ? String(data.fallbackReason) : null,
          createdAt: toIsoDate(data.createdAt),
        };
      });
      callbacks.onRecommendations(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${uid}/recommendations`);
    }
  );

  return () => {
    unsubProfile();
    unsubSmes();
    unsubAssessments();
    unsubRecs();
  };
}
