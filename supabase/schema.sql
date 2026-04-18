-- ============================================================
-- GUARDIUM — Schema Supabase (14 tablas + RLS + Storage)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'guardia')),
  contract_id UUID,
  phone TEXT,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  address TEXT,
  start_date DATE,
  end_date DATE,
  monthly_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'suspendido', 'terminado')),
  admin_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK de users.contract_id -> contracts
ALTER TABLE users ADD CONSTRAINT fk_users_contract FOREIGN KEY (contract_id) REFERENCES contracts(id);

-- 3. guards
CREATE TABLE guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  ci TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  contract_id UUID REFERENCES contracts(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID REFERENCES guards(id),
  contract_id UUID REFERENCES contracts(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'programado' CHECK (status IN ('programado', 'activo', 'completado', 'ausente')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. shift_checkins
CREATE TABLE shift_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id),
  type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. incident_reports
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  guard_id UUID REFERENCES guards(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'bajo' CHECK (severity IN ('bajo', 'medio', 'alto', 'critico')),
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_revision', 'cerrado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. novelty_log
CREATE TABLE novelty_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id),
  guard_id UUID REFERENCES guards(id),
  contract_id UUID REFERENCES contracts(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  full_name TEXT NOT NULL,
  ci TEXT,
  reason TEXT,
  host_name TEXT,
  photo_url TEXT,
  entry_time TIMESTAMPTZ DEFAULT now(),
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. contractors
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  company TEXT,
  full_name TEXT NOT NULL,
  ci TEXT,
  permit_type TEXT,
  permit_valid_until DATE,
  photo_url TEXT,
  entry_time TIMESTAMPTZ DEFAULT now(),
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  plate TEXT NOT NULL,
  type TEXT,
  brand TEXT,
  owner_name TEXT,
  entry_time TIMESTAMPTZ DEFAULT now(),
  exit_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. packages
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  recipient_name TEXT NOT NULL,
  sender TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'recibido' CHECK (status IN ('recibido', 'entregado', 'devuelto')),
  photo_url TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  amount NUMERIC(12,2) NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'vencido')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. audit_log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Funcion helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Funcion helper: obtener contract_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_contract_id()
RETURNS UUID AS $$
  SELECT contract_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Funcion helper: obtener guard_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_guard_id()
RETURNS UUID AS $$
  SELECT g.id FROM guards g JOIN users u ON g.user_id = u.id WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE novelty_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- === USERS ===
CREATE POLICY "superadmin_all_users" ON users FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_contract_users" ON users FOR SELECT
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_read_self" ON users FOR SELECT
  USING (id = auth.uid());

-- === CONTRACTS ===
CREATE POLICY "superadmin_all_contracts" ON contracts FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_own_contract" ON contracts FOR SELECT
  USING (get_user_role() = 'admin' AND id = get_user_contract_id());

CREATE POLICY "guardia_read_own_contract" ON contracts FOR SELECT
  USING (get_user_role() = 'guardia' AND id = get_user_contract_id());

-- === GUARDS ===
CREATE POLICY "superadmin_all_guards" ON guards FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_guards" ON guards FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_read_self_guard" ON guards FOR SELECT
  USING (user_id = auth.uid());

-- === SHIFTS ===
CREATE POLICY "superadmin_all_shifts" ON shifts FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_shifts" ON shifts FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_read_own_shifts" ON shifts FOR SELECT
  USING (guard_id = get_user_guard_id());

-- === SHIFT_CHECKINS ===
CREATE POLICY "superadmin_all_checkins" ON shift_checkins FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_contract_checkins" ON shift_checkins FOR SELECT
  USING (get_user_role() = 'admin' AND shift_id IN (
    SELECT id FROM shifts WHERE contract_id = get_user_contract_id()
  ));

CREATE POLICY "guardia_manage_own_checkins" ON shift_checkins FOR ALL
  USING (shift_id IN (
    SELECT id FROM shifts WHERE guard_id = get_user_guard_id()
  ));

-- === INCIDENT_REPORTS ===
CREATE POLICY "superadmin_all_incidents" ON incident_reports FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_incidents" ON incident_reports FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_own_incidents" ON incident_reports FOR ALL
  USING (get_user_role() = 'guardia' AND contract_id = get_user_contract_id());

-- === NOVELTY_LOG ===
CREATE POLICY "superadmin_all_novelty" ON novelty_log FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_contract_novelty" ON novelty_log FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_own_novelty" ON novelty_log FOR ALL
  USING (get_user_role() = 'guardia' AND guard_id = get_user_guard_id());

-- === VISITORS ===
CREATE POLICY "superadmin_all_visitors" ON visitors FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_visitors" ON visitors FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_contract_visitors" ON visitors FOR ALL
  USING (get_user_role() = 'guardia' AND contract_id = get_user_contract_id());

-- === CONTRACTORS ===
CREATE POLICY "superadmin_all_contractors" ON contractors FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_contractors" ON contractors FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_contract_contractors" ON contractors FOR ALL
  USING (get_user_role() = 'guardia' AND contract_id = get_user_contract_id());

-- === VEHICLES ===
CREATE POLICY "superadmin_all_vehicles" ON vehicles FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_vehicles" ON vehicles FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_contract_vehicles" ON vehicles FOR ALL
  USING (get_user_role() = 'guardia' AND contract_id = get_user_contract_id());

-- === PACKAGES ===
CREATE POLICY "superadmin_all_packages" ON packages FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_manage_contract_packages" ON packages FOR ALL
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

CREATE POLICY "guardia_manage_contract_packages" ON packages FOR ALL
  USING (get_user_role() = 'guardia' AND contract_id = get_user_contract_id());

-- === INVOICES ===
CREATE POLICY "superadmin_all_invoices" ON invoices FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_contract_invoices" ON invoices FOR SELECT
  USING (get_user_role() = 'admin' AND contract_id = get_user_contract_id());

-- === NOTIFICATIONS ===
CREATE POLICY "superadmin_all_notifications" ON notifications FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "user_own_notifications" ON notifications FOR ALL
  USING (user_id = auth.uid());

-- === AUDIT_LOG ===
CREATE POLICY "superadmin_all_audit" ON audit_log FOR ALL
  USING (get_user_role() = 'superadmin');

CREATE POLICY "admin_read_contract_audit" ON audit_log FOR SELECT
  USING (get_user_role() = 'admin' AND user_id IN (
    SELECT id FROM users WHERE contract_id = get_user_contract_id()
  ));

-- ============================================================
-- Storage Buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('guard-photos', 'guard-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', true);

-- Storage policies: cualquier usuario autenticado puede subir, publico puede leer
CREATE POLICY "public_read_guard_photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'guard-photos');

CREATE POLICY "auth_upload_guard_photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guard-photos' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_checkin_photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'checkin-photos');

CREATE POLICY "auth_upload_checkin_photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'checkin-photos' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_incident_photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'incident-photos');

CREATE POLICY "auth_upload_incident_photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'incident-photos' AND auth.role() = 'authenticated');
