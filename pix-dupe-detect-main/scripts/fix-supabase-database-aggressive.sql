-- Aggressive Fix for Supabase Database Setup
-- This script completely removes all existing policies and recreates them
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Drop ALL existing policies on user_roles (if any exist)
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user role creation" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all reads" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_roles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_roles;

-- 2. Drop the user_roles table completely and recreate it
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 3. Create user_roles table fresh
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create very simple policies (no recursion possible)
-- Allow all operations for now (we can tighten this later)
CREATE POLICY "Enable all access for authenticated users" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Create function to automatically create user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user role for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to call function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 10. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_admin();

-- 11. Create function to get user role
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

-- 12. Create function to check if user is admin
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

-- 13. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- 14. Verify the setup
SELECT 
    'Database setup complete!' as status,
    COUNT(*) as user_roles_count
FROM public.user_roles;
