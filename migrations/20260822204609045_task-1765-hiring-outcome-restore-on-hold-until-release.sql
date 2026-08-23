-- Up Migration

-- ╔══════════════════════════════════════════════════════════════════════════════════════════╗
-- ║  TASK-1765 — FORWARD FIX: devolver `on_hold` al CHECK hasta que el release lo retire.     ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════════╝
--
-- QUÉ PASÓ. La migración `20260822203905818_task-1765-hiring-outcome-axis-contract` angostó el CHECK
-- de `decision` a seis valores y sacó `on_hold`. El readback previo era correcto —0 filas con
-- `decision='on_hold'` y 0 entradas de historial— pero la pregunta estaba mal formulada.
--
-- **«Cero filas» NO es «nadie lo escribe»: sólo dice que nadie lo escribió TODAVÍA.**
--
-- Lo que había que verificar es el CONTRATO DE LA SUPERFICIE: qué valores puede escribir el código
-- que corre en producción. Y el código de producción es `origin/main`, no el working tree:
--   · `src/types/hiring.ts` en main todavía tiene `on_hold` en `HIRING_DECISIONS`
--   · `Application360View.tsx` en main todavía pinta el botón «Dejar en espera»
--
-- Como la instancia de Cloud SQL es **UNA SOLA** compartida por dev, staging y producción, angostar
-- el CHECK «en dev» lo angostó en producción, contra un front-end que sigue ofreciendo el valor. Un
-- operador que pulsara «Dejar en espera» habría recibido un `23514`: la acción ofrecida y la base
-- rechazándola. Cero filas afectadas, cero datos perdidos, pero una acción rota.
--
-- Es el §3.6 de la auditoría del vocabulario, en carne propia:
--   «Derivar la alcanzabilidad del contrato de la superficie, nunca del contenido de la tabla.»
--
-- ESTA MIGRACIÓN es puramente PERMISIVA: agregar un valor admitido no puede chocar con ninguna fila
-- existente. Riesgo cero, no toca datos.
--
-- CUÁNDO SE VUELVE A ANGOSTAR: cuando `main` ya no ofrezca `on_hold`, o sea DESPUÉS del release que
-- suba los Slices 1-4 a producción — nunca antes. El contract del enum de desenlaces
-- (`...-contract.sql`) y el CHECK del invariante (`...-closed-invariant.sql`) pasan a ser el MISMO
-- lote post-release: los dos son irreversibles y los dos dependen de que el código ya esté arriba.

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected',
    'withdrawn', 'unresponsive', 'on_hold'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
       AND conname = 'hiring_application_decision_check'
       AND pg_get_constraintdef(oid) LIKE '%on_hold%'
  ) THEN
    RAISE EXCEPTION 'TASK-1765 forward fix: el CHECK de decision NO volvió a admitir on_hold. La acción «Dejar en espera» de producción seguiría rota.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
       AND conname = 'hiring_application_decision_check'
       AND pg_get_constraintdef(oid) LIKE '%not_selected%'
       AND pg_get_constraintdef(oid) LIKE '%unresponsive%'
  ) THEN
    RAISE EXCEPTION 'TASK-1765 forward fix: el CHECK perdió los desenlaces nuevos del expand.';
  END IF;
END
$$;

-- Down Migration

-- Revertir esto volvería a romper la acción de producción. Se deja explícito en vez de silencioso.
ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected', 'withdrawn', 'unresponsive'));
