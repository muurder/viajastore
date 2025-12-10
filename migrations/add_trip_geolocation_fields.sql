-- Migration: Add geolocation and capacity fields to trips table
-- Date: 2025-01-XX
-- Description: Adds latitude, longitude, maxGuests, and allowChildren fields for advanced search and map features

-- Add latitude and longitude for map visualization
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add maxGuests for capacity filtering
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS max_guests INTEGER;

-- Add allowChildren flag for family-friendly filtering
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS allow_children BOOLEAN DEFAULT true;

-- Add index for geolocation queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_trips_location ON public.trips(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add index for max_guests filtering
CREATE INDEX IF NOT EXISTS idx_trips_max_guests ON public.trips(max_guests) 
WHERE max_guests IS NOT NULL;

-- Add index for allow_children filtering
CREATE INDEX IF NOT EXISTS idx_trips_allow_children ON public.trips(allow_children);

COMMENT ON COLUMN public.trips.latitude IS 'Latitude coordinate for map visualization';
COMMENT ON COLUMN public.trips.longitude IS 'Longitude coordinate for map visualization';
COMMENT ON COLUMN public.trips.max_guests IS 'Maximum number of guests allowed per booking';
COMMENT ON COLUMN public.trips.allow_children IS 'Whether the trip is suitable for children';

