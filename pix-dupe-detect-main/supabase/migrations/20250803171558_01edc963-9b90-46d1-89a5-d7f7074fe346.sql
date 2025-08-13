-- Create dedup_events table for comprehensive duplicate detection logging
CREATE TABLE public.dedup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  original_filename text,
  file_type text,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_type text, -- 'sha256', 'phash', 'structure', 'content'
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  similar_files jsonb DEFAULT '[]'::jsonb,
  processing_time_ms integer,
  sync_status text DEFAULT 'pending', -- 'pending', 'success', 'failed'
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dedup_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own dedup events"
ON public.dedup_events 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own dedup events"
ON public.dedup_events 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all dedup events"
ON public.dedup_events 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_dedup_events_user_id ON public.dedup_events(user_id);
CREATE INDEX idx_dedup_events_file_hash ON public.dedup_events(file_hash);
CREATE INDEX idx_dedup_events_created_at ON public.dedup_events(created_at);
CREATE INDEX idx_dedup_events_duplicate_type ON public.dedup_events(duplicate_type);

-- Create trigger for updated_at
CREATE TRIGGER update_dedup_events_updated_at
  BEFORE UPDATE ON public.dedup_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();