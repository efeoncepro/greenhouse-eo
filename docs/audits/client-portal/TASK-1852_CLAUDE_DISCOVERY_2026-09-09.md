# TASK-1852 — dossier de discovery para Claude

Fecha de corte: 2026-09-09. Este documento resume el estado vigente y apunta a las fuentes que deben
leerse antes de continuar TASK-1852. No sustituye la task, el ADR, el runbook ni la evidencia runtime.

## Leer en este orden

1. [Task vigente](../../tasks/in-progress/TASK-1852-berel-sky-service-access-and-channel-enablement.md).
2. [Plan ejecutado](../../tasks/plans/TASK-1852-plan.md).
3. [Runbook operativo](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md).
4. [Auditoría de rollout](TASK-1852_ROLLOUT_2026-09-09.md) y
   [readback final](TASK-1852_PRODUCTION_RELEASE_READBACK_2026-09-09.json).
5. [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md),
   [experiencia de servicios](../../architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md) y
   [entrada/consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
6. [Autoridad interna v2](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md), en especial
   D8–D9: la delegación vigente es read-only y no incorpora writes.

Los nombres, correos y referencias CRM de las seis personas elegidas viven en
`.captures/task-1852/private-scope/claude-discovery.v1.md`, ignorado por Git y con permisos `0600`.
No copies esos datos a documentación pública ni uses el usuario técnico de Berel como destinatario.

## Corte 2026-09-10

Mapping comercial declarado (términos con `bundled_modules`), tres personas Berel provisionadas con invitación
diferida, preview Sky limpio en producción, contrato de autoridad humana delegada implementado en local (sin release).
Estado y comandos exactos: [rollout §Continuación 2026-09-10](TASK-1852_ROLLOUT_2026-09-09.md) y
[readback](TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json). Lo que sigue exige una persona: apply de Sky con
sesión humana + flag, entrega de invitaciones Berel, release del contrato delegado y federación en el gateway.

## Estado que debe conservarse

- Lifecycle: `in-progress`; estado honesto: **capacidad técnica en Production, apertura cliente pendiente**.
- Release: PR #231, main `5726ce9d90d7a0bb3e9ed6aaab011b50351430d2`, orquestador
  `34416904936`, manifest `5726ce9d90d7-61ae6901-a225-46bc-b993-2b671a12ce1d` `released`.
- Vercel está READY; cinco servicios Cloud Run estaban Ready y al 100 % de tráfico; health, watchdog y
  siete canaries HTTP pasaron en el readback fechado.
- `CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED` permanece ausente/default OFF. No hubo apply cliente,
  invitaciones ni mensajes. Las cinco filas de asignación previas se preservaron.
- Berel tiene `SVC-HS-554261764224` sincronizado desde HubSpot con importes NULL porque la fuente no los
  informa. No hay términos ni mapping suficiente para apply.

## Qué se construyó

La misma capacidad sirve cualquier organización; Berel y Sky sólo son la primera cohorte.

| Pieza | Fuente vigente |
|---|---|
| Tipos, validación, reader, preview, apply, rollback y autoridad | `src/lib/client-portal/enablement/` |
| Commands transaccionales de asignación | `src/lib/client-portal/commands/` |
| App y Ecosystem API | `src/lib/api-platform/resources/*client-service-enablement.ts` y seis rutas bajo `src/app/api/platform/` |
| CLI HTTP | `scripts/client-portal/service-enablement.ts` |
| MCP interno | `src/mcp/greenhouse/tool-manifest.ts`, `server.ts`, `tools.ts` y skill `client-service-enablement` |
| Nexa | `src/lib/nexa/actions/client-service-enablement.ts` y registro vigente |
| Contrato público | `public/docs/greenhouse-api-platform-v1.openapi.yaml` |

El preview distingue contratación, asignación, operación y readiness. Apply exige el request revisado,
fingerprint e idempotency key; relee dentro de la transacción y conserva asignaciones previas. El receipt
identifica sólo las altas propias. Rollback pausa esas altas si nadie las cambió después. Audit, outbox y
resultado idempotente quedan coordinados; el actor nunca llega en el body.

## Paridad API: dos niveles distintos

| Consumidor | Preview | Apply/rollback | Estado real |
|---|---:|---:|---|
| App API | sí | sí, sesión humana admin + capability + flag ON | Implementado; writes OFF |
| CLI | sí | sí, sobre el mismo contrato App/Ecosystem | Implementado; depende del lane elegido |
| Nexa | sí, al preparar la propuesta | sí, propose → confirm → reautorizar + flag ON | Implementado; sesión agent no puede aprobar |
| Ecosystem API | sí | 403 `invalid_delegated_context` | Máquina autenticada, sin aprobador humano atribuible |
| MCP interno | sí | 403 por el mismo contrato | Tools registradas internamente; no federadas automáticamente |

Existe **paridad estructural**: los consumidores reutilizan los mismos readers/commands y DTOs. No existe
todavía **Full API Parity operativa de escritura delegada**. No la declares completa, no agregues
`actorUserId` al payload y no amplíes scopes/grants de máquina para sortear el 403. El siguiente diseño debe
proveer autoridad humana atribuible y revalidada en cada llamada, separado del binding del consumer.
El bearer App de origen `sister_platform_oauth` también se rechaza; si móvil/desktop entra como consumer
requerido, necesita el mismo diseño de autoridad y consentimiento, no una excepción en la ruta.

## Cohorte resuelta hasta hoy

- **Berel:** el operador eligió tres personas que existen como contactos HubSpot. Una búsqueda exacta por
  sus correos en Greenhouse devolvió cero usuarios. Requieren provisión/invitación, vínculo de identidad,
  pertenencia, permisos y prueba de login antes del preview humano. El único usuario Greenhouse actual es
  técnico, sin identity profile ni login, y queda excluido como destinatario.
- **Sky:** el operador confirmó las tres personas cliente activas ya asociadas a la organización. Las tres
  tienen identity profile y estado `password_reset_pending`; ninguna registra `last_login_at`. Hay otras
  pertenencias inactivas/invitadas que no forman parte de esta apertura.
- El equipo interno de Sky asignado a delivery no es la lista de destinatarios cliente.
- Los identificadores exactos y la evidencia de origen están en el archivo privado citado arriba. El
  [manifiesto público](../../operations/client-service-enablement/berel-sky.v1.json) conserva sólo IDs
  canónicos ya materializados y estados sanitizados; el draft Berel mantiene `personIds: []` hasta provisionar.

## Bloqueos y secuencia de continuación

1. Commercial/Delivery debe declarar términos y mapping de módulos. El writer vigente de términos no
   admite `bundled_modules`; no uses SQL ad hoc para completar el preview.
2. Identity debe provisionar las tres personas Berel y certificar las seis sesiones, pertenencia y retorno.
3. Client Portal debe verificar rutas propias/ajenas; TASK-1687 conserva el destino Sky.
4. Notifications/Insights debe resolver preferencia, audiencia, cadencia y destino por canal. No hay envío
   certificado y esta task no autorizó mensajes.
5. Platform debe diseñar la autoridad humana delegada antes de habilitar writes Ecosystem/MCP.
6. Sólo después: preview fresco por cuenta, revisión humana, flag ON acotada, apply, readback, prueba de
   acceso/canal y compensación. Mantener la task abierta mientras falte cualquiera de esas evidencias.

## Comandos de discovery seguros

```text
/implement-task TASK-1852
```

El harness de Claude debe solicitar/revalidar `/goal` según sus reglas. Si la continuación se ejecuta con
Codex, su preflight equivalente es:

```sh
pnpm codex:task-hook TASK-1852 --develop
pnpm task:lint --task TASK-1852
pnpm mcp:manifest:check
pnpm mcp:skills:check
rg -n "client-service-enablement|CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED" \
  src docs public/docs/greenhouse-api-platform-v1.openapi.yaml
```

Si cambia implementación o documentación, ejecuta pruebas focales y después:

```sh
pnpm qa:gates --changed --agent codex --task TASK-1852
pnpm local:check
pnpm task:lint --task TASK-1852
pnpm mcp:manifest:check
pnpm mcp:skills:generate
pnpm mcp:skills:check
pnpm docs:closure-check -- <paths propios>
pnpm docs:context-check:strict
```

En Claude usa el gate equivalente de su harness. `docs:context-check:strict` es siempre el último gate,
después de cualquier edición de Handoff/changelog. No incluyas WIP TASK-1604 en validación o commit focal.

Trabaja en el checkout compartido `develop`, preserva WIP ajeno y no cambies de rama ni uses worktrees.
La autorización posterior del operador para esta consolidación documental permitió subagentes de auditoría;
no amplía el rollout, las escrituras cliente, la federación MCP, las invitaciones ni los envíos.
