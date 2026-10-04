# Programación — spot «Los Sparks» (CMP001-08) · 2026-10-03

Marca Metricool `Efeonce Group` (3961547), zona `America/Santiago`. Autorización del operador en chat: «programa los
dos en metricool … para instagram la portada debe ser la 4:5».

| Red | Fecha y hora | ID post | UUID planner | Video | Portada | Estado |
|---|---|---|---|---|---|---|
| Instagram `efeoncepro` (REEL, feed) | lun 05-oct-2026 14:00 | 387560819 | 213403842407255251 | `sparks-aeo-instagram-16x9.mp4` (con intro) | `portada-instagram-4x5-1080x1350.png` | PENDING |
| LinkedIn página Efeonce | jue 08-oct-2026 11:00 | 387560873 | -1362316842369790950 | `sparks-aeo-linkedin-16x9.mp4` | `portada-linkedin-16x9-1920x1080.png` | PENDING |

**Por qué esos horarios:** cruce de `getBestTimeToPostByNetwork` con la cola de la marca. Instagram lunes 14 h
(índice 317, el máximo de la semana) y libre: el siguiente IG es el miércoles 07 a las 20:00 (CMP-001). LinkedIn jueves
11 h (índice 2790), el mejor día libre: martes 06 y viernes 09 ya tienen post a las 11:00. El índice es intensidad
relativa, no pronóstico.

**Transporte:** `gs://efeonce-group-greenhouse-public-media-prod/campaigns/cmp-001-sparks/v1-*` (HTTP 200, MIME
correcto). Metricool re-alojó la media en `static.metricool.com/planner/202610/…`; los cuatro archivos re-alojados
tienen el **mismo SHA-256** que los finales. Texto: idéntico al de `COPY-REDES.md`, según la respuesta de creación.
`autoPublish: true`, `draft: false`, `isAiGenerated: true` en el Reel.

**Pendiente / no hecho:** cambiar el enlace de la bio de Instagram (el copy dice «Link en la bio»); comprobar la
publicación después de la hora (PENDING ≠ publicado); aprobar las versiones en Marketing Studio. Sin pauta hasta la
licencia de la música.
