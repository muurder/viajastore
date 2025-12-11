-- =====================================================
-- ADD NEW COLUMNS TO PLATFORM_SETTINGS TABLE
-- =====================================================
-- Este script adiciona as novas colunas de personalização
-- à tabela platform_settings existente
-- =====================================================

-- Adicionar colunas de personalização de layout
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS layout_style text DEFAULT 'rounded' CHECK (layout_style IN ('rounded', 'square', 'minimal')),
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS background_blur boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS background_transparency numeric DEFAULT 1.0 CHECK (background_transparency >= 0 AND background_transparency <= 1),
  ADD COLUMN IF NOT EXISTS default_settings jsonb DEFAULT '{}'::jsonb;

-- Atualizar default_settings com valores atuais se estiver vazio
UPDATE public.platform_settings
SET default_settings = jsonb_build_object(
  'platform_name', COALESCE(platform_name, 'ViajaStore'),
  'platform_logo_url', platform_logo_url,
  'maintenance_mode', COALESCE(maintenance_mode, false),
  'layout_style', COALESCE(layout_style, 'rounded'),
  'background_color', COALESCE(background_color, '#ffffff'),
  'background_blur', COALESCE(background_blur, false),
  'background_transparency', COALESCE(background_transparency, 1.0)
)
WHERE default_settings IS NULL OR default_settings = '{}'::jsonb;

