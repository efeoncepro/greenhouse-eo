# Conectar GA4 a una organización

> Estado reconciliado (2026-10-04): connection/reader entregados; IAM/URIs, consentimiento de Berel
> y Data API verificados históricamente en staging el 02/10; código/flag promovidos el 03/10 con
> release `fe261ca2745f`. [Evidencia y pendientes](../../tasks/in-progress/TASK-1284-growth-ga4-multitenant-connection-signal.md).
> Sin nuevo round-trip ni comprobación live de todas las organizaciones en esta revisión.
>
> **Delta 2026-10-17:** Efeonce se conectó por primera vez (propiedad `486264460`, «efeoncepro.com»); Berel y Sky
> siguen activas. Las tres respondieron a una lectura sin escritura. Ver
> [Estado vigente y diagnóstico](#estado-vigente-y-diagnóstico-2026-10-17).


1. Abre **Agencia → Cliente → Ciclo de vida** de la organización correcta. Para Berel, usa **Grupo Berel**.
2. En la tarjeta **Google Analytics 4**, selecciona **Conectar Google Analytics**. Autoriza el alcance de solo lectura con una cuenta que tenga acceso a la propiedad GA4 del cliente.
3. Al volver a Greenhouse, elige la propiedad exacta en la lista. Para Grupo Berel, verifica nombre e ID antes de guardar; no elijas una propiedad de Efeonce ni otra organización por proximidad en la lista.
4. La tarjeta mostrará nombre e ID de la propiedad conectada. **Desconectar** desvincula la organización de su token de lectura tras confirmar en el diálogo.

El botón solo está disponible para operadores con `growth.ga4.connect` cuando `GROWTH_GA4_ENABLED=true` en el runtime. El refresh token se guarda en Secret Manager; la base almacena únicamente su referencia. La conexión por sí sola no afirma que un informe histórico haya sido leído: verifica una consulta Data API con el rango y las dimensiones requeridos.

## Prueba desde desarrollo local

No hace falta desplegar Greenhouse en producción para completar el consentimiento. Con el servidor en `http://localhost:3000`, registra exactamente `http://localhost:3000/api/admin/growth/analytics-ga4/oauth/callback` como URI de redirección autorizada en el cliente OAuth web de Google. Configura en el entorno local `GOOGLE_GA4_OAUTH_CLIENT_ID`, `GOOGLE_GA4_OAUTH_CLIENT_SECRET` y `GROWTH_GA4_ENABLED=true`, además de acceso del runtime a Secret Manager. El esquema debe existir en la base de ese entorno; la migración `20261002225253390_task-1284-ga4-connections.sql` ya tiene aplicación registrada el 02/10. No volver a aplicarla ni revertir la base compartida como paso de conexión.

El estado **Testing** de la pantalla de consentimiento de Google permite usuarios de prueba, pero sus autorizaciones y refresh tokens expiran a los siete días. Es una limitación del estado OAuth de Google, distinta del ambiente dev o producción de Greenhouse.

## Qué hace la conexión en el informe de Efeonce Insights

Con GA4 conectado, el informe de Insights suma dos lecturas del sitio: en **Visibilidad orgánica**, las visitas que
llegan desde buscadores y cuántas interactúan; en **Visibilidad en motores de respuesta**, las visitas que llegan desde
asistentes de IA (ChatGPT, Gemini, Perplexity, Claude, Copilot…) y cuál trae más. Si la organización no tiene GA4
conectado, el informe lo dice como límite y le pide al cliente el acceso de lectura.


## Cada organización tiene su propia conexión

- Cada conexión es una fila propia en `greenhouse_growth.ga4_connections` (una por `organization_id`) con su propio
  secreto `ga4-token-<orgId>` en Secret Manager (nombre derivado por `secretIdFor(orgId)` en
  `src/lib/growth/analytics-ga4/command.ts`).
- Conectar, reconectar o desconectar una organización **no afecta a otra**: conectar Berel o Sky no desconecta a
  Efeonce, ni al revés.

## Nunca conectada, desconectada o revocada

| Lo que ves en la base | Qué significa |
|---|---|
| No hay fila para la organización | **Nunca se conectó.** No hubo desconexión. |
| Fila con `status=revoked`, `token_secret_ref` vacío y sin `last_error_code` | Alguien usó **Desconectar** (la fila se conserva, no se borra). |
| Fila con `status=revoked` y `last_error_code=invalid_grant` o `token_secret_missing` | Greenhouse marcó el token como inválido al usarlo. |

Ojo: tanto el listado de propiedades (`listGa4PropertiesForOrg`) como el reader (`readGa4Analytics`) marcan la
conexión `revoked` si Google responde `invalid_grant` o 401/403. Para diagnosticar sin efectos, refresca el token
directamente (resolver el secreto y pedir un access token) en vez de pasar por esos comandos.

## Estado vigente y diagnóstico (2026-10-17)

| Organización | Propiedad | Estado |
|---|---|---|
| Efeonce (`org-2df565fb…`) | `486264460` «efeoncepro.com» | Conectada el 2026-10-17 desde la ficha de la organización. Antes no tenía fila: nunca estuvo conectada. |
| Grupo Berel | `328274754` «Grupo Berel WWW - GA4» | Activa (secreto con una sola versión, del 2026-10-02). |
| Sky | `354430952` «SKY web GA4 - Prod» | Activa (secreto con una sola versión, del 2026-10-15). |

Verificación sin escritura del 2026-10-17 (refresh del token + `runReport` de sesiones de ayer): las tres propiedades
respondieron 200 con datos.

## Verificar el resultado y sus límites

- Confirma propiedad y organización antes de consultar. Estado active y consentimiento de una org
  no acredita conexión de todas las demás.
- Verifica rango, dimensiones y filas mediante el reader gobernado. Sin conexión devuelve
  `not_connected`; con token inválido `token_unhealthy`; una consulta fallida no se informa como cero.
- Insights ya usa sesiones orgánicas/con interacción e IA por asistente; el reader todavía no
  admite conversions y la señal no entra al grader. TASK-1787 conserva la serie referral de producto,
  distinta de las lecturas por ventana de Insights.
- Reader OFF/revocación, rollback, monitoreo 7d y alcance de consentimiento siguen como gates
  pendientes en TASK-1284. No ejecutar desconexiones/revocaciones o cambios IAM sólo para revisar
  esta documentación.

[Descripción funcional](../../documentation/growth/conexion-ga4-por-organizacion.md) y
[contrato técnico](../../architecture/growth/ga4-connection-ui-v1.md).
