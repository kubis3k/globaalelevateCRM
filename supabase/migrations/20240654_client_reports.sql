-- Reporty pro klienty (marketing / weby / akce). Klient si report stáhne v
-- portálu jako PDF (generovaný z obsahu) + volitelné přílohy. Tenant+client
-- scoped, izolace v aplikačním kódu (jako zbytek). Simple query protocol →
-- žádné CREATE INDEX CONCURRENTLY.

CREATE TABLE IF NOT EXISTS client_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title text NOT NULL,
  period_label text,
  summary text,
  status text NOT NULL DEFAULT 'draft',   -- draft | sent
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_client_reports_tenant_client ON client_reports (tenant_id, client_id);

-- Klíčové metriky (dlaždice nahoře v reportu) — např. Návštěvnost, Konverze, Dosah.
CREATE TABLE IF NOT EXISTS client_report_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES client_reports(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  value text NOT NULL,
  note text
);
CREATE INDEX IF NOT EXISTS idx_client_report_metrics_report ON client_report_metrics (report_id);

-- Textové sekce (nadpis + tělo) — komentář, co se dělo, další kroky.
CREATE TABLE IF NOT EXISTS client_report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES client_reports(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  heading text,
  body text
);
CREATE INDEX IF NOT EXISTS idx_client_report_sections_report ON client_report_sections (report_id);

-- Přílohy (nahrané soubory ve Vercel Blob — PDF, screenshoty).
CREATE TABLE IF NOT EXISTS client_report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES client_reports(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_report_attachments_report ON client_report_attachments (report_id);
