-- ============================================================
-- GUARDIUM — Schema Propuestas Economicas (F4)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES users(id),
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('borrador','enviada','en_negociacion','aceptada','rechazada','sin_respuesta')) DEFAULT 'borrador',
  valid_until DATE,
  notes TEXT,
  total_amount NUMERIC(14,2),
  cost_data JSONB,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  frequency TEXT,
  monthly_cost NUMERIC(12,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposal_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'GUARDIUM',
  company_tagline TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_nit TEXT,
  logo_url TEXT,
  pdf_footer_text TEXT,
  pdf_primary_color TEXT DEFAULT '#1B3A6B',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_proposals" ON proposals FOR ALL
  USING (get_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "superadmin_all_proposal_items" ON proposal_items FOR ALL
  USING (get_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "superadmin_all_proposal_settings" ON proposal_settings FOR ALL
  USING (get_user_role() IN ('superadmin', 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "public_read_company_assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "auth_upload_company_assets" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
