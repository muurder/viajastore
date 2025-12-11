-- =====================================================
-- VIAJASTORE - SUPABASE SCHEMA COMPLETO
-- =====================================================
-- Este arquivo contém o schema completo do banco de dados
-- Última atualização: $(date)
-- =====================================================

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  agency_id uuid,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT activity_logs_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);

-- =====================================================
-- AGENCIES
-- =====================================================
CREATE TABLE public.agencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  cnpj text,
  description text,
  logo_url text,
  phone text,
  whatsapp text,
  website text,
  slug text UNIQUE,
  is_active boolean DEFAULT false,
  address jsonb,
  bank_info jsonb,
  hero_mode text DEFAULT 'TRIPS'::text,
  hero_banner_url text,
  hero_title text,
  hero_subtitle text,
  custom_settings jsonb,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_expires_at timestamp with time zone,
  subscription_plan text DEFAULT 'BASIC'::text,
  subscription_status text DEFAULT 'INACTIVE'::text,
  CONSTRAINT agencies_pkey PRIMARY KEY (id),
  CONSTRAINT agencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- =====================================================
-- AGENCY REVIEWS
-- =====================================================
CREATE TABLE public.agency_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  booking_id uuid,
  trip_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  tags ARRAY,
  response text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agency_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT agency_reviews_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id),
  CONSTRAINT agency_reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id),
  CONSTRAINT agency_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT agency_reviews_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);

-- =====================================================
-- AGENCY THEMES
-- =====================================================
CREATE TABLE public.agency_themes (
  agency_id uuid NOT NULL,
  colors jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agency_themes_pkey PRIMARY KEY (agency_id),
  CONSTRAINT agency_themes_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_email text,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- =====================================================
-- BOOKING PASSENGERS
-- =====================================================
CREATE TABLE public.booking_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  full_name text NOT NULL,
  document text,
  birth_date date,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  special_needs text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_passengers_pkey PRIMARY KEY (id),
  CONSTRAINT booking_passengers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);

-- =====================================================
-- BOOKINGS
-- =====================================================
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  passengers integer DEFAULT 1,
  total_price numeric,
  status text DEFAULT 'PENDING'::text,
  payment_method text,
  voucher_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id),
  CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id)
);

-- =====================================================
-- FAVORITES
-- =====================================================
CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (user_id, trip_id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT favorites_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);

-- =====================================================
-- PLANS
-- =====================================================
CREATE TABLE public.plans (
  id text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  duration_months integer NOT NULL,
  features ARRAY,
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text UNIQUE,
  role text DEFAULT 'CLIENT'::text,
  avatar_url text,
  cpf text,
  phone text,
  address jsonb,
  status text DEFAULT 'ACTIVE'::text,
  deleted_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  response text,
  created_at timestamp with time zone DEFAULT now(),
  agency_id uuid,
  CONSTRAINT reviews_pkey PRIMARY KEY (id)
);

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE,
  plan_id text NOT NULL,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)
);

-- =====================================================
-- THEMES
-- =====================================================
CREATE TABLE public.themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  colors jsonb NOT NULL,
  is_active boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT themes_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TRANSACTIONS
-- =====================================================
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  status text DEFAULT 'PENDING'::text,
  gateway_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  payment_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);

-- =====================================================
-- TRIP IMAGES
-- =====================================================
CREATE TABLE public.trip_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trip_images_pkey PRIMARY KEY (id),
  CONSTRAINT trip_images_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);

-- =====================================================
-- TRIPS
-- =====================================================
CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  title text NOT NULL,
  slug text,
  description text,
  destination text,
  price numeric NOT NULL DEFAULT 0,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  duration_days integer,
  category text,
  tags ARRAY,
  traveler_types ARRAY,
  itinerary jsonb,
  payment_methods ARRAY,
  included ARRAY,
  not_included ARRAY,
  is_active boolean DEFAULT false,
  featured boolean DEFAULT false,
  featured_in_hero boolean DEFAULT false,
  popular_near_sp boolean DEFAULT false,
  views_count integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  trip_rating numeric DEFAULT 0,
  trip_total_reviews integer DEFAULT 0,
  boarding_points jsonb DEFAULT '[]'::jsonb,
  operational_data jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);

-- =====================================================
-- ÍNDICES RECOMENDADOS PARA PERFORMANCE E UNICIDADE
-- =====================================================

-- Índices únicos para slugs (garantir unicidade)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug_unique ON public.agencies(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_slug_unique ON public.trips(slug) WHERE slug IS NOT NULL;

-- Índices para performance em buscas comuns
CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON public.agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON public.agencies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agencies_deleted_at ON public.agencies(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trips_agency_id ON public.trips(agency_id);
CREATE INDEX IF NOT EXISTS idx_trips_is_active ON public.trips(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trips_category ON public.trips(category);
CREATE INDEX IF NOT EXISTS idx_trips_featured ON public.trips(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON public.trips(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_agency_reviews_agency_id ON public.agency_reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_reviews_client_id ON public.agency_reviews(client_id);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- FUNÇÕES E TRIGGERS ÚTEIS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para agencies
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para trips
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Função para criar agência (usada no AuthContext)
CREATE OR REPLACE FUNCTION create_agency(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_slug text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.agencies (
    user_id,
    name,
    email,
    phone,
    whatsapp,
    slug,
    is_active,
    hero_mode,
    subscription_status,
    subscription_plan,
    subscription_expires_at
  ) VALUES (
    p_user_id,
    p_name,
    p_email,
    p_phone,
    p_whatsapp,
    p_slug,
    false,
    'TRIPS',
    'INACTIVE',
    'BASIC',
    now() + interval '30 days'
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security) - EXEMPLO
-- =====================================================
-- Nota: Ajuste conforme suas necessidades de segurança

-- Habilitar RLS nas tabelas principais
-- ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: Agências podem ver apenas suas próprias viagens
-- CREATE POLICY "Agencies can view own trips" ON public.trips
--   FOR SELECT USING (
--     agency_id IN (
--       SELECT id FROM public.agencies WHERE user_id = auth.uid()
--     )
--   );

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

