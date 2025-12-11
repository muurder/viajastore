-- =====================================================
-- ADD GUIDE FIELDS TO AGENCIES TABLE
-- =====================================================
-- This migration adds specific fields for tour guides
-- to the agencies table (since guides are stored there with isGuide flag)
-- =====================================================
-- Data: 2025-12-10
-- =====================================================

-- Add is_guide flag first (if it doesn't exist)
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS is_guide boolean DEFAULT false;

-- Add guide-specific fields
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS cadastur text,
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability text DEFAULT 'FULL_TIME';

-- Add CHECK constraint for availability (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agencies_availability_check'
  ) THEN
    ALTER TABLE public.agencies
    ADD CONSTRAINT agencies_availability_check 
    CHECK (availability IN ('FULL_TIME', 'PART_TIME', 'ON_DEMAND'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.agencies.is_guide IS 'Flag to identify tour guides (true = guide, false = agency)';
COMMENT ON COLUMN public.agencies.cadastur IS 'Cadastur number (required for tour guides in Brazil)';
COMMENT ON COLUMN public.agencies.languages IS 'Languages spoken by the guide';
COMMENT ON COLUMN public.agencies.specialties IS 'Guide specialties (e.g., Historical, Ecological, Adventure)';
COMMENT ON COLUMN public.agencies.certifications IS 'Professional certifications';
COMMENT ON COLUMN public.agencies.experience_years IS 'Years of experience as a tour guide';
COMMENT ON COLUMN public.agencies.availability IS 'Guide availability: FULL_TIME, PART_TIME, ON_DEMAND';

-- Create index for faster guide queries (only after is_guide column exists)
CREATE INDEX IF NOT EXISTS idx_agencies_is_guide ON public.agencies(is_guide) WHERE is_guide = true;
CREATE INDEX IF NOT EXISTS idx_agencies_cadastur ON public.agencies(cadastur) WHERE cadastur IS NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run to verify columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'agencies' 
-- AND column_name IN ('cadastur', 'languages', 'specialties', 'certifications', 'experience_years', 'availability');
-- =====================================================

