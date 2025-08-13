-- Create enum for file types
CREATE TYPE public.file_type AS ENUM ('image', 'pdf', 'document');

-- Create enum for cloud providers
CREATE TYPE public.cloud_provider AS ENUM ('s3', 'gdrive', 'dropbox', 'onedrive', 'other');

-- Create file upload logs table
CREATE TABLE public.file_upload_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  file_type file_type NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256_hash TEXT NOT NULL,
  perceptual_hash TEXT,
  content_hash TEXT,
  upload_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cloud_provider cloud_provider NOT NULL,
  cloud_path TEXT NOT NULL,
  rclone_remote TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploaded',
  duplicate_of UUID REFERENCES public.file_upload_logs(id),
  similarity_score DECIMAL(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient duplicate detection
CREATE INDEX idx_file_upload_logs_sha256 ON public.file_upload_logs(sha256_hash);
CREATE INDEX idx_file_upload_logs_perceptual ON public.file_upload_logs(perceptual_hash) WHERE perceptual_hash IS NOT NULL;
CREATE INDEX idx_file_upload_logs_user_id ON public.file_upload_logs(user_id);
CREATE INDEX idx_file_upload_logs_file_type ON public.file_upload_logs(file_type);

-- Enable RLS
ALTER TABLE public.file_upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for file upload logs
CREATE POLICY "Users can view their own uploads" 
ON public.file_upload_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
ON public.file_upload_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" 
ON public.file_upload_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all uploads" 
ON public.file_upload_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_file_upload_logs_updated_at
BEFORE UPDATE ON public.file_upload_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create cloud sync configurations table
CREATE TABLE public.cloud_sync_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider cloud_provider NOT NULL,
  remote_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, remote_name)
);

-- Enable RLS for cloud sync configs
ALTER TABLE public.cloud_sync_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for cloud sync configs
CREATE POLICY "Users can manage their own cloud configs" 
ON public.cloud_sync_configs 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for cloud sync configs timestamps
CREATE TRIGGER update_cloud_sync_configs_updated_at
BEFORE UPDATE ON public.cloud_sync_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();