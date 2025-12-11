-- =====================================================
-- COMANDOS SQL RÁPIDOS PARA SUPABASE - VIAJASTORE
-- =====================================================
-- Use estes comandos quando precisar fazer alterações no banco
-- =====================================================

-- =====================================================
-- 1. ÍNDICES ÚNICOS PARA SLUGS (RECOMENDADO - EXECUTAR AGORA)
-- =====================================================

-- Criar índices únicos para garantir que slugs sejam únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug_unique 
ON public.agencies(slug) 
WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_slug_unique 
ON public.trips(slug) 
WHERE slug IS NOT NULL;

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para agências
CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON public.agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON public.agencies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agencies_deleted_at ON public.agencies(deleted_at) WHERE deleted_at IS NULL;

-- Índices para viagens
CREATE INDEX IF NOT EXISTS idx_trips_agency_id ON public.trips(agency_id);
CREATE INDEX IF NOT EXISTS idx_trips_is_active ON public.trips(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trips_category ON public.trips(category);
CREATE INDEX IF NOT EXISTS idx_trips_featured ON public.trips(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON public.trips(deleted_at) WHERE deleted_at IS NULL;

-- Índices para reservas
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Índices para reviews
CREATE INDEX IF NOT EXISTS idx_agency_reviews_agency_id ON public.agency_reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_reviews_client_id ON public.agency_reviews(client_id);

-- Índices para perfis
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- 3. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_agencies_updated_at 
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at 
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RPC FUNCTION (já deve existir, mas garantindo)
-- =====================================================

-- Remover função existente se houver (pode ter tipo de retorno diferente)
DROP FUNCTION IF EXISTS create_agency(uuid, text, text, text, text, text);

-- Criar função create_agency
CREATE FUNCTION create_agency(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_slug text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.agencies (
    user_id,
    name,
    email,
    phone,
    whatsapp,
    slug,
    is_active,
    hero_mode,
    subscription_status,
    subscription_plan,
    subscription_expires_at
  ) VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_whatsapp,
    p_slug,
    false,
    'TRIPS',
    'INACTIVE',
    'BASIC',
    now() + interval '30 days'
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VALIDAÇÕES DE SLUG (OPCIONAL - APÓS MIGRAÇÃO)
-- =====================================================

-- Descomente estas linhas APÓS garantir que todos os slugs estão corretos:

-- ALTER TABLE public.agencies 
-- ADD CONSTRAINT check_agencies_slug_format 
-- CHECK (
--   slug IS NULL OR 
--   (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) >= 3 AND length(slug) <= 100)
-- );

-- ALTER TABLE public.trips 
-- ADD CONSTRAINT check_trips_slug_format 
-- CHECK (
--   slug IS NULL OR 
--   (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) >= 3 AND length(slug) <= 100)
-- );

-- =====================================================
-- FIM DOS COMANDOS
-- =====================================================

