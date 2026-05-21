# Firebase Security Specification (`security_spec.md`)

This security specification outlines the data invariants, threat-vector payloads, and safety bounds designed to lock down our Firestore database.

## 1. Data Invariants
1. **Authenticated Access Only**: All database reads/writes require a valid authenticated user (`request.auth != null`).
2. **Immutability of Key Ownership**: Fields like `createdAt` and document IDs cannot be tampered with or changed post-creation.
3. **Role-Based Access Controls**: Barista updates are restricted. Only Owners (admins or explicit admin roles) can approve baristas, record daily Z-closures, and manage suppliers/vendors.

## 2. "Dirty Dozen" Security Violations (Threat Scenarios)
1. **Unauthenticated Read/Write**: Attempting to read files without logging in.
2. **Privilege Escalation**: Barista updating their role directly to "admin".
3. **Shadow Update Gate bypass**: Standard user submitting fields outside allowlisted ones (e.g. inject custom verified role).
4. **Incorrect ID Spoofing**: User writing or updating with another user's UID.
5. **Payload Size Flood**: Injecting excessively large strings (>100kb) into simple string fields (e.g. comments, name).
6. **Self-Approve**: Barista setting approved status manually to `true`.
7. **Negative Values**: Submitting negative amounts for bills, prices, or counts.
8. **Malicious ID (Poisoning)**: Writing a document ID with junk path traversal characters.
9. **Fake Time Injection**: Bypassing server time validators with client-forged timestamps.
10. **State Skipping**: Forging transition status of bills directly from "pending" to complete without payment logs.
11. **PII Harvesting**: Accessing profile information of another owner/barista without clearance.
12. **Double Deduction Exploits**: Modifying stock counts externally without appropriate recipe deduction validation.

## 3. Deployment Safety Rules
All writes are guarded by strict JSON-shape validator helpers, strict `Map` validation, and precise checking of `affectedKeys().hasOnly(...)` bounds.
