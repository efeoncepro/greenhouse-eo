# Publicación Ads de formularios comerciales — 18/10/2026

**API verificada22:57:03.870Z:13 formularios comerciales y Discovery con Ads publicado.**
Se publicaron12 formularios adicionales:11 de las propuestas previas (incluido AI Grader, excluido
Contacto) y Lead Gen Web después de corregir su clasificación. No se creó ninguna conversión de prueba.
[Readback saneado por fuente/versión/revisión](2026-10-18-commercial-forms-policy-publication.evidence.json).

## Decisiones y cobertura

Julio confirmó que AI Grader tiene intención comercial y que Contacto es contacto general. Ads se
habilitó para AEO, AI Grader, cotización web, diagnóstico SEO, auditoría social, brief Creators/UGC,
alcance HubSpot, Content Marketing, diagnóstico creativo, medios, inbound y Lead Gen Web. Performance
ya estaba activo. Discovery conserva la acción de reserva confirmada y su política previa.

Contacto no recibió `config.googleAds`; sus destinos Meta/UPD previos permanecen exactos. Los dos
ebooks, careers, newsletter, soporte y fixtures no se incorporaron. Las políticas que ya existían
conservaron destinos/mappings; las tres fuentes sin política previa usan Ads-only. No se habilita
Meta/UPD por inferencia. El catálogo final tiene15 cabezas publicadas y14 fuentes Ads, incluida agenda.

Se usó validate → draft → review → publish, CAS sobre cabeza previa, clave por operación y recibo
privado persistido antes del write; cada transición recibió GET independiente. La revisión final
comprobó13 Forms, agenda, heads exactos, versiones vigentes, destinos y ausencia Ads en Contacto/ebooks.
Los bindings y acciones Ads existentes se reutilizan: anunciante6862539491, EC ON, acciones secundarias,
GTMWeb6/Server10 y mainEC/companion ER5 del release anterior. No hubo cambio de campañas, puja, GTM,
OAuth, IAM o deployment. Ads jreyes@efeoncepro.com; Cloud siempre julio.reyes@efeonce.org/efeonce-group.

## Corrección Lead Gen Web

La fuente97d75d87-0795-4c78-a490-9eba560bf559 declaraba captación de leads comerciales de diseño web,
pero su tipo era `lead_magnet`. Se implementó una corrección estrecha en el command/store canónico
Forms y se ejecutó mediante CLI de operador explícita, perfil ops. La definición se bloquea, exige
hash íntegro esperado, tipo previo, fuente activa/riesgo low-medium y única versión publicada fijada.
Sólo cambia `form_kind` a `quote_request` y `updated_at`; todo otro metadato, key, slug, versión,
campos, consentimiento y destinos permanecen. El recibo se reserva antes de ejecutar y no admite
repetir una mutación unknown. GET del catálogo y GET público verificaron la corrección; la versión
`fver-efeonce-lead-gen-web-v1` sigue vigente. No se abrió una excepción global para lead magnets.

La nueva ruta admin `POST /api/admin/growth/forms/{formId}/classification` comparte command y exige
contexto interno + `growth.forms.author`; identidad de actor sale de sesión. Está implementada/testeada
**en código local de este commit, sin desplegar**. La operación aplicada usó el primitive canónico local;
la lectura/configuración Ads productiva usa el código ya desplegado. No se afirma que esa nueva ruta
admin esté disponible en producción. [Manual](../../manual-de-uso/growth/corregir-clasificacion-comercial.md).

## Verificación y límites

20 pruebas del command/store y API: permisos, path/key, payload estricto, riesgo/estado, head publicado,
hash concurrente, reintento viejo y preservación de otros campos. ESLint y TypeScript PASS. API final
compara configuración por fuente y contrato público Web. El [inventario previo](2026-10-18-commercial-forms-measurement-coverage.md)
queda fechado; ya no describe el estado actual como12 propuestas sin aplicar.

Esta evidencia es de configuración. No prueba una primera recepción Ads, Graph, identidad nativa HubSpot,
atribución o mejora de campaña. El canal depende del navegador/consentimiento. El intake histórico
propio de AI Grader tiene su fachada y no queda certificado por publicar la política: el readback no
sustituye verificar la ruta frontend efectiva y su primera ocurrencia. No se fabricaron leads, reservas,
click IDs ni replay. No se amplía automáticamente la cobertura de nuevas fuentes o versiones futuras.

Rollback de configuración: nuevas revisiones por CAS que retiren sólo Ads preservando destinos previos;
revisar las tres políticas Ads-only antes de desactivarlas. No restaurar a ciegas heads históricos ni
revertir la clasificación comercial correcta. Conversiones ya transmitidas no se retiran por rollback.
