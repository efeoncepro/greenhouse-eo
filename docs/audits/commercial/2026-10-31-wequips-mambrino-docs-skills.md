# Cierre documental — Wequips y Mambrino

Fecha: 31/10/2026. Mandato: «Actualiza todos los docs y skills y luego commit».
Alcance: las dos cuentas y las lecciones verificadas de este hilo; no todo el WIP del checkout.

## Evidencia y resultado

- [Wequips / Mayra](../../commercial/prospecting-agent/runs/2026-10-30-wequips-mayra.md): envío al buzón
  publicado e InMail; waterfall sin correo y cero créditos. El posterior envío individual inferido
  rebotó con 550 5.4.1; nota/banner/actividad verificados, sin reintento. Update de propiedades no confirmado.
- [Mambrino / Dayanna](../../commercial/prospecting-agent/runs/2026-10-31-mambrino-dayanna.md): consentimiento
  propio de waterfall, email `Verified`, dos créditos; Contact/Primary y EMAIL `SENT` comprobados.
  Firma gráfica, CCO, landing y brochure individual confirmados en borrador y copia de Enviados.
  La empresa vacía automática quedó secundaria; membresía de segmentos no confirmada por límites del carril.

La evidencia privada conserva correos, shortlinks individuales, recibos y cuerpos completos. La versión
del repo conserva identidad profesional, fuentes públicas, IDs de CRM, resultado y límites, sin copiar
emails de prospectos, IDs crudos de Outlook, requests del proveedor o vínculos de tracking individuales.
Este cierre usa los recibos de la operación realizada, sin nuevos envíos, créditos, writes CRM o pruebas
de entrega. Una nota, una actividad `SENT` o el lifecycle automático no certifican lectura ni calificación.

## Cobertura documental

- **Técnica:** [decisión B2B vigente](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md)
  y [runbook CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md), con límites de OAuth,
  automatización y readback por carril.
- **Funcional:** [prospección B2B](../../documentation/comercial/prospeccion-b2b.md), estados separados
  por persona/canal y alta repetida resuelta sin duplicación.
- **Manual:** [operar prospección](../../manual-de-uso/comercial/operar-prospeccion-b2b.md),
  [captura CRM](../../manual-de-uso/hubspot/llenar-propiedades-comerciales.md) y
  [Outlook](../../operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).
- **Skills espejo Claude/Codex:** `efeonce-b2b-prospecting/references/contact-quality-and-enrichment.md`
  y `hubspot-as-a-service/references/account-based-prospecting.md`: permisos por persona, resultado adverso,
  Primary tras automatización y verificación de alta existente. Entrypoints conservan sus rutas actuales.
- **Descubrimiento:** registro de prospección, índice Commercial, Handoff y changelog apuntan al cierre.

Aplican los ADRs existentes de método B2B y
[admisión/segmentación](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
No hay cambio de schema, API, permisos, autonomía, scheduler o runtime: no corresponde otro ADR.
AGENTS y CLAUDE ya enrutan a las fuentes correctas; project_context ajusta sólo el rótulo del enlace B2B
a permisos y Primary, sin añadir historia inline.
Copywriting, Commercial, gráfica y oferta HubSpot revisadas sin cambio: no se modifican voz, diseño,
brochures ni promociones generales. No se toca el scheduler/radar ni se abre una task de implementación.

## Verificación y alcance del commit

Verificación realizada: `pnpm skills:mirrors` PASS; 34 enlaces locales comprobados sin rotos;
adiciones sin correo de prospecto, shortlink individual o ID Outlook; `git diff --cached --check` PASS.
`node scripts/check-documentation-closure.mjs --staged --strict`: cero advertencias.
`pnpm docs:context-check:strict`: cero errores y advertencias, repetido después de la última edición. El índice se construye sólo con las adiciones propias sobre HEAD para conservar
WIP previo incluso en los mismos archivos. No se incluyen cambios de pricing, ARMOR, MG Indusol, licitaciones,
artefactos creativos ni otros registros operativos. Sin push.

## Pendientes operativos conservados

Julio/Commercial: esperar respuesta/brief; no reintentar el correo rebotado de Mayra. En una revisión CRM
autorizada, conciliar Company secundaria y verificar segmentos de Mambrino con un carril permitido.
No se presentan estos pendientes como cambios de documentación faltantes ni como tareas ejecutadas.
