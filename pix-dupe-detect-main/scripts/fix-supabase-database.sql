-- Fix Supabase Database Setup for Real User Authentication
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- 4. Create simplified RLS policies for user_roles (avoiding recursion)
-- Policy: Users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow insert for new users (simplified)
CREATE POLICY "Allow user role creation" ON public.user_roles
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own roles
CREATE POLICY "Users can update own roles" ON public.user_roles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Allow all reads for now (simplified to avoid recursion)
CREATE POLICY "Allow all reads" ON public.user_roles
    FOR SELECT USING (true);

-- 5. Create function to automatically create user role on signup
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

-- 6. Create trigger to call function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 9. Drop existing functions if they exist (to avoid return type conflicts)
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

-- 12. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- 13. Create a test admin user (optional - replace with your email)
-- INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin' FROM auth.users WHERE email = 'your-email@example.com';

-- 14. Verify the setup
SELECT 
    'Database setup complete!' as status,
    COUNT(*) as user_roles_count
FROM public.user_roles;
