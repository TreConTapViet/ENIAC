/*
# Create profiles and clothes tables + clothing storage bucket

1. New Tables
- `profiles`: stores the user's body measurement profile collected during the onboarding dialog.
  - id (uuid PK)
  - name (text)
  - age (int)
  - gender (text: 'male' | 'female')
  - height_cm (numeric)
  - weight_kg (numeric)
  - waist_cm (numeric, nullable — only for females)
  - hip_cm (numeric, nullable — only for females)
  - bust_cm (numeric, nullable — only for females)
  - bmi (numeric, computed by app)
  - body_type (text, computed by app — e.g. 'hourglass', 'pear', 'inverted-triangle', 'rectangle', 'mesomorph', 'ectomorph', 'endomorph')
  - created_at (timestamptz)
- `clothes`: stores uploaded clothing items the user tries on the mannequin.
  - id (uuid PK)
  - image_path (text — storage path in the clothing bucket)
  - category (text: 'top' | 'bottom' | 'dress' | 'outerwear' | 'other')
  - color (text, nullable)
  - label (text — user-given name for the item)
  - fit_score (int 0-100, nullable — computed after try-on)
  - fit_notes (text, nullable — computed recommendations)
  - created_at (timestamptz)

2. Storage
- Create public bucket `clothing` for uploaded clothing photos.
- Allow anon/authenticated to read and upload.

3. Security
- Enable RLS on both tables.
- Grant CRUD to anon + authenticated (single-tenant, no sign-in).
- Storage policies allow public read + authenticated/anon upload to the clothing bucket.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age int NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  height_cm numeric NOT NULL,
  weight_kg numeric NOT NULL,
  waist_cm numeric,
  hip_cm numeric,
  bust_cm numeric,
  bmi numeric,
  body_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS clothes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'other')),
  color text,
  label text NOT NULL DEFAULT 'Untitled',
  fit_score int CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clothes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON clothes TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_clothes" ON clothes;
CREATE POLICY "anon_select_clothes" ON clothes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clothes" ON clothes;
CREATE POLICY "anon_insert_clothes" ON clothes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clothes" ON clothes;
CREATE POLICY "anon_update_clothes" ON clothes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clothes" ON clothes;
CREATE POLICY "anon_delete_clothes" ON clothes FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing', 'clothing', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "clothing_public_read" ON storage.objects;
CREATE POLICY "clothing_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'clothing');

DROP POLICY IF EXISTS "clothing_anon_upload" ON storage.objects;
CREATE POLICY "clothing_anon_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'clothing');

DROP POLICY IF EXISTS "clothing_anon_delete" ON storage.objects;
CREATE POLICY "clothing_anon_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'clothing');
