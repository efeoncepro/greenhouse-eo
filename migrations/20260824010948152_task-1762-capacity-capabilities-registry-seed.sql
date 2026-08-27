-- Up Migration

-- TASK-1762 — seed de las dos capabilities del cierre por capacidad en el registry de la base.
--
-- El catalogo TS y `capabilities_registry` tienen que estar sincronizados: `parity.live.test.ts`
-- (TASK-611) lo verifica y falla si una capability existe en TS y no en la base. Sin esta fila,
-- persistir un grant de estas capabilities seria imposible por el guardrail del dominio.
--
-- Las dos van SEPARADAS a proposito: leer el resumen de un cierre es inocuo; confirmarlo cambia el
-- desenlace de decenas de personas y —con su flag prendido— les escribe. Una sola capability
-- dejaria que cualquiera que puede mirar, pueda ejecutar.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.opening.capacity.read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-1762 — Ver la politica de capacidad de una vacante y el preview de la cohorte que cerraria. Lectura sin efectos.', NOW(), NULL),
  ('hiring.opening.capacity.confirm', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1762 — Confirmar el cierre de una vacante por capacidad: registra el desenlace not_selected + capacity_filled en cada candidatura de la cohorte. Irreversible. Role-only, exige actor humano. Gobierna ademas el unico camino autorizado para cambiar requested_seats con politica vigente.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

-- Anti pre-up-marker bug guard: si el seed no quedo aplicado, el drift TS⇆DB seguiria vivo y el
-- unico sintoma seria un test live rojo mucho despues, lejos de esta migracion.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT count(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('hiring.opening.capacity.read', 'hiring.opening.capacity.confirm')
    AND deprecated_at IS NULL;

  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1762 anti pre-up-marker check: se esperaban 2 capabilities de capacidad activas y hay %.', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Se DEPRECAN, no se borran: el registry es el catalogo canonico y borrar una fila dejaria
-- huerfano cualquier grant que la citara. `deprecated_at` es el retiro gobernado del dominio.
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key IN ('hiring.opening.capacity.read', 'hiring.opening.capacity.confirm');
