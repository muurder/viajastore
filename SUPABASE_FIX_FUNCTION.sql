-- =====================================================
-- CORREÇÃO: Remover e Recriar função create_agency
-- =====================================================
-- Execute este comando se receber erro ao criar a função
-- =====================================================

-- Remover função existente (se houver)
DROP FUNCTION IF EXISTS create_agency(uuid, text, text, text, text, text);

-- Recriar função com a assinatura correta
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

