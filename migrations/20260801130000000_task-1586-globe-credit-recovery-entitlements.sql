-- Up Migration
-- TASK-1586 — lectura de capacidad/operaciones y reconciliación readback-first de créditos Globe.
-- Reconcile no repite la mutación económica; mantiene capability propia para least privilege.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'platform.globe_credit_funding.read',
    'platform',
    ARRAY['read'],
    ARRAY['all'],
    'Leer capacidad efectiva y operaciones de fondeo Globe mediante el broker tenant-bound.',
    NOW(),
    NULL
  ),
  (
    'platform.globe_credit_funding.reconcile',
    'platform',
    ARRAY['execute'],
    ARRAY['all'],
    'Reconciliar evidencia durable de una operación Globe sin repetir efectos económicos.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;
