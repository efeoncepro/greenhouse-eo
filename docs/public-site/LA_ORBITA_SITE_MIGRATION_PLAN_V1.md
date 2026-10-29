# Migración del sitio público a «La órbita» — plan V1

> **Tipo:** plan de programa (propuesta para el operador). No reserva IDs de task ni de epic.
> **Estado:** borrador para decisión · 2026-10-18.
> **Alcance pedido por el operador:** las 9 páginas que siguen en el sistema visual anterior y la Home, con Nosotros
> primero.
> **Doctrina que manda:** [PDR-026](decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md) (cada landing deriva
> su diseño de su necesidad; ninguna landing es plantilla de otra) · skill `efeonce-graphic-line` (La órbita) ·
> [PDR-012](decisions/PDR-012-growth-operating-system-global-positioning.md) (posicionamiento) ·
> [PDR-011](decisions/PDR-011-about-us-identidad-golden-circle.md) (Nosotros).
> **Fuera de este plan:** el encabezado y la navegación global ([PDR-027](decisions/PDR-027-navegacion-global-del-sitio-portable.md),
> EPIC-055) y el footer (recompuesto el 2026-10-14). Cada migración toca sólo el cuerpo de la página.

## 1. Qué encontramos

Medición del 2026-10-18 sobre las 18 URL del menú principal, con el mismo script para todas (fuente tipográfica y peso
de los titulares H1–H3 fuera del footer, colores de acento dentro de los titulares, presencia de un SVG de órbita, fondo
del hero). Las fechas son el `lastmod` del sitemap de Yoast.

El sitio convive en **tres generaciones**:

| Generación | Rasgos medidos | Páginas | Última edición |
|---|---|---|---|
| **La órbita** | titulares en Bricolage Grotesque (620–780) + Poppins funcional; hero `#001a33`; órbita en SVG; un acento por línea de servicio | Agencia Creativa (y su v2), Performance, Agencia de Medios, HubSpot, Inbound | 2026-10-15 a 10-18 |
| **Intermedia** | Poppins 600–800 sin Bricolage; cuerpo en Geist; acentos teal/lima | **Home**, Marketing de Contenidos, Influencers | 2026-08-29 a 08-31 |
| **Anterior (Ohio)** | DM Sans + Inter (y Roboto); sin órbita; acentos de varios colores por página | **Nosotros, AEO, SEO, Redes Sociales, Desarrollo web, Servicios (hub), Contacto, Partnership, Portafolio** | 2025-04 a 2026-09-18 |

**Peso orgánico:** Semrush (base Chile, 2026-10-18) sólo le asigna tráfico estimado a `/agencia-inbound-marketing/`
(4 visitas/mes); ninguna de las páginas de este plan tiene tráfico orgánico estimado. Migrarlas no pone rankings en
riesgo. *Es una estimación de Semrush, no Search Console; antes de cambiar una URL se confirma en GSC.*

## 2. Qué significa «migrar a La órbita»

No es copiar una landing nueva y rellenarla (PDR-026). Cada página parte de **su** necesidad declarada —a quién le
habla, en qué etapa, qué oferta, qué prueba, qué decide quien visita— y desde ahí se diseña. Lo que comparten todas es
el **sistema**, no el aspecto:

- **Tipografía:** Bricolage editorial para titulares, con contraste de pesos en titulares largos (criterio del
  2026-10-17); Poppins funcional. Sin DM Sans, Inter ni Roboto en el cuerpo de la página.
- **Color:** un acento por página, el de su línea de servicio, desde tokens (`efeonceGraphicLine`). El acento nunca en
  texto de menos de 24 px.
- **Voces:** pregunta con anillo y respuesta con esfera donde la página lo pide; la respuesta domina.
- **La órbita sólo con trabajo:** rodea, mide un dato real con fuente o enfoca. Una página sin órbita es válida.
- **Eslogan:** sólo en cierres y en bloque con el logo; nunca como chip ni como texto suelto.
- **Imagen:** lenguaje fotográfico de Efeonce (oficio real, roster, uniforme) en vez de ilustración de stock o
  gráficos brillantes; íconos sólo del catálogo de AXIS.
- **Mecanismos compartidos** (se usan si la página los necesita, con su propia piel): compilador desde canvas
  (`scripts/public-website/lib/source-led-compiler.cjs` y sus guardas), carril acotado de publicación con rollback,
  `<gh-meeting-cta>`, `EfeonceMention`, Growth Forms y Growth CTA.
