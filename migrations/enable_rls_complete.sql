-- =====================================================
-- ENABLE RLS COMPLETE - VIAJASTORE
-- =====================================================
-- Este script HABILITA Row Level Security em TODAS as tabelas críticas
-- e aplica as políticas de segurança otimizadas.
-- =====================================================
-- Data: 2025-12-10
-- IMPORTANTE: Execute este script no Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Criar função helper is_admin() (se não existir)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: HABILITAR RLS EM TODAS AS TABELAS CRÍTICAS
-- =====================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Agency Reviews
ALTER TABLE public.agency_reviews ENABLE ROW LEVEL SECURITY;

-- Agency Themes
ALTER TABLE public.agency_themes ENABLE ROW LEVEL SECURITY;

-- Favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Trip Images
ALTER TABLE public.trip_images ENABLE ROW LEVEL SECURITY;

-- Activity Logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Audit Logs (Admin only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform Settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: APLICAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- =====================================================
-- TABLE: profiles
-- =====================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users Delete Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin Manage All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Unified Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Unified Profiles Insert" ON public.profiles;
DROP POLICY IF EXISTS "Unified Profiles Update" ON public.profiles;
DROP POLICY IF EXISTS "Unified Profiles Delete" ON public.profiles;

-- Create optimized consolidated policies
CREATE POLICY "Unified Profiles Access" ON public.profiles
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Profiles Insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Profiles Update" ON public.profiles
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = id OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Profiles Delete" ON public.profiles
  FOR DELETE
  USING (
    (SELECT auth.uid()) = id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: agencies
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can view own data" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can update own data" ON public.agencies;
DROP POLICY IF EXISTS "Public can view active agencies" ON public.agencies;
DROP POLICY IF EXISTS "Admin full access on agencies" ON public.agencies;
DROP POLICY IF EXISTS "Unified Agencies Select" ON public.agencies;
DROP POLICY IF EXISTS "Unified Agencies Insert" ON public.agencies;
DROP POLICY IF EXISTS "Unified Agencies Update" ON public.agencies;
DROP POLICY IF EXISTS "Unified Agencies Delete" ON public.agencies;

-- Create optimized policies
CREATE POLICY "Unified Agencies Select" ON public.agencies
  FOR SELECT
  USING (
    -- Public can view active agencies
    (is_active = true AND deleted_at IS NULL) OR
    -- Agencies can view their own data
    user_id = (SELECT auth.uid()) OR
    -- Admin can view all
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agencies Insert" ON public.agencies
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agencies Update" ON public.agencies
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid()) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agencies Delete" ON public.agencies
  FOR DELETE
  USING (
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: trips
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Agencies can manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Public can view active trips" ON public.trips;
DROP POLICY IF EXISTS "Admin full access on trips" ON public.trips;
DROP POLICY IF EXISTS "Unified Trips Select" ON public.trips;
DROP POLICY IF EXISTS "Unified Trips Insert" ON public.trips;
DROP POLICY IF EXISTS "Unified Trips Update" ON public.trips;
DROP POLICY IF EXISTS "Unified Trips Delete" ON public.trips;

-- Create optimized policies
CREATE POLICY "Unified Trips Select" ON public.trips
  FOR SELECT
  USING (
    -- Public can view active trips
    (is_active = true AND deleted_at IS NULL) OR
    -- Agencies can view their own trips
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    -- Admin can view all
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trips Insert" ON public.trips
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trips Update" ON public.trips
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trips Delete" ON public.trips
  FOR DELETE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: bookings
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Agencies can view bookings for their trips" ON public.bookings;
DROP POLICY IF EXISTS "Admin full access on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Unified Bookings Select" ON public.bookings;
DROP POLICY IF EXISTS "Unified Bookings Insert" ON public.bookings;
DROP POLICY IF EXISTS "Unified Bookings Update" ON public.bookings;
DROP POLICY IF EXISTS "Unified Bookings Delete" ON public.bookings;

-- Create optimized policies
CREATE POLICY "Unified Bookings Select" ON public.bookings
  FOR SELECT
  USING (
    -- Clients can view their own bookings
    (SELECT auth.uid()) = client_id OR
    -- Agencies can view bookings for their trips
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    -- Admin can view all
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Bookings Insert" ON public.bookings
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Bookings Update" ON public.bookings
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = client_id OR
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = client_id OR
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Bookings Delete" ON public.bookings
  FOR DELETE
  USING (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: agency_reviews
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Public can view agency reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Clients can create reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Clients can update own reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Admin full access on agency reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Unified Agency Reviews Select" ON public.agency_reviews;
DROP POLICY IF EXISTS "Unified Agency Reviews Insert" ON public.agency_reviews;
DROP POLICY IF EXISTS "Unified Agency Reviews Update" ON public.agency_reviews;
DROP POLICY IF EXISTS "Unified Agency Reviews Delete" ON public.agency_reviews;

-- Create optimized policies
CREATE POLICY "Unified Agency Reviews Select" ON public.agency_reviews
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Reviews Insert" ON public.agency_reviews
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Reviews Update" ON public.agency_reviews
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Reviews Delete" ON public.agency_reviews
  FOR DELETE
  USING (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: agency_themes
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can manage own theme" ON public.agency_themes;
DROP POLICY IF EXISTS "Admin full access on agency themes" ON public.agency_themes;
DROP POLICY IF EXISTS "Unified Agency Themes Select" ON public.agency_themes;
DROP POLICY IF EXISTS "Unified Agency Themes Insert" ON public.agency_themes;
DROP POLICY IF EXISTS "Unified Agency Themes Update" ON public.agency_themes;
DROP POLICY IF EXISTS "Unified Agency Themes Delete" ON public.agency_themes;

-- Create optimized policies
CREATE POLICY "Unified Agency Themes Select" ON public.agency_themes
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Themes Insert" ON public.agency_themes
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Themes Update" ON public.agency_themes
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Themes Delete" ON public.agency_themes
  FOR DELETE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: favorites
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Clients can manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Admin read access on favorites" ON public.favorites;
DROP POLICY IF EXISTS "Unified Favorites Select" ON public.favorites;
DROP POLICY IF EXISTS "Unified Favorites Insert" ON public.favorites;
DROP POLICY IF EXISTS "Unified Favorites Delete" ON public.favorites;

-- Create optimized policies
CREATE POLICY "Unified Favorites Select" ON public.favorites
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Favorites Insert" ON public.favorites
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Favorites Delete" ON public.favorites
  FOR DELETE
  USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: trip_images
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can manage images for own trips" ON public.trip_images;
DROP POLICY IF EXISTS "Public can view trip images" ON public.trip_images;
DROP POLICY IF EXISTS "Admin full access on trip images" ON public.trip_images;
DROP POLICY IF EXISTS "Unified Trip Images Select" ON public.trip_images;
DROP POLICY IF EXISTS "Unified Trip Images Insert" ON public.trip_images;
DROP POLICY IF EXISTS "Unified Trip Images Update" ON public.trip_images;
DROP POLICY IF EXISTS "Unified Trip Images Delete" ON public.trip_images;

-- Create optimized policies
CREATE POLICY "Unified Trip Images Select" ON public.trip_images
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trip Images Insert" ON public.trip_images
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trip Images Update" ON public.trip_images
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Trip Images Delete" ON public.trip_images
  FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      )
    ) OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: activity_logs
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admin full access on activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Unified Activity Logs Select" ON public.activity_logs;
DROP POLICY IF EXISTS "Unified Activity Logs Insert" ON public.activity_logs;

-- Create optimized policies
CREATE POLICY "Unified Activity Logs Select" ON public.activity_logs
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Activity Logs Insert" ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: audit_logs (Admin only)
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admin full access on audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Unified Audit Logs Select" ON public.audit_logs;
DROP POLICY IF EXISTS "Unified Audit Logs Insert" ON public.audit_logs;

-- Create optimized policies
CREATE POLICY "Unified Audit Logs Select" ON public.audit_logs
  FOR SELECT
  USING (
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Audit Logs Insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: platform_settings (Admin only)
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Platform Settings Public Read" ON public.platform_settings;
DROP POLICY IF EXISTS "Platform Settings Admin Write" ON public.platform_settings;
DROP POLICY IF EXISTS "Unified Platform Settings Select" ON public.platform_settings;
DROP POLICY IF EXISTS "Unified Platform Settings Insert" ON public.platform_settings;
DROP POLICY IF EXISTS "Unified Platform Settings Update" ON public.platform_settings;
DROP POLICY IF EXISTS "Unified Platform Settings Delete" ON public.platform_settings;

-- Create optimized policies
CREATE POLICY "Unified Platform Settings Select" ON public.platform_settings
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Platform Settings Insert" ON public.platform_settings
  FOR INSERT
  WITH CHECK (
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Platform Settings Update" ON public.platform_settings
  FOR UPDATE
  USING (
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Platform Settings Delete" ON public.platform_settings
  FOR DELETE
  USING (
    (SELECT public.is_admin())
  );

-- =====================================================
-- VERIFICATION QUERIES (Run to verify RLS is enabled)
-- =====================================================

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'agencies', 'trips', 'bookings', 
    'agency_reviews', 'agency_themes', 'favorites', 
    'trip_images', 'activity_logs', 'audit_logs', 
    'platform_settings'
  )
ORDER BY tablename;

-- Check policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- END OF SCRIPT
-- =====================================================
-- IMPORTANTE: Após executar, teste o acesso:
-- 1. Login como Agência A
-- 2. Tente acessar dados de Agência B
-- 3. Deve retornar erro ou dados vazios
-- =====================================================

