
ALTER TABLE public.saved_furniture
  ADD COLUMN IF NOT EXISTS rendering_url text,
  ADD COLUMN IF NOT EXISTS assignments jsonb;

-- Allow all authenticated users to save/update furniture (not just admins)
DROP POLICY IF EXISTS "Auth users insert saved furniture" ON public.saved_furniture;
CREATE POLICY "Auth users insert saved furniture"
  ON public.saved_furniture FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users update saved furniture" ON public.saved_furniture;
CREATE POLICY "Auth users update saved furniture"
  ON public.saved_furniture FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
