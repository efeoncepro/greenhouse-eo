-- TASK-1746 — CONTRACT (fase 2 de 2) del versionado de credencial de acceso a candidate tests.
--
-- ⚠️ POR QUÉ ESTE ARCHIVO NO VIVE EN `migrations/`: `node-pg-migrate` aplica TODAS las migraciones
-- pendientes en una sola invocación y en una sola transacción (`scripts/migrate.ts`, sin
-- `--no-single-transaction`). Si este DDL estuviera en `migrations/`, el próximo
-- `pnpm pg:connect:migrate` lo aplicaría junto con la fase EXPAND — que es exactamente el fallo
-- que el split existe para evitar. Un comentario de advertencia no habría impedido nada: el
-- runner no lee comentarios. Se aplica a mano, en el cutover, con el mismo patrón que el índice
-- CONCURRENTLY de TASK-1745.
--
-- Uso:  pnpm pg:connect:shell < scripts/operations/task-1746-assessment-access-credential-contract.sql
--
-- Por qué está separada de `20260819072130586_task-1746-assessment-access-recovery.sql`:
-- esa migración (EXPAND) agrega `access_token_version_id` con DEFAULT, lo que la hace compatible
-- con el writer que corre hoy en producción. El CHECK y el trigger de abajo NO lo son: el
-- `insertCandidateTest` vigente escribe `access_token_hash` sin la versión, y el reissue del email
-- rota el hash sin rotar la versión. Aplicarlos antes de desplegar el código nuevo tumbaría toda
-- asignación de test de candidato con 23514, en los DOS runtimes que la ejecutan (Vercel y el
-- ops-worker, este último con `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` activo).
--
-- ⚠️ PRECONDICIÓN DE APLICACIÓN — no la apliques sin verificar antes:
--   1. El código nuevo está en `main` (producción sirve `main`, no `develop`).
--   2. El deployment de Vercel productivo corre ese SHA.
--   3. La revisión ACTIVA del ops-worker corre ese SHA (`pnpm release:workers --expected-sha=<sha>`).
-- Sólo entonces todo writer escribe la versión y el invariante puede exigirse.
--
-- Hay UNA sola instancia Cloud SQL compartida por producción, staging y local: aplicar esto desde
-- cualquier entorno es un cambio productivo inmediato.

SET lock_timeout = '3s';

-- NOT VALID evita el scan completo bajo ACCESS EXCLUSIVE; la validación posterior toma un lock
-- mucho más débil (SHARE UPDATE EXCLUSIVE) y no bloquea lecturas ni escrituras concurrentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_assessment_access_credential_version_check'
      AND conrelid = 'greenhouse_hiring.hiring_assessment'::regclass
  ) THEN
    ALTER TABLE greenhouse_hiring.hiring_assessment
      ADD CONSTRAINT hiring_assessment_access_credential_version_check
      CHECK (access_token_hash IS NULL OR access_token_version_id IS NOT NULL) NOT VALID;
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_assessment
  VALIDATE CONSTRAINT hiring_assessment_access_credential_version_check;

-- La función ya existe desde la migración EXPAND; sin trigger asociado nunca se ejecutaba.
CREATE TRIGGER trg_hiring_assessment_access_credential_guard
  BEFORE INSERT OR UPDATE OF access_token_hash, access_token_version_id
  ON greenhouse_hiring.hiring_assessment
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.guard_hiring_assessment_access_credential();

-- Guard anti pre-up-marker, simétrico con lo que el Down deshace: constraint + trigger.
-- Verifica además que el constraint quedó VALIDADO (`convalidated`), porque un NOT VALID sin
-- VALIDATE no protege las filas preexistentes y el fallo sería silencioso.
DO $$
DECLARE constraint_count integer; validated_count integer; trigger_count integer; function_count integer;
BEGIN
  SELECT COUNT(*) INTO constraint_count FROM pg_constraint
  WHERE conname = 'hiring_assessment_access_credential_version_check'
    AND conrelid = 'greenhouse_hiring.hiring_assessment'::regclass;

  SELECT COUNT(*) INTO validated_count FROM pg_constraint
  WHERE conname = 'hiring_assessment_access_credential_version_check'
    AND conrelid = 'greenhouse_hiring.hiring_assessment'::regclass
    AND convalidated;

  SELECT COUNT(*) INTO trigger_count FROM pg_trigger
  WHERE tgname = 'trg_hiring_assessment_access_credential_guard'
    AND tgrelid = 'greenhouse_hiring.hiring_assessment'::regclass
    AND NOT tgisinternal;

  SELECT COUNT(*) INTO function_count FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'greenhouse_hiring'
    AND p.proname = 'guard_hiring_assessment_access_credential';

  IF constraint_count <> 1 OR validated_count <> 1 OR trigger_count <> 1 OR function_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1746 contract check failed: constraint=%, validated=%, trigger=%, function=%',
      constraint_count, validated_count, trigger_count, function_count;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (devuelve la base al estado EXPAND; columna y DEFAULT se conservan)
--
--   DROP TRIGGER IF EXISTS trg_hiring_assessment_access_credential_guard
--     ON greenhouse_hiring.hiring_assessment;
--   ALTER TABLE greenhouse_hiring.hiring_assessment
--     DROP CONSTRAINT IF EXISTS hiring_assessment_access_credential_version_check;
-- ─────────────────────────────────────────────────────────────────────────────
