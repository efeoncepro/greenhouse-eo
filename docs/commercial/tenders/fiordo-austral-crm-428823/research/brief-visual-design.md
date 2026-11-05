# Brief visual — Propuesta Fiordo Austral · Implementación HubSpot (Wherex 428823)

> **Tipo:** brief de diseño interno (no se entrega al comprador).
> **Preparado:** 2026-11-05, por Claude (fork visual), antes de pasar a /design con La órbita.
> **Objetivo del operador:** una propuesta que se vea «muy HubSpot» sin perder la línea gráfica de Efeonce y con
> altísimo impacto visual.
> **Estado:** investigación y dirección. No hay láminas compuestas ni plates nuevos generados.

## 1. Tesis visual

Es una propuesta de Efeonce con la línea **`revenue-hubspot`**, en tema oscuro, sobre el fondo Efeonce. «Suena a
HubSpot» por cuatro vías: el **producto real** (capturas de nuestro portal configurado), la **terminología oficial**,
la **insignia de Solutions Partner Gold** y los **íconos oficiales de los productos HubSpot**. Nunca suena a HubSpot por
imitar su marca, su paleta o su interfaz.

El precedente que ya está aprobado es el deck HubSpot del 2026-10-06 (propuesta de 31 láminas, canvas
`https://claude.ai/artifact/FzFy2GMoU32898wyhwHUxU`). La propuesta Assetplan del 2026-10-20 (22 láminas, enviada) es
la referencia de una propuesta real de esta línea.

El comité de Fiordo Austral la **lee sin nosotros**: entra por Wherex y la evalúan Adquisiciones, el área Comercial y TI.
Por eso se construye con el método aprobado de **propuesta técnica que se lee sin presentador**, que es un híbrido:
- Láminas de **receta** (`pnpm brand:compose`) para todo lo que ya tiene receta aprobada.
- Láminas **a mano en HTML con tokens** para todo lo que lleva datos del cliente: su matriz, su arquitectura y su
  cronograma.

