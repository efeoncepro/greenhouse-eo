# Conversiones Google Ads para Forms y agendas

**Checkpoint 18/10, 20:43:28Z: configuración de producción verificada; primera conversión pendiente.**
Server **10** (`1792355562526`) se publicó primero y Web **6** (`1792355588730`) después,
con readback live. La cuenta6862539491 tiene EC efectiva **ON** y términos aceptados. El bridge
`4250795666af…` está servido en WordPress y Think. Performance y Discovery tienen políticas Ads
rev2 publicadas, con `activationAt=2026-10-18T20:35:00.000Z`; los destinos previos se conservaron.
El flag de proyecto se guardó `true` a las20:36:20Z. El companion Vercel del mismo main
`ec317c928fffcb919d71bdb62821b80280af2347`, `dpl_ER5v1bwisSTkfWE6BCd7jfJNLxvk`, está
**READY** y el alias apunta a él (20:43:28Z). SHA exacto, proyecto true y claves congeladas env/build
verifican la cadena de configuración; la API sólo expone nombres, no el booleano congelado ni ejecución
de una conversión. Primera ocurrencia comercial, recibo proveedor y
atribución siguen pendientes; el E2E no está cerrado. [Auditoría de activación](../../audits/growth/2026-10-18-google-ads-activation.md).

