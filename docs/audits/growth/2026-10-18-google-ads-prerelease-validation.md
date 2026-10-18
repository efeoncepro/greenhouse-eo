# Google Ads — validación previa al release, 18-10-2026

Pedido: validar Forms/agendas, revisar API y preparar paquete; **sin publicar GTM ni desplegar**.
Owner: Growth/Integrations. ADR existente de Google Ads; TASK-2034 conserva lifecycle in-progress.
[Paquete y rollback](../../operations/releases/google-ads-2026-10-18/README.md).

## Resultado

- **CONDITIONAL PASS** de preparación Ads: suites, Chromium aislado, APIs, propuestas offline y
  hashes de assets preparados. No hay cambio funcional de producto en esta unidad.
- **BLOCK** del release completo: preflight del candidato local sin CI remoto y batch policy
  `requires_break_glass`. No se pidió ni ejecutó bypass.
- No hay prueba de entrega Ads, atribución, reserva HubSpot/Outlook/Teams ni envío CRM nuevos.
  El harness no representa el GA4 Client real ni el comportamiento de tags Google descargados.

## Readbacks independientes

Todas las llamadas Ads fijaron6862539491 / MCC9531478329. Auth verifica email Google
`jreyes@efeoncepro.com`. Cloud/impersonación siempre `julio.reyes@efeonce.org` / `efeonce-group`.

| Gate | Evidencia nueva | Límite |
| --- | --- | --- |
| Cuenta Ads | Owner686, auto-taggingON, `acceptedCustomerDataTerms=true`, EC efectiva `OFF` | Aceptación no habilita EC |
| Acciones | Dos bindings ready=true, una página completa, AW/labels iguales al paquete | No implica recepción |
| GTM cuerpos/conflictos |107 checks PASS por GET: plan canónico, entidades previas, excepción exacta, sin altas ajenas ni conflictos | Borradores; no publish |
| GTM live | Web5 / Server9 sin cambio | Sin afirmar runtime del borrador |
| Compilación fresca | quick_preview HTTP200 en ambos, compilerError=false, version0;15:08:07/08UTC | Versión efímera; no versión publicada |
| Políticas | GET admin autenticado con sesión canónica;17 fuentes,12 policies publicadas, ninguna con `googleAds` | No se llamó apply |
| Resolver actual |17 fuentes,14 Ads-eligible por tipo/riesgo,0 blockers; consulta canónica read-only | No aprueba intención comercial |
| Forms render contracts |16 GET públicos HTTP200 y16 versiones coincidentes | No hubo POST de negocio real |
| Hosts | Bridge anterior idéntico en ambos hosts; no contiene atributos Google nuevos | Compatibilidad pendiente del release |

