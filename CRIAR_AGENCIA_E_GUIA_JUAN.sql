-- =====================================================
-- SCRIPT PARA CRIAR AGÊNCIA E GUIA DE TURISMO
-- Nome: Juan Nicolas
-- Execute este script no Supabase SQL Editor
-- 
-- NOTA: Este script cria os registros nas tabelas, mas você precisará
-- criar os usuários no auth.users através do Dashboard do Supabase
-- ou usar a API de criação de usuários.
-- =====================================================

-- IMPORTANTE: Primeiro crie os usuários no Supabase Dashboard:
-- 1. Authentication > Users > Add User
-- 2. Email: juan.agencia@viajastore.com | Senha: agencia123
-- 3. Email: juan.guia@viajastore.com | Senha: guia123
-- 4. Copie os UUIDs dos usuários criados
-- 5. Use os UUIDs abaixo nas queries

-- Alternativamente, use a função auth.create_user() se disponível

-- 1. Criar usuário para a Agência
-- IMPORTANTE: Substitua 'SEU_UUID_AQUI' pelo UUID do usuário criado no Supabase Auth
DO $$
DECLARE
  agency_user_id UUID;
  agency_profile_id UUID;
  guide_user_id UUID;
  guide_profile_id UUID;
  agency_id UUID;
  guide_agency_id UUID;
  agency_password_hash TEXT;
  guide_password_hash TEXT;
BEGIN
  -- Gerar UUIDs para os usuários (ou use os UUIDs retornados ao criar no Dashboard)
  agency_user_id := gen_random_uuid();
  guide_user_id := gen_random_uuid();
  
  -- Hash da senha usando pgcrypto (senha: agencia123)
  agency_password_hash := crypt('agencia123', gen_salt('bf'));
  
  -- Criar usuário auth para Agência usando extensão auth
  -- Nota: Você pode precisar criar os usuários via Dashboard primeiro
  -- e depois apenas atualizar/inserir aqui
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      agency_user_id,
      '00000000-0000-0000-0000-000000000000',
      'juan.agencia@viajastore.com',
      agency_password_hash,
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Juan Nicolas Agência"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    ) ON CONFLICT (email) DO NOTHING RETURNING id INTO agency_user_id;
    
    -- Se já existe, buscar o ID existente
    IF agency_user_id IS NULL THEN
      SELECT id INTO agency_user_id FROM auth.users WHERE email = 'juan.agencia@viajastore.com';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, tentar buscar usuário existente
    SELECT id INTO agency_user_id FROM auth.users WHERE email = 'juan.agencia@viajastore.com';
  END;

  -- Criar profile para Agência
  agency_profile_id := agency_user_id; -- Usa o mesmo ID do auth.users
  
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    agency_profile_id,
    'Juan Nicolas Agência',
    'juan.agencia@viajastore.com',
    'AGENCY',
    NOW(),
    NOW()
  );

  -- Criar registro na tabela agencies
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
    agency_user_id,
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
  );

  -- ============================================
  -- 2. Criar usuário para Guia de Turismo
  -- ============================================
  
  -- Hash da senha para o guia (senha: guia123)
  guide_password_hash := crypt('guia123', gen_salt('bf'));
  
  -- Criar usuário auth para Guia
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      guide_user_id,
      '00000000-0000-0000-0000-000000000000',
      'juan.guia@viajastore.com',
      guide_password_hash,
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Juan Nicolas Guia"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    ) ON CONFLICT (email) DO NOTHING RETURNING id INTO guide_user_id;
    
    -- Se já existe, buscar o ID existente
    IF guide_user_id IS NULL THEN
      SELECT id INTO guide_user_id FROM auth.users WHERE email = 'juan.guia@viajastore.com';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, tentar buscar usuário existente
    SELECT id INTO guide_user_id FROM auth.users WHERE email = 'juan.guia@viajastore.com';
  END;

  -- Criar profile para Guia
  guide_profile_id := guide_user_id; -- Usa o mesmo ID do auth.users
  
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    guide_profile_id,
    'Juan Nicolas Guia',
    'juan.guia@viajastore.com',
    'AGENCY',
    NOW(),
    NOW()
  );

  -- Criar registro na tabela agencies como guia (is_guide = true)
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
    guide_user_id,
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
  );

  RAISE NOTICE 'Agência criada com sucesso!';
  RAISE NOTICE 'Email: juan.agencia@viajastore.com | Senha: agencia123';
  RAISE NOTICE 'Guia criado com sucesso!';
  RAISE NOTICE 'Email: juan.guia@viajastore.com | Senha: guia123';
END $$;

-- Verificar se foram criados corretamente
SELECT 
  'AGÊNCIA' as tipo,
  a.name,
  a.email,
  a.slug,
  a.is_guide,
  a.subscription_status,
  a.is_active
FROM public.agencies a
WHERE a.email IN ('juan.agencia@viajastore.com', 'juan.guia@viajastore.com')
ORDER BY a.is_guide;
