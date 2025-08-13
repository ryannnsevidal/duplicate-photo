-- Create storage bucket for uploaded images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Create policies for the images bucket
CREATE POLICY "Allow authenticated users to upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete their images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- Create a table to store duplicate check results
CREATE TABLE public.duplicate_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duplicates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on duplicate_checks table
ALTER TABLE public.duplicate_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for duplicate_checks
CREATE POLICY "Users can view their own duplicate checks" 
ON public.duplicate_checks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own duplicate checks" 
ON public.duplicate_checks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_duplicate_checks_updated_at
BEFORE UPDATE ON public.duplicate_checks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();