Corte 17-10-2026: código local y workspaces preparados, entonces **sin deploy ni publicación GTM**.
[ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md),
[arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
[evidencia](../../audits/growth/2026-10-17-google-ads-online-conversions.md).

Validación18/10 y [paquete de release](../../operations/releases/google-ads-2026-10-18/README.md):
Chromium aislado/API verificados; propuestas Performance/Discovery sin apply. Los hosts todavía
servían el bridge anterior. En ese corte el release general estaba bloqueado por alcance/CI/preflight; sin publicación GTM.
Smoke reproducible: `pnpm exec tsx scripts/gtm/google-ads-browser-smoke.ts` (todo interceptado,
respuestas simuladas; no certifica proveedor, GTM real ni atribución).

**Checkpoint 18/10, 19:51Z: release de código RELEASED.** Main
`ec317c928fffcb919d71bdb62821b80280af2347`; CI/Deep/smoke PASS; orquestador [39159325900](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39159325900)
SUCCESS; manifest `ec317c928fff-33c067f4-bc76-4a21-a5e0-a37a99ac726b` released a las 19:51:25.548Z,
releído a las 19:51:44.315Z. Vercel Production `dpl_F13UyAaTEjkcttFKc7aZjjtgTFNt` READY y alias
releídos a las 19:49:59Z; health HTTP 200 y watchdog `ok`, 6/6 runtimes, `drift=0` y `dataMissing=0`.
Canario admin 7/7, bundles Forms/Meetings/CTA y dos negativos `private, no-store` PASS; sin lead ni reserva
real. Las expansiones SQL de recibos están aplicadas; excepción específica de batch autorizada a las 18:53:53Z.
[Auditoría y límites](../../audits/releases/2026-10-18-full-develop-production-release.md).

`GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` estaba ausente en Production en ese checkpoint
(readback a las19:49:57.865Z) y conservaba OFF. No se publicó GTM ni se activaron políticas Ads con este release de código. El opt-in, hosts compatibles,
Preview funcional, EC efectiva y la primera solicitud/reserva real consentida conservaban sus gates
en ese corte; el avance posterior se registra en el checkpoint actual.
El PASS del contrato servido no acredita conversión enviada, recepción ni atribución Ads.

## Qué registra

| Resultado confirmado | Acción nativa secundaria | ID |
| --- | --- | --- |
| Solicitud comercial aceptada y persistida | Efeonce - Solicitud comercial aceptada | 7852486523 |
| Reserva confirmada por Scheduler y persistida | Efeonce - Agenda confirmada | 7852487186 |

Anunciante único **6862539491**, owner propio; Ads `jreyes@efeoncepro.com`.
Cloud **julio.reyes@efeonce.org**, proyecto `efeonce-group`; manager9531478329 es sólo ruta.
Ambas WEBPAGE, ONE_PER_CLICK, primaryForGoal=false, valor de medición0 CLP; no es ingreso ni valor
estimado de un lead. No se cambiaron campañas, objetivos de puja ni acciones GA4 HIDDEN.

El GCLID/GBRAID/WBRAID se observa, no se genera ni se dispara. Google tag/Conversion Linker mantienen
su contexto nativo. La cookie propia `efeonce_gads` conserva contexto observado hasta30d tras grant,
sin reemplazar `_gcl_*`; revocar/GPC limpia. El snapshot backend cifrado se purga con el plazo48h
existente. No hay carga de históricos, identificadores fabricados ni actualización de `hs_google_click_id`.

## Recorrido y privacidad

1. El visitante concede analytics y publicidad; cuatro estados Google explícitos deben estar granted.
   Procesamiento del formulario, communications opt-in y consentimiento anterior desconocido no bastan.
2. La política publicada de esa fuente/versión/surface/origin habilita `googleAds`. El flag global
   `GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` debe estar ON; por defecto está OFF.
3. Forms acepta y guarda; Meetings confirma proveedor y ledger. Un SAVEPOINT fallido no autoriza
   recibo Ads. Dedupe Forms60min y replay Meetings no producen otro recibo.
4. El recibo dedicado `googleAdsConversion` aporta key, transactionId UUID y caduca10min. Si EC está
   habilitado aporta hashes Google de email/teléfono, nunca contacto crudo ni click IDs.
5. El browser conserva hashes en memoria privada como máximo10s. GTM los obtiene por
   `efeonceReadGoogleAdsUserData(transactionId)` para el parámetro reservado `user_data`.
   Callback/timeout/pagehide/retiro limpian. No se añaden a dataLayer, estado UI ni analítica ordinaria.
6. `gh_ads_conversion` lleva sólo key/UUID y controles callback. El tag web lo transporta a GA4 Client
   de sGTM; Ads nativo usa su acción/label y transaction_id. El Server excluye ese evento del forwarding
   GA4. `generate_lead` existente y Meta conservan sus canales.

La dependencia browser permanece: cerrar pestaña o bloquear scripts puede impedir entrega. Guardar
una proyección no prueba envío Ads. El canal no tiene retries backend ni se presenta como Data Manager.

## Política operable por agentes

Usar `pnpm --silent growth:measurement discover|validate|apply|verify` con sesión canónica interna.
La API y CLI comparten CAS, revisión/publicación y autorización existentes. Preservar los destinos Meta
/UPD previos; no publicar todas las fuentes por lote implícito. Ejemplo del fragmento nuevo:

```json
{
  "googleAds": {
    "conversionKey": "commercial_lead",
    "enhancedConversions": true,
    "activationAt": "2026-10-17T00:00:00.000Z"
  }
}
```

Ese fragmento no es un comando completo ni activa nada por sí solo. Agendas usan `meeting_booking`.
Elegibilidad: Forms contact/diagnostic_intake/quote_request de riesgo low/medium y binding activo de
Meetings, con intención comercial revisada. Excluir soporte, contenido/newsletter, careers y pruebas.
La fuente/versión se comprueba de nuevo al preparar; destinos[] es válido para Ads-only.
El panel conserva la configuración Ads al editar una policy, pero su autoría inicial Ads es por API/CLI;
no se incorporó un formulario visual ni nueva tool MCP para este delta.

## GTM publicado y operación posterior

- Web `GTM-NGHPGRLZ`, live6: cuatro variables, trigger77 y tag78, preparados en workspace8.
- Server `GTM-K2X4ZTTK`, live10: variables38–40, triggers41/42/44/46, tags43/45/47,
  preparados en workspace12; forwarder18 agrega sólo blockingTriggerId41. El readback combinado
  previo al publish pasó173 checks. Preview técnico Server reconstruyó `user_data` con tres
  supresiones, sin etiquetas ni salidas; SDK Web live pasó cuatro casos con todo envío interceptado.
  Esto acredita protocolo/negativos, no entrega de una conversión Ads.
- `pnpm --silent google-ads conversions bindings` relee y verifica owner, tipo, estado, categoría,
  conteo, primary, AW y labels; salida sin HTML. No derivar AW del customer/actionID.
- `pnpm exec tsx scripts/gtm/google-ads-plan.ts` genera revisión offline con blockers. No publica ni
  ejecuta API. `--input` exige readback de acciones nativas según su schema; no admite pegar
  directamente la salida saneada de `conversions bindings` como si fuese ese formato.

Antes de publicar: comparar cuerpos/fingerprints frescos con el plan, confirmar ausencia de cambios
ajenos y repetir compilación/Preview. Validar Tag Assistant y el protocolo GA4 Client→Ads; comprobar
que el bridge no llega a GA4 ordinario ni Meta. La compilación no prueba entrega. Verificar en la
cuenta Ads los términos aplicables y habilitación efectiva EC; no inferirla de un tag configurado.
Histórico17/10: el operador autorizó aceptar los términos y se guardaron; el panel reabierto
confirmó «Has leído y aceptado estos términos». EC continuaba OFF en ese corte: la habilitación y el
rollout se realizaron después, según el checkpoint18/10 de este manual. [Evidencia](../../audits/growth/2026-10-17-google-ads-online-conversions.md#confirmación-posterior--términos-aceptados).

Coordinar release backend/renderers/bridge y sus hosts (WP/Think), publicar primero Server con la
excepción, luego Web, y sólo después habilitar policy/flag del backend tras consent smoke. Registrar
consentimiento revocado y los negatives. No habilitar el flag en producción con bundles incompatibles:
el contexto público previo era estricto. No se requiere migración, cron ni IAM nuevos.

La publicación requiere Preview y confirmación explícita del operador, según la skill GTM.
Después de publicar ejecutar `pnpm gtm:snapshot`, commitear ambos snapshots live y releer versiones.
No ejecutar el builder privado de preparación como reconciliador: un unknown necesita inspección,
y los recursos existentes deben compararse, no reutilizarse ciegamente por nombre.

Primera comprobación comercial: observar un lead/reserva real consentido y registrar ocurrencia,
transactionId, acción, salida del tag y diagnóstico Ads sin persistir contacto/hashes en evidencia.
No crear reservas/contactos ni conversiones ficticias para completar el gate. Atribución y puja
requieren sus ventanas y evidencia posterior; un tag fired o HTTP200 no las acredita.

## Rollback y trabajo posterior

Deshabilitar captura Ads y su opt-in de política. Conservar Meta/UPD y la limpieza48h; no reenviar
ocurrencias históricas al reactivar. Revertir sólo los tags nuevos con versiones gobernadas, manteniendo
la exclusión GA4 mientras pueda llegar el evento técnico. Un rollback no retira datos ya enviados.

Qualified lead, oportunidad y negocio ganado son acciones diferentes. Su entrega posterior requiere
binding durable al CRM y elegir **HubSpot nativo o Data Manager**, uno por acción; este rollout no los
activa. TASK-1885 conserva UTMs/binding de campaña de agendas. No generar otro Forms submit para booking.
