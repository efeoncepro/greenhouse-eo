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

## Release aplicado: selector premium de países

El release del renderer productivo (`growth-forms/renderer-latest.js`) y de los assets SVG de banderas fue verificado
en producción el 2026-09-15. Luego se ejecutó `scripts/growth/activate-contacto-country-select.ts --apply`: creó,
revisó y publicó la versión `fver-c00955ca-863a-4e7d-99c7-c09706660a3a` (v3), conservó el destino existente,
deprecó la v2 y verificó el contrato leído por el runtime público. Es una mutación gobernada de Growth Forms,
no sólo un cambio visual de WordPress.

Evidencia: renderer y bandera responden HTTP 200; el readback API devuelve `country.type=select`,
`presentation.control=country_select`, placeholder `Selecciona tu país` y 250 opciones; el árbol de accesibilidad
del navegador muestra el combo `ghf-1-country`. El rollback conserva la v2 como referencia y permite deprecar la v3
sin borrar submissions.
