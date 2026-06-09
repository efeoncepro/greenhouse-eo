-- Up Migration

-- TASK-1022 — Collaborator Viewer del Workforce Contracting Studio.
-- Seedea el viewCode canónico del self-service del colaborador (View Registry Governance
-- Pattern, espejo TASK-796 mi_ficha.mi_contratacion). Gatea los ítems de nav "Mis ofertas"
-- y "Mis contratos" (ambos bajo este viewCode) + el page guard. Grant a `collaborator`.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('mi_ficha.mis_contratos',
   'mi_ficha',
   'Mis contratos y ofertas',
   'Vista del colaborador de sus cartas oferta y contratos laborales bilingües: estado honesto, sin edición legal.',
   'my',
   '/my/contracts',
   'tabler-file-certificate',
   62,
   TRUE,
   'migration:TASK-1022')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1022';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('collaborator', 'mi_ficha.mis_contratos', true, 'migration:TASK-1022', NOW(), NOW(), 'migration:TASK-1022')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1022';

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'mi_ficha.mis_contratos';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1022 anti pre-up-marker: mi_ficha.mis_contratos NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'mi_ficha.mis_contratos' AND granted = TRUE;
  IF granted_count < 1 THEN
    RAISE EXCEPTION 'TASK-1022 anti pre-up-marker: expected >=1 role grant, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Append-only governance: revoca (granted=FALSE) preservando audit trail, NO borra filas.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1022:revert'
WHERE view_code = 'mi_ficha.mis_contratos';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1022:revert'
WHERE view_code = 'mi_ficha.mis_contratos';
