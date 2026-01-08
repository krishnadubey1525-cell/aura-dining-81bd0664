-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view visible menu items" ON public.menu_items;

-- Create a permissive policy that allows anyone to view visible items
CREATE POLICY "Anyone can view visible menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_visible = true);

-- Create a separate policy for admins to view all items
CREATE POLICY "Admins can view all menu items" 
ON public.menu_items 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));