-- Up Migration

-- TASK-1301 Slice 2 — Seed del módulo `seo_v1` en el catálogo del client portal.
-- Descubierto en el smoke live: module_assignments.module_key tiene FK a
-- greenhouse_client_portal.modules — sin esta fila, ningún assignment SEO puede existir.
-- Espejo del seed AEO (TASK-1277): tier=addon (servicio per-org), pricing_kind=addon_usage
-- (metered: allowance + budget por tier via enforceSeoRunEntitlement). capabilities=[] a
-- propósito: la autorización usa la capability growth (`growth.seo.*`) + el módulo asignado,
-- NO hasCapabilityViaModule. view_codes=[] por ahora: la vista cliente nace en TASK-1310 y
-- agrega su view_code al módulo en su propio PR. data_sources declara el dominio productor
-- `growth.seo` (agregado al TS union ClientPortalDataSource en el mismo PR — parity DB ⊆ TS).
-- Nota Wave: SV360 tiene destino wave.efeoncepro/wave.efeonce.org (EPIC-037, arch doc SEO
-- §17); applicability_scope queda 'cross' espejo del AEO (motor hermano, mismo estadio).

INSERT INTO greenhouse_client_portal.modules
  (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind)
VALUES
  ('seo_v1',
   'SEO (Search Visibility 360)',
   'SEO',
   'cross',
   'addon',
   ARRAY[]::TEXT[],
   ARRAY[]::TEXT[],
   ARRAY['growth.seo'],
   'addon_usage')
ON CONFLICT (module_key) DO NOTHING;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el módulo no quedó seedeado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_client_portal.modules
  WHERE module_key = 'seo_v1';

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1301 anti pre-up-marker check: seo_v1 module NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Solo si ninguna org tiene assignment (FK RESTRICT protege si existen).
DELETE FROM greenhouse_client_portal.modules WHERE module_key = 'seo_v1';
