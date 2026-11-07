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
| Motores | «Definir modelos» (pendiente) vs fichas que ya fijan Nano Banana Pro / ChatGPT Images 2.5 | Solo `gpt-image-2.5-sunburst` (con REF-01 en modo edición); Nano Banana Pro excluido por Julio el 2026-11-05 por calidad |
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

## 5. Referencias fotográficas reales (REF-01)

Un lugar identificable sólo se genera con una foto real del lugar cargada como `--image` (invariante 10). En el lote del
2026-11-05 las REF salieron de dos fuentes, por decisión de Julio: Shutterstock primero («también tienes Shutterstock …
con el cual puedes pedir imágenes reales de referencia») y, donde no había, Wikimedia Commons (opción «Usar Wikimedia
Commons» elegida por Julio). Resultado: 33 portadas y 61 escenas generadas con REF; 20 licencias Shutterstock
(7 portadas + 13 escenas) de las 100 descargas de la suscripción.

| Fuente | Cómo se usó | Límites medidos el 2026-11-05 |
|---|---|---|
| Shutterstock API | Token en Secret Manager `greenhouse-shutterstock-oauth-token` (proyecto `efeonce-group`); búsqueda `GET /v2/images/search`; licencia en lote `POST /v2/images/licenses?subscription_id=…&size=huge` (suscripción Standard Image License, listada por `GET /v2/user/subscriptions`) y descarga desde la URL que devuelve cada licencia | 100 consultas por hora (`RateLimit-Limit: 100`; `RateLimit-Reset` dice cuándo vuelve). Las búsquedas agotaron el tope y la licencia esperó el reinicio |
| Wikimedia Commons | `Special:FilePath/<archivo>?width=2000` para portadas; miniaturas `…/1920px-…` para escenas; reducción a 2400 px con sharp | Pausas entre descargas y User-Agent identificado; con 429 o descargas inválidas, reintentar más despacio; un ancho de miniatura no estándar puede responder 400 y entonces se baja el original |

Reglas:

- **Leer la descripción y mirar la miniatura antes de licenciar.** La relevancia del buscador es pobre para lugares de
  Perú: entre los candidatos aparecieron un pinar de Norfolk (Inglaterra) para Costa del Este, un puesto de fruta de
  Marrakech para el aguaje de Iquitos, «Oropesa landmarks, Spain» para Lamas y manglares de Langkawi (Malasia) para
  Tumbes. Todos se reemplazaron por fotos de Wikimedia del lugar real.
- **Elegir mirando:** hojas de contacto con hasta 8 candidatos por imagen, etiquetados `S0…` (Shutterstock) y `W0…`
  (Wikimedia; `X0…` en la segunda pasada), con la imagen y la búsqueda como rótulo (`tools/imagenes/csheet3.mjs`, `csheet4.mjs`).
- **Una REF aproximada se declara**, no se esconde: Catacaos 2 usa un taller de paja toquilla de Ecuador, Titicaca 3
  usa Taquile para Amantaní y lodge de selva 2 y 3 usan vegetación amazónica genérica. Quedan como observación para
  revisión humana.
- **Sin REF válida, la pieza no se genera:** portadas de Colán y Amigos y 6 escenas quedaron bloqueadas el 2026-11-05.
- **Procedencia en `refs-ledger/` de la pieza**, sin URLs firmadas: Shutterstock con `image_id` y `license_id`;
  Wikimedia con título, página, licencia y autor; cada escena con su fuente y el uso «REF-01 solo como evidencia
  geográfica para generar; no se publica». Las fotos descargadas viven fuera de Git
  (`ai-generations/<fecha>_sky-blog-lote/{portadas,escenas}/refs/`).
