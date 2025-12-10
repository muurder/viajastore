-- =====================================================
-- FIX RLS PERFORMANCE ISSUES - VIAJASTORE
-- =====================================================
-- Este script corrige problemas de performance nas políticas RLS:
-- 1. auth_rls_initplan: Envolve auth.uid() em (select auth.uid()) para InitPlan
-- 2. multiple_permissive_policies: Consolida políticas duplicadas usando OR
-- =====================================================
-- Data: 2025-12-10
-- =====================================================

-- Helper function to check if user is admin (if not exists)
-- Note: This function already uses (select auth.uid()) internally, so it's optimized
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
-- TABLE: profiles
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users Delete Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin Manage All Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Read Profiles" ON public.profiles;

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
DROP POLICY IF EXISTS "Agency Update Self" ON public.agencies;
DROP POLICY IF EXISTS "Agencies can manage their own record" ON public.agencies;
DROP POLICY IF EXISTS "Admin Manage All Agencies" ON public.agencies;
DROP POLICY IF EXISTS "Admin full access on agencies" ON public.agencies;
DROP POLICY IF EXISTS "Public Read Agencies" ON public.agencies;
DROP POLICY IF EXISTS "Public can view non-deleted agencies" ON public.agencies;

-- Create optimized consolidated policies
CREATE POLICY "Unified Agencies Select" ON public.agencies
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_active = true OR
      (SELECT auth.uid()) = user_id OR
      (SELECT public.is_admin())
    )
  );

CREATE POLICY "Unified Agencies Insert" ON public.agencies
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agencies Update" ON public.agencies
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agencies Delete" ON public.agencies
  FOR DELETE
  USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: trips
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agency Update Own Trips" ON public.trips;
DROP POLICY IF EXISTS "Agency View Own Trips" ON public.trips;
DROP POLICY IF EXISTS "Agencies can manage their own trips" ON public.trips;
DROP POLICY IF EXISTS "Admin full access on trips" ON public.trips;
DROP POLICY IF EXISTS "Public Read Active Trips" ON public.trips;
DROP POLICY IF EXISTS "Public can view non-deleted trips" ON public.trips;

-- Create optimized consolidated policies
CREATE POLICY "Unified Trips Select" ON public.trips
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_active = true OR
      agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      ) OR
      (SELECT public.is_admin())
    )
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
-- TABLE: trip_images
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can manage their trip images" ON public.trip_images;
DROP POLICY IF EXISTS "Admin full access on trip_images" ON public.trip_images;
DROP POLICY IF EXISTS "Public can view trip images" ON public.trip_images;

-- Create optimized consolidated policies
CREATE POLICY "Unified Trip Images Select" ON public.trip_images
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE deleted_at IS NULL AND (
        is_active = true OR
        agency_id IN (
          SELECT id FROM public.agencies 
          WHERE user_id = (SELECT auth.uid())
        ) OR
        (SELECT public.is_admin())
      )
    )
  );

CREATE POLICY "Unified Trip Images Insert" ON public.trip_images
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      ) OR
      (SELECT public.is_admin())
    )
  );

CREATE POLICY "Unified Trip Images Update" ON public.trip_images
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      ) OR
      (SELECT public.is_admin())
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      ) OR
      (SELECT public.is_admin())
    )
  );

CREATE POLICY "Unified Trip Images Delete" ON public.trip_images
  FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM public.trips 
      WHERE agency_id IN (
        SELECT id FROM public.agencies 
        WHERE user_id = (SELECT auth.uid())
      ) OR
      (SELECT public.is_admin())
    )
  );

-- =====================================================
-- TABLE: bookings
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Clients can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Agencies can view bookings for their trips" ON public.bookings;
DROP POLICY IF EXISTS "Admin full access on bookings" ON public.bookings;

-- Create optimized consolidated policies
CREATE POLICY "Unified Bookings Select" ON public.bookings
  FOR SELECT
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

-- =====================================================
-- TABLE: favorites
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Clients can manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Admin read access on favorites" ON public.favorites;

-- Create optimized consolidated policies
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
-- TABLE: agency_reviews
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Clients can create reviews for purchased agencies" ON public.agency_reviews;
DROP POLICY IF EXISTS "Clients can update their own reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Clients can delete their own reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Agencies can add responses to their reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Admin full access on agency_reviews" ON public.agency_reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON public.agency_reviews;

-- Create optimized consolidated policies
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
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT auth.uid()) = client_id OR
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Agency Reviews Delete" ON public.agency_reviews
  FOR DELETE
  USING (
    (SELECT auth.uid()) = client_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: subscriptions
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin full access on subscriptions" ON public.subscriptions;

-- Create optimized consolidated policies
CREATE POLICY "Unified Subscriptions Select" ON public.subscriptions
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: themes
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view themes" ON public.themes;
DROP POLICY IF EXISTS "Admin full access on themes" ON public.themes;

-- Create optimized consolidated policies
CREATE POLICY "Unified Themes Select" ON public.themes
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: agency_themes
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Agencies can manage their own theme" ON public.agency_themes;
DROP POLICY IF EXISTS "Admin full access on agency_themes" ON public.agency_themes;

-- Create optimized consolidated policies
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
-- TABLE: activity_logs
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated Users Can View Own Activity Logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated Users Can Insert Own Activity Logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admin Full Access Activity Logs" ON public.activity_logs;

-- Create optimized consolidated policies
CREATE POLICY "Unified Activity Logs Select" ON public.activity_logs
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

CREATE POLICY "Unified Activity Logs Insert" ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: audit_logs
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admin Full Access Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can see audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated Read Audit Logs" ON public.audit_logs;

-- Create optimized consolidated policies
CREATE POLICY "Unified Audit Logs Select" ON public.audit_logs
  FOR SELECT
  USING (
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: plans
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admin full access on plans" ON public.plans;
DROP POLICY IF EXISTS "Public can read plans" ON public.plans;

-- Create optimized consolidated policies
CREATE POLICY "Unified Plans Select" ON public.plans
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- TABLE: reviews
-- =====================================================

-- Drop old policies (if they exist)
DROP POLICY IF EXISTS "Admin Full Access Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated Read Reviews" ON public.reviews;

-- Create optimized consolidated policies
CREATE POLICY "Unified Reviews Select" ON public.reviews
  FOR SELECT
  USING (
    true OR
    (SELECT public.is_admin())
  );

-- =====================================================
-- VERIFICATION QUERIES (Optional - Run to verify)
-- =====================================================

-- Check remaining policies (should show only the new unified ones)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =====================================================
-- END OF SCRIPT
-- =====================================================

