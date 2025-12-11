-- Migration: Add passenger_config column to trips table
-- Date: 2025-01-XX
-- Description: Adds passenger_config JSONB column for storing passenger configuration (age limits, discounts, etc.)

-- Add passenger_config as JSONB column
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS passenger_config JSONB DEFAULT '{
  "allowChildren": true,
  "allowSeniors": true,
  "childAgeLimit": 12,
  "allowLapChild": false,
  "childPriceMultiplier": 0.7
}'::jsonb;

-- Add index for passenger_config queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_trips_passenger_config ON public.trips USING GIN (passenger_config);

COMMENT ON COLUMN public.trips.passenger_config IS 'Passenger configuration: age limits, discounts, lap child allowance, etc.';

