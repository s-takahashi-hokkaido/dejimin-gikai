-- Seed file for local development
--
-- To create an admin user:
-- 1. Run this seed file with: npx supabase db reset
-- 2. The admin user will be created with email: admin@example.com
-- 3. Password: admin123456

-- Create admin user for local development
-- Note: We use crypt() function from pgcrypto extension to hash the password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123456', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create identity record for the user
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  id::text,
  format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@example.com';

-- 管理画面のプロフィールを作成（ロールの正は admin_profiles。app_metadata.roles はもう参照しない）
-- マイグレーションのデータ移行はこのseedより先に走るため、ここで改めて登録する
INSERT INTO public.admin_profiles (user_id, role, display_name)
SELECT id, 'admin', email
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id) DO NOTHING;
