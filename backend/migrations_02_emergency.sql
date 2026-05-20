-- Supabase Migration: Emergency External Providers
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.external_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    phone_number TEXT,
    rating NUMERIC(3, 2),
    review_count INTEGER DEFAULT 0,
    trust_score NUMERIC(5, 2),
    specializations TEXT[],
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    address TEXT,
    is_open_now BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.external_provider_search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_requested TEXT NOT NULL,
    location_requested TEXT NOT NULL,
    radius_km NUMERIC(5, 2),
    providers_found INTEGER DEFAULT 0,
    search_reasoning TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.external_provider_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    external_provider_id UUID NOT NULL REFERENCES public.external_providers(id),
    status TEXT DEFAULT 'pending_onboarding',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.external_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_provider_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_provider_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.external_providers FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.external_providers FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable read access for all users" ON public.external_provider_search_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.external_provider_search_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.external_provider_assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.external_provider_assignments FOR INSERT WITH CHECK (true);
