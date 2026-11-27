# SmartGrowth AI — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No Firestore path outside explicitly governed collections is readable or writable.
2. **PII Ownership Isolation**: User profiles (`/users/{userId}`) contain PII (`email`, `fullName`, `city`) and are readable/writable ONLY by the authenticated verified owner (`request.auth.uid == userId`) or a verified Admin. Blanket `isSignedIn()` reads or unscoped `list` queries are forbidden.
3. **Master Gate on Subcollections**: Every document under `/users/{userId}/smes`, `/users/{userId}/assessments`, and `/users/{userId}/recommendations` requires that the parent `/users/{userId}` document exists (or is created atomically in the same batch via `existsAfter`).
4. **Immutable Ownership & Timestamps**: `userId`/`uid` and `createdAt` cannot be modified after creation. All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **Privilege Escalation Prevention**: Users cannot assign themselves admin privileges or write to `/admins/{adminId}`.
6. **Prototype Feedback Governance**: Pilot validation feedback (`/pilotFeedback/{feedbackId}`) can only be created for `request.auth.uid`, read by its author or Admin, and cannot be silently forged for another user.

## 2. Adversarial "Dirty Dozen" Attack Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Read**: `get(/users/userA)` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User PII Read**: `get(/users/userA)` signed in as `userB` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: `create(/users/userA, ...)` when `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Assessment**: `create(/users/userA/assessments/a1, { userId: "userB", ... })` signed in as `userA` -> `PERMISSION_DENIED`.
5. **Orphaned Subcollection Write**: `create(/users/userA/assessments/a1, ...)` when `/users/userA` does not exist -> `PERMISSION_DENIED`.
6. **Ghost / Shadow Field Injection**: `create(/users/userA, { ..., isAdmin: true })` -> `PERMISSION_DENIED` (blocked by `hasOnly`).
7. **Self-Privilege Escalation**: `create(/admins/userB, { uid: "userB", email: "userB@example.com" })` signed in as `userB` -> `PERMISSION_DENIED`.
8. **Email Spoofing Admin Bypass**: `get(/pilotFeedback/f1)` with `email == "fsonsdigitalmarketing@gmail.com"` and `email_verified == false` -> `PERMISSION_DENIED`.
9. **ID Poisoning (1KB Junk Document ID)**: `create(/users/userA/assessments/${'x'.repeat(300)}, ...)` -> `PERMISSION_DENIED` (`isValidId` rejects > 128 chars).
10. **Client Timestamp Forgery**: `create(/users/userA, { ..., createdAt: "2020-01-01T00:00:00Z" })` -> `PERMISSION_DENIED` (`createdAt != request.time`).
11. **Unscoped List Scraping**: `list(/users)` or `list(/pilotFeedback)` as non-admin without owner filter -> `PERMISSION_DENIED`.
12. **Immutable Field Tampering**: `update(/users/userA, { uid: "attacker", createdAt: request.time })` -> `PERMISSION_DENIED`.
