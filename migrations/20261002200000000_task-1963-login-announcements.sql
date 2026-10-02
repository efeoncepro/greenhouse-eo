-- Up Migration

-- TASK-1963 — Novedades del login (carrusel del login V4 aprobado el 2026-10-02).
-- Fuente de verdad de las novedades que el login muestra sobre la foto con la Lente de «La órbita»: texto o banner,
-- por línea de servicio, con vigencia, prioridad y estado. La lectura es pública (sólo campos de presentación, sólo
-- lo publicado y vigente); escribir exige la capability login_announcements.manage. Puramente aditiva (expand).

CREATE TABLE greenhouse_core.login_announcements (
  announcement_id TEXT PRIMARY KEY DEFAULT ('lgan-' || gen_random_uuid()::text),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'banner')),
  service_line TEXT NOT NULL CHECK (service_line IN ('growth', 'brand', 'engine', 'voice', 'revenue-hubspot', 'revenue-salesforce', 'greenhouse')),
  tab_label TEXT NOT NULL CHECK (length(btrim(tab_label)) BETWEEN 1 AND 24),
  kicker TEXT CHECK (kicker IS NULL OR length(kicker) <= 60),
  title TEXT CHECK (title IS NULL OR length(title) <= 80),
  body TEXT CHECK (body IS NULL OR length(body) <= 180),
  cta_label TEXT CHECK (cta_label IS NULL OR length(cta_label) <= 40),
  cta_url TEXT CHECK (cta_url IS NULL OR cta_url ~ '^(/[^/]|https://)'),
  image_path TEXT CHECK (image_path IS NULL OR image_path ~ '^(/[^/]|https://)'),
  image_alt TEXT CHECK (image_alt IS NULL OR length(btrim(image_alt)) BETWEEN 1 AND 200),
  lens_x NUMERIC(5, 2) CHECK (lens_x IS NULL OR lens_x BETWEEN 0 AND 100),
  lens_y NUMERIC(5, 2) CHECK (lens_y IS NULL OR lens_y BETWEEN 0 AND 100),
  lens_radius_ratio NUMERIC(4, 3) CHECK (lens_radius_ratio IS NULL OR (lens_radius_ratio > 0 AND lens_radius_ratio <= 1)),
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT login_announcements_text_needs_title CHECK (kind <> 'text' OR title IS NOT NULL),
  CONSTRAINT login_announcements_banner_needs_image CHECK (kind <> 'banner' OR (image_path IS NOT NULL AND image_alt IS NOT NULL)),
  CONSTRAINT login_announcements_image_needs_alt CHECK (image_path IS NULL OR image_alt IS NOT NULL),
  CONSTRAINT login_announcements_cta_pair CHECK ((cta_label IS NULL) = (cta_url IS NULL)),
  CONSTRAINT login_announcements_lens_together CHECK (
    (lens_x IS NULL AND lens_y IS NULL AND lens_radius_ratio IS NULL)
    OR (lens_x IS NOT NULL AND lens_y IS NOT NULL AND lens_radius_ratio IS NOT NULL)
  ),
  CONSTRAINT login_announcements_window CHECK (ends_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE greenhouse_core.login_announcements IS
  'TASK-1963 — Novedades del login de Greenhouse (texto o banner por línea de servicio). Lectura pública de lo publicado y vigente; escritura con login_announcements.manage.';

CREATE INDEX login_announcements_active
  ON greenhouse_core.login_announcements (priority DESC, starts_at DESC)
  WHERE status = 'published';

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.login_announcements TO greenhouse_runtime;

-- Seed: las dos novedades reales del prototipo aprobado (fotos de referencia del set curado de La órbita; se
-- reemplazan por fotos producidas antes de producción). La tercera del prototipo era un marcador sin contenido.
INSERT INTO greenhouse_core.login_announcements
  (announcement_id, kind, service_line, tab_label, kicker, title, body, cta_label, cta_url, image_path, image_alt,
   lens_x, lens_y, lens_radius_ratio, priority, status, created_by, updated_by)
VALUES
  ('lgan-seed-ai-visibility-report', 'text', 'engine', 'Engine', 'Nuevo · AI Visibility Report', 'Que la IA te encuentre',
   'Mira cómo te describen ChatGPT, Gemini y los buscadores con IA cuando alguien pregunta por tu categoría.',
   'Pedir mi reporte', 'https://efeoncepro.com', '/images/login/announcement-engine.webp',
   'Dos personas revisan resultados en una pantalla de noche', 46.00, 30.00, 0.240, 20, 'published',
   'migration:task-1963', 'migration:task-1963'),
  ('lgan-seed-globe-studio', 'text', 'brand', 'Brand', 'Nuevo · Globe Studio', 'Tu contenido, en locación',
   'Producción con tu squad donde pasa tu marca: foto, video y piezas listas para publicar.',
   'Conocer Globe Studio', 'https://efeoncepro.com', '/images/login/announcement-brand.webp',
   'Equipo de producción grabando a un chef en un mercado', 60.00, 34.00, 0.270, 10, 'published',
   'migration:task-1963', 'migration:task-1963')
ON CONFLICT (announcement_id) DO NOTHING;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('login_announcements.manage', 'login_announcements', ARRAY['create', 'update'], ARRAY['tenant'],
   'Crear, editar, publicar y archivar las novedades del login de Greenhouse. La lectura de lo publicado es pública', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si la tabla, el seed o la capability no quedaron.
DO $$
DECLARE seeded integer; registered integer;
BEGIN
  SELECT COUNT(*) INTO seeded FROM greenhouse_core.login_announcements WHERE announcement_id LIKE 'lgan-seed-%';
  SELECT COUNT(*) INTO registered FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'login_announcements.manage' AND deprecated_at IS NULL;

  IF seeded <> 2 OR registered <> 1 THEN
    RAISE EXCEPTION 'TASK-1963 anti pre-up-marker check: seed=% (esperado 2), capability=% (esperado 1)', seeded, registered;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'login_announcements.manage';

DROP TABLE IF EXISTS greenhouse_core.login_announcements;
