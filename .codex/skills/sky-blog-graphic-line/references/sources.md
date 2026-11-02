# Fuentes en Notion y contradicciones resueltas

Teamspace «Sky Ariline - SEO+AEO» (id `3e439c2f-efe7-8114-8f92-0042c6191ff6`). Leído completo el 2026-11-02; ninguna
página verificada en Notion, sin comentarios abiertos.

## 1. Qué decide cada página

| Página | ID | Rol | Última edición |
|---|---|---|---|
| Skill · Producción de imágenes con IA · Blog SKY | `5e4b2473…` | Cómo producir: motores, D/E, prompt, QA, entrega | 2026-10-09 |
| Spec Imágenes | `cbf3b294…` | Qué lleva cada pieza: familias IMG/BANNER, máx. 3, D, campos de la spec, 1408×768 | 2026-10-09 |
| Sistema de selección de imágenes | `3f439c2f…8004…` | Tipos A–H, modificadores, matriz por tipo de artículo | 2026-10-13 |
| Playbook Producción · Blog SKY | `06531fec…` | Orden del proceso, naming de tareas, bitácora de decisiones, roles | 2026-10-15 |
| Flujo Completo de Producción Visual | `3f439c2f…8017…` | Fuentes de verdad, roles, ficha de 16 campos, estados, nomenclatura | 2026-10-19 |
| Brand Voice: Tono & Estilo (borrador v0.2) | `a7339c2f…` | Lo visual: sin crédito fotográfico, la IA no habilita relato vivencial | 2026-10-15 |
| Propuesta Flujo de trabajo + SKILL | `3ed39c2f…` | **Antecedente, no vigente** (maestro 3000×2000, vista aérea, avión) | 2026-10-09 |
| SOP Gráficos Blog | `59139c2f…` | **Propuesta previa a la IA** (niveles A/B/C, Geographic Lock) | 2026-09-23 |

Roles (Playbook): Valentina (Content Hub y guía), Daniela (wiki y distribución a diseño), Julio (SEO y supervisión),
Andrés (newsletter), Melkin (producción de piezas).

## 2. Contradicciones y cómo quedaron

| Tema | Conflicto | Resolución en la línea |
|---|---|---|
| Medidas | 3000×2000 3:2 (Propuesta) vs 1408×768 11:6 (Spec, Playbook, Flujo) | 1408×768 desde un maestro 16:9; la Propuesta es antecedente |
| Primer plano | «Obligatorio» (Spec) vs «cuando sea plausible» (alcance, Sistema) | Por defecto si es plausible, siempre declarado (elemento o razón) |
| Personas | «No siempre de espaldas» (Spec) vs «de espaldas y fuera de foco» (fichas Art. 1) | Spec vigente: espontáneas, sin pose ni mirada al lente; las fichas viejas se actualizan |
| Infografías | «Fuera por ahora» vs formato antes/después en la wiki | Fuera; el formato antes/después es de Berel (ver §3) |
| Vista aérea / avión | Propuesta los admite; Spec los prohíbe | Prohibidos (dron y avión/cabina/uniforme SKY) |
| Nomenclatura | `N1_B01_Portada`, `N1_IMG-1`, `N6_B02_V2`, nombres descriptivos | ID de tarea `N[art]_IMG-[n]` / `N[art]_BAN-[n]`; archivo = nombre de la spec en kebab-case (`exportar.mjs --nombre`) |
| Motores | «Definir modelos» (pendiente) vs fichas que ya fijan Nano Banana Pro / ChatGPT Images 2.5 | Ambos autorizados como hipótesis de arranque; nombre verificable en el log |
| Banner de ruta | Medidas sólo en una ficha y el kickoff | Contrato: 1408×400 y 1080×1080, WebP < 150 KB |
| Estados | Cinco vocabularios; fichas «Aprobado» con cuerpo «Bloqueado» | Estado de ficha ≠ tarea es un hallazgo (Playbook 14/10); no se aprueba encima |

## 3. Contaminación Berel en la wiki de SKY

«Banners» (Comunicación Visual - Formatos, `1e439c2f…`) y «Flujo de Producción Diseño» (`ec039c2f…`) son contenido de
Berel (moho, salitre, «banners para artículos de Berel», SharePoint de Berel). No son reglas de SKY. Recomendación
pendiente de decisión del operador: moverlas al teamspace de Berel.

## 4. Estado de tareas al 2026-11-02

- «Kickoff — Sección de estilo fotográfico» (Daniela): Sin empezar, fecha 28/10 vencida; el kickoff fue el 02/11.
- «Producción de banners de artículos del Content Hub» (Daniela, 43 artículos en Idea): Bloqueada por la redacción
  (Valentina).
