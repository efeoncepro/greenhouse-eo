# Deck Salesforce: inventario de hechos para canonizar (2026-09-29)

**Aprobación:** el operador aprobó todo el set («Esto está aprobado todo, canonicemos», 2026-09-29, sesión «Nuevas láminas
Salesforce deck»). Este archivo es la fuente de hechos para los subagentes; lo que no está aquí se verifica en el código o
se pregunta. No inventar.

- Script de render: `render-src/salesforce.mjs` (HTML + Playwright chrome + sharp, 1920×1080, margen M=140, línea
  `revenue-salesforce`, tokens `efeonceGraphicLine` de `@efeoncepro/axis-tokens`, `answerHtml` de
  `@efeoncepro/axis-graphic-line`, íconos Trazo con `resolveIcon`, selección con `paintSelection`
  (`ai-generations/2026-09-27_deck-recetas/render-src/sel.mjs`, contrato `efeonce.collaboration-selection` 0.3.0)).
  Uso: `ONLY=SFx node render-src/salesforce.mjs`; `SIN_BADGE=1` genera las variantes sin badge (`-sin-badge`).
- Salidas aprobadas: `out/SF*.png` (y `.jpg`).
- Decisiones y pendientes: `DECISIONES.md` (leerlo entero). Fuentes de cada asset: `logos/FUENTES.txt`.
- Canvases: revisión https://claude.ai/artifact/Jp1zybpowqVVyvgnDu1NSw (narrativa en 5 actos) · «La órbita»
  https://claude.ai/artifact/1XvHMkqtp4pe5zzhVB7QJJ, página **Deck**, fila y=7900 (boards `DeckSalesforce*.dc.html`).

## Narrativa aprobada (orden de lectura del brochure)

| # | Id | Pregunta → respuesta (voz) | Clase de receta (a confirmar con el catálogo) | Elementos |
|---|---|---|---|---|
| 01 | SF0-portada | ¿Tu Salesforce ya actúa? → Por ti. | `cover-brochure-line` variante `revenue-salesforce` (portada con foto, registro cine) | foto NXSF2 (Nexa + portal de luz), logo Efeonce 500 px, «Brochure · Servicios Salesforce», seis servicios, **badge Salesforce Partner** al pie (vector) |
| 02 | SF6-propuesta-cine | ¿Qué le falta a tu Salesforce? → Conexión. | `proposal-cinematic` layout service (datos) | foto NXSF1 (Nexa + anillo), selección «Cliente» |
| 03 | SF1-una-operacion | ¿Cuántos Salesforce tienes? → Uno. | nueva | 8 íconos oficiales de producto alrededor de la cuenta, plataforma de luz, selección «Cliente» |
| 04 | SF4-el-que-encaje | ¿Salesforce o HubSpot? → El que encaje. | nueva | 4 veredictos (Salesforce-first, HubSpot-first, híbrida, no-fit) como monolitos de vidrio |
| 05 | SF3-engagement-next | Marketing Cloud: ¿Hay que migrar a Next? → No por defecto. | nueva | dos plataformas a distinta profundidad, ícono Marketing |
| 06 | SF8-servicios | ¿Qué hacemos en Salesforce? → Todo el ciclo. | nueva | 6 carriles con íconos oficiales + 4 fases, **Agent Astro pose saluda** |
| 07 | SF9-dreamforce-2026 | ¿Qué trajo Dreamforce? → Agentes. | nueva | Agent Astro pose camina, 8 chips de lanzamiento con estado (corte 2026-09-18) |
| 08 | SF2-agentes-supervisor | Agentforce: ¿Quién responde por el agente? → Una persona. | nueva | supervisora + 3 fichas de agente con autonomía, ícono Agentforce |
| 09 | SF18-supervision-vivo | ¿Dónde apruebas al agente? → Donde trabajas. | `content-day-live-progress` (datos: aprobación en la herramienta; allí Notion/Frame.io, aquí Slack + Service Cloud) | aprobación del agente en Slack, selección «Supervisora», gap de botones 26 |
| 10 | SF16-crm-en-claude | ¿Y si le preguntas a tu CRM? → Te responde. | nueva | ventana de chat Claude (logotipo Claude del repo), «Conectado a Salesforce», acción que el ejecutivo confirma, **wordmark Claudeforce** en tarjeta navy, 3 garantías en fila, selección «Ejecutivo» |
| 11 | SF12-data-consentimiento | ¿Puedes contactar a ese cliente? → Con permiso. | nueva | 5 fuentes → resolución de identidad → perfil con preferencias, ícono Data Cloud |
| 12 | SF13-migracion | ¿Cómo sabes que migró todo? → Porque cuadra. | nueva | 5 etapas con contadores (datos de muestra) + reconciliación |
| 13 | SF5-diagnostico-decision | ¿Qué recibes primero? → Una decisión. | `decision-diagnosis-map` (datos) | mapa del estado, veredicto, «recomendación por defecto» |
| 14 | SF10-equipo-hibrido | ¿Cómo se suma un agente? → Por olas. | `method-staircase` (datos) | 4 olas |
| 15 | SF14-dia-a-dia | ¿Cómo trabajamos contigo? → Sin sorpresas. | **receta nueva «ciclo del release»** (no `content-day-tools`: quitó el panel Greenhouse fijo de esa receta) | Teams, Notion, Loom, sandbox Salesforce; avatar «EF» |
| 16 | SF15-adopcion-loom | ¿Cómo aprende tu equipo? → A su ritmo. | nueva | biblioteca de tutoriales Loom por rol (datos de muestra) |
| 17 | SF11-operacion | ¿Y después del go-live? → Lo operamos. | variante de datos de `content-day-live-results` | consola de operación (releases, SLA, calidad) |
| 18 | SF17-que-medimos | ¿Cómo sabes que funciona? → Lo medimos. | nueva | 5 métricas: fórmula · fuente · dueño (rol), sin cifras |
| 19 | SF19-contraportada | Empower your Revenue | `close-proposal-horizon` línea revenue-salesforce | foto NXSF3 bordada (Nexa de espaldas), logo 700 px + eslogan en bloque al 64 %, contacto, redes, **badge** bajo el contacto |