- **Contenido al día:** mercados según PDR-012 (Chile, Estados Unidos, Colombia, México, Perú), cifras con fuente y
  consistentes entre páginas, sólo casos citables.

**Definición de terminado por página:** necesidad declarada → copy validado → 2–3 direcciones en canvas → aprobación
del operador → compilación → publicación por el carril → QA (captura desktop y 390 px, contraste sobre píxeles
finales, `qa-checklist.md` de la línea, smoke de formularios y agenda, metadata/canonical/JSON-LD preservados) →
documentación funcional y manual actualizados.

## 3. Oleadas

### Oleada 1 — Nosotros (`/about-us-efeonce/`, página 249770)

**Por qué primero:** es la página de identidad (PDR-011), está en el menú principal y hoy contradice al resto del
sitio:

- Cuatro países; PDR-012 suma Estados Unidos.
- «+90» clientes en el hero y «120+ empresas atendidas» más abajo.
- Globe, Reach y Wave con chips «Empower your…» (eslogan rearmado como etiqueta, a 14 px, en Inter) y Wave en verde,
  cuando su línea (Engine) es azul.
- El gráfico «Loop marketing» (infinito 3D iridiscente) se presenta junto a «metodología propietaria Nested Loops™»: la
  línea prohíbe brillos y reflejos, y el gráfico no es de Efeonce.
- Titular «Se orquesta»: PDR-011 pide abrir con el Why, no con esa frase.
- Cinco colores de acento en los titulares; ilustraciones de stock en «Ecosistema tecnológico».

**Cómo:** se ejecuta con [TASK-1369](../tasks/to-do/TASK-1369-about-us-identidad.md), que ya tiene decisión y copy, pero
**antes hay que actualizarla**: su wireframe es del 2026-07-08, anterior a La órbita (2026-09-26), a la precisión de
mercados de PDR-012 (2026-08-31) y a la familia de productos H3 (2026-10-09). En particular, su regla «nunca nombrar
Globe/Reach/Wave» convive ahora con lockups de familia aprobados: el operador decide cómo aparecen en Nosotros.

**Desbloqueo propuesto:** TASK-1369 ya permite ocultar el bloque de equipo si faltan bios. Publicar con el fundador y sin
ese bloque saca a Nosotros del bloqueo; el equipo entra cuando lleguen las bios.

**Línea:** Growth (Efeonce). Slug: decidir si pasa a `/nosotros/` con 301 (hoy `/nosotros/` responde 404).

### Oleada 2 — Home (`/`)

**Por qué segunda:** es el pitch (PDR-010) y la puerta de entrada; ya está cerca de la línea (navy, órbita en el hero,
acento teal), así que el delta es menor: titulares en Bricolage con contraste de pesos, cuerpo sin Geist, voces, y
verificar que los datos que acompañan la órbita del hero tienen fuente. Se recompila con su compilador
(`compile-agency-elementor-source.cjs`), no se edita en Elementor.

**Coordinación:** después de Nosotros para que ambas cuenten lo mismo (mercados, cifras, capacidades).

### Oleada 3 — Servicios con formulario

| Página | Estado de su task | Notas para la migración |
|---|---|---|
| `/servicios/posicionamiento-seo/` | TASK-1343 complete | Growth Form `efeonce-seo-diagnostic` en `#grader`: preservar `form_key` y medición. Línea Engine; puede usar los lockups SV360/AEO aprobados. |
| `/aeo-2/` | TASK-1321 complete | Formulario que dispara el Grader y envía el informe: smoke completo antes y después. Decidir si el slug `-2` se corrige. Línea Engine. |
| `/desarrollo-sitios-web/` | TASK-1345 **in-progress** | Integrar la migración al cierre de TASK-1345 en lugar de abrir otra task. Línea Engine. |
| `/servicios/redes-sociales/` | TASK-1351 complete | Decidir la línea de servicio (Brand o Voice) antes de diseñar. |

SEO y AEO van juntas: comparten línea, submarcas y lectores. Antes de esta oleada conviene saber si
[TASK-2038](../tasks/to-do/TASK-2038-growth-forms-renderer-on-axis.md) (formularios sobre AXIS) llega a tiempo; si no,
la página migra igual y el formulario conserva su piel actual hasta que llegue.

### Oleada 4 — Contacto y hub de Servicios

- `/contacto/` (TASK-1801 complete, 2026-09-15): cuerpo en Poppins, titulares en DM Sans. Delta chico; preservar el
  formulario multi-stakeholder y la agenda.
