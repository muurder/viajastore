

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
      // Fix: Cast auth to any
      const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email: agency.email,
        password: 'password123', 
        options: {
          data: {
            name: agency.name,
            role: 'AGENCY'
          }
        }
      });

      let userId = authData.user?.id;

      if (authError) {
        log(`⚠️ Info Auth para ${agency.email}: ${authError.message}`);
        if (authError.message.includes('already registered')) {
             // Fix: Cast auth to any
             const { data: loginData } = await (supabase.auth as any).signInWithPassword({
                 email: agency.email,
                 password: 'password123'
             });
             userId = loginData.user?.id;
        }
      }

      if (userId) {
        agencyIdMap[agency.id] = userId;

        const { error: agencyError } = await supabase
          .from('agencies')
          .upsert({
            id: userId,
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
      await delay(500);
    }

    // 2. Migrar Viagens (Individualmente para salvar as imagens)
    log(`\n📦 Migrando viagens...`);
    
    let successCount = 0;

    for (const trip of MOCK_TRIPS) {
       const newAgencyId = agencyIdMap[trip.agencyId];
      
       if (!newAgencyId) {
         continue;
       }

       // Inserir Viagem
       const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
            agency_id: newAgencyId,
            title: trip.title,
            slug: trip.slug, // Included slug field
            description: trip.description,
            destination: trip.destination,
            price: trip.price,
            start_date: trip.startDate,
            end_date: trip.endDate,
            duration_days: trip.durationDays,
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
        })
        .select()
        .single();

        if (tripError) {
            log(`❌ Erro viagem ${trip.title}: ${tripError.message}`);
            continue;
        }

        // Inserir Imagens
        if (tripData && trip.images && trip.images.length > 0) {
            const imagesPayload = trip.images.map(url => ({
                trip_id: tripData.id,
                image_url: url
            }));

            const { error: imgError } = await supabase
                .from('trip_images')
                .insert(imagesPayload);
            
            if (imgError) log(`⚠️ Erro imagens ${trip.title}: ${imgError.message}`);
        }

        successCount++;
        await delay(100); // Pequeno delay para evitar gargalo
    }

    log(`✅ ${successCount} viagens processadas com sucesso!`);

  } catch (e: any) {
    log(`💀 Erro fatal: ${e.message}`);
  }

  log('\n🏁 Migração concluída!');
  return logs;
};
