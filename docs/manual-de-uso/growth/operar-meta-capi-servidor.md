# Diagnosticar y recuperar Meta CAPI por GTM Server

> Manual de operador · 2026-10-13. GTM Server6/Web5, matching activado; primera conversión comercial consentida post-flip sin observar.

1. Leer el [runbook](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md)
   y la [decisión](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md).
2. Verificar acceso Google CLI/ADC y read-only GTM. Seleccionar **Efeonce Server**
   `GTM-K2X4ZTTK` (cuenta `6068297031`, container `191286361`), confirmar `usageContext=server`.
   `GTM-NGHPGRLZ` es web y no sustituye el servidor.
3. Releer live version, Clients, template/tag CAPI, permisos y endpoint. Inspeccionar
   infraestructura sin exports con tokens. No asumir que el token funciona porque existe.
4. Seguir en Preview servidor la cadena ingreso → Client → evento → trigger → tag → Meta.
   Revisar fuentes de ambos hosts y `gh_form_submission_accepted → generate_lead` tras
   aceptación backend de formularios comerciales;
   aislar el primer fallo antes de editar recursos.
5. Preparar workspaces aislados con mappings PageView/Lead, gate de consentimiento,
   ingreso backend validado, identidad estable y exclusiones. Consultar el runbook para
   datos permitidos, secretos y alcance de cada fuente. No añadir PII a GA4/dataLayer.
6. Con alcance de prueba autorizado, usar Test Events para confirmar origen **Server**,
   URLs correctas y pruebas negativas/replay/dedupe. Guardar sólo evidencia saneada.
7. Presentar diff/QA/rollback y pedir aprobación de publicación sobre cambios concretos;
   hosting, DNS/IAM, secreto y canary tienen límites propios. No publicar otros workspaces.
8. Retirar test code, verificar versiones y recepción live posterior en Meta; registrar
   estado y evidencia en [tracking plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md).

`pnpm gtm:snapshot --check` y `pnpm measurement:smoke` son controles **web/GA4**.
No demuestran entrega servidor a Meta. Pixel browser es complementario si se decide dual;
compartir nombre e ID con CAPI y verificar deduplicación. No fabricar conversiones reales
para probar ni confundir recepción con atribución o resultados comerciales.

Estado vigente: [release completo y matching](../../audits/releases/2026-10-13-full-develop-matching-release.md).
Hosting del mismo contenedor en efeonce-group, min0/max1; Server6/Web5, sin Test Events code.
Client backend31/trigger33 es el emisor Meta Lead; legacy12/17 retirados. PageView11 y mirror
GA4 continúan. HubSpot categorías/routing activos WP/Think. [Consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).
SQL aplicada, refs pinned y tres flags worker true (Ops00775-fnh100% + GitHub repo vars),
captura Vercel true exacta tras redeploy READY. Canary worker200 resuelve secretos reales;
cola/leaseCAS/retención probados con rol runtime. Preview/Test Events Processed/Server mostró
em/ph/fn/ln y clasificadores; negativos live no disparan Meta. Primera conversión comercial
real consentida post-flip todavía sin observar. No crear negocios de prueba ni afirmar serving.
GA4 UPD/ack y siete audiencias90d activos; conservar link Ads. Nunca hashes en parámetros
ordinarios/dataLayer: user_data MP top-level sin events adicionales.

Secuencia aplicada; para un futuro rollout, releer primero el estado: publicar source/worker/renderer mediante release gobernado con el alcance
autorizado (operador13/10: todo develop→main); aplicar SQL parked post-release y configurar
tres refs pinned de Secret Manager. Publicar ingreso sGTM sin test code y retirar triggers
Meta Lead12/17 en la misma versión; luego destinos/retención worker ON y verificar resolución
con su identidad real. Activar captura y redeploy Vercel al final. Google UPD sólo con client_id
real y consentimiento analytics+ads. Mantener PageView11 y mirror GA4; forwarding GA4 exige
Client Name=GA4 y excluye el Client backend. Validar la versión congelada antes del publish.
Verificar registros de negocio, cola/HTTP y recepción provider por separado. Durante rollback:
senders/capture OFF, retención ON, no borrar key/ciphertext; restaurar sender anterior sólo
tras deshabilitar backend. No crear otra infraestructura ni promover trabajo ajeno por inferencia.