- `/servicios/`: con el mega menú de PDR-027, decidir si el hub sigue existiendo como página o se reduce. No migrar antes
  de esa decisión.

### Oleada 5 — Partnership y Portafolio

`/partnership/` y `/portafolio/` son de 2025, sin H1 y sin task. **Primero decidir** si se mantienen, se fusionan (con
casos o con la fila de partners del footer) o se retiran con 301. Migrar sólo lo que sobreviva.

> **Delta 2026-10-23 — `/portafolio/` decidido.** Se mantiene y se reconstruye como portafolio propio:
> [PDR-028](decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md), ejecución en `EPIC-056` (`TASK-2046`…`TASK-2049`).
> La auditoría encontró 44 entradas demo de Ohio publicadas e indexadas ([ISSUE-183](../issues/resolved/ISSUE-183-portfolio-ohio-demo-entries-indexed.md));
> su limpieza (`TASK-2046`) va primero. `/partnership/` sigue sin decidir.

## 4. Deuda vecina (fuera del pedido, se registra)

- **Generación intermedia:** Marketing de Contenidos e Influencers no están en La órbita (Poppins sin Bricolage, cuerpo
  Geist). Candidatas a una oleada posterior.
- **Agencia Creativa duplicada:** `/agencia-creativa/` y `/agencia-creativa-v2/` siguen indexables; ya es el rango 01 de
  EPIC-047.
- **Páginas de demo en el sitemap:** `homedemo1/8/17/27/35-elementor`, `about-ver1-elementor-section`, `home-prueba`,
  `home-2-2`, `demo-landing-2024`, `landing-loop-marketing` y un borrador de HubSpot aparecen en `page-sitemap.xml`. Si son
  indexables, cuentan como «landing que daña» bajo el criterio de EPIC-047. *No verifiqué su `robots`; es lo primero a
  confirmar.*

## 5. Gobierno propuesto

- **Un epic nuevo** «Migración del sitio público a La órbita», separado de EPIC-047: aquel ordena superficies nuevas;
  éste migra superficies existentes. Una task por página, reutilizando las que existen (TASK-1369 para Nosotros,
  TASK-1345 para Desarrollo web).
- Cada task nace con la declaración de necesidad (PDR-026) antes de la dirección visual, y con `UI ready: no`.
- Los IDs se reservan al aprobar este plan, barriendo el registro por dominio y superficie (hay sesiones paralelas
  trabajando en `docs/public-site/` hoy).

## 6. Decisiones que esperan al operador

1. Aprobar el orden de oleadas (Nosotros → Home → servicios con formulario → Contacto/hub → Partnership/Portafolio).
2. Nosotros: publicar sin bloque de equipo hasta tener bios, y cómo aparecen Globe, Reach y Wave (lockup H3, descripción
   por función o ambos).
3. Slug de Nosotros (`/nosotros/` con 301) y de AEO (`/aeo-2/`).
4. Línea de servicio de Redes Sociales.
5. Futuro de `/servicios/`, `/partnership/` y `/portafolio/`.
6. Si el registro fotográfico cine puede usarse en heroes web de identidad (hoy la línea lo limita a deck, propuestas y
   superficies de producto).
7. Epic nuevo o extensión de EPIC-047.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Que la primera página migrada se vuelva plantilla de las demás | PDR-026: necesidad declarada por página; la revisión compara contra la necesidad, no contra otra landing. |
| Romper formularios, agenda o medición al recompilar | Smoke de envío y de `generate_lead` antes y después; `form_key` y destinos sin cambios. |
| Cifras o claims inconsistentes entre Home y Nosotros | Oleadas 1 y 2 consecutivas, con una sola fuente de cifras (context pack + PDR-012). |
| Cambiar URL sin datos de Search Console | Confirmar en GSC antes de cada 301; Semrush es sólo estimación. |
| Pisar trabajo de sesiones paralelas en el sitio | Revisar sesiones activas y el estado del carril antes de cada publicación. |

## 8. Método y límites de la medición

- Tipografía y acentos: estilos computados en el navegador sobre la página publicada, 1440 px de ancho.
- Órbita: heurística (SVG de más de 120 px con dos o más círculos). Puede omitir órbitas hechas con CSS o imagen.
- Peso orgánico: Semrush `resource_organic_unique`, base `cl`, sin páginas de blog.
- No se midieron móvil, rendimiento ni accesibilidad: se miden por página en su QA.
