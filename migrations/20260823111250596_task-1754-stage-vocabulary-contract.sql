-- Up Migration

-- ╔══════════════════════════════════════════════════════════════════════════════════════════╗
-- ║  TASK-1754 Slice F — EL CONTRACT.  ⚠️  NO APLICAR SIN AUTORIZACION EXPLICITA DEL OPERADOR ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════════╝
--
-- CONDICION DE EJECUCION: autorizacion explicita del operador para correr `pnpm pg:connect:migrate`.
-- Las dos condiciones tecnicas YA estan cumplidas y verificadas (release 304371f73 en produccion +
-- TASK-1765 verificada); lo unico que falta es el permiso humano. El comando quedo bloqueado por el
-- clasificador de permisos el 2026-08-23.
--
-- POR QUE VIVE ACA Y NO EN `migrations/`: estuvo committeada en `migrations/` durante un commit
-- (`ddb38d3a6`) y eso fue un error. Una migracion committeada y sin aplicar no espera su turno: el
-- proximo `migrate:up` de CUALQUIER sesion la aplica sin su readback y sin saberlo — un hotfix, otra
-- task, una reparacion de incidente. Es exactamente el caso que motivo esta carpeta (ver README).
--
-- COMO SE APLICA: `pnpm migrate:create task-1754-stage-vocabulary-contract` para obtener timestamp
-- nuevo, pegar este cuerpo BUSCANDO el marker `-- Up Migration` (nunca cortando lineas fijas: asi se
-- pierde el marker y `node-pg-migrate` registra la migracion sin ejecutar nada), readback antes y
-- despues, y borrar este `.pending` en el mismo commit.
--
-- READBACK ESPERADO:
--   antes:   pg_get_constraintdef del CHECK de `stage` = TRECE valores; 0 filas en las siete retiradas
--   despues: SEIS valores, y `src/lib/hiring/stage-enum-check-parity.live.test.ts` pasa a verde
--            (hoy falla A PROPOSITO: enum 6 != CHECK 13, y ese fallo ES el readback pendiente)
--
-- TASK-1754 Slice F — contract del vocabulario de ETAPAS: el CHECK pasa de trece valores a seis.
--
-- Se retiran siete literales, por dos razones distintas que conviene no mezclar:
--
--   qualified, client_review      → ABSORBIDOS por `shortlisted` (Slice B). El tablero mostraba seis
--                                   columnas sobre trece etapas y tres se veian como «Evaluacion»:
--                                   los movimientos humanos caian en `qualified`, que ninguna
--                                   automatizacion vigila, y las quince politicas configuradas en
--                                   `shortlisted` nunca disparaban.
--   selected, backup, rejected,   → ESPEJOS TERMINALES. Dejaron de ser etapas cuando TASK-1765 creo
--   withdrawn, handoff_ready        el eje de DESENLACE: hoy todo recorrido terminado escribe
--                                   `stage='closed'` y su desenlace vive en `decision`.
--
-- ORDEN, que es la parte que se paga cara si se invierte (ADR §16, ISSUE-161): este contract se
-- aplica DESPUES del release que retiro los escritores. Verificado sobre `origin/main` en el
-- release 304371f73, no sobre el working tree: los unicos tres escritores de la columna estan
-- acotados por tipo — `store.ts` INSERT y UPDATE pasan por `assertEnum(HIRING_PIPELINE_STAGES)` y
-- `decide.ts` escribe `DECISION_STAGE[decision]`, que mapea los seis desenlaces a 'closed'. La
-- union de lo escribible son exactamente los seis que quedan.
--
-- «Cero filas» NO habria sido evidencia suficiente: solo dice que nadie lo escribio todavia. Lo que
-- autoriza a angostar es el contrato de la superficie desplegada. Hay UNA sola instancia Cloud SQL
-- compartida por dev, staging y produccion, asi que angostar aca angosta en produccion.

-- 1. Guarda de datos: si alguna fila quedo en una etapa retirada, abortar antes de tocar el CHECK.
DO $$
DECLARE stranded integer;
BEGIN
  SELECT count(*) INTO stranded
  FROM greenhouse_hiring.hiring_application
  WHERE stage IN ('qualified', 'client_review', 'selected', 'backup', 'rejected', 'withdrawn', 'handoff_ready');

  IF stranded > 0 THEN
    RAISE EXCEPTION 'TASK-1754 Slice F: % fila(s) en una etapa retirada. El contract no puede aplicarse sin migrarlas primero.', stranded;
  END IF;
END
$$;

-- 2. DDL: reemplazar el CHECK.
ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_stage_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_stage_check
  CHECK (stage = ANY (ARRAY[
    'sourced'::text,
    'screening'::text,
    'shortlisted'::text,
    'interview'::text,
    'decision_pending'::text,
    'closed'::text
  ]));

-- 3. Anti pre-up-marker: si el bloque Up no se ejecuto, esto no corre y la migracion no puede
--    registrarse como aplicada sin haber hecho nada. Verifica el RESULTADO, no la intencion.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
    AND conname = 'hiring_application_stage_check';

  IF definition IS NULL THEN
    RAISE EXCEPTION 'TASK-1754 Slice F anti pre-up-marker check: hiring_application_stage_check NO existe tras el DDL. Los markers pueden estar invertidos.';
  END IF;

  -- Los siete, no una muestra: ninguno de los seis que quedan los contiene como substring, asi que
  -- enumerarlos completos no introduce falsos positivos y no deja al lector adivinando si la lista
  -- es deliberada o incompleta.
  IF definition LIKE '%''qualified''%'
     OR definition LIKE '%''client_review''%'
     OR definition LIKE '%''handoff_ready''%'
     OR definition LIKE '%''backup''%'
     OR definition LIKE '%''selected''%'
     OR definition LIKE '%''rejected''%'
     OR definition LIKE '%''withdrawn''%' THEN
    RAISE EXCEPTION 'TASK-1754 Slice F anti pre-up-marker check: el CHECK sigue admitiendo etapas retiradas: %', definition;
  END IF;
END
$$;

-- Down Migration

-- Restituye las trece etapas. Es reversible en el esquema, pero NO en el significado: las filas que
-- el colapso movio a `shortlisted` no vuelven solas a `qualified`, ni las cerradas a su espejo.
ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_stage_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_stage_check
  CHECK (stage = ANY (ARRAY[
    'sourced'::text,
    'screening'::text,
    'qualified'::text,
    'shortlisted'::text,
    'client_review'::text,
    'interview'::text,
    'decision_pending'::text,
    'selected'::text,
    'backup'::text,
    'rejected'::text,
    'withdrawn'::text,
    'handoff_ready'::text,
    'closed'::text
  ]));
