# Plan — TASK-1473 Globe Contract Packaging, SDK/MCP Adapters and Parity Certification

## Discovery summary

- El gateway independiente `efeonce-mcp` ya autentica el scope `efeonce.mcp.globe.read`, usa una service
  account dedicada y alcanza `GET /v1/capabilities` de Globe con un ID token de audiencia exacta.
- Globe ya expone el primitive canónico `globe.producer.fleet.list` en `POST /v1/readers`. El reader deriva
  disponibilidad por workspace desde readiness promovido y production routing, y su proyección no entrega
  provider slug ni house a un principal sin `globe.producer.route.reveal_house`.
- La clase `globe:service:mcp-provider` fue creada para discovery con cero capabilities/bindings. El único
  cambio de autoridad requerido es `globe.producer.catalog.read` y el workspace interno exacto
  `greenhouse-org:efeonce`; no requiere modificar IAM ni compartir credenciales.
- `TASK-1469` y `TASK-1472` siguen bloqueando lifecycle, review, release, delivery y writes. No bloquean el
  reader de fleet: no muta, no gasta, no usa artifacts ni expone datos de operación.

## Access model

- `routeGroups`: no aplica; el gateway es Streamable HTTP y Globe conserva su API privada.
- `views` / `authorizedViews`: no aplica.
- `entitlements`: tenant Entra único + scope `efeonce.mcp.globe.read` en el gateway; Globe deriva el único
  workspace desde la service identity y no acepta un workspace de quien invoca MCP.
- `startup policy`: Globe y el gateway fallan cerrados si falta OAuth, identidad workload o el provider.
- Decisión de diseño: reutilizar el reader y envelope versionados; no crear endpoint model-specific ni
  introducir una capa de negocio en el gateway.

## Architecture decision

- ADR existente: `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`, decisiones 8–10 y rollout
  paso 6.
- ADR nuevo/propuesto: ninguno. Es la aplicación read-only y internal-only del adapter ya decidido.
- Status requerido antes de implementar: `accepted` (cumplido).
- Razón: cambia sólo la proyección de privilegio mínimo de una identidad existente y usa un reader canónico.

## Backend/data contract

- Source of truth: readiness y production route bindings de Globe; el gateway no persiste ni interpreta rutas.
- Contract surface: `POST /v1/readers` con `ReaderRequestEnvelopeV1` para
  `globe.producer.fleet.list`; resultado versionado `ProducerFleetListDataV1`.
- Invariantes: workspace derivado, no selección libre; no provider slug/house/costo de proveedor/margin. La
  guía pública `Bajo|Estándar|Premium` permanece porque no es costo de vendor; sin writes, idempotency keys ni
  side effects.
- Access/auth: OAuth scope en el gateway; ID token y allowlist en Globe; capability única downstream.
- Migration/backfill/rollback: ninguno. Rollback por revision Cloud Run o por devolver la clase MCP a cero
  capabilities/bindings; ambos fail-closed.
- Runtime evidence: tests de principal/coverage/envelope, scope deny antes de downstream, fault sanitizado,
  correlación y canary OAuth de cliente MCP real.

## Skills

- Slice Globe: `greenhouse-globe` y `efeonce-mcp-platform`.
- Slice gateway/runtime: `efeonce-mcp-platform`, `greenhouse-secret-hygiene` y `cloud-run-basics`.
- Cierre: `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

## Subagent strategy

`sequential`

- El reader, la identidad downstream, el gateway y el canary forman una sola frontera de seguridad; se
  implementan y verifican en orden para evitar que un despliegue temporal exponga una tool sin autorización
  mínima comprobada.

## Execution order

1. Cambiar en Globe la clase MCP a capability/binding mínimo y habilitar sólo la coverage MCP del fleet reader;
   añadir regresiones de principal y proyección.
2. Validar, versionar, revisar y desplegar Globe API internal antes del gateway.
3. Extender el provider de `efeonce-mcp` y registrar `globe.producer.fleet.list` como tool sin argumentos;
   mantener `globe.capabilities.list` como discovery no autoritativo.
4. Añadir tests de allow/deny/fault/redaction/correlación y actualizar el canary OAuth para llamar la tool real.
5. Validar, desplegar gateway, ejecutar el canary autenticado y documentar evidencia/rollback.

## Files to create

- Ninguno previsto fuera de pruebas o evidencia de canary que el runtime ya gestione.

## Files to modify

- `../efeonce-globe/apps/studio-web/src/app.ts` — proyección de autoridad del caller MCP.
- `../efeonce-globe/packages/domain/src/producer-fleet.ts` y pruebas focales — coverage y regresión.
- `../efeonce-mcp/src/providers/{globe,types}.ts`, `src/mcp.ts`, pruebas y canary — adapter delgado y evidencia.
- Task, handoff, runbook y changelog de Greenhouse — lifecycle/evidencia, sin duplicar la arquitectura.

## Files to delete

- Ninguno.

## Risk flags

- Cambia una capacidad de una identidad workload; se limita a un reader read-only y un único workspace.
- El gateway se despliega después de Globe para que nunca intente una ruta inexistente.
- Este slice no autoriza clientes externos/multitenant ni cualquier write; éstos conservan gate explícito.

## Open questions

- Ninguna para el corte internal-only. La extensión a clientes requiere decidir el modelo B2B/multitenant y
  entitlements antes de ampliar workspace bindings.
