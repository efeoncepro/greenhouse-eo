# Google Ads CLI y OAuth Efeonce — implementación local, 17-10-2026

## Resultado y alcance

Implementada **`pnpm google-ads`**, contrato `google-ads-agent.v1`, para el operador Efeonce.
La instrucción inicial pidió prueba de lectura; el operador amplió después la **capacidad de la CLI
a escritura y actualización**. Se implementó ese catálogo sin ejecutar una mutación publicitaria real.

Identidades preservadas: Cloud **`julio.reyes@efeonce.org`**, proyecto **`efeonce-group`**;
principal Ads **`jreyes@efeoncepro.com`**, anunciante **`6862539491`**, manager de acceso **`9531478329`**.
Ningún otro anunciante, sender, CRM, GTM, IAM, schema, worker o deployment fue modificado.

## OAuth y cambio de marca aplicado

Consola Cloud confirmó el principal y proyecto correctos. Antes de editar se inventariaron los dos
clientes existentes: **Greenhouse Search Console** y **Claude_EO**, ambos web. GA4 y GSC comparten
el primer cliente; Google SSO está disponible en Greenhouse, pero la asociación de su configuración
local al mismo proyecto no quedó acreditada. No se borraron ni renombraron esos clientes técnicos.

Se guardaron mediante Google Auth Platform:

- Nombre de aplicación: **Claude → Efeonce**.
- Página principal: `https://efeoncepro.com/`.
- Política de privacidad existente: `https://efeoncepro.com/politica-de-privacidad/`.

La UI exigió completar ambas URLs para guardar el nombre. Se verificó que el enlace de privacidad
era público y pertenecía a Efeonce. No se reescribieron políticas, se cargó logo ni se aceptó un nuevo
acuerdo. Se conservaron IDs, secretos de clientes, callbacks, scopes, audiencia, dominios y contactos.
Soporte OAuth mostrado: `julio.reyes@efeonce.org`; contacto de desarrollador existente: `jreyes@efeoncepro.com`.
Ese contacto no cambia el principal Cloud usado para administrar.

Google confirmó **«Se guardaron los cambios de marca»**. Evidencia visual fuera del repo:
`/Users/jreye/Documents/google-ads-architecture-discovery-2026-10-17/oauth-efeonce-brand-saved.png`.
**Verificación de marca/scopes por Google pendiente**: el nombre guardado no elimina ese gate ni acredita
su revisión. No se completó un consentimiento nuevo de marca Efeonce durante esta unidad; se reutilizó
el grant existente del mismo cliente, refrescado y verificado con Google. Su acceso sí se probó.

Comprobación visible posterior: un flujo OAuth nuevo mostró **«Selecciona una cuenta → Ir a Efeonce»**,
el usuario `jreyes@efeoncepro.com` y el enlace de privacidad correcto. Se capturó en
`/Users/jreye/Documents/google-ads-architecture-discovery-2026-10-17/oauth-efeonce-google-signin.png`.
Se cerró antes de seleccionar/conceder y se detuvo el listener: sin intercambio ni custodia de tokens
nuevos. Esto acredita el nombre público Efeonce, no la verificación formal de Google.

El grant se importó explícitamente a un secreto propio:
`projects/efeonce-group/secrets/efeonce-google-ads-agent-oauth/versions/latest`, versión inicial 1.
Antes de guardarlo se verificaron audiencia, scope `adwords`, email verificado y subject mediante
Google tokeninfo/userinfo, y luego la identidad Ads exacta. No se copiaron tokens a argumentos, env,
salidas o Git. La CLI no tiene fallback al archivo de discovery. Cada comando autenticado verifica el
principal con Google; no confía únicamente en metadata del archivo. gcloud recibe `--account` y
`--project` fijos. No se amplió IAM ni se publicaron credenciales de servidor.

## Implementación y cobertura