Artefactos privados0600/0700 en `.auth/google-ads-prerelease-20261018/`: account/bindings/actions,
gtm-comparison, preview, policies, sources-current, host-compatibility y preflight-final.
No se guardaron secretos OAuth, contacto ni hashes de identidad reales en Git/evidencia.
El significado de `effective_enablement_setting` se contrastó con la
[referencia primaria v26](https://developers.google.com/google-ads/api/reference/rpc/v26/ConversionTrackingSetting):
es la configuración efectiva de conversiones mejoradas a nivel de cuenta.

## Chromium — positivos y negativos sin envío

Comando reproducible:

```bash
pnpm exec tsx scripts/gtm/google-ads-browser-smoke.ts
```

Se compilan/importan FormRenderer, MeetingRenderer y sus API clients reales. Chromium abre un
documento enteramente interceptado bajo cada hostname permitido; no navega al sitio público.
Cada request recibe fixture local o se aborta. Service workers bloqueados. Se simulan respuestas
de aceptación/confirmación, no persistencia ni proveedor. Captcha usa puerto de prueba explícito.

**32 escenarios PASS**:2 hosts ×2 recorridos ×8 casos. Viewport390×844, reduced motion.

| Caso | Expectativa comprobada |
| --- | --- |
| Aceptado/confirmado con recibo válido | Una señal Ads; datos reservados disponibles sólo mediante getter |
| Sin recibo / replay no elegible | Cero señales Ads; negocio sigue su resultado |
| Rechazo/error | Cero señales Ads |
| Google denied | Cero señales Ads |
| Google desconocido | Cero señales Ads aunque legacy ads/analytics estén granted |
| GPC | Cero señales Ads |
| Recibo vencido | Cero señales Ads |
| Key de otra acción | Cero señales Ads |

En todos: exactamente un POST de negocio **interceptado**, consentimiento leído por API client,
cero errores JS y cero requests externos. En positivos: retransmitir mismo UUID no duplica;
callback elimina la entrada EC; ningún email/hash está en dataLayer ordinario. También se ejecutan
los CJS canónicos de GTM: consentimiento devuelve0/1 esperado y getter resuelve el canal reservado.
Se ejecuta código local fijado, no scripts arbitrarios de un input/proveedor.

La primera corrida del harness reveló una espera incorrecta sobre un alert preexistente; se
cambió por observación de aceptación/rechazo/estado final antes de asertar. No se alteró el motor
para hacer pasar el test. TypeScript del harness se corrigió; pasada final registrada.

Salida `.captures/google-ads-prerelease-20261018/result.json`, cuatro capturas positivas. Se usó
Playwright focal porque se necesitaba interceptar absolutamente todas las peticiones y controlar
respuestas/consentimiento; el DSL de captura visual no expresa esta prueba de protocolo local.
No se emite un veredicto de diseño visual con estas capturas.

## Pruebas y build

-34 suites /481 tests PASS: contexto, recibos/backend/policies/store, CLI Ads, compilador GTM,
  ambos renderers/API clients/telemetría y command Meetings; proyecto unit, dos workers.
-3 suites /18 tests adicionales PASS: frontera Forms→CRM/medición, revalidación y nombres.
  Son archivos distintos de la corrida481; total focal **499**.
- Bridge:16 checks PASS; suite atribución:13 casos (Node informa14 subtests por harness incluido).
- Bundles Forms y Meetings construidos con builders canónicos. Outputs y copias de revisión
  fuera del commit; SHA-256/tamaño en manifest.
- TypeScript strict focal21 entradas originales +2 herramientas de esta unidad y ambient types;
  ESLint de herramientas PASS. Sin build/typecheck global ni CI remoto de este nuevo commit.
- Se intentó un filtro `commands.test.ts` inexistente: Vitest informó sin archivos y exit1.
  No se contó como prueba; se localizaron y ejecutaron las suites reales de frontera Forms.

## Preparación de activación

Se prepararon comandos draft offline para Performance/Discovery contra heads actuales, conservando
destinos previos y mapping. Schema y mapping contrastados contra el resolver actual. No se fijó
una ventana efectiva ni se enviaron al backend. Antes de aplicar hay que refrescar fechas/CAS/clave.

Lead Gen Web y dos ebooks son lead_magnet y quedan excluidos por tipo. Las otras14 fuentes
técnicamente elegibles no son un lote aprobado; sólo2 se proponen para primera revisión.
No hay cambio `hs_google_click_id`, unión histórica CRM ni sender Data Manager nuevo.

## Preflight general y límites de release

Se ejecutó el CLI canónico, primero sin entorno completo y luego con fuentes locales/custodia
GitHub en memoria y las referencias de WIF/Sentry declaradas por production-release.yml.
No se imprimieron valores de tokens. Los defaults históricos del preflight apuntaban a otro
nombre de pool/provider; con `github-actions` / `efeoncepro-greenhouse-eo`, WIF pasó sin cambios IAM.

Lectura final15:08–15:09UTC: PostgreSQL health y migrationsOK, Vercel staging/production READY,
WIF ACTIVE/mapping completo, Sentry sin issues activas error/fatal en su ventana configurada;
sin approvals production stale ni runs vacíos. Azure conserva warning sin federated credentials.
Estos readbacks no prueban el funcionamiento del nuevo código servido.

Candidato `b8cdf8b1f5aa0c891a978386b89bad816444cf36`: dos commits locales por delante de
origin/develop al corte, GitHub422 / CI0 / smoke0. Diff frente al último main released9690efad:
1.406 archivos; batch classifier marca `.github/workflows/gtm-drift.yml` y exige autoridad/audit
de override. No hay GO de release ni excepción nueva. Repetir para el SHA final y revisar el
alcance total con la skill de producción; no promover sólo por esta auditoría Ads.

## Pendientes explícitos

- [ ] CI/smoke y preflight aprobados para el candidato definitivo, con alcance general revisado.
- [ ] Distribución compatible de bridge/renderers y readback en WP/Think mediante release autorizado.
- [ ] Preview funcional del protocolo real Google tag→GA4 Client→Ads nativo, sin falsificar demanda.
- [ ] EC efectiva habilitada, políticas revisadas y flag servido verificado en activación posterior.
- [ ] Publicación coordinada Server→Web y snapshots live actualizados.
- [ ] Primera ocurrencia comercial consentida y diagnóstico Ads; entrega CRM verificada aparte.

No quedan ocultos como aprobados por tests. No se realizó ninguna de estas activaciones.
