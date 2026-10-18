# Último envío de Performance — rastreo de recepción

Lectura realizada el 2026-10-17, 20:45–20:47 UTC / 17:45–17:47 America/Santiago.
Alcance: formulario activo `efeonce-performance-diagnostic`. Se resolvió el formulario por slug
y se volvió a consultar su lista de envíos antes de elegir el más reciente; no se reutilizó un
ID anterior sin comprobar su vigencia. Operación exclusivamente de lectura.

## Resultado

El envío más reciente fue aceptado y conserva entrega exitosa a HubSpot y ACK del tag Meta.
El proveedor Meta además reporta un Lead de servidor en la ventana horaria correspondiente.
No se observaron errores de entrega ni destinos HubSpot pendientes de verificar para esta ocurrencia.

| Etapa | Evidencia observada | Hora Chile (UTC−3) |
| --- | --- | --- |
| Forms | `fsub-7d76a9ba-ae79-49a1-a57b-a3bce86ce7c9`; estado `delivered`, aceptación persistida | 16:19:43.462 |
| Consentimiento | Ads y analytics concedidos; GPC false; revisión autorizante persistida | 16:19:43.006 |
| Conversión | `474092ed-4407-4934-8458-afb40ee9a746`, asociada a esa submission | 16:19:43.354 |
| HubSpot, recibo local | Intento `fatt-ac6bdabd-59c5-45c3-9e5a-0abe8e29f1da`, `succeeded`, HTTP 200 | 16:20:01.791 |
| HubSpot, historial nativo | Un candidato coincidente por identidad privada, formulario y ventana: `ec4257e0-c8f3-490a-b952-7174fd62302a`; consulta completa | 16:20:01.602 |
| HubSpot, contacto | Contacto `255816530227` encontrado por identidad; fecha de creación coincide con la submission nativa | 16:20:01.602 |
| sGTM/Meta, recibo local | `ack_recorded`, HTTP 200, un intento, sin clase de error registrada | 16:20:02.380 |
| Meta, stats de proveedor | `events stats --event Lead --source server --days 1 --pages 10 --limit 100`: un Lead; dos páginas completas, exit 0 | Bloque 16:00–17:00 |

La recepción HubSpot y el ACK de Meta se registraron unos 18–19 segundos después de aceptar el
formulario. El contador `form_submission.delivery_attempts` no se interpreta como número total
de POST: la evidencia de entrega es el ledger `form_destination_attempt`.

## Fallos y pendientes

- No hay fallo de transporte o entrega registrado en la ocurrencia consultada. Ads consentido y
  la proyección persistida corresponden a este envío; no se descifró su payload.
- Meta: el agregado confirma que el dataset contabiliza un Lead de servidor en esa hora. No
  contiene el UUID externo y no prueba por sí solo identidad individual, matching ni atribución
  a una campaña/anuncio. La traza conserva `meta.processing.status=unknown`; el ACK de sGTM no
  se convierte en evidencia de procesamiento individual.
- HubSpot: historial y contacto son lecturas nativas independientes. La relación del historial
  con nuestra submission es `correlated`, no un binding de IDs persistido. El adaptador guarda
  un recibo sintético `hsforms-<submissionId>`; no devuelve ni persiste el conversionId nativo.
  La coincidencia de fechas del contacto no demuestra por sí sola causalidad de creación.
- La calidad agregada de Lead sigue en EMQ 6,9; no es una evaluación individual de este contacto.
  FBC/teléfono ausentes en la muestra agregada no se declaran fallos de esta ocurrencia.

No se reenviaron formularios ni eventos, ni se crearon/editaron contactos o políticas.

## Evidencia y reproducción

Artefactos saneados, fuera del repositorio, permisos 0600:
`/Users/jreye/Documents/Meta-Efeonce-Connection/lead-trace-verification-2026-10-17/`:

- `latest-performance-lookup.json`: resolución vigente del formulario y últimos envíos.
- `latest-performance-trace.json`: traza completa; `coverage.complete=true`, sin destinos sin verificar.
- `latest-meta-lead-stats.json`: contador Meta, ventana y paginación completas.
- `latest-meta-quality.json`: calidad agregada; sin valores de contacto.

```bash
pnpm --silent meta leads trace --submission-id fsub-7d76a9ba-ae79-49a1-a57b-a3bce86ce7c9
pnpm --silent meta leads trace --event-id 474092ed-4407-4934-8458-afb40ee9a746
pnpm --silent meta events stats --event Lead --source server --days 1 --pages 10 --limit 100
```

[Contrato del diagnóstico](../../architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md) ·
[Manual de agentes](../../manual-de-uso/growth/consultar-meta-con-agentes.md).
