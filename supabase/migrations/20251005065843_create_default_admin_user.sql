/*
  # Create Default Admin User

  ## Overview
  This migration creates a default admin user account for initial system access.
  
  ## Changes
  1. Creates a default admin user with credentials:
     - Email: admin@example.com
     - Password: admin123
     - Role: admin (set in raw_app_metadata)
  
  ## Security Notes
  - The password is hashed by Supabase Auth
  - Admin role is stored in app_metadata (cannot be modified by user)
  - This is intended for initial setup only
  - IMPORTANT: Change these credentials immediately after first login in production
  
  ## Usage
  After this migration runs, you can log in with:
  - Email: admin@example.com
  - Password: admin123
*/

-- Check if admin user already exists, if not create it
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  -- If user doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Generate a new UUID for the admin user
    admin_user_id := gen_random_uuid();
    
    -- Insert admin user into auth.users table
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
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"role": "admin"}'::jsonb,
      '{"role": "admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into auth.identities for email provider (email column is generated)
    INSERT INTO auth.identities (
      provider_id,
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id::text,
      gen_random_uuid(),
      admin_user_id,
      format('{"sub":"%s","email":"admin@example.com","email_verified":true,"phone_verified":false}', admin_user_id::text)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
