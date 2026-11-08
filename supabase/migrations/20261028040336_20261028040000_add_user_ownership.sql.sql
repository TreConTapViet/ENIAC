/*
# Add user ownership to profiles & clothes for authenticated accounts

## Summary
Converts the app from single-tenant (anon) to multi-user (authenticated) data isolation.
Each profile and clothing item is now owned by the authenticated user who created it.

## Changes to existing tables
### profiles
- Added `user_id` column (uuid, nullable, defaults to auth.uid(), references auth.users ON DELETE CASCADE).
### clothes
- Added `user_id` column (uuid, nullable, defaults to auth.uid(), references auth.users ON DELETE CASCADE).
- Added index on user_id for faster filtered queries.

## Security changes
- profiles & clothes: RLS stays enabled. Policies replaced with authenticated-only ownership
  checks (auth.uid() = user_id). Grants restricted to authenticated + service_role.
- storage.objects: clothing bucket upload/delete/update now require authenticated.
  Public read stays open.

## Notes
1. Existing pre-auth rows have user_id = NULL and are invisible under the new ownership policies.
   This is expected — the app is transitioning to a per-user model.
2. New inserts default user_id to auth.uid() so client code can omit it.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE clothes
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clothes_user_id ON clothes(user_id);

REVOKE SELECT, INSERT, UPDATE, DELETE ON profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON clothes FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clothes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON clothes TO service_role;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;

CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "anon_select_clothes" ON clothes;
DROP POLICY IF EXISTS "anon_insert_clothes" ON clothes;
DROP POLICY IF EXISTS "anon_update_clothes" ON clothes;
DROP POLICY IF EXISTS "anon_delete_clothes" ON clothes;

CREATE POLICY "select_own_clothes" ON clothes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_clothes" ON clothes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_clothes" ON clothes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_clothes" ON clothes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clothing_anon_upload" ON storage.objects;
CREATE POLICY "clothing_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clothing');

DROP POLICY IF EXISTS "clothing_anon_delete" ON storage.objects;
CREATE POLICY "clothing_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'clothing');

DROP POLICY IF EXISTS "clothing_authenticated_update" ON storage.objects;
CREATE POLICY "clothing_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'clothing') WITH CHECK (bucket_id = 'clothing');
