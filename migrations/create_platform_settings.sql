-- =====================================================
-- PLATFORM SETTINGS TABLE (Singleton)
-- =====================================================
-- Tabela para configurações globais da plataforma (Whitelabel)
-- Apenas 1 linha permitida (singleton pattern)
-- =====================================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer NOT NULL DEFAULT 1,
  platform_name text NOT NULL DEFAULT 'ViajaStore',
  platform_logo_url text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  -- Personalização de Layout
  layout_style text DEFAULT 'rounded' CHECK (layout_style IN ('rounded', 'square', 'minimal')),
  background_color text DEFAULT '#ffffff',
  background_blur boolean DEFAULT false,
  background_transparency numeric DEFAULT 1.0 CHECK (background_transparency >= 0 AND background_transparency <= 1),
  -- Configurações padrão (snapshot)
  default_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_settings_pkey PRIMARY KEY (id),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

-- Inserir linha inicial padrão (se não existir)
INSERT INTO public.platform_settings (
  id, platform_name, platform_logo_url, maintenance_mode,
  layout_style, background_color, background_blur, background_transparency,
  default_settings
)
VALUES (
  1, 'ViajaStore', NULL, false,
  'rounded', '#ffffff', false, 1.0,
  '{"platform_name": "ViajaStore", "platform_logo_url": null, "maintenance_mode": false, "layout_style": "rounded", "background_color": "#ffffff", "background_blur": false, "background_transparency": 1.0}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Política: Leitura pública (qualquer um pode ler)
CREATE POLICY "Platform Settings Public Read" ON public.platform_settings
  FOR SELECT
  USING (true);

-- Política: Escrita apenas para Admin/Service Role
-- Nota: A função is_admin() deve ser criada separadamente ou usar auth.uid() com verificação de role
CREATE POLICY "Platform Settings Admin Write" ON public.platform_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índice único no id (já garantido pela PK, mas explícito para clareza)
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_settings_id ON public.platform_settings(id);

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

