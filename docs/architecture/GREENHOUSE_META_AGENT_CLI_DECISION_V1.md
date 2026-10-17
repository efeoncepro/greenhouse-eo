# ADR — Consultas locales de Meta para agentes

- Status: `Accepted` — foundation de lectura; frontera GET y salida v1 ampliadas por [ADR de operación local](GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md), aprobado el 2026-10-17.
- Date: `2026-10-17`.
- Owner: `Growth / Marketing Operations / Agent tooling`.
- Scope: consultas locales de activos Efeonce mediante Graph API y credencial existente; sin promoción a producto, API Greenhouse, MCP, deploy ni ampliación de permisos.
- Reversibility: `two-way`.
- Confidence: `high` en la frontera; disponibilidad por comando sujeta a respuesta real de Meta.
- Validated as of: `2026-10-17`; contrato de implementación local. Un comando descrito no implica una consulta live aprobada.

## Delta aceptado — 2026-10-17

El [ADR de operación local](GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md) conserva esta foundation y
su evidencia, agrega escrituras acotadas y catálogo de métricas, y adopta `meta-agent.v2`. Las cláusulas
GET-only y `meta-agent-read.v1` de este documento describen el corte inicial, no el límite vigente.
No se borra ni se atribuye a la ampliación el readback histórico de abajo.

## Context

El agente necesita consultar cuentas, campañas, eventos y activos sociales de Meta de forma repetible,
con salida estructurada. La conexión local ya tiene una identidad y activos verificados; copiar tokens,
construir URLs arbitrarias o confundir permisos concedidos con operaciones disponibles debilitaría
esa frontera. La medición CAPI existente conserva su sender, políticas y autoridad propios.

## Decision

Exponer `pnpm --silent meta` como cliente local de comandos de lectura cerrados. El perfil inicial
es `efeonce`, con Graph API `v25.0`, IDs Graph explícitos y origen fijo `https://graph.facebook.com`.
`discover` describe el contrato sin autenticar. Las consultas autentican primero al usuario técnico
esperado y su pertenencia al Business Efeonce; un ID o permiso aislado no concede autoridad.

La fuente única de credencial es
`projects/efeonce-group/secrets/efeonce-meta-agent-token/versions/latest`. El proceso usa el acceso
local autorizado de `gcloud` y captura el valor sólo en memoria; no admite tokens en argumentos,
variables de entorno o archivos, ni imprime stdout de credenciales o errores de proveedor crudos.
El token de Página se resuelve en memoria para su activo y nunca forma parte de la salida.
No reutilizar el token CAPI del tag sGTM.

El perfil fija el principal Graph `122100132867513483` (Greenhouse); el ID mostrado en Business
Suite `61595404505049` es distinto. La app declarada es `1665579481811196`; declarar su ID no
sustituye una introspección del binding de la credencial.

Los comandos Meta sólo emiten GET contra rutas/fields permitidos. No hay Graph genérico, URL libre,
POST/DELETE, envío de conversiones, publicación, cambios de presupuesto, descarga de leads individuales
ni cuerpos privados de mensajes. Las conversaciones se limitan a metadata. Los permisos amplios del
token existente no amplían el catálogo de esta CLI.
Posts, comentarios y media de Instagram devuelven metadata por defecto; `--content` permite
solicitar texto/caption público en esas lecturas, sin cuerpos privados o participantes de conversaciones.

## Alternatives Considered

| Alternativa | Decisión |
| --- | --- |
| Scripts puntuales con token/URL libre | Reemplazar por comandos tipados y contrato estable; conservar evidencia histórica fuera del repo. |
| MCP oficial de Meta | Carril separado, dependiente del cliente y OAuth; no bloquea consultas API locales autorizadas. |
| Federación en Efeonce MCP o panel multiempresa | Diferida: requiere contrato de producto, autoridad por organización y gobernanza propios. |
| Otro sender CAPI | Descartado: [CAPI existente](GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md) conserva el envío. |

## Runtime Contract

- Entrada: `pnpm --silent meta <comando>`; catálogo y uso en el
  [manual](../manual-de-uso/growth/consultar-meta-con-agentes.md) y
  [documentación funcional](../documentation/growth/meta-agent-cli.md).
- Implementación local: `scripts/meta/client.ts` y `scripts/meta/cli.ts`; pruebas en los archivos
  `client.test.ts` y `cli.test.ts` de esa carpeta. El tooling permanece en `scripts/`, fuera del
  grafo runtime del producto.
