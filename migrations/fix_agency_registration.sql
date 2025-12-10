-- =====================================================
-- FIX AGENCY REGISTRATION - VIAJASTORE
-- =====================================================
-- Este script corrige o bug crítico no cadastro de agências:
-- 1. Agências são criadas como INACTIVE (bloqueando acesso)
-- 2. Loop de loading infinito após cadastro
-- 3. Introduz plano gratuito "STARTER"
-- =====================================================
-- Data: 2025-01-10
-- =====================================================

-- Atualiza a função para criar agências já ATIVAS e no plano STARTER
-- CORREÇÃO: Garante que slug nunca seja NULL ou vazio
CREATE OR REPLACE FUNCTION public.create_agency(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_slug text
)
RETURNS void AS $$
DECLARE
  v_slug text;
BEGIN
  -- FIX: Garantir que slug nunca seja NULL ou vazio
  v_slug := COALESCE(NULLIF(TRIM(p_slug), ''), 'agencia-' || floor(random() * 100000)::text);
  
  -- Se o slug ainda estiver vazio após COALESCE, usar timestamp
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := 'agencia-' || extract(epoch from now())::bigint::text;
  END IF;
  
  INSERT INTO public.agencies (
    user_id,
    name,
    email,
    phone,
    whatsapp,
    slug,
    is_active,             -- CORREÇÃO: Já nasce ativa (true)
    hero_mode,
    subscription_status,   -- CORREÇÃO: Status Ativo
    subscription_plan,     -- CORREÇÃO: Plano Starter
    subscription_expires_at
  ) VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_whatsapp,
    v_slug,                -- Usar slug validado
    true,                  -- true (ativa desde o cadastro)
    'TRIPS',
    'ACTIVE',              -- ACTIVE (não mais INACTIVE)
    'STARTER',             -- STARTER (plano gratuito)
    NULL                   -- Sem data de expiração para Free
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Após executar este script, todas as novas agências serão:
-- - is_active: true
-- - subscription_status: 'ACTIVE'
-- - subscription_plan: 'STARTER'
-- - subscription_expires_at: NULL
-- =====================================================

