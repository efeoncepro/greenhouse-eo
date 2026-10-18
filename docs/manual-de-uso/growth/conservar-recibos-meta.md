# Conservar recibos de Meta por evento

Estado 2026-10-18, 20:33:29Z: **GTM Server 10 publicado y confirmado live**. El tag Meta 6
usa el template 3 instrumentado y `captureEfeonceReceipt=true`; el schema y el worker compatibles
ya están activos. La captura queda acotada al Lead backend autenticado. El primer recibo Graph
de una ocurrencia real sigue pendiente: la publicación no acredita recepción ni atribución.
[Activación y readback](../../audits/growth/2026-10-18-google-ads-activation.md) ·
[Reparación del storage](../../audits/releases/2026-10-18-candidate-89d70ec13-review.md).
[ADR](../../architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) ·
[Qué demuestra cada evidencia](../../documentation/growth/meta-individual-event-verification.md).

## Contrato activo

El sender conserva la base oficial fijada en `a575edb31aa447469b855c3006ed9991dad711cf`.
El callback inspecciona el resultado de la única petición que ya envía. No crea otro sender o POST.
La opción `captureEfeonceReceipt` mantiene **false** como default del template y está activada
únicamente en el tag 6. El helper exige Client autenticado, ruta `/efeonce/lead-enrichment`,
dataset propio, UUID/lease/intento válidos y un único evento Lead. PageView conserva su envío
anterior y no recibe esta cabecera.

El worker envía el lease y número de intento en headers internos, fuera de CAPI user_data/custom_data.
El tag devuelve `x-efeonce-meta-receipt` saneado: dataset, API solicitada, evento/hora/nombre,
intento, HTTP Graph, parseo del body, contador recibido, traza acotada y errores numéricos. Nada
de raw responses, mensajes, tokens, URLs, PII, hashes o cookies. `queryPermission` hace que una
denegación del permiso de telemetría omita el recibo conservando el callback previo del tag.

El worker valida la correlación completa y finaliza con un solo UPDATE CAS. Agrega la observación
a `provider_receipts_json` (máximo cinco), sin reemplazar intentos anteriores. Recibos ausentes,
inválidos o inaccesibles son estados propios, no motivos nuevos para reenviar. Un timeout mantiene
la incertidumbre y los retries preexistentes. Una respuesta tardía no finaliza otro lease/intento.
Una caída del proceso antes del CAS puede perder ese recibo; no equivale a rechazo Meta ni habilita
reconstrucción o replay. `staleFinalizations` permite observar finalizaciones cuyo CAS ya no pertenece.
La falta de storage se detecta antes del claim/POST Meta; Google conserva su carril independiente.
El ciphertext se purga según contrato de 48 horas; la retención operacional conserva estos recibos.

La CLI READ ONLY añade `meta.receipt`: `status=recorded|not_recorded|invalid`,
`reception=acknowledged|not_confirmed|unknown`, y metadata por intento. Un cuerpo válido, HTTP
Graph 2xx, contador uno y ausencia de error numérico acreditan recepción de esa petición de un
evento. Procesamiento/matching/deduplicación/atribución permanecen `unknown`. Los lease UUID no
salen en esta proyección. El ACK sGTM conserva su significado independiente.

```sh
# Genera sólo un archivo nuevo local; sin autenticación, red o operaciones GTM.
pnpm exec tsx scripts/measurement/build-meta-receipt-template.ts --out /ruta/privada/meta-receipt.tpl

# Consulta una ocurrencia persistida; no envía una conversión.
pnpm --silent meta leads trace --event-id UUID --source-only
```

El builder comprueba SHA256 del upstream y anclas únicas, conserva código/permisos anteriores y
añade sólo el helper, checkbox y permisos necesarios. Fixture upstream/licencia están versionados
para pruebas reproducibles. No ejecutar `build-sgtm-lead-draft.ts` histórico para este cambio:
su contrato/base son anteriores y muta workspaces. El builder nuevo no lo invoca.

## Operación y siguientes verificaciones

La [expansión versionada](../../../migrations/20261018174804112_meta-event-receipts.sql) se aplicó
el 18/10 con autorización específica. El release posterior dejó activo el worker compatible.
Server 10 incluye el checkbox del tag 6 y conserva Client, sender, consentimiento, dataset,
triggers Lead backend y PageView. La compilación del conjunto pasó; el readback de la versión
publicada se registró a las 20:33:29Z. Esto no envió una conversión de prueba.

1. Antes de modificar el template, releer versión live, template y tag; revisar drift y evitar
   que una actualización del gallery elimine el parche. La publicación vigente usa el tipo nativo
   `cvt_191286361_3`, asociado al template 3.
2. Para otro cambio, preparar workspace, compilar Preview y revisar el diff antes de la publicación
   autorizada. Conceder sólo los permisos del manifest y conservar el scope del header reservado.
3. Con el próximo tráfico real autorizado, consultar la ocurrencia en la cola y la CLI. No reenviar
   un histórico ni crear un lead sintético sólo para llenar evidencia; Test Events tampoco es un
   sandbox de descarte. La captura de recibos es independiente del carril online de Google Ads.

### Precauciones de la API GTM

El PUT de actualización rechazó `galleryReference` con HTTP 400 por campo no soportado. El GET
confirmó que ese intento no cambió el template. El cuerpo corregido conservó `name` y `templateData`
y omitió esa metadata; el readback observó un fork nativo sin `galleryReference`.

La API normalizó la serialización de `TEMPLATE_PARAMETERS` y el espacio exterior de
`SERVER_PERMISSIONS`. La equivalencia se comprobó parseando únicamente esas dos secciones JSON:
el JavaScript y las secciones INFO, términos, tests y notas permanecieron byte a byte. No basta
aceptar cualquier diferencia de hash. El template publicado tiene SHA256 de `templateData`
`1331b38055d8b0fccb4701d6ed3beeadeee2eda70c7445ed7307073c3a4f9512`.
Ante un resultado incierto, reconciliar por GET antes de otro PUT y conservar los cuerpos y journals
privados; nunca restaurar el gallery para forzar una coincidencia.

Rollback conserva los recibos y puede retirar el checkbox/instrumentación usando versiones
compatibles. El Down no elimina evidencia. El carril antiguo puede seguir dando ACK sin recibo;
esa falta nunca se reconstruye desde stats/EMQ ni prueba que Meta rechazó el evento.

## Integridad al consultar

El reader rechaza intentos fuera de orden; admite huecos causados por intentos sin evidencia durable.
También rechaza una observación Graph posterior a su registro durable más allá de cinco minutos de
margen entre relojes. Usa la fecha de la propia observación, sin reinterpretar históricos con el reloj
actual. Un historial inválido muestra `invalid`/recepción desconocida y no habilita replay.
[Revisión local final](../../audits/growth/2026-10-17-meta-cli-final-review.md).
