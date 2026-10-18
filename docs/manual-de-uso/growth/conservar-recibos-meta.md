# Preparar recibos de Meta por evento

Estado 2026-10-18: expansión DB autorizada y aplicada; worker compatible ya servido.
Captura en GTM sin activar/publicar. [Reparación y readback](../../audits/releases/2026-10-18-candidate-89d70ec13-review.md).
[ADR](../../architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) ·
[Qué demuestra cada evidencia](../../documentation/growth/meta-individual-event-verification.md).

## Contrato preparado

El sender sigue en el template de GTM Server fijado en `a575edb31aa447469b855c3006ed9991dad711cf`.
El callback inspecciona el resultado de la única petición que ya envía. No crea otro sender o POST.
La opción `captureEfeonceReceipt` permanece **false** por defecto. Si se autoriza en el futuro,
exige Client autenticado, ruta backend exacta, dataset propio, UUID/lease/intento válidos y Lead.

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
El ciphertext se purga según contrato48h; la retención operacional conserva estos recibos.

La CLI READ ONLY añade `meta.receipt`: `status=recorded|not_recorded|invalid`,
`reception=acknowledged|not_confirmed|unknown`, y metadata por intento. Un cuerpo válido, HTTP
Graph2xx, contador uno y ausencia de error numérico acreditan recepción de esa petición de un
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

## Gates futuros, sujetos a nueva autorización

1. Releer template/live del container servidor y revisar drift respecto del pin. No sobrescribir
   cambios recientes ni permitir que una actualización automática del gallery elimine el parche.
2. La [expansión versionada](../../../migrations/20261018174804112_meta-event-receipts.sql)
   se aplicó el 18/10 con autorización específica para reparar el worker existente, sin deploy.
   Verificar schema/trigger/constraint antes de reanudar Meta. Revisar dependencias del lote,
   incluido storage preparado de HubSpot, sin habilitar sus opt-ins por inferencia.
3. Por el control plane habitual, preparar workspace, compilar Preview sin enviar eventos y
   revisar diff: sender, triggers, consentimiento, dataset y PageView preservados; header reservado
   sólo para Lead backend. Conceder permisos únicamente del manifest. Publicación no autorizada hoy.
4. Verificar worker compatible activo (ya servido al reparar el18/10) y, sólo con autorización,
   habilitar el checkbox del tag Lead. Cualquier nuevo deploy conserva el control plane habitual.
   Leer revisión activa, template/Client/tag, permisos y opciones reales; archivo local no es deploy.
5. Con tráfico real autorizado, verificar receipt en la cola y la CLI. No reenviar un histórico ni
   crear un lead sintético sólo para llenar evidencia; Test Events tampoco es sandbox de descarte.

Rollback conserva los recibos y puede retirar el checkbox/instrumentación usando versiones
compatibles. El Down no elimina evidencia. El carril antiguo puede seguir dando ACK sin recibo;
esa falta nunca se reconstruye desde stats/EMQ ni prueba que Meta rechazó el evento.

## Integridad al consultar

El reader rechaza intentos fuera de orden; admite huecos causados por intentos sin evidencia durable.
También rechaza una observación Graph posterior a su registro durable más allá de cinco minutos de
margen entre relojes. Usa la fecha de la propia observación, sin reinterpretar históricos con el reloj
actual. Un historial inválido muestra `invalid`/recepción desconocida y no habilita replay.
[Revisión local final](../../audits/growth/2026-10-17-meta-cli-final-review.md).
