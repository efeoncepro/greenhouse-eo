# Diagnosticar y recuperar Meta CAPI por GTM Server

> Manual de operador · 2026-10-13. GTM Server 5/Web 5 publicados; consentimiento y transporte activos.

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

Diagnóstico vigente: [2026-10-13](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md).
Hosting del mismo contenedor recuperado en `efeonce-group`, min 0/max 1 por servicio;
GTM server live 5/web live 5 publicados con autorización. HubSpot categorías y routing activo
WP/Think; [contrato de consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).
Test Events procesó PageView/Lead Server; navegación real de ambos hosts completó tags.
Próximas conversiones/replay de negocio aún sin observar. Renderer local preparado, sin release;
el sender usa UUID fallback compatible y no requiere otro evento/backend. Incidente QA previo
registrado en auditoría; nunca contar un Lead sintético como conversión comercial.

Matching de remarketing: implementación local y Preview/Test Events PASS en
[TASK-2034](../../tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md), pendiente de deploy.
[08 §4.2](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13)
es el contrato vigente. GA4 UPD/ack y siete audiencias90d ya activados; conservar el link Ads.
No poner hashes en parámetros GA4 ni dataLayer: usar user_data MP top-level sin events.

Para activar: publicar source/worker/renderer mediante release acotado; aplicar SQL parked
post-release, configurar tres refs pinned de Secret Manager y verificar resolución con la
identidad real del runtime. Activar captura, publicar ingreso sGTM sin test code y retirar
triggers Meta Lead12/17 en la misma versión antes de prender backend Meta. Google UPD sólo
con client_id real y consentimiento analytics+ads. Mantener PageView11 y mirror GA4.
Verificar registros de negocio, cola/HTTP y recepción provider por separado. Durante rollback:
senders/capture OFF, retención ON, no borrar key/ciphertext; restaurar sender anterior sólo
tras deshabilitar backend. No crear otra infraestructura ni promover trabajo ajeno por inferencia.
