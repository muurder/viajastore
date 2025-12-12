-- =====================================================
-- SCRIPT SIMPLIFICADO - Execute após criar usuários no Dashboard
-- =====================================================
-- 
-- PASSOS:
-- 1. No Supabase Dashboard, vá em Authentication > Users > Add User
-- 2. Crie dois usuários:
--    - Email: juan.agencia@viajastore.com | Senha: agencia123
--    - Email: juan.guia@viajastore.com | Senha: guia123
-- 3. Copie os UUIDs dos usuários criados
-- 4. Substitua 'UUID_AGENCIA_AQUI' e 'UUID_GUIA_AQUI' abaixo pelos UUIDs reais
-- 5. Execute este script
-- =====================================================

-- =====================================================
-- Este script busca automaticamente os UUIDs dos usuários
-- pelos emails, então você só precisa criar os usuários
-- no Dashboard primeiro!
-- =====================================================

-- 1. Criar profile e agência para Juan Nicolas Agência
DO $$
DECLARE
  agency_id UUID;
  guide_agency_id UUID;
  agency_user_uuid UUID;
  guide_user_uuid UUID;
BEGIN
  -- Buscar UUID do usuário da agência
  SELECT id INTO agency_user_uuid FROM auth.users WHERE email = 'juan.agencia@viajastore.com';
  
  IF agency_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuário juan.agencia@viajastore.com não encontrado. Crie primeiro no Dashboard!';
  END IF;

  -- Criar profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    agency_user_uuid,
    'Juan Nicolas Agência',
    'juan.agencia@viajastore.com',
    'AGENCY',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET full_name = 'Juan Nicolas Agência',
        email = 'juan.agencia@viajastore.com',
        role = 'AGENCY',
        updated_at = NOW();

  -- Criar agência
  agency_id := gen_random_uuid();
  
  INSERT INTO public.agencies (
    id,
    user_id,
    name,
    email,
    slug,
    description,
    is_active,
    is_guide,
    subscription_status,
    subscription_plan,
    created_at,
    updated_at
  ) VALUES (
    agency_id,
    agency_user_uuid,
    'Juan Nicolas Agência',
    'juan.agencia@viajastore.com',
    'juan-nicolas-agencia',
    'Agência de viagens especializada em pacotes personalizados e experiências únicas.',
    true,
    false,
    'ACTIVE',
    'PREMIUM',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET name = 'Juan Nicolas Agência',
        slug = 'juan-nicolas-agencia',
        description = 'Agência de viagens especializada em pacotes personalizados e experiências únicas.',
        is_active = true,
        is_guide = false,
        subscription_status = 'ACTIVE',
        subscription_plan = 'PREMIUM',
        updated_at = NOW();

  -- ============================================
  -- 2. Criar profile e agência para Guia
  -- ============================================
  
  -- Buscar UUID do usuário do guia
  SELECT id INTO guide_user_uuid FROM auth.users WHERE email = 'juan.guia@viajastore.com';
  
  IF guide_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuário juan.guia@viajastore.com não encontrado. Crie primeiro no Dashboard!';
  END IF;

  -- Criar profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    guide_user_uuid,
    'Juan Nicolas Guia',
    'juan.guia@viajastore.com',
    'AGENCY',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET full_name = 'Juan Nicolas Guia',
        email = 'juan.guia@viajastore.com',
        role = 'AGENCY',
        updated_at = NOW();

  -- Criar agência como guia (is_guide = true)
  guide_agency_id := gen_random_uuid();
  
  INSERT INTO public.agencies (
    id,
    user_id,
    name,
    email,
    slug,
    description,
    is_active,
    is_guide,
    subscription_status,
    subscription_plan,
    created_at,
    updated_at
  ) VALUES (
    guide_agency_id,
    guide_user_uuid,
    'Juan Nicolas Guia de Turismo',
    'juan.guia@viajastore.com',
    'juan-nicolas-guia',
    'Guia de turismo especializado em proporcionar experiências autênticas e memoráveis.',
    true,
    true,
    'ACTIVE',
    'PREMIUM',
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE
    SET name = 'Juan Nicolas Guia de Turismo',
        slug = 'juan-nicolas-guia',
        description = 'Guia de turismo especializado em proporcionar experiências autênticas e memoráveis.',
        is_active = true,
        is_guide = true,
        subscription_status = 'ACTIVE',
        subscription_plan = 'PREMIUM',
        updated_at = NOW();

  RAISE NOTICE '✅ Agência criada: juan.agencia@viajastore.com';
  RAISE NOTICE '✅ Guia criado: juan.guia@viajastore.com';
END $$;

-- Verificar resultado
SELECT 
  CASE WHEN a.is_guide THEN 'GUIA' ELSE 'AGÊNCIA' END as tipo,
  a.name,
  a.email,
  a.slug,
  a.is_guide,
  a.subscription_status,
  a.is_active,
  p.id as user_id
FROM public.agencies a
JOIN public.profiles p ON p.id = a.user_id
WHERE a.email IN ('juan.agencia@viajastore.com', 'juan.guia@viajastore.com')
ORDER BY a.is_guide;
