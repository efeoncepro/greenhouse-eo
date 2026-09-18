# Contrato técnico de la landing pública Contacto

**Ruta:** `https://efeoncepro.com/contacto/`
**Surface:** `efeonce-contacto`
**Task de origen:** [TASK-1801](../../tasks/complete/TASK-1801-contacto-multistakeholder-form-agenda.md)
**Estado:** construida, verificada y aprobada por el operador el 2026-09-15; release de copy de cobertura y
banda de reuniones en móvil aplicado el 2026-09-16.

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
overflow en desktop/mobile. El selector de país está publicado; queda pendiente promover el hotfix del renderer
que reemplaza el glifo erróneo `↗` del ícono de país por su SVG geográfico. El footer global de Ohio conserva una
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

### Pendiente para el próximo release del renderer

El override page-scoped `ghf-country-icon-ohio-override-v1` se probó y se revirtió el 2026-09-16: el CSS no
atraviesa el Shadow DOM del renderer y dejaba `globe` junto al SVG. Se restauró el snapshot
`_gh_contacto_before_country_icon_override`; no queda mitigación live para ese problema. Tras el release del
renderer se detectó una duplicación distinta (pin azul del host + globo SVG del renderer); se corrigió sin release
mediante CSS page-scoped `ghf-country-icon-dedup-v1`, que oculta solo el globo dentro de `/contacto/`. Los commits
`e5d4a0fb2` y `d15bb9256` siguen siendo el hotfix del renderer; no requiere crear otra versión de Growth Forms.

## Release aplicado: cobertura y banda de reuniones (2026-09-16)

Ejecutado por el carril SSH/WP-CLI sobre la página `20729`, sin token de Kinsta. Tres pasos: exportar el código
vivo, construir el paquete acotado contra ese baseline e instalarlo.

```bash
pnpm public-website:export-live-code
node scripts/public-website/build-contacto-elementor-package.cjs <baseline>
pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-contacto-elementor-package.php \
  --input-file tmp/contacto-elementor-release/package.zip \
  --input-file tmp/contacto-elementor-release/manifest.json --wp-user 12
```

Resultado: `{"status":"scoped_package_installed","files":9}`.

**Guard de baseline.** El manifest declara por archivo el `previousSha256` del archivo vivo con el que se armó el
paquete. El instalador compara ese hash contra lo que hay en el servidor antes de escribir; si alguien tocó el
archivo entre el export y el deploy, el release aborta en vez de pisar el cambio ajeno. Por eso el paso de export
no es opcional: es lo que hace comparable el baseline.

**Backup.** `/tmp/eo-contacto-widgets-before-20260916-120717.tar` en el servidor, tomado antes de escribir.

**Versionado del asset.** El plugin versiona el CSS por `filemtime`, así que el `?ver=` saltó solo de
`1789484153` a `1789560441` y no hizo falta purgar caché. Una consulta a la URL del CSS **sin** query string
sigue devolviendo una variante cacheada vieja: la verificación se hace contra la URL versionada que pide el HTML,
nunca contra la URL desnuda.

### Cambio 1 — copy de cobertura

En `includes/widgets/class-eo-contact-landing-widgets.php`, la entrada «Cobertura» del directorio de contacto
directo pasó de `Trabajamos con organizaciones en Chile y otros mercados.` a `Trabajamos con organizaciones en
Chile, Estados Unidos, Colombia, México y Perú.` Los cinco mercados salen del SSOT `EFEONCE_OPERATING_MARKETS` de
`src/config/efeonce-brand.ts`. Se conservó deliberadamente el verbo «trabajamos con organizaciones **en**»,
porque expresa cobertura y no sedes: la entrada vecina muestra la dirección postal de la casa matriz y el brief
prohíbe implicar oficina o entidad legal por mercado.

### Cambio 2 — banda de reuniones en móvil

`assets/css/contact-landing.css` pasó de 30.960 a 32.820 bytes. Medición a 390 px contra producción:

| Señal | Antes (2026-09-16 AM) | Después |
| --- | --- | --- |
| `grid-template-columns` de `.gh-contact__band-inner` | `56px 267px` | `40px 306px` |
| Titular `h2` | 34 px, 3 líneas | 27 px, 2 líneas |
| `padding-block` interno | `0 / 0` | `25px / 27px` |
| Curva decorativa `::after` | cruzaba el botón CTA | pasa por debajo |
| Overflow | 0 | 0 |

Desktop 1440 sin regresión: grid `86px 864px 190px`, banda de 160 px de alto, titular en una línea y CTA en la
misma fila.

## Delta 2026-09-16 — el fix móvil estaba escrito y verificado, y nunca se había desplegado

El fix de la banda de reuniones en móvil existía y estaba verificado desde el 2026-09-15, y la documentación lo
daba por publicado. No lo estaba: producción servía un `contact-landing.css` 1.860 bytes más viejo, sin el
`clamp(27px, 5.5vw, 33px)` del titular. Es el caso exacto del *Runtime Rollout Completion Gate* de `CLAUDE.md`:
se declaró `code complete` como `operationally complete`. El estado honesto durante esas 24 horas era
`code complete, rollout pendiente`, y ninguna verificación del repo lo habría detectado — sólo leer el runtime.

### Alcance real del despliegue

El paquete lleva 9 archivos, pero sólo 2 diferían del live: el PHP del widget y el CSS. El diff del CSS tuvo 488
líneas cambiadas y sólo 12 corresponden a la banda de reuniones; el resto es el set completo de iteraciones del
2026-09-15 que tampoco estaba desplegado (hero, columna de formulario, callout de Careers, FAQ, grid de canales,
audio, notas de Nexa, wave y meeting card). Antes de desplegar se corrió
`scripts/public-website/verify-contacto-responsive-composition.ts` sobre el HTML vivo (asserts en verde, banda de
273 px a 390 px, overflow 0) y después se comprobó desktop. La superficie desplegada fue mayor que los dos
cambios pedidos y queda declarada como tal.
