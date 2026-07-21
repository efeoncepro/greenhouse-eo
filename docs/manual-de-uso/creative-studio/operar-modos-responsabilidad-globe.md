# Manual — Operar modos y responsabilidades de Globe

> **Tipo:** manual de uso / runbook
> **Versión:** 1.0
> **Actualizado:** 2026-07-21 (TASK-1466)

## Antes de empezar

- Trabaja desde `../efeonce-globe` y carga la skill `greenhouse-globe`.
- Usa únicamente el API/SDK tipado; nunca escribas directamente en `responsibility_assignment_versions`.
- El servicio es internal-only. El caller autorizado es `greenhouse-globe-caller`; no amplíes invokers ni clientes.
- Una asignación describe accountability. Los permisos se siguen evaluando con capabilities y workspace bindings.

## Verificar schema y runtime

Con `gcloud` y ADC autenticados, ejecuta el verifier no mutante:

```bash
GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-globe:southamerica-west1:globe-pg \
GLOBE_POSTGRES_DATABASE=globe \
GLOBE_MIGRATOR_USER=<usuario-IAM-migrador> \
pnpm --filter @efeonce-globe/database verify:responsibility-migration
```

Debe confirmar `0002`, owner `globe_owner`, grants DML para los dos usuarios de runtime y constraints de tenant/scope,
versión e idempotencia.

## Ejecutar el smoke internal-only

El operador debe poder impersonar temporalmente al caller. La concesión `serviceAccountTokenCreator` se retira al
terminar. El helper incluye email verificado en el ID token y nunca imprime el token:

```bash
GLOBE_API_BASE_URL=<url-run-app-api> \
GLOBE_API_AUDIENCE=<url-run-app-api> \
GLOBE_CALLER_SERVICE_ACCOUNT=greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com \
GLOBE_SMOKE_RESPONSIBILITY=1 \
node scripts/smoke-private-api.mjs
```

El resultado correcto declara: acceso sin auth denegado, audiencia exacta aceptada, audiencia errónea denegada,
assign v1, replay estable, replay conflictivo denegado, change v2 y acceso cross-workspace denegado. Conserva el scope
opaco como evidencia y comprueba que existen exactamente las versiones/auditorías `responsibility.assign` y
`responsibility.change` esperadas.

## Cambiar una responsabilidad

1. Lee la asignación efectiva por SDK/API.
2. Presenta la intención completa, una `idempotencyKey` nueva y el `expectedVersion` actual.
3. Confirma que la respuesta incrementó la versión y conserva `correlationId`.
4. Lee history y audit; nunca edites o borres snapshots previos.

## Recuperación y problemas comunes

- `authentication_required`: verifica que el ID token tenga audiencia exacta y `--include-email`.
- `access_denied`: revisa caller allowlist, capability y workspace binding; no concedas acceso desde la asignación.
- `conflict`: no recicles una llave para otra intención; relee la versión actual antes de reintentar un change.
- Tras `deploy-internal.yml`, revisa ambos servicios: el workflow puede bajar `maxScale` a 1. Restáuralo a 3 hasta que
  TASK-1508 elimine ese drift.
- Para rollback, deshabilita/revierte el wiring; conserva tabla, versiones y auditorías.

## Referencias

- [Contrato técnico](../../architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md)
- [Documentación funcional](../../documentation/creative-studio/modos-operativos-responsabilidad-globe.md)
- [Continuidad runtime](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