Fuentes:
- `.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md`.
- Norma `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6, «Deck HubSpot».
- `docs/operations/brand-graphic-line/deck-recipes/README.md`, «El deck HubSpot» y «La propuesta Assetplan».

## 2. Qué de La órbita se usa y dónde

| Elemento | Dónde | Regla |
|---|---|---|
| **Línea `revenue-hubspot`** (acento del token) | Todo el documento | El acento sale de `efeonceGraphicLine` y nunca se transcribe como HEX. Nunca va en texto de menos de 24 px; ahí se usa blanco o el suave. |
| **Voz pregunta → respuesta** (Poppins Light con anillo + Bricolage con esfera) | Títulos de lámina | La respuesta contesta la pregunta. Es formal y no tutea (es una licitación). Va en una o dos líneas. |
| **Portada `cover-proposal`** (sin foto, logo del cliente dentro de la órbita) | P01 | Layout `orbit-decision` (titular de decisión, sin pregunta), como en Assetplan. Greenhouse fija `axis-tokens` 0.3.41 y todavía no lo ve (TASK-2014 está en to-do), así que se repite el método de Assetplan: receta `orbit` más la hoja `portada-orbit-decision.css` de esa corrida. |
| **Contraportada `close-proposal-horizon`** | Última | Con foto (plate **BR3h**, que en `revenue-hubspot` reemplaza a BR3) y «Empower your Revenue» como mensaje principal, en bloque con el logo. |
| **Una órbita por lámina**, una esfera por lámina | Siempre | Ningún texto cruza la órbita. En el cine, la luz de la escena cuenta como la órbita. |
| **Arco de medida** (sólo dato real con fuente) | Lámina de SLA o de adopción | Por ejemplo «99,9 % comprometido por las bases» se mide como dato del comprador, con su fuente. Nunca se usa como adorno ni como loader. |
| **Íconos Trazo** (`resolveIcon`) | Pasos, integraciones, controles | En reposo. Responde uno solo, y sólo si la lámina no tiene otra esfera. Se corre `auditIconGroup`. |
| **Registro cine** | Sólo `proposal-cinematic` con Nexa, y las secciones y el «about» | Sin cine en láminas de datos. |
| **Burbuja URL** en el pie | Láminas interiores | El logo va sólo en portada, cierre o marca-sujeto. |

## 3. Co-branding HubSpot: permitido y prohibido

### Permitido (con fuente)

- **La insignia oficial de Solutions Partner del tier vigente: Gold.**
  - Según `.claude/skills/hubspot-solutions-partner/efeonce/ESTADO_ACTUAL.md`, Gold está acreditado hasta el
    **2027-01-15**.
  - Es un **claim** con readback (`hubspot-partner-readback-2026-10-06`).
  - Archivos en `public/branding/partners/hubspot/solution-partner/`. Se elige la variante por contraste con
    `getHubSpotSolutionPartnerBadgeForSurface(surface)`: sobre oscuro va la placa `light`; sobre papel, la `dark`.
  - Se conserva la proporción 431.07 × 428.92 sin recolorear, recortar ni poner texto encima.
  - Fuentes: [Trademark Usage Guidelines](https://legal.hubspot.com/tm-usage-guidelines) («You may not alter any
    partner badges…», «use the most up-to-date version of your partner badge») y la
    [Solutions Partner Promotion Guidelines](https://www.hubspot.com/partners/promotion-guidelines) (los tier badges
    son sólo para quien alcanzó el tier).
- **Íconos oficiales de productos HubSpot** de `@efeoncepro/axis-brand-assets` 0.4.25: `assets/partners/hubspot-icon-sales.svg`,
  `-data.svg`, `-service.svg`, `-marketing.svg`, `-content.svg` y `-revenue.svg`. Son los que usa el deck aprobado.
- **Isotipo y logotipo de HubSpot como logo de herramienta**, en la fila «construimos sobre»:
  - Archivos: `assets/tools/hubspot-isotype.svg` y `hubspot-logotype.svg`.
  - Se usan sólo como tercero: sin cambiar color, sin deformar y sin palabras ni formas encima.
  - Fuente: Promotion Guidelines, «Brand Guidelines → HubSpot Logo Use».
- **Capturas reales del producto** («product screenshots and illustrated icons» que HubSpot ofrece a partners en el
  Brandfolder del Solutions Partner Hub, según las Promotion Guidelines). Recomendación: capturar **nuestro propio
  portal demo configurado** (registro de empresa con las propiedades % proteína y % FFA, pipeline, app móvil), rotulado
  como «Ejemplo de configuración».
- **Terminología:** «Certified HubSpot Solutions Partner», «HubSpot» con S mayúscula, y nombres de producto exactos
  (Smart CRM, Sales Hub Professional y Enterprise, Breeze).
  - Antes de imprimir, verificar en la página oficial el nombre vigente de los agentes: una fuente secundaria de
    julio de 2026 dice que Breeze Agents pasó a «Agent Hub».

### Prohibido

- **Sin superlativos** («#1», «agencia líder», «top 10»).
- **Sin estadísticas de HubSpot que HubSpot no pueda verificar.** Se usa sólo la documentación oficial: no se afirma
  ISO 27001 de HubSpot (es de su proveedor de nube), una región de datos en LATAM (no existe) ni el 99,95 % como SLA
  con créditos (es una meta).
- **No usar el sprocket ni el logo de HubSpot como parte de nuestra marca**, ni el sprocket como letra.
- **No poner textos ni formas alrededor del logo**, ni encima de él.
- **No nombrar un servicio con «Hub»** ni con «Efeonce for HubSpot».
- **No imitar el trade dress de HubSpot:** ni su paleta (el naranja HubSpot no reemplaza el acento de la línea), ni su
  tipografía (Lexend Deca o Queens), ni redibujar su interfaz.
- **Sin mascotas ni personajes de HubSpot**: es una regla del deck aprobado.
- **Sprocket 3D: hay una decisión pendiente.** La norma (§4.6 y §7) dice «uso interno hasta aprobación escrita de
  HubSpot». El `LEEME.md` de Assetplan dice «uso autorizado desde 2026-10-14», y lo usó en una propuesta enviada.
  **Confirmar con Julio antes de ponerlo en el PDF.** Hasta entonces, no va.
- Fuentes de esta sección: [Promotion Guidelines](https://www.hubspot.com/partners/promotion-guidelines),
  [Trademark Usage Guidelines](https://legal.hubspot.com/tm-usage-guidelines),
  [Partner badges](https://www.hubspot.com/partners/badges), y norma §4.6 «Reglas del deck HubSpot».

**Cómo se ve «muy HubSpot» sin romper nada:**
- La insignia Gold, en portada, equipo y cierre.
- La fila de íconos de producto en el alcance.
- Capturas reales de nuestro portal.
- Vocabulario de producto exacto.
- Los «seis Hubs» como mapa del ciclo de vida.

El acento sigue siendo el de `revenue-hubspot`. Si se quiere el naranja HubSpot, que viva sólo dentro de los archivos
oficiales de HubSpot (insignia, íconos y capturas), nunca en nuestras formas.

## 4. Estructura visual propuesta (unas 30 láminas, 16:9, PDF)

**Momentos dominantes** (★ = momento visual de alto impacto; R = receta del catálogo; M = a mano con tokens):

| # | Lámina | Voz (borrador) | Tipo | Notas |
|---|---|---|---|---|
| 01 ★ | Portada | «Implementación HubSpot» / titular de decisión con el logo de Fiordo Austral dentro de la órbita | R `cover-proposal` (`orbit-decision`, método Assetplan) | Insignia Gold. Logo oficial del cliente (abajo). |
| 02 | Cómo leer esta propuesta | — | M | Cinco capítulos con su pregunta, navegación con la órbita. |
| 03 ★ | Lo que entendimos | «¿Qué necesita Fiordo Austral? Un solo lugar.» | R `proposal-cinematic-nexa` o `section-cine-purpose` | Ferias, plantas y exportación; cine con Nexa. |
| 04 | Un CRM | «¿Cuántos CRM necesito? Uno.» | R `content-one-platform` | Del deck HubSpot. |
| 05 | La plataforma | «¿Por qué HubSpot? Porque encaja.» | R `decision-provider-fit` | Íconos Trazo, nunca logos de la competencia. |
| 06 ★ | Su ficha técnica en el CRM | «¿Dónde viven las especificaciones? En la ficha.» | M + captura real | Propiedades % proteína y % FFA en un registro de empresa, sobre la plataforma de luz. Rótulo «Ejemplo de configuración». |
| 07 | Ciclo comercial | «¿Qué cubre? Todo el ciclo.» | R `content-service-lanes` | Clientes, pipeline, actividades, documentos, reportes. |
| 08 ★ | En terreno | «¿Y en la feria? En el teléfono.» | R `proposal-cinematic` (`hero`) con Nexa | Plate nuevo opcional (Nexa con móvil en feria o planta); requiere `design-studio` + `cine-reviewer`. |
| 09 | Automatizaciones | «¿Workflow o agente? Según la tarea.» | R `method-staircase` | Alertas de cliente sin contacto, aprobaciones, seguimientos. |
| 10 ★ | Arquitectura de integraciones | «¿Tengo que reemplazar mis sistemas? No.» | R `decision-platform-coexistence` + M | HubSpot al centro, con Outlook, Teams, SharePoint/OneDrive, Excel, QAD, Entra ID y Wazuh como nodos. Obligatorio frente a deseable por forma (esfera = obligatorio, anillo = deseable), acompañado de texto. |
| 11 | Migración desde Excel | «¿Cómo sé que migró todo? Porque cuadra.» | R `method-migration-reconcile` | |
| 12 | Capítulo · Seguridad | «¿Quién ve sus datos? Sólo quien debe.» | R `decision-difference` | Logo oficial de Efeonce en el rótulo (ajuste de Assetplan). |
| 13 ★ | Zero Trust con Entra ID | «¿Quién entra? Quien verificamos.» | M | Cadena identidad → MFA → Acceso Condicional → rol mínimo → registro hacia Wazuh, como objetos sobre la plataforma de luz y no como tabla plana. |
| 14 | Residencia | «¿Dónde están sus datos? En Estados Unidos.» | R `content-markets` (plate RG2b) | Ajustar a la región que se contrate (US o EU). Nunca decir LATAM. |
| 15 | Respaldo y continuidad | «¿Y si algo falla? Se recupera.» | M | SLA de las bases medido con arco y fuente; RTO y RPO con fuente oficial. |
| 16 | Matriz de cumplimiento (resumen) | «¿Cumple lo obligatorio? Requisito a requisito.» | M | Chips por estado (cumple / configuración / licencia / desarrollo). La matriz completa va en anexo tabular. |
| 17 | Salida | «¿Y si mañana se van? Con todo.» | R `section-cine-purpose` (HS4) | |
| 18 | Capítulo · Implementación | — | R `section-cine` | |
| 19 ★ | Cronograma | «¿Cuándo está listo? En [N] semanas.» | M | Fases → prueba técnica previa a producción → go-live → estabilización. Timeline sobre la plataforma de luz. |
| 20 | Por olas | «¿Todo junto? No, por olas.» | R `method-waves` | |
| 21 | Qué llega a producción | «Lo que aprueben.» | R `content-day-release-cycle` | Ambientes separados (pide las bases). |
| 22 | Adopción | «¿Cómo aprende su equipo? A su ritmo.» | R `content-day-live-library` | Usuarios y administradores. |
| 23 | Soporte y SLA | «¿Cuándo nos responden? A tiempo.» | R `content-bullets` | Severidades, horario y escalamiento. |
| 24 | Después del go-live | «¿Y después? Lo operamos.» | R `content-day-live-console` | |
| 25 | Medición | «¿Cómo sabemos que funciona? Lo medimos.» | R `content-measure-formulas` | |
| 26 | Equipo | — | R `content-team` (5 fichas) | Roles y seniority, sin nombres salvo autorización. Insignia Gold. |
| 27 | Prueba | Caso ANAM · «¿Qué ganó su equipo? Tiempo.» | R `decision-case` (Growth claro, recoloreado) | La restricción de ANAM la supera la ratificación del 17-10-2026. Las cifras, sólo las aprobadas. |
| 28 | Clientes | «+90 empresas.» | R `content-clients` | Logos con autorización (TASK-1937). |
| 29 | Costos | «¿Hay costos escondidos? Ninguno.» | R `content-bullets` | Licencias Microsoft y HubSpot declaradas (lo piden las bases). |
| 30 | Inversión | «¿Cómo se cotiza? Por alcance.» | R `content-pricing` (`live`) | Montos desde la cotización formal (excepción de Assetplan). La económica formal va además en la plantilla A4. |
| 31 | Próximos pasos | — | R `decision-next-steps` | Demo y prueba técnica. |
| 32 ★ | Contraportada | «Empower your Revenue» | R `close-proposal-horizon` (BR3h) | La insignia Gold como capa, igual que en Assetplan. |

**Ritmo:** alternar láminas de foto y cine con las azules de datos. Nunca más de tres láminas de texto seguidas.

**Anexos aparte** (A4 o tabla, legibles):
- La **matriz de cumplimiento** con las columnas que exigen las bases: cumple / parcial / no / requiere desarrollo,
  licencia, configuración, costo, plazo, limitaciones, responsable y evidencia.
- La económica en la plantilla A4 (`docs/commercial/templates/cotizacion-a4/`).

## 5. Assets necesarios

| Asset | Fuente | Estado |
|---|---|---|
| Logo Efeonce (positivo y negativo) | `@efeoncepro/axis-brand-assets` → `assets/efeonce-logo-positive.svg`, `-negative.svg` | disponible |
| Órbita de la línea | `assets/orbit/orbit-revenue-hubspot-{dark,light}-{deck,print,screen,social}.svg/png` | disponible |
| Insignia HubSpot Solutions Partner Gold | `public/branding/partners/hubspot/solution-partner/badge-{light,dark,orange}-spp-hubspot.svg` (AXIS sólo trae la crema `assets/partners/hubspot-solutions-partner-gold-light.svg`) | disponible. Vigente hasta el 2027-01-15. |
| Íconos de producto HubSpot | `assets/partners/hubspot-icon-*.svg` | disponible |
| Logo HubSpot como tercero | `assets/tools/hubspot-isotype.svg`, `hubspot-logotype.svg` | disponible |
| Logos de Microsoft (Outlook, Teams, SharePoint, OneDrive, Entra ID), QAD y Wazuh | catálogo de logos de AXIS (`axis.efeonce.org/references/logos/`) u OneDrive `Alineación/7. Branding & Diseño/04. Logos & Partnership/` | **por verificar**. Sólo archivos oficiales, normalizados, nunca redibujados. |
| Logo de Fiordo Austral | sitio oficial `https://fiordoaustral.com/wp-content/uploads/2024/01/cropped-logo-FA-web-1.png` (PNG «cropped», baja resolución probable) | **pendiente**: buscar un SVG o PNG grande oficial. No recrear. |
| Sparks `revenue-hubspot` | `assets/sparks/spark-revenue-hubspot-*.png` | disponible (hilo visual opcional) |
| Plates de cine aprobados | `ai-generations/2026-10-06_deck-hubspot/fotos/plates/` (HS2d, HS4, HS5b, HS6b, CMP-crm-B, RG2b) y `ai-generations/2026-10-20_propuesta-assetplan/plates/BR3h-v3-logo-acabado.png` | en disco (`pnpm ai-gen:pull` si falta) |
| Capturas reales de HubSpot | portal demo Efeonce configurado (por producir) | **pendiente** |
| Plate nuevo «en terreno» con Nexa | `design-studio` + casebook cine + `cine-reviewer` | **opcional**. Decisión de costo. |