- Salida JSON `meta-agent-read.v1`: `ok`, `command`, `observedAt`, `profile`, `apiVersion`, `data`,
  paginación y errores saneados cuando corresponda. stdout contiene un único resultado JSON.
- Paginación: `--pages` entre 1 y 10 (default 1), `--limit` entre 1 y 100 (default 25), cursor
  opaco. Sólo se acepta el cursor, nunca una URL de continuación arbitraria. `hasMore` y el estado
  parcial son explícitos; no declarar inventario completo con páginas pendientes.
- Stats: ventana entre 1 y 7 días, default 7; fuente server/browser/all y agregaciones cerradas.
  Insights: entre 1 y 90 días, default 30; niveles account/campaign/adset/ad.
- Salidas: 0 éxito; 2 entrada inválida; 3 autenticación; 4 denegado; 5 proveedor; 6 parcial.
  No inventar ceros al recibir denegación, error, campo no soportado o cobertura insuficiente.
- Datos personales: no salida de credenciales, leads individuales o mensajes privados. Archivos de
  evidencia operacional fuera del repo y privados; no capturar payloads crudos indiscriminadamente.
- Authority: perfil cerrado Efeonce; otro Business, cuenta, Página o Instagram requiere revisión
  explícita del binding y propiedad, no un parámetro libre.

## Consequences

El agente puede repetir una lectura y explicar su ventana, identidad y cobertura. El costo es
mantener las rutas, fields y versión compatibles con Meta; cambios de API o permisos pueden negar
un comando sin invalidar los demás.

Estadísticas de eventos son agregados del proveedor, no el ledger comercial ni el CRM. Un ACK,
una fila Lead o EMQ no certifican venta, atribución o entrega CRM. Calidad es específica del evento;
`event_coverage=0` no prueba CAPI apagada, especialmente con un sender sólo servidor. La reconciliación
con consentimiento, aceptación, event_id y recepción conserva los contratos de
[matching](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md) y
[políticas](GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

## Verification

Comprobar parser, límites, rechazo de rutas/token/IDs fuera de perfil, secreto sólo en memoria,
redacción, paginación parcial y denegación con fixtures locales. El readback real debe registrar
comando, identidad, hora, resultado y cobertura sin secretos; no crear conversiones o publicaciones
para validar una CLI de consulta. Tests locales y contrato aceptado no sustituyen ese readback.

### Readback de implementación local — 2026-10-17

34 tests PASS (19 CLI + 15 cliente), ESLint y TypeScript focalizados PASS en los cuatro archivos.
Lectura real de los 17 comandos del catálogo: 18 invocaciones al consultar ambas plataformas de
conversaciones. Identidad/Business, 29 permisos y activos respondieron correctamente. Campañas,
adsets, ads, posts e Instagram media se acotaron deliberadamente a dos filas/una página: `ok=true`,
exit 6 y `hasMore=true`, sin afirmar inventario completo. Insights de 30 días devolvió cero filas;
conversaciones Facebook una, Instagram cero y comentarios del post propio cero, con exit 0.

Stats servidor de siete días completó dos páginas/36 filas; el readback final con
`pnpm --silent meta events stats --days 1 --source server --pages 10 --limit 100` completó dos
páginas/seis filas, exit 0. Calidad devolvió Lead EMQ 6,9 y PageView 3; es disponibilidad de nuevos
agregados, no una mejora de medición causada por la CLI. No se generaron eventos para estas pruebas.
La recuperación de la UI quedó terminada: desafío SMS ausente y asistente de token completado;
la implementación local no amplía permisos por ello.

Evidencia privada fuera del repo:
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-verification-2026-10-17/summary.json`
(20:10 UTC / 17:10 Chile) y `final-stats.json` (20:12 UTC / 17:12 Chile).
Una página aceptada cuyo siguiente cursor falta o se repite produce resultado parcial sin cursor
de continuación seguro. Un fallo HTTP antes de aceptar una página conserva el cursor de esa página.
Nunca reiniciar y sumar filas para ocultar esa discontinuidad.

## Revisit When

Reabrir esta decisión si se piden escrituras, otras organizaciones, scheduling, credenciales nuevas,
renovación automática, bodies privados, leads individuales o promoción a producto/API/MCP. Para
cambiar la versión Graph, verificar comandos y evidencia antes de mover el perfil.
