-- Up Migration

-- TASK-1677 — Fase CONTRACT del cutover `seo_v1 → seo_v2`. Cierra la ventana que
-- ISSUE-143 dejó abierta a propósito.
--
-- ## Por qué esta migración puede correr ahora
--
-- El código que lee sólo `seo_v2` (`SEO_MODULE_KEYS_READ = ['seo_v2']`) está desplegado
-- en producción desde el release `49f86c98cda6` (2026-08-09), y su canary quedó verde:
-- la superficie `/growth/seo` de Grupo Berel abre con datos medidos y sin estado de
-- "sin entitlement". Ése es el orden que el dominio exige — código primero, datos
-- después — y el motivo por el que esta migración NO viajó en el mismo release que su
-- código: el check `postgres_migrations` del preflight es estricto, y una migración
-- pendiente habría bloqueado ese release.
--
-- ## Por qué escribe fuera del command canónico
--
-- Los commands de `src/lib/client-portal/commands/` gobiernan decisiones COMERCIALES
-- sobre una organización: habilitar, pausar, expirar un módulo. Esto no es eso. Es el
-- cierre de una ventana de migración técnica que el propio sistema abrió, y no existe
-- una operación de dominio para "supersedé la clave vieja de todas las organizaciones".
--
-- ## NUNCA un DELETE
--
-- El contract es `effective_to`, que preserva la historia. `seo_v1` sigue existiendo
-- como fila en `modules` (append-only); lo que se retira son sus assignments vigentes.

UPDATE greenhouse_client_portal.module_assignments
   SET effective_to = CURRENT_DATE,
       updated_at = now()
 WHERE module_key = 'seo_v1'
   AND effective_to IS NULL;

DO $$
DECLARE
  v1_vigentes int;
  sin_cobertura int;
BEGIN
  SELECT count(*) INTO v1_vigentes
    FROM greenhouse_client_portal.module_assignments
   WHERE module_key = 'seo_v1' AND effective_to IS NULL;

  IF v1_vigentes > 0 THEN
    RAISE EXCEPTION 'TASK-1677: quedan % assignments seo_v1 vigentes tras el contract', v1_vigentes;
  END IF;

  -- La verificación que importa: nadie perdió el módulo. Toda organización que tenía SEO
  -- por la clave vieja tiene que conservarlo por la nueva. Si alguna quedara sin cobertura,
  -- esta excepción aborta la transacción entera y el contract no se aplica.
  SELECT count(DISTINCT a1.organization_id) INTO sin_cobertura
    FROM greenhouse_client_portal.module_assignments a1
   WHERE a1.module_key = 'seo_v1'
     AND a1.effective_to = CURRENT_DATE
     AND NOT EXISTS (
       SELECT 1 FROM greenhouse_client_portal.module_assignments a2
        WHERE a2.organization_id = a1.organization_id
          AND a2.module_key = 'seo_v2'
          AND a2.effective_to IS NULL
          AND a2.status IN ('active', 'pilot'));

  IF sin_cobertura > 0 THEN
    RAISE EXCEPTION 'TASK-1677: % organizacion(es) quedarian sin SEO tras el contract', sin_cobertura;
  END IF;
END
$$;

-- Down Migration

-- Reabre la ventana. Se acota por `effective_to = CURRENT_DATE` —la firma de este
-- contract— para no resucitar assignments que se cerraron por otra razón.
UPDATE greenhouse_client_portal.module_assignments
   SET effective_to = NULL,
       updated_at = now()
 WHERE module_key = 'seo_v1'
   AND effective_to = CURRENT_DATE;