| Hogar | Contrato |
| --- | --- |
| `src/lib/growth/google-ads/contracts.ts` | Perfil fijo, catálogo, errores seguros y versión |
| `queries.ts` / `client.ts` | GAQL cerrado, proyección de campos, identidad obligatoria, paginación, reporting y transporte con límites |
| `writes.ts` | Diez operaciones cerradas, una por plan, digest y máscaras generadas |
| `scripts/google-ads/auth.ts` | Custodia local de operador, Secret Manager, refresh/identidad y migración explícita de grant |
| `cli.ts` / `journal.ts` | Adapter de argumentos y ejecución, receipts privados con exclusión de replay |

Lecturas: cuenta, campañas, presupuestos, grupos, metadatos `ad_group_ad`, acciones, goals de cuenta,
campaña/config/custom y métricas por fechas/nivel. Sin endpoints, GAQL o fields arbitrarios, PII, click IDs,
search terms o snippets. Ads no cubre asset groups PMax. Cuota/páginas y cobertura son explícitas;
un fallo no es cero. Reporte diario advierte omisión de filas con métricas cero y conserva micros/moneda.

Gestión: create/update de campaign Budget, campañas SEARCH, grupos SEARCH_STANDARD y conversionActions;
update de accountGoal/campaignGoal. Campañas/grupos sólo PAUSED. El catálogo actual no activa ni elimina,
no crea creatividades y no ingiere conversiones. Scopes OAuth amplios no amplían ese catálogo.
`write plan` no requiere auth; `write validate` usa `validateOnly`; `write apply --confirm DIGEST`
valida y reserva el journal antes del único dispatch. El mismo digest queda bloqueado incluso tras
timeout/crash/rechazo hasta reconciliación/revisión. Nunca se reintenta una mutación automáticamente.

Recibo `accepted` sólo acredita respuesta de transporte con resource name. `write verify` selecciona
todos los campos del plan, compara valores y conserva pendientes/mismatches. Un recurso existente
no se presenta como configuración verificada. La CLI guarda journals 0700/0600 con creación exclusiva
y fsync antes de dispatch. No se promete exactly-once remoto ni recuperación universal de un create ambiguo.

La unidad es **local de operador**. Conexión por organización, DB/API/MCP/UI de producto, extracción del
dominio y senders de conversión no forman parte de esta implementación; permanecen gobernados por el ADR.

## Prueba real de CLI: PASS, sólo consultas

Comandos reales de terminal: `auth import`, `auth verify`, `campaigns list`, `conversions list` y
`report get --days 7 --daily`. El resto del catálogo se ejecutó mediante el mismo handler exportado,
con cliente y token provider canónicos compartidos en un runner privado, sin paths ni tokens libres.

| Consulta | Resultado |
| --- | --- |
| `auth verify` | Principal jreyes verificado y cliente Ads exacto |
| `account get` | 1 fila, Efeonce - Agencia, CLP, America/Santiago, no manager/test, auto-tag ON |
| `campaigns list`, `budgets list`, `adgroups list`, `ads list` | Cero filas, cobertura completa para sus queries |
| `conversions list` | 2 filas GA4 HIDDEN: purchase y generate_lead, no primarias |
| Goals account/campaign/config/custom | Cero filas, sin página pendiente |
| Reporte diario por campaña, últimos siete días completos | Cero filas; advierte semántica de omisión de ceros |

Owner de conversiones: `customers/6862539491`; tracking ID `18432951465`;
`NOT_CONVERSION_TRACKED` / effective enablement OFF. Cuenta nueva según operador. Se mantiene el
[probe inicial y sus request IDs](2026-10-17-google-ads-api-discovery.md).

Recibos privados de esta unidad en `.auth/google-ads-discovery-20261017/`:
`cli-auth-import.json`, `cli-auth-verify.json`, `cli-campaigns.json`, `cli-conversions.json`,
`cli-report.json`, `cli-catalog-results.json`. Son 0600/ignorados; no se agregan al commit.
No se envió `validateOnly` ni `apply` contra Google durante estas pruebas. Escrituras: tests locales
con proveedor simulado y contrato primario contrastado; **no certificadas todavía con un payload real**.

