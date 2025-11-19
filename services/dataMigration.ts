
import { supabase } from './supabase';
import { MOCK_AGENCIES, MOCK_TRIPS } from './mockData';

// Função auxiliar para pausa (evitar rate limit do Auth)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const migrateData = async () => {
  console.log('🚀 Iniciando migração...');
  const agencyIdMap: Record<string, string> = {};
  const logs: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // 1. Migrar Agências
    log(`📦 Migrando ${MOCK_AGENCIES.length} agências...`);
    
    for (const agency of MOCK_AGENCIES) {
      log(`Processando agência: ${agency.name}`);
      
      // A. Criar Usuário de Auth
      // Nota: O Supabase tem rate limit de signups. Se falhar, considere usar a service_role key no backend
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: agency.email,
        password: 'password123', // Senha padrão para migração
        options: {
          data: {
            name: agency.name,
            role: 'AGENCY'
          }
        }
      });

      let userId = authData.user?.id;

      if (authError) {
        log(`⚠️ Erro no Auth para ${agency.email}: ${authError.message}`);
        // Se o usuário já existe, tentamos pegar o ID dele fazendo login (truque para migração)
        if (authError.message.includes('already registered')) {
             const { data: loginData } = await supabase.auth.signInWithPassword({
                 email: agency.email,
                 password: 'password123'
             });
             userId = loginData.user?.id;
        }
      }

      if (userId) {
        // Salvar mapeamento ID Antigo -> Novo UUID
        agencyIdMap[agency.id] = userId;

        // B. Inserir dados na tabela public.agencies
        // O profile já deve ter sido criado via Trigger, mas garantimos a agência
        const { error: agencyError } = await supabase
          .from('agencies')
          .upsert({
            id: userId, // O ID da agência é o mesmo do usuário
            name: agency.name,
            description: agency.description,
            logo_url: agency.logo,
            subscription_status: 'ACTIVE',
            subscription_plan: 'PREMIUM',
            website: agency.website,
            subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          });

        if (agencyError) log(`❌ Erro tabela agencies: ${agencyError.message}`);
        else log(`✅ Agência salva: ${agency.name}`);
      }

      // Pausa pequena para não estourar limites
      await delay(1000);
    }

    // 2. Migrar Viagens
    log(`\n📦 Migrando viagens...`);
    
    const tripsToInsert = MOCK_TRIPS.map(trip => {
      const newAgencyId = agencyIdMap[trip.agencyId];
      
      if (!newAgencyId) {
        log(`⚠️ Pular viagem "${trip.title}": Agência original ${trip.agencyId} não migrada.`);
        return null;
      }

      return {
        agency_id: newAgencyId,
        title: trip.title,
        description: trip.description,
        destination: trip.destination,
        price: trip.price,
        start_date: trip.startDate,
        end_date: trip.endDate,
        duration_days: trip.durationDays,
        images: trip.images,
        category: trip.category,
        tags: trip.tags,
        traveler_types: trip.travelerTypes,
        active: trip.active,
        included: trip.included,
        not_included: trip.notIncluded || [],
        featured: trip.featured || false,
        popular_near_sp: trip.popularNearSP || false,
        sales_count: trip.sales || 0,
        views_count: trip.views || 0,
        created_at: new Date().toISOString()
      };
    }).filter(Boolean);

    if (tripsToInsert.length > 0) {
      const { error: tripsError } = await supabase
        .from('trips')
        .insert(tripsToInsert);

      if (tripsError) log(`❌ Erro ao inserir viagens: ${tripsError.message}`);
      else log(`✅ ${tripsToInsert.length} viagens inseridas com sucesso!`);
    }

  } catch (e: any) {
    log(`💀 Erro fatal: ${e.message}`);
  }

  log('\n🏁 Migração concluída!');
  return logs;
};
