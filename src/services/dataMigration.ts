
import { supabase } from './supabase';
import { MOCK_AGENCIES, MOCK_TRIPS } from './mockData';
import { ActivityActionType } from '../types'; // Import ActivityActionType

// Função auxiliar para pausa (evitar rate limit do Auth)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const migrateData = async () => {
  if (!supabase) {
    alert('Cliente Supabase não está configurado. Verifique seu arquivo .env e as variáveis de ambiente.');
    return;
  }
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
      const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email: agency.email,
        password: 'password123', 
        options: {
          data: {
            full_name: agency.name,
            role: 'AGENCY'
          }
        }
      });

      let userId = authData.user?.id;

      if (authError) {
        log(`⚠️ Info Auth para ${agency.email}: ${authError.message}`);
        if (authError.message.includes('already registered')) {
             const { data: loginData } = await (supabase.auth as any).signInWithPassword({
                 email: agency.email,
                 password: 'password123'
             });
             userId = loginData.user?.id;
        }
      }

      if (userId) {
        // Map mock agencyId (e.g., 'ag_1') to the new user UUID
        agencyIdMap[agency.agencyId] = userId;

        // B. Upsert Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            full_name: agency.name,
            email: agency.email,
            role: 'AGENCY'
        }, { onConflict: 'id' });
        if (profileError) log(`❌ Erro tabela profiles: ${profileError.message}`);

        // C. Upsert Agency
        const { data: agencyData, error: agencyError } = await supabase
          .from('agencies')
          .upsert({
            user_id: userId,
            name: agency.name,
            description: agency.description,
            logo_url: agency.logo,
            website: agency.website,
            slug: agency.slug,
            is_active: true, // Activate during migration
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (agencyError) log(`❌ Erro tabela agencies: ${agencyError.message}`);
        else if(agencyData) {
            log(`✅ Agência salva: ${agency.name}`);
            agencyIdMap[agency.agencyId] = agencyData.id; // IMPORTANT: Map to the agencies table PK
        }
      }
      await delay(500);
    }

    // 2. Migrar Viagens (Individualmente para salvar as imagens)
    log(`\n📦 Migrando ${MOCK_TRIPS.length} viagens...`);
    
    let successCount = 0;

    for (const trip of MOCK_TRIPS) {
       const newAgencyId = agencyIdMap[trip.agencyId];
      
       if (!newAgencyId) {
         log(`⚠️ Viagem "${trip.title}" pulada: agência com ID mock "${trip.agencyId}" não encontrada.`);
         continue;
       }

       // Inserir Viagem
       const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
            agency_id: newAgencyId, // Use the real agency PK
            title: trip.title,
            slug: trip.slug,
            description: trip.description,
            destination: trip.destination,
            price: trip.price,
            start_date: trip.startDate,
            end_date: trip.endDate,
            duration_days: trip.durationDays,
            category: trip.category,
            tags: trip.tags,
            traveler_types: trip.travelerTypes,
            is_active: trip.is_active,
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
            log(`❌ Erro ao salvar viagem ${trip.title}: ${tripError.message}`);
            continue;
        }

        // Inserir Imagens
        if (tripData && trip.images && trip.