## Regresión por marca compartida: PASS

Verificada **22:55:42–22:56:11 UTC / 19:55:42–19:56:11 America/Santiago**:

- GA4 Efeonce `486264460`: grant existente, refresh y reporte agregado, HTTP 200.
- GSC `sc-domain:efeoncepro.com`: grant existente, refresh y query agregada, HTTP 200.
- `/api/auth/providers` y `/api/auth/health`: HTTP 200; Google, Azure y Credentials presentes/ready.
- Metadata de conexiones leída con DB canónica en transacción **READ ONLY**: estados/scopes/timestamps
  conservados. Ninguna escritura de conexión ni reconexión; tokens sólo en memoria.

Una primera llamada GSC falló localmente por forma de parámetros, antes de enviar el request; se corrigió
y la consulta posterior pasó. El recibo privado `branding-regression.json` conserva ese límite y los tiempos,
sin métricas, tokens ni payloads personales. Auth health acredita disponibilidad/configuración, no un nuevo
round-trip de Google SSO. No se probaron otras organizaciones GA4/GSC ni se usaron como fallback.

Comprobación específica de **Efeonce Insights**, 23:03:38–23:03:43 UTC: la consulta exacta de
`ga4-site-facts.ts` para el 16/10 (`sessionDefaultChannelGroup`, `sessionSourceMedium`; `sessions`,
`engagedSessions`) pasó con el grant existente y propiedad `486264460`: **HTTP 200, 2/2 filas,
cobertura completa**, un request. Sin métricas persistidas ni escrituras de conexión. El adapter usa
el reader canónico `readGa4Analytics`; no depende del grant nuevo Ads.

El adapter SEO de Insights lee `readSeoOverviewKpisForWindow` sobre `seo_gsc_daily`, alimentada por
`gsc-daily-materializer.ts` mediante `readSearchConsoleAnalytics` y el grant GSC existente. El HTTP 200
GSC acredita autenticación upstream después del cambio; no certifica frescura del cron/materialización
ni un informe Insights generado o renderizado. El recibo privado incorpora `insightsGa4Regression`.

## Verificación local y límites

Pruebas focales de dominio/CLI: aislamiento de cuenta, aud/scopes/email/subject, fechas/SQL, proyección y
redacción, páginas parciales/cursor cíclico, planes/masks, confirmación, archivos privados, reserva durable,
timeout sin replay y readback incompleto/diferente. TypeScript strict focal, ESLint de archivos propios,
enlaces y cierre documental se ejecutan antes del commit. No se requiere build/release para esta CLI local.

Resultado focal al cierre de código: **114 tests / 4 archivos PASS**, TypeScript strict focal y ESLint
de archivos propios PASS; skills Codex/Claude byte-idénticas y enlaces locales/fences comprobados.

La revisión independiente detectó y corrigió tres defectos: nombres con forma de secreto OAuth eran
aceptados en el plan, el primer readback sólo comprobaba existencia del recurso y un recibo cruzado podía
verificar otro recurso de la misma cuenta. Updates exigen ahora identidad exacta con el recurso del plan,
antes del readback y al validar el resultado de mutate. Los tests negativos
correspondientes forman parte del cierre. Lecturas reales PASS no equivalen a escrituras verificadas,
atribución comercial, app verificada por Google, publicación GTM o disponibilidad de producto.

Fuentes: [paginación](https://developers.google.com/google-ads/api/docs/reporting/paging),
[fechas](https://developers.google.com/google-ads/api/docs/query/date-ranges),
[métricas cero](https://developers.google.com/google-ads/api/docs/reporting/zero-metrics),
[marca por proyecto](https://developers.google.com/identity/protocols/oauth2/cross-client-identity),
[ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y
[manual](../../manual-de-uso/growth/conectar-google-ads-con-agentes.md).
