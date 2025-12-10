-- Migration: Add indexes for unindexed foreign keys
-- Purpose: Optimize JOIN operations by creating indexes on foreign key columns
-- Generated based on Supabase Database Linter report for "Unindexed Foreign Keys"
-- Note: Using CREATE INDEX (without CONCURRENTLY) to allow execution within transaction blocks

-- Activity Logs: agency_id foreign key index
CREATE INDEX IF NOT EXISTS idx_activity_logs_agency_id 
ON public.activity_logs(agency_id);

-- Activity Logs: user_id foreign key index
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
ON public.activity_logs(user_id);

-- Agency Reviews: booking_id foreign key index
CREATE INDEX IF NOT EXISTS idx_agency_reviews_booking_id 
ON public.agency_reviews(booking_id);

-- Agency Reviews: trip_id foreign key index
CREATE INDEX IF NOT EXISTS idx_agency_reviews_trip_id 
ON public.agency_reviews(trip_id);

-- Favorites: trip_id foreign key index
CREATE INDEX IF NOT EXISTS idx_favorites_trip_id 
ON public.favorites(trip_id);

-- Subscriptions: plan_id foreign key index
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
ON public.subscriptions(plan_id);

-- Trip Images: trip_id foreign key index
CREATE INDEX IF NOT EXISTS idx_trip_images_trip_id 
ON public.trip_images(trip_id);

