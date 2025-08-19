-- Final Fix for Supabase Database Setup
-- This script completely resets and creates a working authentication setup
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Drop ALL existing policies, triggers, and functions
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user role creation" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all reads" ON public.user_roles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_roles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.create_user_role(UUID, TEXT);

-- 2. Drop the user_roles table completely
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 3. Create user_roles table fresh with proper constraints
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, permissive policies (no recursion)
CREATE POLICY "Allow authenticated users full access" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
BEGIN 
    RETURN (SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN 
    RETURN (SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_user_role(user_uuid UUID, user_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (user_uuid, user_role) 
    ON CONFLICT (user_id) DO UPDATE SET role = user_role;
    RETURN TRUE;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE WARNING 'Failed to create user role for %: %', user_uuid, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_role(UUID, TEXT) TO anon, authenticated;

-- 10. Verify setup
SELECT 
    'Database setup complete!' as status,
    COUNT(*) as user_roles_count,
    'Ready for authentication' as message
FROM public.user_roles;