## 6. Reglas duras que el diseño no puede romper

1. Ningún texto cruza la órbita. Una órbita y una esfera por lámina. En el cine, la luz cuenta como órbita.
2. El arco mide sólo un dato real con fuente. Recorre y no se llena como un loader.
3. Valores sólo desde tokens. Archivos de marca sólo desde `@efeoncepro/axis-brand-assets` (o la carpeta de insignias
   del repo). Nunca HEX, px ni fuentes transcritas.
4. El eslogan nunca va en la portada. En la contraportada de una propuesta es el mensaje principal y va en bloque,
   debajo del logo, al 64 % de su ancho.
5. El acento nunca va en texto de menos de 24 px y debe medir ≥ 3:1 contra su fondo.
6. Una receta aprobada se compone con `pnpm brand:compose` y el plan pasa `pnpm brand:deck-plan -- --plan` sin errores.
   Portada y contraportada salen siempre del compositor. `cover-classic` y `close-classic` no se usan.
7. Íconos sólo del catálogo AXIS, en reposo, con `auditIconGroup`. Nunca dibujados a mano.
8. Cifras con fuente visible. Montos como `[MONTO]` hasta la cotización aprobada.
9. Marca de terceros sin tocar: insignia y logos sin recolorear, deformar ni tapar. Sin mascotas de HubSpot.
10. No usar tablas planas para mostrar datos (el operador las rechazó por falta de impacto): objetos sobre la plataforma
    de luz. La matriz exigida por las bases vive en el anexo tabular.
11. Registro formal (de usted), es-CL, sin superlativos. «HubSpot» con S mayúscula.
12. `decision-case` y `content-clients` existen sólo en claro: se componen como láminas de Efeonce en la línea Growth y
    se recolorean al acento único.

## 7. Decisiones abiertas para Julio

1. ¿Puede ir el sprocket 3D en el PDF? La norma dice interno y el LEEME de Assetplan dice autorizado.
2. ¿Plate nuevo «en terreno» con Nexa (costo de generación), o se reutiliza un plate aprobado?
3. ¿Se usan capturas del portal demo de Efeonce? Hay que configurarlo antes.
4. ¿Nombres del equipo con consentimiento, o sólo roles?
5. Vigencia de la insignia: Gold vence el 2027-01-15, dentro de los 12 meses de contrato. ¿Se menciona el tier sólo
   como hecho actual?
