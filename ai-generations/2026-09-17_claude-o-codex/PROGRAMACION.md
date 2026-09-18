# Programación — «¿Claude o Codex?»

Autorizado por el operador el 2026-09-17: LinkedIn en la **página de Efeonce** (no en su perfil), Instagram
**en colaboración con Efeonce**, y también Threads. Eligió la versión de LinkedIn en voz de la empresa y Threads
desde su propia cuenta. Horas con `getBestTimeToPostByNetwork` (Threads no está soportado por la herramienta: va
alineado con Instagram).

| Red | Cuenta | Fecha/hora (Santiago) | ID / UUID | Estado al crear |
|---|---|---|---|---|
| Instagram | `cesargrowth` (marca `5105024`) + **colaboradora `efeoncepro`** | 2026-09-23 10:00 | `377864349` / `-1000316609540636218` | PENDING · POST · autoPublish · `isAiGenerated: false` · alt text · PNG |
| Threads | `cesargrowth` (marca `5105024`) | 2026-09-23 10:00 | `377864406` / `2896359603539758540` | PENDING · POST · autoPublish · alt text · PNG |
| LinkedIn | página Efeonce (marca `3961547`, `urn:li:organization:20503593`) | 2026-09-23 11:00 | `377864466` / `8771071419592755692` | PENDING · post · autoPublish · alt text · PNG |

Mejores horarios medidos: Instagram de su cuenta, miércoles 10:00 (6.506, el más alto de martes–miércoles);
LinkedIn de la página, miércoles 11:00 (2.445, el doble que las 10:00). Miércoles deja dos días de aire después del
KV «Tu IA no conoce tu negocio» del lunes 21/09, que sale en el feed de `efeoncepro`.

Media: `out/claude-o-codex-4x5-v04-1080x1350.png` subida a
`gs://efeonce-group-greenhouse-public-media-prod/campaigns/claude-o-codex-2026/claude-o-codex-4x5-v04.png`
(HTTP 200, `image/png`, 2.876.168 bytes); Metricool la re-alojó como PNG en cada post.

Copy: el de `COPY.md`. Instagram y Threads en su voz; LinkedIn adaptado a la voz de la empresa **citándolo**, porque
«En junio escribí aquí» deja de ser cierto publicado desde la página. Sin marca de contenido generado por IA, por
decisión del operador.

**Lectura de vuelta** con `getScheduledPosts` en las dos marcas, 2026-09-17 23:37: los tres en PENDING con el texto,
la imagen, el alt text y la hora esperados; Instagram con `collaborators: efeoncepro` e `isAiGenerated: false`.

## Pendiente

- **Alguien con acceso a `efeoncepro` debe aceptar la invitación de colaboración desde la app de Instagram.** Hasta
  que la acepten, el post sólo aparece en `cesargrowth`.
- Readback después de publicar (miércoles 23/09, 11:00+): confirmar `PUBLISHED`, URL pública y que la colaboración
  quedó activa.
