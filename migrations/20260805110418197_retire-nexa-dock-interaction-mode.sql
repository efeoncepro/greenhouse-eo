-- Up Migration

-- Retiro del modo de interacción `dock` ("Compacto") de Nexa (2026-08-05).
--
-- `dock` era el panel flotante efímero anterior a TASK-1078 (runtime local, sin
-- historial persistido). Cuando el panel ampliable pasó a ser el comportamiento base,
-- el modo viejo sobrevivió como opción del selector sin ser una modalidad vigente. Se
-- retira: los modos canónicos quedan en `expandible` (piso incondicional) y `lane`.
--
-- Orden importante: primero se normalizan las filas, después se cierra el CHECK — al
-- revés, el ALTER fallaría por filas que violan la constraint nueva.

-- 1. Normalizar preferencias persistidas: `dock` → NULL (default del sistema =
--    `expandible`). Se deja NULL en vez de escribir 'expandible' para no fabricar una
--    elección explícita que el usuario nunca hizo.
UPDATE greenhouse_core.client_users
   SET nexa_interaction_mode = NULL
 WHERE nexa_interaction_mode = 'dock';

-- 2. Cerrar el CHECK al vocabulario vigente.
ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_nexa_interaction_mode_check;

ALTER TABLE greenhouse_core.client_users
  ADD CONSTRAINT client_users_nexa_interaction_mode_check
  CHECK (nexa_interaction_mode IS NULL OR nexa_interaction_mode IN ('expandible','lane'));

-- 3. Anti pre-up-marker bug guard: aborta si el CHECK nuevo no quedó aplicado o si
--    sobrevivió alguna fila en el modo retirado.
DO $$
DECLARE
  constraint_ok boolean;
  leftover_dock integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'client_users_nexa_interaction_mode_check'
       AND pg_get_constraintdef(oid) LIKE '%expandible%'
       AND pg_get_constraintdef(oid) NOT LIKE '%dock%'
  ) INTO constraint_ok;

  IF NOT constraint_ok THEN
    RAISE EXCEPTION 'Retiro de dock: el CHECK client_users_nexa_interaction_mode_check NO quedo restringido a (expandible, lane). Migration markers may be inverted.';
  END IF;

  SELECT COUNT(*)
    INTO leftover_dock
    FROM greenhouse_core.client_users
   WHERE nexa_interaction_mode = 'dock';

  IF leftover_dock > 0 THEN
    RAISE EXCEPTION 'Retiro de dock: quedaron % filas con nexa_interaction_mode = dock.', leftover_dock;
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_core.client_users.nexa_interaction_mode IS 'TASK-1079 — Nexa interaction mode preference: expandible (panel ampliable con historial) o lane (sidecar full-height). NULL = system default (expandible). El modo dock (panel efimero pre-TASK-1078) se retiro el 2026-08-05. Ambas modalidades comparten runtime/persistencia/historial (greenhouse_ai.nexa_threads/nexa_messages).';

-- Down Migration

ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_nexa_interaction_mode_check;

ALTER TABLE greenhouse_core.client_users
  ADD CONSTRAINT client_users_nexa_interaction_mode_check
  CHECK (nexa_interaction_mode IS NULL OR nexa_interaction_mode IN ('dock','expandible','lane'));
