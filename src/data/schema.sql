-- ========================================================
-- SCHEMA SQL PARA SUPABASE - GESTÃO FINANCEIRA FAMILIAR
-- Executar no SQL Editor do seu projeto Supabase
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONFIGURAÇÕES E PERFIS
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    p1_name TEXT NOT NULL DEFAULT 'Hugo Alves',
    p2_name TEXT NOT NULL DEFAULT 'Mariana Dique',
    reserve_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir registro padrão se não existir
INSERT INTO app_settings (id, p1_name, p2_name, reserve_percentage)
VALUES ('default_settings', 'Hugo Alves', 'Mariana Dique', 20.00)
ON CONFLICT (id) DO NOTHING;

-- 2. TABELA DE FONTES DE RENDA (RENDA FIXA E EXTRAS)
CREATE TABLE IF NOT EXISTS income_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year TEXT NOT NULL, -- Formato: YYYY-MM
    user_id TEXT NOT NULL, -- 'p1' ou 'p2'
    user_name TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL CHECK (type IN ('fixed', 'extra')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE DESPESAS (COMUNITÁRIAS E INDIVIDUAIS)
CREATE TABLE IF NOT EXISTS monthly_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year TEXT NOT NULL, -- Formato: YYYY-MM
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    division_type TEXT NOT NULL CHECK (division_type IN ('shared', 'individual')),
    individual_user_id TEXT, -- 'p1' ou 'p2' se for individual
    individual_user_name TEXT,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'estimated')),
    estimated_amount NUMERIC(12,2) DEFAULT 0.00,
    actual_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    due_date DATE NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
    paid_by TEXT DEFAULT 'none', -- 'p1', 'p2', ou 'none'
    assigned_to TEXT DEFAULT 'none', -- 'p1', 'p2', ou 'none'
    barcode TEXT,
    pix_code TEXT,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE HISTÓRICO DE APORTES DA RESERVA DO CASAL
CREATE TABLE IF NOT EXISTS reserve_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year TEXT NOT NULL,
    income_source_id UUID REFERENCES income_sources(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    extra_income_description TEXT NOT NULL,
    extra_income_amount NUMERIC(12,2) NOT NULL,
    percentage_applied NUMERIC(5,2) NOT NULL,
    reserve_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE FECHAMENTOS MENSAIS
CREATE TABLE IF NOT EXISTS monthly_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_year TEXT UNIQUE NOT NULL,
    p1_name TEXT NOT NULL,
    p2_name TEXT NOT NULL,
    p1_net_income NUMERIC(12,2) NOT NULL,
    p2_net_income NUMERIC(12,2) NOT NULL,
    p1_proportion NUMERIC(5,2) NOT NULL,
    p2_proportion NUMERIC(5,2) NOT NULL,
    total_community_expenses NUMERIC(12,2) NOT NULL,
    p1_quota NUMERIC(12,2) NOT NULL,
    p2_quota NUMERIC(12,2) NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- INDEXES PARA BUSCAS RÁPIDAS POR MÊS/ANO
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_income_month ON income_sources(month_year);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON monthly_expenses(month_year);
CREATE INDEX IF NOT EXISTS idx_reserve_month ON reserve_investments(month_year);

-- ========================================================
-- ATIVAR SUPABASE REALTIME NAS TABELAS
-- ========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE income_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE reserve_investments;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_closings;

-- Desativar Row Level Security para facilidade de acesso familiar direto
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE reserve_investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closings DISABLE ROW LEVEL SECURITY;
