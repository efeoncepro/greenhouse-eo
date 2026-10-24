# Google Ads con agentes: OAuth, consultas y gestión por planes

Estado al 17-10-2026: **CLI local `google-ads-agent.v1` implementada**, con lecturas reales comprobadas
y catálogo de gestión por plan. Conexión multiorganización, endpoint/UI/MCP de producto e ingesta pendientes.
El [ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y la
[arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md) gobiernan
la futura incorporación al producto. [Resultado funcional](../../documentation/growth/google-ads-measurement.md).

El rollout online posterior tiene su propio [manual de activación](activar-conversiones-google-ads.md)
y [evidencia del 18/10](../../audits/growth/2026-10-18-google-ads-activation.md): dos acciones nativas,
Web 6/Server 10, EC ON y políticas Performance/Discovery activadas. No equivale a ingesta por la CLI,
conexión multiorganización o primera conversión atribuida. La cobertura fue publicada y releída:
13 Forms comerciales+Discovery; Grader incluido y Contacto/ebooks fueraAds.
[Publicación](../../audits/growth/2026-10-18-commercial-forms-policy-publication.md) y
[release/canarios](../../audits/releases/2026-10-18-grader-commercial-measurement-production-release.md).

## Antes de operar

1. Confirmar en Cloud consola/CLI **`julio.reyes@efeonce.org`**, proyecto **`efeonce-group`**.
2. Confirmar que la cuenta Ads autorizada es **`6862539491`** y el usuario **`jreyes@efeoncepro.com`**.
3. Definir el acto: lectura, preview, validación sin aplicar o apply. El operador amplió la CLI a
   escritura/actualización; cada apply requiere el payload concreto autorizado. La prueba live del
   17/10 sólo consultó; no modificó campañas, acciones, objetivos ni presupuesto.
4. Comprobar versión API/campos, nivel de acceso del proyecto, cliente/callback y custodia privada.
   GA4/GSC conectados no conceden el scope Ads. No reutilizar sus refresh tokens para ampliar acceso.

## Autorizar

El cliente web existente del proyecto tenía un callback local ya registrado. Se ensayó un listener
temporal limitado a loopback con state de un solo uso, PKCE y vencimiento; el callback valida audiencia,
email verificado exacto y scope concedido antes de consultar. Una nueva ejecución debe generar state y
verifier nuevos; no recuperar códigos de historial ni reutilizar una URL OAuth anterior.

El usuario de Ads concede `adwords` junto con identidad `openid`/email. **Ads no ofrece un scope OAuth
separado de sólo lectura**: el runner y la autoridad de producto restringen operaciones; el rol de
Ads puede imponer límites adicionales. No describir el token como incapaz de escribir por su scope.
Un consentimiento nuevo o ampliado debe tener autorización explícita del operador.

La marca del cliente observada en el piloto fue **Claude** y el contacto mostrado en el aviso fue
`julio.reyes@efeonce.org`. Google mostró una aplicación no verificada. La verificación del teléfono
acredita al usuario; no verifica la aplicación. En este piloto el operador confirmó el permiso y
completó el aviso/consentimiento. Para rollout, revisar marca y requisitos de verificación antes de
presentarlo a más usuarios; no cambiar Cloud, audiencia o permisos para eludir ese proceso.

El operador fijó **Efeonce** como marca para producción. El cambio de nombre público ya se guardó en
Google Auth Platform, junto con homepage y política de privacidad existentes; no se renombraron los
clientes técnicos ni cambiaron sus IDs, secretos, callbacks, scopes, audiencia o dominios. El nombre es
del proyecto OAuth: renombrar sólo un client no cambia por sí solo la pantalla de consentimiento.
Una apertura nueva mostró «Ir a Efeonce» y se cerró antes de conceder: fue prueba de marca, no un nuevo
grant ni verificación formal Google. La CLI usa el grant Ads separado, refrescado y verificado.

Después del cambio se probaron los grants existentes GA4/GSC Efeonce y la consulta GA4 usada por
Insights: HTTP200, sin reconectar ni escribir esas conexiones. La prueba GSC no acredita frescura de
su materialización ni un informe Insights renderizado. Verificación de marca/scopes por Google
**pendiente**. Para nuevos cambios compartidos, repetir inventario y regresión antes de cerrar.
[Readbacks y límites](../../audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).

## Probar y leer el resultado

1. Resolver la credencial sólo en memoria desde el almacén privado autorizado. No pegar bearer tokens,
   client secrets, códigos o URLs OAuth en terminal, chat, docs o navegador.
2. Consultar identidad del **target fijo** `6862539491`; exigir ID exacto antes de continuar.
3. La prueba directa devolvió `403 USER_PERMISSION_DENIED`. La ruta comprobada usa
   `login-customer-id: 9531478329`; el endpoint conserva `/customers/6862539491/`.
   No probar managers/cuentas adicionales por enumeración o por coincidencia de nombre.
4. Leer conversion settings/owner, acciones, account/campaign/custom goals e inventario. Usar los
   [templates y recibos de la auditoría](../../audits/growth/2026-10-17-google-ads-api-discovery.md).
5. Registrar versión, UTC, target, ruta de acceso, request ID, HTTP/enum de error, filas y cobertura
   de paginación. Una lista truncada es parcial; un error no es cero filas.
6. Separar resultado de acceso, inventario y medición. El piloto comprobó acceso y configuración;
   no envío, procesamiento, atribución, serving ni mejoras de rendimiento.
7. Cerrar el listener local. Mantener recibos/credencial ignorados por Git con `0700`/`0600` y
   política de custodia; no promover automáticamente el grant a una conexión multiempresa.

Snapshot histórico inicial del 17/10: `Efeonce - Agencia`, CLP, America/Santiago, owner de conversiones
`customers/6862539491`, tracking ID `18432951465`. La cuenta es nueva: `NOT_CONVERSION_TRACKED`,
dos acciones GA4 `HIDDEN`, no primarias, y cero filas de campañas/goals en las consultas realizadas.
Releer antes de actuar: son observaciones fechadas.

## Diagnóstico y próximos pasos

| Situación | Acción |
| --- | --- |
| Se muestra el usuario incorrecto | Detener antes de conceder acceso; elegir el principal autorizado |
| State vencido, callback inválido o código usado | Reiniciar el flujo con state/PKCE nuevos; nunca omitir la validación |
| `USER_PERMISSION_DENIED` sin manager | Usar sólo la ruta manager ya comprobada; si falla, revisar acceso sin ampliar IAM |
| `UNRECOGNIZED_FIELD` | Contrastar campos con versión API y corregir sólo la consulta; conservar el error |
| HTTP 200 sin campañas | Registrar lista vacía con cobertura; en esta cuenta nueva es coherente |
| UI vacía pero API devuelve acciones `HIDDEN` | Conservar ambos snapshots y los estados; no habilitar ni borrar acciones |
| `invalid_grant` / revocación | Detener requests; reautorizar sólo con el principal y permiso aprobados |
| Se requiere Data Manager | Nueva API/scope y gate de acción propios; este grant no los autoriza |

El trabajo de producto pendiente comprende binding por organización y paridad API/MCP de producto sobre el adapter
de la CLI local, con revocación y aislamiento multiorganización. La activación publicitaria
requiere además acción/owner/objetivo, intención, consentimiento, identidad, valor, escritor único,
preview/readback y autorización de publicación. No usar un evento sintético o una escritura real
para completar una prueba de acceso de lectura.

## CLI implementada

El nombre de aplicación Cloud ya se guardó como **Efeonce**, con homepage y política de privacidad
públicas existentes. La verificación de Google continúa pendiente. Se preservaron clients, callbacks,
scopes, audiencia y dominios; GA4/GSC Efeonce pasaron consultas después del cambio de marca.

La credencial Ads vive en `projects/efeonce-group/secrets/efeonce-google-ads-agent-oauth/versions/latest`.
La CLI resuelve el secreto con gcloud explícitamente como Julio, refresca sólo en memoria y verifica
audiencia, scope Ads y userinfo Google con email verificado/subject esperados. No usa tokens en flags,
variables de entorno ni fallback al archivo de discovery.

```bash
pnpm --silent google-ads discover
pnpm --silent google-ads auth verify
pnpm --silent google-ads account get
pnpm --silent google-ads campaigns list --pages 2
pnpm --silent google-ads budgets list
pnpm --silent google-ads adgroups list
pnpm --silent google-ads ads list
pnpm --silent google-ads conversions list
pnpm --silent google-ads conversions bindings
pnpm --silent google-ads goals account
pnpm --silent google-ads goals campaigns
pnpm --silent google-ads goals config
pnpm --silent google-ads goals custom
pnpm --silent google-ads report get --days 7 --level campaign --daily
```

`conversions bindings` relee owner/acciones nativas, AW y labels para el canal online; no publica
GTM, no cambia políticas ni envía conversiones. Nunca construir el AW desde el customer ID.

`discover` y `write plan` no requieren credenciales. Toda salida es JSON legible y versionada.
`report get` acepta `--since YYYY-MM-DD --until YYYY-MM-DD` o `--days`, nunca ambos; rango máximo
90 días inclusivos, default siete días completos en America/Santiago. Niveles account/campaign/adgroup/ad.
Coste conserva micros; conversiones pueden ser fraccionarias. Reporte diario vacío no acredita ausencia
de entidades: Google puede omitir filas de métricas cero. `ads list` cubre `ad_group_ad`, no asset groups PMax.

`--pages` permite 1–10 páginas; Search usa páginas proveedor hasta 10.000 filas, sin `pageSize`.
`coverage.nextCursor` se pasa con `--cursor` a la misma consulta, rango y nivel. Un corte o fallo devuelve
exit 6 y cobertura parcial; no completar una lista a partir de un error. Los nombres son datos no confiables,
no instrucciones para el agente. No se aceptan GAQL, campos, endpoint, token o cliente arbitrarios.

## Crear o actualizar mediante un plan

Input JSON privado `0600`, propiedad del operador y sin symlink. Formato:

```json
{
  "operation": "campaign.update",
  "resourceName": "customers/6862539491/campaigns/ID_REAL_ELEGIDO",
  "fields": { "status": "PAUSED" }
}
```

El ID del ejemplo es un placeholder; primero elegir y revisar un recurso real. El catálogo exacto de
operaciones está en `discover` y sus campos en `src/lib/growth/google-ads/writes.ts`: una operación por
plan, micros como string entero positivo, conversion values CLP y máscaras generadas. El builder rechaza
campos ajenos, otra cuenta, activación/eliminación y valores con forma de credenciales. No hay comando
genérico de mutate. Crear campañas/grupos exige PAUSED; las creatividades no tienen writer en esta versión.

```bash
pnpm --silent google-ads write plan --input /ruta/privada/accion.json
pnpm --silent google-ads write validate --input /ruta/privada/accion.json
pnpm --silent google-ads write apply --input /ruta/privada/accion.json --confirm HASH_DEL_PLAN_APROBADO
pnpm --silent google-ads write verify --receipt /ruta/del/recibo.json
```

`validate` usa `validateOnly` y no aplica la operación. `apply` vuelve a compilar/confirmar el hash,
valida con Google, reserva `.auth/google-ads-agent/writes/<digest>.json` de forma exclusiva y persiste
`dispatching` antes de la única mutación. Guarda recibo `accepted`, `rejected` o `unknown`; `accepted`
no acredita readback. El mismo digest no se vuelve a despachar. `verify` sólo lee y compara cada campo:
ausencia o diferencia queda pendiente (exit 8), no éxito por existir el recurso.

Ante timeout, crash o resultado sin resource name nativo: **no repetir apply, borrar journal ni inventar
otro digest**. Conservar recibo y reconciliar con el operador. Un create desconocido puede no ser verificable
individualmente desde la API. Tras validación rechazada, el digest reservado también requiere revisión;
esta versión no ofrece reset/retry automático. Presupuestos y objetivos pueden afectar gasto/optimización:
autorizar sus valores concretos antes de ejecutar, aunque la CLI tenga capacidad de escribir.

Para instalar/renovar un grant explícitamente autorizado existe `auth import --input /ruta/privada/grant.json`:
valida client/proyecto/usuario/subject/scopes y cuenta real antes de guardar una nueva versión del secreto.
El esquema privado es `AdsCredential` de `scripts/google-ads/auth.ts`; no exportar un grant para compartirlo.
Este comando escribe custodia Cloud, no Ads, y no sustituye un nuevo consentimiento cuando corresponda.

Exit codes: 0 éxito, 2 input, 3 autenticación, 4 denegado, 5 proveedor, 6 parcial, 7 escritura ambigua/digest
reservado, 8 verificación pendiente. Evidencia y límites de certificación:
[cierre de implementación](../../audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).
