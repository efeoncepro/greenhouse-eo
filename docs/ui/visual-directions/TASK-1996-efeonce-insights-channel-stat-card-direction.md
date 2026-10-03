# TASK-1996 — Dirección aprobada: tarjeta de cifra con isotipo de canal

- **Aprobada por:** el operador, 2026-10-03, en el canvas «TASK-1975 · Tarjeta de cifra»
  (<https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>), junto con su inventario.
- **Hojas (tamaño nativo):** [`TASK-1996-efeonce-insights-channel-stat-card/paginas/`](TASK-1996-efeonce-insights-channel-stat-card/paginas/):
  `Premium-Cifras-Canal.png` (A4), `Deck-Cifras-Canal.png` (deck), `Cifras-Canal-Norma.png` (regla) y
  `Cifras-Canal-Inventario.png` (qué cifra lleva qué ícono).
- **Sistema de diseño:** AXIS `v0.3.42`: contrato `efeonce.insights-stat-card` 0.2.0, tokens
  `efeonceInsights.statCard.channel`, isotipos `AXIS_PLATFORM_ASSETS` (@efeoncepro/axis-brand-assets 0.4.15) y glifos
  Trazo D30 (@efeoncepro/axis-graphic-line 0.15.0). Lab: <https://axis.efeonce.org/references/insights/#cifras-canal>.

## Decisión

| Tablero | Título | Celda |
|---|---|---|
| Mezcla motores de respuesta (ChatGPT, Gemini, Claude, Perplexity, AI Overview) | sin isotipo | disco blanco con el isotipo al 60 % + nombre del canal; la métrica bajo la cifra |
| Todas las cifras salen de las mismas plataformas (Search Console y Google; Greenhouse) | isotipos una vez, Search Console primero | ícono de la métrica |
| Alguna cifra sin plataforma conocida | sin isotipo | ícono de la métrica |

- La plataforma sale de la **fuente** del hecho (Search Console, GA4, ICO → Greenhouse) y, si no, de su `channelId`.
- Disco: 30 px en A4 y web, 28 px en el deck; filete fino en papel, sin filete en navy. Junto al título, 22 px.
- El isotipo reemplaza al ícono de la métrica: nunca los dos. Una plataforma sin isotipo conocido queda con su nombre.
- AI Overview lleva su lupa con el degradado de la G, no la G de Google.

## Evidencia

- Catálogos: `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/fidelity/derivada-{Cifras-Canal-Celdas,Cifras-Canal-Titulo,Deck-Cifras-Canal-Celdas,Deck-Cifras-Canal-Titulo}.png`.
- Ediciones reales (septiembre 2026): `docs/ui/reviews/TASK-1996-efeonce-insights-channel-stat-card/berel-2026-09-a4-cifras-seo.png`
  (Search Console y Google en el título) y `sky-2026-09-deck-cifras-ico.png` (Greenhouse en el título).
- Las hojas del canvas no traen el cromo de página (pie, bloque de fuentes): se revisan lado a lado, no con la medición
  de fidelidad ≤ 1 %.
