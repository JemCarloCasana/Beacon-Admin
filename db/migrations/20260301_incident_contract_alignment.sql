BEGIN;

-- Add missing incident lifecycle and assignment fields.
ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS priority varchar(20),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_department varchar(64),
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Backfill and enforce defaults for existing rows.
UPDATE public.incident_reports
SET priority = COALESCE(priority, 'medium'),
    updated_at = COALESCE(updated_at, created_at);

ALTER TABLE public.incident_reports
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN priority SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- Keep a single status constraint aligned with web-admin contract.
ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_status_check;

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_status_check
  CHECK (status IN ('pending', 'dispatched', 'in_progress', 'resolved'));

-- Enforce incident priority domain.
ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_priority_check;

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_priority_check
  CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- Enforce assignment department domain.
ALTER TABLE public.incident_reports
  DROP CONSTRAINT IF EXISTS incident_reports_assigned_department_check;

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_assigned_department_check
  CHECK (
    assigned_department IS NULL
    OR assigned_department IN (
      'Emergency Medical Unit',
      'Fire Station Unit',
      'Police Personnel',
      'Traffic Enforcement Unit'
    )
  );

-- Keep updated_at current on writes using the existing helper trigger function.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_updated_at'
      AND n.nspname = 'public'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'trg_incident_reports_updated_at'
      AND t.tgrelid = 'public.incident_reports'::regclass
  ) THEN
    CREATE TRIGGER trg_incident_reports_updated_at
    BEFORE UPDATE ON public.incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Performance indexes for incidents views and filters.
CREATE INDEX IF NOT EXISTS idx_incident_reports_status_created
  ON public.incident_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_reports_priority_created
  ON public.incident_reports (priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_reports_assigned_status
  ON public.incident_reports (assigned_department, status);

-- Add missing incident permissions used by frontend/backend RBAC.
-- Fix sequence drift first to avoid duplicate permissions_pkey on insert.
SELECT setval(
  'public.permissions_id_seq',
  COALESCE((SELECT MAX(id) FROM public.permissions), 0),
  true
);

INSERT INTO public.permissions (name, description)
SELECT 'view_incidents', 'Can view incidents'
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions WHERE name = 'view_incidents'
);

INSERT INTO public.permissions (name, description)
SELECT 'manage_incidents', 'Can manage incidents'
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions WHERE name = 'manage_incidents'
);

-- Grant incident permissions to admin role.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('view_incidents', 'manage_incidents')
WHERE lower(r.name) = 'admin'
ON CONFLICT DO NOTHING;

COMMIT;
