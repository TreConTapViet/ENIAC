# Security Specification — Smart Wardrobe

## 1. Data Invariants
1. **Identity & Ownership**:
   - Every `/users/{userId}` document must have `uid == userId` and `userId == request.auth.uid`.
   - Every `/wardrobeItems/{itemId}` document must have `userId == request.auth.uid`.
   - Every `/savedOutfits/{outfitId}` document must have `userId == request.auth.uid`.
2. **PII Isolation**:
   - `/users/{userId}` contains user `email` and personal profile data. Read (`get`) and write (`create`, `update`, `delete`) are strictly restricted to the authenticated owner (`request.auth.uid == userId`). Blanket `list` queries on `/users` are completely forbidden.
3. **Strict Schema & Volumetric Boundaries**:
   - Strings and arrays are bounded with `.size()` checks matching `firebase-blueprint.json`.
   - Document IDs are validated with `isValidId(id)` matching `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.
4. **Temporal Integrity & Immutability**:
   - `createdAt` must equal `request.time` on `create` and remain immutable on `update`.
   - `updatedAt` must equal `request.time` on `create` and `update`.
   - `uid` and `userId` are immutable on `update`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Profile Creation**: Creating `/users/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Spoofing**: Authenticated `user_2` creating `/users/user_1` -> `PERMISSION_DENIED`.
3. **PII Leak via Profile Read**: Authenticated `user_2` reading `/users/user_1` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Profile**: Creating `/users/user_1` with an extra field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Invalid Gender Enum**: Updating `/users/user_1` with `gender: "Invalid"` -> `PERMISSION_DENIED`.
6. **Unbounded Style Array**: Updating `/users/user_1` with 15 styles (`size() > 10`) -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Creating `/wardrobeItems/item_1` with client past timestamp instead of `request.time` -> `PERMISSION_DENIED`.
8. **Ownership Hijacking on Update**: Updating `/wardrobeItems/item_1` to change `userId` to another user -> `PERMISSION_DENIED`.
9. **CreatedAt Mutation**: Updating `/wardrobeItems/item_1` to alter `createdAt` -> `PERMISSION_DENIED`.
10. **Cross-User Wardrobe Read**: Authenticated `user_2` querying `wardrobeItems` belonging to `user_1` -> `PERMISSION_DENIED`.
11. **Oversized Garment Name**: Creating `/wardrobeItems/item_1` with `name` of 500 characters (`> 100`) -> `PERMISSION_DENIED`.
12. **SavedOutfit Unauthorized Delete**: Authenticated `user_2` deleting `/savedOutfits/outfit_1` owned by `user_1` -> `PERMISSION_DENIED`.