Fuera del recorrido (material): SF7-propuesta (alternativa sobria de 02, receta `proposal-service`, misma foto NXSF1;
nunca van juntas), respaldos `SF0-portada-sin-badge` («Operamos sobre» + logo Salesforce) y `SF19-contraportada-sin-badge`.

## Voz y reglas ya aplicadas (todas las láminas)

Eyebrow → pregunta con anillo (40 px) → respuesta con esfera ≥ 3× la pregunta (Bricolage) → evidencia con una palabra en
negrita; una sola órbita por lámina (la plataforma de luz); ningún texto cruza la órbita; márgenes 140 incl. etiquetas de
colaborador; notas arriba a la derecha («ejemplo ilustrativo», «datos de muestra», «corte 2026-09-18»); sin olivo; montos
como `[MONTO]`; colaborador «Cliente»/«Supervisora»/«Ejecutivo» (rol, no persona).

## Fotos (fichas `fichas/`, plates `plates/`)

- `NXSF1-nexa-conexion` (propuesta), `NXSF2-nexa-portal` (portada), `NXSF3-nexa-contraportada` (+ `-bordada`: espalda
  corregida con el método de acabado, 0 px fuera de la marca). Identidad A de Nexa, softshell del kit, `linea:
  revenue-salesforce`, registro cine (85 mm, reserva 45 % izquierda). Pipeline: `pnpm foto:prompt` → `pnpm foto:generar
  <ficha> --quality high` → `pnpm foto:validar` → `pnpm foto:emblema`.
- `SF1-una-operacion.json` y `plates/SF1-*`: **RECHAZADOS** (rostro deformado, sin identidad). No canonizar.

## Assets nuevos (no existían antes en el sistema)

| Asset | Archivo | Origen | Condición |
|---|---|---|---|
| 8 íconos oficiales de producto Salesforce (Agentforce, Sales, Service, Marketing, Data Cloud, Platform, Slack, Tableau) | `logos/icon-*.svg` | CDN salesforce.com (wp.sfdcdigital.com), con permiso | sujetos a autorización escrita de Salesforce; no se recolorean; sólo donde se nombra el producto |
| Badge «Salesforce Partner» horizontal (vector) | `logos/salesforce-partner-badge-horizontal.svg` (+ `.ai` oficial) | kit de partner en OneDrive; `.ai` → SVG con pdftocairo, sólo recorte de viewBox | **claim bloqueante**: no sale a cliente sin readback en Partner Community (owner Julio + RevOps & CRM); respaldo «Operamos sobre» |
| Agent Astro (poses camina y saluda, alfa) | `astro/agent-astro-v1-alpha.png`, `astro/agent-astro-v2-saluda-alpha.png` | **interpretación**: edición del arte oficial `ASTRO_NoOutfit` (no es el arte oficial de Agent Astro) | autorización de Salesforce; sólo láminas gráficas, nunca dentro de una foto; reemplazar si aparece el oficial en Brand Central |
| Wordmark Claudeforce (versión video: Claude blanco + force celeste con la f de Salesforce) | `logos/claudeforce-wordmark.svg`, script `render-src/claudeforce-wordmark.mjs` | force/a/e = vector oficial Dreamforce (`logos/claudeforce-layer1-oficial.svg`); d/l/u/C construidas con medidas oficiales, verificadas contra el cuadro del video | autorización de Salesforce y Anthropic; reemplazar si se publica el vector |
| Loom (ícono de app) | `logos/loom-app-icon-180.png`, `logos/loom-pinned-tab.svg` | loom.com | Loom confirmado en el stack de Efeonce (2026-09-29); falta alta en `deck-axis/assets/tools/loom-isotype.svg` |
| Logo Salesforce | `public/images/logos/partners/salesforce.com_logo.svg` (ya existía) | registro de logos del repo | en portada sin badge («Operamos sobre») |
| Logotipo Claude | `public/images/logos/partners/claude-logotype.svg` (ya existía) | registro del repo | ventana de chat genérica, sin imitar la UI real |

