# Contrato técnico de la landing pública Contacto

**Ruta:** `https://efeoncepro.com/contacto/`
**Surface:** `efeonce-contacto`
**Task de origen:** [TASK-1801](../../tasks/complete/TASK-1801-contacto-multistakeholder-form-agenda.md)
**Estado:** construida, verificada y aprobada por el operador el 2026-09-15.

## Composición

La página vive en WordPress/Kinsta con Ohio y Ohio Child. Elementor compone el hero de Nexa, el formulario
hosted de Growth Forms, la vía independiente de Meetings, el bloque de datos institucionales, el FAQ y la
banda de reuniones. WordPress es host de composición: no contiene secretos, mappings de CRM ni lógica de
dispatch.

Growth Forms controla definición/versionado, condiciones, validación, consentimientos, persistencia, receipts y
dispatch. Meetings controla disponibilidad, booking y confirmación. La rama de empleo se desvía al portal
Careers y no recibe postulaciones en este formulario.

## Contratos visibles

- Hero responsive con imagen aprobada de Nexa, narración y pasos de orientación; a 390 px no hay overflow.
- Motivos semánticos con iconos azules, campos condicionales, consentimientos accionables y estados de error.
- Selector de país con bandera y código; el chevron cerrado apunta abajo y el abierto gira 180 grados hacia
  arriba. La regla está documentada también en la referencia de la skill para evitar regresiones.
- Datos page-scoped: `hola@efeoncepro.com`, móvil Chile `+56 9 3732 3064`, línea Chile `600 914 0660`,
  Estados Unidos `+1 (239) 235-2073` y casa matriz en Santiago de Chile.
- SEO/AEO: título `Contacto Efeonce | Escríbenos o agenda una reunión`, descripción orientada a motivos,
  Santiago y agenda; Open Graph determinístico 1200×630; `ContactPage`, `Organization` enriquecido y FAQ
  visible, sin inventar `LocalBusiness`, horarios o reseñas.

## Evidencia y límites

La verificación pública cubrió contenido, formulario, Careers, agenda, datos institucionales, SEO/schema y
overflow en desktop/mobile. El candidato responsive y el selector de país son artefactos locales hasta que un
rollout gobernado los publique; no se afirma despliegue adicional. El footer global de Ohio conserva una
dirección legacy fuera del ownership page-scoped de esta landing. Routing operativo por motivo, SLA, booking
end-to-end y entregabilidad de cada destino requieren una unidad posterior con sus owners y evidencia propia.

Fuentes: [brief aprobado](../../public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md) y [referencia operativa de la
skill](../../../.codex/skills/efeonce-public-site-wordpress/references/landings/contacto.md).

## Release pendiente: selector premium de países

El selector con banderas está implementado en el repositorio, pero todavía no está publicado. El release debe
promover el renderer productivo (`growth-forms/renderer-latest.js`) y los assets SVG de banderas. Después se debe
ejecutar `scripts/growth/activate-contacto-country-select.ts --apply`: el comando crea, revisa y publica una nueva
versión de `efeonce-contacto`, conserva destinos/consentimientos, depreca la anterior y verifica el contrato leído
por el runtime público. Es una mutación gobernada de Growth Forms, no sólo un cambio visual de WordPress.

Prechecks obligatorios: renderer y bandera responden en producción, snapshot/rollback disponible, revisión de la
nueva versión, readback API y GVC desktop/mobile con teclado y `scrollWidth === clientWidth`. Si falla cualquiera,
mantener la versión actual de texto y declarar `code complete, rollout pendiente`.
