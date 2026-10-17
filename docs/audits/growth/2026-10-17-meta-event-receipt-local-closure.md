# Recibo Meta por evento — cierre de implementación local

Pedido del operador 2026-10-17: implementar y commit, **sin activar ni desplegar**.
[ADR](../../architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) ·
[Manual](../../manual-de-uso/growth/conservar-recibos-meta.md).

## Resultado preparado

Instrumentación del callback del sender Meta fijado, con gate default OFF y header reservado al
Client backend autenticado. El builder es offline, comprueba SHA256/anclas y conserva payload,
URL, callbacks y permisos anteriores. Fixture upstream y licencia Apache2 preservados; helper
Efeonce separado. No se ejecuta el builder histórico que autentica y muta workspaces.

Worker valida UUID, hora, lease e intento del recibo saneado. Se guardan HTTP original Graph,
contador recibido, traza acotada, parseo y errores numéricos. No se guardan raw bodies, mensajes,
tokens, URLs, user_data, hashes o cookies. ACK sGTM conserva su contrato y la falta de telemetría
no añade retries. Google UPD mantiene su carril separado.

Finalización y append del historial (máximo cinco observaciones) comparten un UPDATE CAS. SQL
protege orden, identidad y prefix inmutable; respuestas tardías no tocan otro lease/intento.
Caída antes del CAS puede perder un recibo: se conserva incertidumbre, no se fabrica evidencia.
`meta.receipt` en la CLI READ ONLY separa recepción de procesamiento/matching/dedupe/atribución,
que permanecen desconocidos. Históricos anteriores no reciben un backfill desde ACK o stats.

## Evidencia local

- 402 tests en 26 archivos Vitest PASS: incluye regresiones CLI/HubSpot/Measurement y pruebas del
  template upstream completo en sandbox simulado; payload y URL idénticos al upstream.
- 36 tests Node de consentimiento/atribución/Client ingress PASS.
- Casos: counter0/2, JSON inválido/oversize, scopes públicos/checkbox OFF/permisos denegados,
  4xx/5xx, timeout, UUID/hora/lease incorrectos, peticiones concurrentes en orden inverso,
  saneamiento de PII, ausencia de recibo sin otro POST y CAS tardío/Google independiente.
- SQL Up repetido en PostgreSQL17.5 aislado (PGlite0.3.14): append conserva ambos intentos,
  lease antiguo devuelve cero filas, intento ajeno/rewrite rechazados y Google aislado.
  Base compartida intacta. SQL pendiente fuera de `migrations/`, sin registro aplicado.
- TypeScript strict focal con código/imports canónicos y ESLint propios PASS.

Artefactos locales privados: `/Users/jreye/Documents/Meta-Efeonce-Connection/meta-receipt-2026-10-17/`:
template generado con default OFF, manifest SHA256, resultado SQL y salidas de comprobación.
La simulación no sustituye a la compilación real de GTM, revisión del workspace o readback nativo.

## Estado operativo

Código local preparado, no rollout. Ningún push, cambio de flags/secretos, DDL compartido,
workspace/Preview/publish GTM, deploy, POST de conversión o redispatch de leads.
El consentimiento/publicación y CRM existentes no se modificaron. HubSpot también conserva la
instrucción previa de dejarlo preparado sin activar. Gates futuros sólo con nueva autorización.
