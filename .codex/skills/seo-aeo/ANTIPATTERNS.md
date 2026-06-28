# ANTIPATTERNS — Qué NO hacer (guardrails)

> Contrasta toda táctica agresiva contra este archivo ANTES de recomendarla.
> Efeonce/Greenhouse no hace black-hat: el riesgo (penalización, daño
> reputacional, pérdida de confianza de modelos IA) no compensa el atajo.
> Sello: as-of 2026-06.

## Borde black-hat / spam (riesgo de penalización Google)

- **Cloaking** — mostrar a Googlebot/bots IA algo distinto que al usuario.
  Violación dura. Incluye servir contenido por user-agent.
- **Link schemes** — compra de links, PBNs, intercambios masivos, anchors
  exactos a escala, links en footer/sidebar sitewide. Google los detecta y
  penaliza el dominio que recibe.
- **Scaled content abuse** (política reforzada 2024) — generar contenido a escala
  (IA o no) con poco valor para manipular ranking. **Este es el anti-patrón
  estrella de la era IA.** Generar 1000 posts con LLM sin datos ni valor
  incremental = penalización + cero citas IA.
- **Doorway pages** — páginas casi idénticas por ciudad/keyword sin valor único,
  hechas solo para capturar variantes. Distinto de páginas locales/programáticas
  *con valor real*.
- **Keyword stuffing** — repetir keywords antinaturalmente. Muerto hace años;
  además **no** mueve la aguja en GEO (la investigación lo confirma).
- **Hidden text / hidden links** — texto del color del fondo, oculto en CSS,
  marcar schema de contenido no visible. Violación.
- **Sneaky redirects** — redirigir al usuario a algo distinto de lo indexado.
- **Parasite SEO** — explotar la autoridad de un dominio host publicando
  contenido de terceros poco relacionado. Google endureció contra esto
  ("site reputation abuse", 2024).

## Anti-patrones específicos de AEO/GEO

- **Tratar "AEO" como canal único** — optimizar genérico "para IA" sin distinguir
  motor. Cada motor cita fuentes distintas (`04_AEO_GEO.md`).
- **Sobre-invertir en `llms.txt`** — Google no lo usa, 97% reciben cero requests.
  Ponerlo si quieres, pero no a costa de estructura/frescura/entidad.
- **Spam en Reddit/comunidades** — autopromoción descarada. Reddit y los modelos
  castigan el spam; quema la marca. Participación = valor genuino o nada.
- **Fabricar reseñas / señales falsas** — reseñas compradas, menciones falsas.
  Riesgo legal + de plataforma + reputacional.
- **Falsear E-E-A-T** — autores ficticios, credenciales inventadas, "experiencia"
  que no existe. En YMYL es especialmente grave y detectable.
- **Edición promocional de Wikipedia/Wikidata** — se revierte, daña reputación y
  puede generar cobertura negativa.

## Anti-patrones de proceso / criterio

- **Recomendar sin diagnosticar** — listas genéricas de 40 ítems sin intake ni
  priorización. (Ver SKILL.md §0.)
- **Perseguir el 100 de Lighthouse** — optimizar métricas de laboratorio en vez
  de datos de campo (CrUX). Arregla lo rojo, no persigas vanity scores.
- **Sacrificar contenido/UX por SEO** — texto keyword-stuffed que el humano
  odia, intersticiales agresivos. Google premia experiencia real.
- **Presentar estimaciones como mediciones** — si no hay GSC/herramienta, dilo;
  marca como estimado (SKILL.md §5).
- **Prometer rankings/timelines garantizados** — el SEO/AEO no se garantiza;
  quien lo promete miente. Comunica rangos y probabilidades.
- **Ignorar el costo de bloquear bots IA** — bloquear retrieval bots = salir de
  esas respuestas; data 2026: bloquear → −23.1% tráfico sin reducir citas de
  forma fiable. Decisión consciente, no default (`01_SEO_TECHNICAL.md`).
- **Afirmar datos volátiles de memoria** — features de motores y cifras cambian.
  Reverifica con WebSearch (`SOURCES.md`).

## Señal de alarma transversal

Si una táctica depende de que Google o un motor IA **no se den cuenta**, es
black-hat y es deuda con interés. La estrategia robusta y escalable (la que
Greenhouse exige) gana porque el contenido y la entidad son *genuinamente*
buenos, no porque engañan al sistema.
