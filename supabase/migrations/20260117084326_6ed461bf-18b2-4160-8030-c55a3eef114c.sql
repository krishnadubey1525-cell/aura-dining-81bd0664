-- Create a table for form submissions (like Google Forms)
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit the form (public access for submissions)
CREATE POLICY "Anyone can submit the form"
ON public.form_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Admins can view all submissions"
ON public.form_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));