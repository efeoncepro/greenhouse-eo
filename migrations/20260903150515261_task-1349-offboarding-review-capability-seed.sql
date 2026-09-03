-- Up Migration

-- TASK-1349 — seed de la capability fina del command de revisión de un caso de offboarding.
--
-- `workforce.offboarding.review_case` (execute) gobierna la decisión contractual explícita sobre un caso
-- existente: `access_only` (baja de acceso; no toca relación, compensación ni member) o `relationship_ended`
-- (término real con causal respaldada y fechas explícitas; recomputa lane y requisitos e invalida la
-- aprobación previa). Separada de `hr.offboarding_case:update` a propósito: editar notas/fechas de un caso
-- no es lo mismo que reclasificar la naturaleza laboral de una salida, y la matriz de grants tiene que
-- poder distinguirlas. Catálogo TS: `src/config/entitlements-catalog.ts`; grants:
-- `src/lib/entitlements/runtime.ts`. `parity.live.test.ts` (TASK-611) exige la fila en la base.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('workforce.offboarding.review_case', 'workforce', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1349 — Revisar/corregir un caso de offboarding existente con decisión explícita (access_only | relationship_ended): causal respaldada, fechas explícitas, lane recomputada, aprobación previa invalidada. Audit + outbox en la misma transacción. Nunca cancela ni crea otro caso.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

-- Anti pre-up-marker bug guard: si el seed no quedó aplicado, el drift TS⇆DB sólo se vería en un test
-- live rojo mucho después, lejos de esta migración.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT count(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'workforce.offboarding.review_case'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1349 anti pre-up-marker check: se esperaba 1 capability review_case activa y hay %.', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Se DEPRECA, no se borra: el registry es el catálogo canónico y borrar una fila dejaría huérfano
-- cualquier grant que la citara.
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key = 'workforce.offboarding.review_case';
