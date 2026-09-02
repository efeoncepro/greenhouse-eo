# Home — Jerarquía tipográfica FAQ · 2026-08-31

Aplicado y verificado en https://efeoncepro.com/, post `251731`. Instrucción explícita: ajustar
jerarquías dentro de cada acordeón y añadir negritas para orientar la lectura. Skill aplicada:
`greenhouse-typography-accessibility`; usa el rol body-lg del sitio público, no variantes MUI.

## Implementación

Se reutiliza el acordeón nativo details/summary y el renderer escapado existente. Dos nuevos campos
nativos de texto por fila: `answer_lead` y `answer_note` opcional. `f003_texto` queda como párrafo
de apoyo. Se reagrupan las seis respuestas sin alterar preguntas, IDs, orden, iconos o URLs.

- Idea principal: strong, Geist, 700, text-primary.
- Apoyo: Geist/body-lg, 1rem, 400, leading 1.6, text-secondary, measure máxima 66ch.
- Aclaración opcional: strong 600; usada para cifras ilustrativas, separada del apoyo.
- Párrafos con 0.75em de separación; 0.75rem de aire bajo el summary. Sin altura fija.
- Notas/ideas vacías ocultas; no se introducen HTML libre ni parsers de rich text.

Owner runtime existente: `eo-elementor-widgets`, ocho archivos: schema FAQ, seis templates
`faq--questions-{0..5}.html` y CSS `agency-elementor.css`. No cambio al renderer compartido,
JS, familias, tokens globales o resto de módulos. Se mantienen 408 campos raíz y seis repeaters;
la colección FAQ añade dos campos de texto a cada fila.

## Mutación y recuperación

Guardas de ID/estado/owner/hash/permisos/control, snapshots y save canónico Document::save.
18 asignaciones nativas en el widget `0d2c364`. Readback íntegro; árbol restante, SEO, ajustes,
links y siete páginas de referencia protegidos sin cambios. Purga Elementor/Kinsta.

- Snapshot CMS: `_gh_home_faq_typography_20260831_204935`.
- Backup de ocho archivos: `/tmp/eo-agency-before-20260831-204927.tar`.
- Backup posterior de ajuste de padding: `/tmp/eo-agency-before-20260831-205024.tar`.
- Hash anterior: `7f709e28d551a737b6510e1929a3d45ee6bfccb4a6b5d01ffba6cf774b1210d6`.
- Hash actual: `98d7306b40f444023da5760cb700e0edd9c0b715635023c446658b6b7d77dec8`.

Para restaurar con autorización: comparar drift, restaurar sólo archivos del primer tar y FAQ del
snapshot mediante Document::save, preservando cambios posteriores; purgar y verificar. El segundo tar
sólo revierte el padding, no la revisión completa.

## Verificación

- Renderer local PASS, 17 módulos; comprobación adicional de strong/p y escape de script en lead PASS.
- Contrato Elementor vivo PASS, failures vacío; readback exacto de 18 textos.
- Navegador desktop 1280 y móvil 390: apertura de acordeones, lead/cuerpo/nota legibles, sin overflow
del documento. Computed: 16px, line-height 25.6px, pesos 700/400/600, separación 12px.
- Móvil: respuesta abierta sin corte, nota vacía display:none, padding superior final 12px.
- Capturas `.captures/home-faq-type-20260831/`; planes y logs `tmp/home-faq-type-20260831/`.
- No nueva auditoría completa WCAG, overrides de espaciado ni editor autenticado save/reopen certificados.
- Sin commit/push ni cambios a WIP ajeno. Continuidad en este registro, contrato dueño, manual y referencia espejada.