## Condiciones que viajan con la canonización

1. Autorización escrita de Salesforce (logo, íconos, Astro, badge) y de Anthropic (Claude/Claudeforce en SF16):
   **pendiente de archivar**. Sin ella, las láminas con esas marcas no salen a clientes ni a pauta.
2. Badge partner: bloqueante hasta readback (ver arriba). Las recetas deben permitir la variante sin badge.
3. Cifras de SF11, SF13 y SF15 = datos de muestra; SF17 sin cifras (baseline en el diagnóstico); montos `[MONTO]`.
4. Dreamforce (SF9): estado de lanzamientos con corte 2026-09-18; se verifica en cada org; ledger
   `.claude/skills/salesforce-crm-practice/references/dreamforce-2026.md`.
5. Nombre del servicio de SF16: «CRM conversacional» (sugerido) vs «Enablement conversacional» (propuesta del operador):
   decisión abierta.
6. Receta `close-proposal-horizon`: su ficha fija el eslogan a 72 px suelto; la regla del operador del 2026-09-29 lo pone
   en bloque bajo el logo al 64 %. El delta lo registra la sesión «Efeonce línea gráfica: huecos pendientes».
7. **Falta el deck HubSpot equivalente** (misma práctica RevOps & CRM: HubSpot-first es un veredicto de SF4). Documentar
   como pendiente, con qué recetas reutiliza y qué assets necesitaría (logos/íconos oficiales HubSpot, badge de partner
   HubSpot con su propio readback, sin mascota inventada).

## Clasificación confirmada (sesión «Efeonce línea gráfica: huecos pendientes», 2026-09-29)

- **Datos de recetas existentes (8):** SF0 = `cover-brochure-line` variante `revenue-salesforce` · SF5 =
  `decision-diagnosis-map` · SF6 = `proposal-cinematic` · SF7 = `proposal-service` · SF10 = `method-staircase` · SF11 ≈
  `content-day-live-results` · SF18 = `content-day-live-progress` · SF19 = `close-proposal-horizon`.
- **Recetas nuevas (12):** SF1, SF2, SF3, SF4, SF8, SF9, SF12, SF13, SF14, SF15, SF16, SF17.

Reglas para canonizar (no perder):
- SF0: la línea `revenue-salesforce` pasa de «pendiente» a **aprobada** en la receta de portada de línea. El badge es un
  **slot opcional nuevo** (p. ej. `partnerMark`) condicionado a readback vigente; sin él, logo corporativo con «Operamos
  sobre». Nunca elemento fijo.
- SF6 y SF7 comparten la foto NXSF1: `pairsWith` como variantes excluyentes; la foto se reserva para la propuesta
  (`plate-repeated`).
- SF9 es de temporada: fecha de corte (as-of) = slot **obligatorio**; la receta dice que no entra en un brochure evergreen.
- SF8, SF9, SF16: Astro y la marca Claude/Claudeforce = **slot opcional sujeto a autorización**, nunca fijo.
- El Agent Astro editado **no va a un package de AXIS publicado** mientras no llegue la autorización escrita o el arte oficial.
- Assets de terceros en AXIS (íconos de producto, badge, Loom, Claude, Claudeforce): con metadatos de **procedencia y
  estado de autorización** (como `FUENTES.txt`); el badge marcado como claim condicionado.
- Eslogan en bloque al 64 % (SF19): la regla es del operador del 2026-09-29 (skill `efeonce-graphic-line`, regla dura 8) y
  el operador aprobó SF19 → registrarlo en `close-proposal-horizon` y cerrar el delta pendiente de TASK-1933 con la fecha.
- Gates: `pnpm brand:deck-recipes` (índice + `catalog.generated.json`), `validateDeckPlan` (TASK-1929),
  `pnpm composer:visual-gate` a **0 px en las 78 existentes**; rebaseline sólo declarado en `BASELINE_DELTAS.md`.
- Otras sesiones tocan el mismo JSON (TASK-1930 in-progress: bindings de slots; TASK-1933): **releer justo antes de
  escribir** y commitear sólo los hunks propios (temp-index si hace falta).
- Plates en `ai-generations/` = ruta local: el Job `artifact-worker` no los lee hasta el banco de plates (TASK-1931). Las
  recetas con foto heredan ese bloqueo en productivo: documentarlo, no resolverlo aquí.
- Plate SF1 de la arquitecta: rechazado, **no entra** al banco ni a receta alguna.
- Deck HubSpot: la variante `revenue-hubspot` de portadas y propuesta RevOps ya existe (RV1b); **falta la serie de
  contenido equivalente** → follow-up.
- Consumidor: la sesión «Artifact composer con 78 slides nuevas» (TASK-1932, Proposal) lee `catalog.generated.json` y
  `recipe-map.json`; **no cambiar contentType ni slots de las 78 existentes** y avisarle al integrar.
