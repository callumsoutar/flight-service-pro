-- AUTH SETUP SCRIPT
-- Run this after your main schema is created

-- 1. Insert default roles (if not already inserted)
INSERT INTO public.roles (name, description) VALUES
  ('owner', 'Full system access and control'),
  ('admin', 'Administrative access to manage users and settings'),
  ('instructor', 'Can manage bookings, lessons, and student progress'),
  ('member', 'Standard member access'),
  ('student', 'Student access for learning and booking')
ON CONFLICT (name) DO NOTHING;

-- 2. Create the auth trigger to automatically create user records
CREATE OR REPLACE TRIGGER auth_users_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verify the setup
SELECT 'Roles created:' as info;
SELECT name, description FROM public.roles ORDER BY name;

SELECT 'Auth trigger created successfully' as info; 