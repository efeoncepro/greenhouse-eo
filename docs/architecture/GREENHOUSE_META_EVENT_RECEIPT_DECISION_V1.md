# ADR — Recibo CAPI por evento e intento

- Status: `Accepted` — implementación local solicitada el 2026-10-17, sin activación/deploy.
- Date: `2026-10-17`.
- Confidence: `high` en contrato y pruebas locales; compilación/publicación GTM y recepción real pendientes.
- Validated as of: `2026-10-17`, sin mutaciones externas ni nuevas conversiones.
- Owner: Growth / Measurement.
- Scope: sender sGTM existente, worker/ledger/readers canónicos y CLI READ ONLY.
- Reversibility: `two-way`; conservar evidencia, retirar instrumentación sin reenviar.
- Modular placement: `src/lib/growth/measurement` y tooling local `scripts/measurement`; sin servicio,
  credencial, evento, autoridad o sender adicionales.

## Decisión

Instrumentar el callback HTTP del template Meta fijado en `a575edb31aa447469b855c3006ed9991dad711cf`.
Un parche local determinista exige SHA256 y anclas exactas; no modifica destino, payload, cookies,
consentimiento, triggers ni semántica de `gtmOnSuccess`/reintentos. Opción del template default OFF.
Sólo el Client autenticado `Efeonce backend Lead ingress`, su ruta y un único evento `Lead` pueden
emitir el header reservado `x-efeonce-meta-receipt`. Correlación por UUID de evento, hora, lease e
intento enviados en headers backend; no se incorporan a custom_data ni al payload CAPI.

Se permite únicamente dataset, versión API solicitada, identidad/hora/nombre de ese evento,
identidad/número de intento, HTTP original Graph, estado del parseo, `events_received`, `fbtrace_id`
acotado, fecha de observación y códigos numéricos de error. Se descartan mensajes libres, cuerpo
crudo, tokens, URLs, user_data, hashes y cookies. PageView y clientes públicos nunca emiten el header.

El dispatcher conserva el contrato ACK anterior. Ausencia/forma inválida del recibo no vuelve a
enviar un HTTP ya aceptado. Cada intento Meta finalizado agrega una observación operacional (incluida falta
de recibo) a un array acotado de máximo cinco en su delivery. Finalización y append comparten el
mismo UPDATE CAS por evento/destino/lease/número de intento; respuesta tardía no puede sobrescribir
evidencia de otro intento. Si el proceso muere antes de finalizar, o su lease fue reemplazado, el
recibo puede no quedar persistido: esa ausencia sigue siendo desconocida, no se reconstruye.
Expiración/retención del ciphertext no borra estos metadatos.

HTTP 2xx Graph + cuerpo válido + contador uno acredita recepción de la petición de un evento;
no matching, deduplicación efectiva, procesamiento, audiencia ni atribución. Es una vinculación del
transporte, no una consulta Meta por UUID. La CLI muestra estas etapas separadas. Históricos sin
recibo permanecen desconocidos; no se rellenan por stats ni se reenvían para fabricar la evidencia.

## Preparación y rollout separado

SQL aditivo parqueado fuera de `migrations/`; reactivar con timestamp nuevo dentro de un release
posterior autorizado. Worker comprueba storage antes de reclamar/enviar Meta; ausencia de schema
no produce un POST sin finalización persistible y no bloquea el carril Google. Preview/compilación
GTM y un readback de tráfico real son gates futuros, no pruebas locales ya satisfechas.
No ejecutar builder histórico que muta workspace ni publicar template/flag para probar este cambio.

Alternativas rechazadas: nuevo sender directo, raw responses en logs, contador agregado como
prueba individual, callback de tag sin recibo Graph, almacenamiento posterior sin CAS, o cambiar
los reintentos sólo para recuperar telemetría. La retención operacional sigue la del ledger existente.

Fuentes: [Google APIs sGTM](https://developers.google.com/tag-platform/tag-manager/server-side/api),
[template fijado](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager/blob/a575edb31aa447469b855c3006ed9991dad711cf/template.tpl),
[límites de evidencia](../documentation/growth/meta-individual-event-verification.md).

## Revisión local final del 17/10

El reader exige intentos estrictamente crecientes (permite huecos sin recibo), y vincula el reloj
Graph con `recordedAt` de la propia observación, con tolerancia de cinco minutos. Historia inválida
no acredita recepción; no cambia el ACK ni induce otro POST. [Evidencia](../audits/growth/2026-10-17-meta-cli-final-review.md).
