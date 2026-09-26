# «Nivel de búsqueda» (2026): trendjacking GTA VI, de la estética equivocada a Metricool

Fecha de registro: 2026-09-19. Owner: Social Media Studio / Efeonce.
Caso: carrusel de trendjacking sobre el lanzamiento de GTA VI (19-nov-2026), territorio AEO + IA.
Bitácora técnica y creativa; las reglas transferibles viven en las skills enlazadas por el
[protocolo social](../SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) y el
[contrato publicitario](../ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md). Procedencia, prompts, compositor y QA en
[`LEEME.md`](../../../ai-generations/2026-09-19_nivel-de-busqueda/LEEME.md); copy en
[`COPY.md`](../../../ai-generations/2026-09-19_nivel-de-busqueda/COPY.md); programación en
[`PROGRAMACION.md`](../../../ai-generations/2026-09-19_nivel-de-busqueda/PROGRAMACION.md) (binarios fuera de git).

## 1. Estado

| Pieza | Red | Fecha/hora (America/Santiago) | Metricool id | Estado verificado |
|---|---|---|---|---|
| Carrusel 9 × 1080×1350 | Instagram `efeoncepro` | 2026-09-22 16:00 | `378566667` | `PENDING` (readback 2026-09-19) |
| Documento PDF 9 páginas | LinkedIn organización | 2026-09-25 11:00 | `378566757` | `PENDING` (readback 2026-09-19) |
| Pieza suelta «Nadie te está buscando» | — | — | — | Producida, **no programada** |

Aprobación del operador: «Me encanta todos… programemos». Horas = máximo semanal de `getBestTimeToPostByNetwork`
(IG mar 16 h, índice 311; LinkedIn vie 11 h, índice 2914), sin choque con el KV del lunes 21 ni «¿Claude o Codex?» del
miércoles 23. Readback: texto idéntico a `COPY.md`; orden verificado por firma de imagen (primera = portada, última =
contraportada, diferencia 0). Media en `gs://efeonce-group-greenhouse-public-media-prod/campaigns/nivel-de-busqueda-2026-09/`.
Publicación y medición: pendientes. Entrega al equipo en OneDrive: `5. Contenidos/Trendjacking/2026/2026-09-16-Lanzamiento GTA VI/Nivel de búsqueda/v04/` (manifiesto SHA-256 verificado).

## 2. Concepto

- **Doble sentido:** en la comunidad hispana, las estrellas de persecución son el «nivel de búsqueda». En el juego, cinco
  estrellas = te persigue toda la ciudad; en la búsqueda con IA = te encuentran ChatGPT, Perplexity y Gemini, y ahí sí
  las quieres.
- **Secuencia:** portada-gancho con el meme de la espera («GTA VI va a llegar **antes** que tu marca a ChatGPT», 13 años
  desde GTA V) → reencuadre («Cinco estrellas: **todos** te buscan») → 5 misiones AEO (entidad, respuesta primero, datos
  propios, menciones, acceso de rastreadores) → «Misión **cumplida**» → contraportada «Pide **refuerzos**» con el logo
  3D como héroe, Clawd y Codex como equipo de refuerzo y firma url-lum.
- **Marca en escena:** Nexa (portada), logo 3D monumental (misión 1 y contraportada), nave (cierre), Clawd y Codex
  (contraportada). Los cursores colaborativos cuentan al squad trabajando cada misión.

## 3. Cómo se llegó (iteraciones)

| Versión | Qué pasó | Corrección |
|---|---|---|
| v1 | Plates fotográficos synthwave 80s y 2 niveles de texto planos: «no está mal, pero no está bien» | Estudio visual con fuentes: GTA VI = Florida hiperreal 2026 + key art de realismo ilustrado pintado ([estudio](../../../ai-generations/2026-09-19_nivel-de-busqueda/brief/gta6-visual-study.md)) |
| v2 | Escenas pintadas propias, marca en escena, 4 niveles, selección AXIS | Plates regenerados con layout en el prompt (cielo oscuro reservado en %) tras logo cortado y titulares a 1,4:1 |
| v3 | Contraportada pedida por el operador | Una pasada Sunburst con 4 referencias (logo, silueta, Clawd, Codex); regenerada con «STRICT LAYOUT» para dejar cielo y piso oscuros |
| v4 | Pasada de jerarquía: «que no haya jerarquías planas» | 5 voces por lámina, texto enriquecido por palabra, Guttery 1 por pieza; acento naranja sólo donde se lee |

Falsas alarmas y trampas registradas: moderación `safety_violations=[sexual]` con una multitud apuntando teléfonos
(pasó reescrita como festival con ropa descrita); JSON de `--batch` roto por comillas dentro del bloque de estilo;
hoja de revisión alfabética que hizo creer que la contraportada no era la última; sesión gcloud vencida antes de subir
media (`pnpm gcloud:auth:playwright -- --force`).

## 4. Sistema tipográfico final (resumen)

Etiqueta Poppins 700 + estrella naranja · entrada Bricolage 420 celeste con nombres propios a 760 · dominante
Bricolage 780 ancho 78 con palabra clave naranja · cierre Bricolage 620/800 · tarjeta de notificación Poppins 400/700
con vidrio esmerilado real · gesto Guttery blanco. Compositor de referencia:
[`componer-v2.mjs`](../../../ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs) (`richBlock`,
`**negrita**`/`[[acento]]`, HUD propio, selección AXIS con cursores fijos y en movimiento, `compositeLuminosity`
exportado desde `scripts/creative/layout-compiler/compiler.mjs` para la firma url-lum).

## 5. Riesgos abiertos

- IP de Take-Two: orgánico con referencia nominativa; **no pautar** sin revisión legal. Sin logo, Pricedown, personajes,
  «Vice City», «Leonida» ni literales del juego.
- Dos mascotas de partners juntas por pedido explícito; validar guías de marca de Anthropic/OpenAI antes de pauta.
- El meme de la espera caduca el 19-nov-2026; revalidar tono antes de cada salida.
- Acentos naranjas con p98 1,8–2,5:1 (luces puntuales del skyline) aprobados por revisión visual a 390 px.
