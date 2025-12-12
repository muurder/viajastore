-- =====================================================
-- SCRIPT PARA LIMPAR TODOS OS DADOS MAS MANTER ADMIN
-- Execute este script no Supabase SQL Editor
-- Mantém usuários com email específico (ajuste o email)
-- =====================================================

-- Desabilitar temporariamente as constraints de foreign key
SET session_replication_role = 'replica';

-- 1. Deletar bookings (dependem de trips e clients)
DELETE FROM public.bookings;

-- 2. Deletar trip_images (dependem de trips)
DELETE FROM public.trip_images;

-- 3. Deletar favorites (dependem de trips e users)
DELETE FROM public.favorites;

-- 4. Deletar agency_reviews (dependem de agencies e clients)
DELETE FROM public.agency_reviews;

-- 5. Deletar reviews antiga (se existir)
DELETE FROM public.reviews WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews');

-- 6. Deletar trips (dependem de agencies)
UPDATE public.trips SET deleted_at = NULL;
DELETE FROM public.trips;

-- 7. Deletar agencies (dependem de users)
UPDATE public.agencies SET deleted_at = NULL;
DELETE FROM public.agencies;

-- 8. Deletar activity_logs
DELETE FROM public.activity_logs;

-- 9. Deletar profiles (exceto admin)
-- AJUSTE O EMAIL ABAIXO para manter o admin
DELETE FROM public.profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users 
  WHERE email IN ('admin@teste.com', 'juannicolas1@gmail.com')
);

-- 10. Deletar usuários do auth.users (exceto admin)
-- AJUSTE O EMAIL ABAIXO para manter o admin
DELETE FROM auth.users 
WHERE email NOT IN ('admin@teste.com', 'juannicolas1@gmail.com');

-- Reabilitar as constraints
SET session_replication_role = 'origin';

-- Verificar resultado
SELECT 
  (SELECT COUNT(*) FROM public.bookings) as bookings_restantes,
  (SELECT COUNT(*) FROM public.trips) as trips_restantes,
  (SELECT COUNT(*) FROM public.agencies) as agencies_restantes,
  (SELECT COUNT(*) FROM public.profiles) as profiles_restantes,
  (SELECT COUNT(*) FROM auth.users) as users_restantes,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('admin@teste.com', 'juannicolas1@gmail.com')) as admins_mantidos;
