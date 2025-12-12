-- =====================================================
-- SCRIPT PARA LIMPAR TODOS OS DADOS DO BANCO
-- Execute este script no Supabase SQL Editor
-- ATENÇÃO: Esta ação é IRREVERSÍVEL!
-- =====================================================

-- Desabilitar temporariamente as constraints de foreign key para facilitar a limpeza
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
-- Primeiro limpa deleted_at para garantir hard delete
UPDATE public.trips SET deleted_at = NULL;
DELETE FROM public.trips;

-- 7. Deletar agencies (dependem de users)
UPDATE public.agencies SET deleted_at = NULL;
DELETE FROM public.agencies;

-- 8. Deletar activity_logs
DELETE FROM public.activity_logs;

-- 9. Deletar profiles (dependem de auth.users)
DELETE FROM public.profiles;

-- 10. Deletar todos os usuários do auth.users (exceto admin se necessário)
-- ATENÇÃO: Isso vai deletar TODOS os usuários, incluindo admins
-- Se você quiser manter algum usuário, ajuste a query
DELETE FROM auth.users;

-- Reabilitar as constraints
SET session_replication_role = 'origin';

-- Verificar se tudo foi deletado
SELECT 
  (SELECT COUNT(*) FROM public.bookings) as bookings_restantes,
  (SELECT COUNT(*) FROM public.trip_images) as trip_images_restantes,
  (SELECT COUNT(*) FROM public.favorites) as favorites_restantes,
  (SELECT COUNT(*) FROM public.agency_reviews) as agency_reviews_restantes,
  (SELECT COUNT(*) FROM public.trips) as trips_restantes,
  (SELECT COUNT(*) FROM public.agencies) as agencies_restantes,
  (SELECT COUNT(*) FROM public.profiles) as profiles_restantes,
  (SELECT COUNT(*) FROM auth.users) as users_restantes;
