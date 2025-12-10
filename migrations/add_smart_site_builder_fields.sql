-- Migration: Add Smart Site Builder fields to agency_themes
-- Purpose: Enable advanced theme customization (fonts, borders, buttons, backgrounds)
-- Date: 2025-01-10

-- Add new columns to agency_themes table
ALTER TABLE public.agency_themes
ADD COLUMN IF NOT EXISTS font_pair text DEFAULT 'modern' CHECK (font_pair IN ('modern', 'classic', 'playful')),
ADD COLUMN IF NOT EXISTS border_radius text DEFAULT 'soft' CHECK (border_radius IN ('none', 'soft', 'full')),
ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'solid' CHECK (button_style IN ('solid', 'outline', 'ghost')),
ADD COLUMN IF NOT EXISTS header_style text DEFAULT 'solid' CHECK (header_style IN ('transparent', 'solid')),
ADD COLUMN IF NOT EXISTS background_image text,
ADD COLUMN IF NOT EXISTS background_blur numeric DEFAULT 0 CHECK (background_blur >= 0 AND background_blur <= 20),
ADD COLUMN IF NOT EXISTS background_opacity numeric DEFAULT 1 CHECK (background_opacity >= 0 AND background_opacity <= 1);

-- Add comment for documentation
COMMENT ON COLUMN public.agency_themes.font_pair IS 'Font pair selection: modern (Inter), classic (Playfair), playful (Comic Sans)';
COMMENT ON COLUMN public.agency_themes.border_radius IS 'Border radius style: none (0px), soft (8px), full (24px)';
COMMENT ON COLUMN public.agency_themes.button_style IS 'Button style: solid, outline, ghost';
COMMENT ON COLUMN public.agency_themes.header_style IS 'Header style: transparent or solid';
COMMENT ON COLUMN public.agency_themes.background_image IS 'Background image URL for hero section';
COMMENT ON COLUMN public.agency_themes.background_blur IS 'Background blur intensity (0-20)';
COMMENT ON COLUMN public.agency_themes.background_opacity IS 'Background opacity (0-1)';

