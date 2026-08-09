-- Up Migration

-- TASK-1679 Slice 2 — La persona agente cliente necesita una organización resuelta.
--
-- `greenhouse_serving.session_360` deriva la organización de una sesión por un puente de
-- tres saltos:
--
--     client_users.client_id → spaces (client_id, active) → organizations (active)
--
-- `agent-client@greenhouse.efeonce.org` tiene `client_id = 'agent-client-sandbox'`, y ese
-- cliente NO tenía fila en `spaces`. Resultado: `organization_id` NULL, y la persona que
-- `CLAUDE.md` prescribe para validar el portal cliente no podía abrir ninguna página —
-- ni con el guard arreglado, porque no hay organización contra la que evaluar módulos.
--
-- Se le crea su space apuntando a la organización **Greenhouse Demo**, que tiene CERO
-- module_assignments vigentes. Ésa es exactamente la organización correcta para la persona
-- del caso "cliente sin módulos": con ella, las vistas module-gated muestran su empty state
-- legítimo en vez de un tercer camino de error.
--
-- El space queda `space_type='client_space'` como el resto de los spaces de cliente, y su
-- `public_id`/`numeric_code` se derivan del máximo vigente en vez de hardcodearse, para no
-- colisionar con lo que haya crecido entre que esto se escribió y se aplicó.
--
-- Idempotente: no hace nada si el space ya existe.

INSERT INTO greenhouse_core.spaces (
  space_id,
  public_id,
  organization_id,
  client_id,
  space_name,
  space_type,
  status,
  active,
  notes,
  numeric_code
)
SELECT
  'spc-agent-client-sandbox',
  'EO-SPC-' || LPAD((COALESCE(MAX(NULLIF(REGEXP_REPLACE(s.public_id, '\D', '', 'g'), ''))::int, 0) + 1)::text, 4, '0'),
  org.organization_id,
  'agent-client-sandbox',
  'Agent Client Sandbox',
  'client_space',
  'active',
  TRUE,
  'TASK-1679 — space de la persona agente cliente. Apunta a Greenhouse Demo (0 modulos) para servir como persona canonica del caso empty state del portal cliente.',
  LPAD((COALESCE(MAX(s.numeric_code::int), 0) + 1)::text, 2, '0')
FROM greenhouse_core.spaces s
CROSS JOIN (
  SELECT organization_id
  FROM greenhouse_core.organizations
  WHERE organization_name = 'Greenhouse Demo'
    AND active = TRUE
  LIMIT 1
) org
WHERE NOT EXISTS (
  SELECT 1 FROM greenhouse_core.spaces WHERE client_id = 'agent-client-sandbox'
)
GROUP BY org.organization_id;

-- Anti pre-up-marker guard + verificación del efecto real: la persona tiene que quedar con
-- organización resuelta en `session_360`, que es lo que la sesión lee. Verificar el INSERT
-- en `spaces` no alcanza — lo que importa es que el puente completo resuelva.
DO $$
DECLARE resolved_org text;
BEGIN
  SELECT organization_id
  INTO resolved_org
  FROM greenhouse_serving.session_360
  WHERE email = 'agent-client@greenhouse.efeonce.org';

  IF resolved_org IS NULL THEN
    RAISE EXCEPTION 'TASK-1679 anti pre-up-marker check: agent-client sigue sin organization_id resuelta en session_360. El space no se creo, o su organizacion no esta activa.';
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.spaces WHERE space_id = 'spc-agent-client-sandbox';
