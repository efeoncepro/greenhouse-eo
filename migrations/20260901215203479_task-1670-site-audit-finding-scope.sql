-- Up Migration

-- TASK-1670 — Alcance del hallazgo del site audit: página vs sitio.
--
-- Hasta hoy toda fila de `seo_site_audit_findings` era un hallazgo DE PÁGINA derivado del
-- crawl OnPage, y la `url` NOT NULL alcanzaba para describirla. Los hallazgos que esta task
-- agrega —acceso de crawlers de IA, acceso en el borde, JSON-LD ausente, salud de sitemap—
-- son del DOMINIO: un `robots.txt` no pertenece a ninguna página. Sin este discriminador un
-- consumer los contaría como "1 página afectada", que es falso, y por eso el flip del flag
-- de materialización queda condicionado a `TASK-1671` (la superficie que sabe renderizarlos).
--
-- Se elige COLUMNA y no una convención dentro de `detail` (Open Question 2 de la task): el
-- alcance es una propiedad del hallazgo y es consultable; escondido en un JSON queda invisible
-- para cualquier consumer que no sepa que debe buscarlo ahí.
--
-- ADITIVA y de una sola dirección: `DEFAULT 'page'` hace que las 4.977 filas históricas
-- queden correctamente clasificadas sin backfill — todas son, de hecho, hallazgos de página.
-- Los runs históricos NO se reprocesan: un run es un snapshot inmutable de lo que se midió
-- ese día (invariante append-only de TASK-1299) y agregarle hallazgos a posteriori sería
-- reescribir historia.
--
-- El trigger `trg_seo_site_audit_findings_append_only` es `BEFORE UPDATE OR DELETE ... FOR
-- EACH ROW`: no se dispara con DDL, así que este ALTER no lo pelea ni necesita desactivarlo.

ALTER TABLE greenhouse_growth.seo_site_audit_findings
  ADD COLUMN IF NOT EXISTS finding_scope TEXT NOT NULL DEFAULT 'page';

-- CHECK aplicado directo (sin NOT VALID + VALIDATE): la columna nace con default constante,
-- así que no existe fila que pueda violarlo y la validación es un scan de 4.977 filas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'seo_site_audit_findings_scope_check'
       AND conrelid = 'greenhouse_growth.seo_site_audit_findings'::regclass
  ) THEN
    ALTER TABLE greenhouse_growth.seo_site_audit_findings
      ADD CONSTRAINT seo_site_audit_findings_scope_check
      CHECK (finding_scope IN ('page', 'site'));
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_growth.seo_site_audit_findings.finding_scope IS
  'TASK-1670 — alcance del hallazgo: page (derivado del crawl OnPage, una URL real) | site (propiedad del dominio: robots.txt, borde/WAF, sitemap, JSON-LD de la home). Un hallazgo site NUNCA se cuenta como pagina afectada.';

-- Índice parcial: los consumers de los hallazgos de sitio (TASK-1671, artefacto de auditoría)
-- los piden separados dentro de un run, y son pocas filas frente al total de página.
CREATE INDEX IF NOT EXISTS seo_site_audit_findings_run_site_scope_idx
  ON greenhouse_growth.seo_site_audit_findings (audit_run_id)
  WHERE finding_scope = 'site';

-- Guard anti pre-up-marker (CLAUDE.md §Migration markers): si esta sección quedara fuera de
-- la Up por markers invertidos, la migración se registraría como aplicada SIN ejecutar el DDL
-- y el collect insertaría contra una columna inexistente. Falla fuerte acá o no falla nunca.
DO $$
DECLARE column_exists boolean;
DECLARE constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'greenhouse_growth'
       AND table_name = 'seo_site_audit_findings'
       AND column_name = 'finding_scope'
  ) INTO column_exists;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'seo_site_audit_findings_scope_check'
       AND conrelid = 'greenhouse_growth.seo_site_audit_findings'::regclass
  ) INTO constraint_exists;

  IF NOT column_exists THEN
    RAISE EXCEPTION 'TASK-1670 anti pre-up-marker check: greenhouse_growth.seo_site_audit_findings.finding_scope NO fue creada. Los markers de la migracion pueden estar invertidos.';
  END IF;

  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'TASK-1670 anti pre-up-marker check: la constraint seo_site_audit_findings_scope_check NO fue creada.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.seo_site_audit_findings_run_site_scope_idx;

ALTER TABLE greenhouse_growth.seo_site_audit_findings
  DROP CONSTRAINT IF EXISTS seo_site_audit_findings_scope_check;

ALTER TABLE greenhouse_growth.seo_site_audit_findings
  DROP COLUMN IF EXISTS finding_scope;
