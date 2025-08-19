-- Simple Fix for Supabase Database Setup (No Triggers)
-- This script creates a minimal setup without triggers to avoid database errors
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Drop ALL existing policies and triggers
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user role creation" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all reads" ON public.user_roles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_roles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_roles;

-- 2. Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Drop the user_roles table completely and recreate it
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 4. Create user_roles table fresh (no triggers)
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create very simple policies (no recursion possible)
-- Allow all operations for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 9. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin();

-- 10. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.user_roles 
        WHERE user_id = user_uuid 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT EXISTS (
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = user_uuid AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to create user role (called manually after signup)
CREATE OR REPLACE FUNCTION public.create_user_role(user_uuid UUID, user_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, user_role)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_role(UUID, TEXT) TO anon, authenticated;

-- 14. Verify the setup
SELECT 
    'Database setup complete!' as status,
    COUNT(*) as user_roles_count
FROM public.user_roles;
