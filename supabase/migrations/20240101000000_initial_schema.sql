-- Supabase Database Schema for Duplicate Photo Detection
-- This file contains all the necessary tables and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE duplicate_status AS ENUM ('pending', 'processing', 'completed', 'no_duplicates', 'found_duplicates');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user'::user_role,
  session_timeout_minutes INTEGER DEFAULT 30,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File upload logs table
CREATE TABLE public.file_upload_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_source TEXT DEFAULT 'local', -- 'local', 'google_drive', 'dropbox'
  status upload_status DEFAULT 'pending'::upload_status,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Image hashes table
CREATE TABLE public.image_hashes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_upload_id UUID REFERENCES public.file_upload_logs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  phash TEXT NOT NULL,
  dhash TEXT NOT NULL,
  avg_hash TEXT NOT NULL,
  color_hash TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate checks table
CREATE TABLE public.duplicate_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file1_id UUID REFERENCES public.file_upload_logs(id) ON DELETE CASCADE NOT NULL,
  file2_id UUID REFERENCES public.file_upload_logs(id) ON DELETE CASCADE NOT NULL,
  algorithm TEXT NOT NULL, -- 'phash', 'dhash', 'avg_hash', 'color_hash'
  similarity_score DECIMAL(5,2) NOT NULL,
  threshold_used DECIMAL(5,2) NOT NULL,
  is_duplicate BOOLEAN NOT NULL,
  reviewed_by_user BOOLEAN DEFAULT FALSE,
  user_action TEXT, -- 'keep_both', 'delete_duplicate', 'mark_not_duplicate'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Dedup events table (for batch operations)
CREATE TABLE public.dedup_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'batch_upload', 'manual_check', 'scheduled_scan'
  total_files INTEGER NOT NULL,
  duplicates_found INTEGER DEFAULT 0,
  status duplicate_status DEFAULT 'pending'::duplicate_status,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Admin activity logs
CREATE TABLE public.admin_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_resource_type TEXT, -- 'user', 'file', 'duplicate_check'
  target_resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_file_upload_logs_user_id ON public.file_upload_logs(user_id);
CREATE INDEX idx_file_upload_logs_status ON public.file_upload_logs(status);
CREATE INDEX idx_file_upload_logs_uploaded_at ON public.file_upload_logs(uploaded_at);
CREATE INDEX idx_image_hashes_user_id ON public.image_hashes(user_id);
CREATE INDEX idx_image_hashes_file_upload_id ON public.image_hashes(file_upload_id);
CREATE INDEX idx_image_hashes_phash ON public.image_hashes(phash);
CREATE INDEX idx_image_hashes_dhash ON public.image_hashes(dhash);
CREATE INDEX idx_duplicate_checks_user_id ON public.duplicate_checks(user_id);
CREATE INDEX idx_duplicate_checks_similarity_score ON public.duplicate_checks(similarity_score);
CREATE INDEX idx_duplicate_checks_is_duplicate ON public.duplicate_checks(is_duplicate);
CREATE INDEX idx_dedup_events_user_id ON public.dedup_events(user_id);
CREATE INDEX idx_dedup_events_status ON public.dedup_events(status);
CREATE INDEX idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dedup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- File upload logs policies
CREATE POLICY "Users can view their own uploads" ON public.file_upload_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads" ON public.file_upload_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" ON public.file_upload_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all uploads" ON public.file_upload_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Image hashes policies
CREATE POLICY "Users can view their own image hashes" ON public.image_hashes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image hashes" ON public.image_hashes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all image hashes" ON public.image_hashes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Duplicate checks policies
CREATE POLICY "Users can view their own duplicate checks" ON public.duplicate_checks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own duplicate checks" ON public.duplicate_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own duplicate checks" ON public.duplicate_checks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all duplicate checks" ON public.duplicate_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Dedup events policies
CREATE POLICY "Users can view their own dedup events" ON public.dedup_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dedup events" ON public.dedup_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dedup events" ON public.dedup_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dedup events" ON public.dedup_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin activity logs policies
CREATE POLICY "Admins can view admin activity logs" ON public.admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert admin activity logs" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity = NOW()
  WHERE id = auth.uid();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role_result, 'user'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old files (for scheduled cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_files(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only admins can run cleanup
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Delete old processed uploads and their related data
  WITH deleted_files AS (
    DELETE FROM public.file_upload_logs
    WHERE uploaded_at < NOW() - INTERVAL '%s days' AND status = 'completed'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_files;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for uploads (run this in Supabase dashboard or via client)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Storage policies for uploads bucket
-- CREATE POLICY "Users can upload their own files" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own files" ON storage.objects
--   FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Admins can view all files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'uploads' AND public.is_admin());

-- Sample data for testing (optional)
-- INSERT INTO public.profiles (id, email, full_name, role) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'admin'),
--   ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Regular User', 'user');
