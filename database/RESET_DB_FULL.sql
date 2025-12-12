-- =====================================================
-- SQL Script: RESET COMPLETO DO BANCO DE DADOS
-- =====================================================
-- ⚠️  ATENÇÃO: ESTE SCRIPT É DESTRUTIVO ⚠️
-- 
-- Este script limpa TODAS as tabelas de dados do ViajaStore,
-- preservando apenas tabelas de configuração (planos, temas base).
-- 
-- USE APENAS EM AMBIENTE DE DESENVOLVIMENTO/TESTE!
-- NUNCA EXECUTE EM PRODUÇÃO!
-- =====================================================

BEGIN;

-- Desabilitar temporariamente triggers e constraints para evitar erros de FK
SET session_replication_role = 'replica';

-- =====================================================
-- LIMPEZA DE DADOS DE NEGÓCIO
-- =====================================================

-- 1. Reservas e Passageiros (dependem de viagens e clientes)
TRUNCATE TABLE booking_passengers CASCADE;
TRUNCATE TABLE bookings CASCADE;

-- 2. Avaliações (dependem de reservas, viagens, agências e clientes)
TRUNCATE TABLE agency_reviews CASCADE;

-- 3. Viagens (dependem de agências)
TRUNCATE TABLE trips CASCADE;

-- 4. Interações de Broadcast (dependem de comunicados e usuários)
TRUNCATE TABLE broadcast_interactions CASCADE;

-- 5. Comunicados (dependem de administradores)
TRUNCATE TABLE broadcast_messages CASCADE;

-- 6. Logs e Auditoria
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE audit_logs CASCADE;

-- 7. Agências (dependem de profiles)
-- NOTA: Mantemos agências mas limpamos dados relacionados
-- Se quiser limpar agências também, descomente a linha abaixo:
-- TRUNCATE TABLE agencies CASCADE;

-- 8. Clientes/Usuários (profiles com role CLIENT)
-- NOTA: Mantemos profiles mas limpamos dados relacionados
-- Se quiser limpar todos os usuários, descomente a linha abaixo:
-- TRUNCATE TABLE profiles CASCADE;

-- =====================================================
-- TABELAS PRESERVADAS (Configuração)
-- =====================================================
-- As seguintes tabelas NÃO são limpas:
-- - platform_settings (configurações globais da plataforma)
-- - agency_themes (temas salvos das agências - opcional, pode limpar se necessário)
-- - profiles com role ADMIN (administradores são preservados)
-- 
-- Para limpar temas também, descomente:
-- TRUNCATE TABLE agency_themes CASCADE;

-- =====================================================
-- RESET DE SEQUENCES (Opcional)
-- =====================================================
-- Se você quiser resetar os IDs auto-incrementáveis:
-- ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE trips_id_seq RESTART WITH 1;
-- (Ajuste conforme suas sequences)

-- Reabilitar triggers e constraints
SET session_replication_role = 'origin';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO PÓS-LIMPEZA
-- =====================================================
-- Execute estas queries para verificar se a limpeza foi bem-sucedida:

-- SELECT 'bookings' as tabela, COUNT(*) as registros FROM bookings
-- UNION ALL
-- SELECT 'booking_passengers', COUNT(*) FROM booking_passengers
-- UNION ALL
-- SELECT 'trips', COUNT(*) FROM trips
-- UNION ALL
-- SELECT 'agency_reviews', COUNT(*) FROM agency_reviews
-- UNION ALL
-- SELECT 'broadcast_messages', COUNT(*) FROM broadcast_messages
-- UNION ALL
-- SELECT 'broadcast_interactions', COUNT(*) FROM broadcast_interactions
-- UNION ALL
-- SELECT 'activity_logs', COUNT(*) FROM activity_logs
-- UNION ALL
-- SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script usa TRUNCATE CASCADE para limpar dados relacionados
-- 2. Profiles com role ADMIN são preservados (não são truncados)
-- 3. Platform settings são preservados
-- 4. Agency themes podem ser preservados ou limpos (comentado)
-- 5. Execute em uma transação (BEGIN/COMMIT) para poder reverter se necessário
-- 6. Em caso de erro, execute ROLLBACK para desfazer todas as alterações
-- =====================================================
