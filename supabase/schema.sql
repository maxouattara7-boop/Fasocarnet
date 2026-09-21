-- ==============================================================================
-- SCHEMA SUPABASE CLOUD POUR FASOCARNET
-- À exécuter dans l'onglet "SQL Editor" de votre projet Supabase
-- ==============================================================================

-- 1. TABLE DES BOUTIQUES (Cloisonnement multi-tenant avec JSONB haute performance)
CREATE TABLE IF NOT EXISTS public.shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    owner_name TEXT,
    owner_phone TEXT,
    city TEXT,
    pin_code TEXT,
    subscription_plan TEXT DEFAULT 'trial',
    subscription_status TEXT DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    telemetry JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer la recherche par téléphone lors de la connexion
CREATE INDEX IF NOT EXISTS idx_shops_phone ON public.shops(phone);
CREATE INDEX IF NOT EXISTS idx_shops_owner_phone ON public.shops(owner_phone);
CREATE INDEX IF NOT EXISTS idx_shops_updated_at ON public.shops(updated_at);

-- 2. TABLE DES CLÉS DE LICENCE OFFICIELLES
CREATE TABLE IF NOT EXISTS public.licenses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL,
    duration_days INT NOT NULL,
    price INT NOT NULL DEFAULT 2000,
    is_used BOOLEAN DEFAULT FALSE,
    used_by_shop_id TEXT,
    used_by_shop_name TEXT,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_code ON public.licenses(code);

-- 3. TABLE DES ANNONCES BROADCAST SUPER-ADMIN
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id TEXT PRIMARY KEY DEFAULT 'current_broadcast',
    message JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTIVER ROW LEVEL SECURITY (RLS) & POLITIQUES D'ACCÈS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture et écriture anonyme / authentifiée pour l'application mobile
DROP POLICY IF EXISTS "Allow anon full access on shops" ON public.shops;
CREATE POLICY "Allow anon full access on shops" 
ON public.shops FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access on licenses" ON public.licenses;
CREATE POLICY "Allow anon full access on licenses" 
ON public.licenses FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access on broadcasts" ON public.broadcasts;
CREATE POLICY "Allow anon full access on broadcasts" 
ON public.broadcasts FOR ALL 
USING (true) 
WITH CHECK (true);

-- Notification de fin
COMMENT ON TABLE public.shops IS 'Table de synchronisation multi-boutiques pour FasoCarnet Mobile';
