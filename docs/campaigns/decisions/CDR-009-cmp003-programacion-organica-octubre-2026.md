# CDR-009 · CMP-003 SKY: programación orgánica de octubre 2026

**Estado:** Accepted · **Decisión y readback:** 2026-09-24 · **Aprobador:** Julio Reyes.
**Estado operativo verificado:** tres publicaciones `PENDING`, `autoPublish=true`, `draft=false`.
Programado no significa publicado. Este registro describe el readback del 24 de septiembre; antes de modificar
o reportar publicación efectiva, consultar Metricool de nuevo.

## Decisión y alcance

El operador aprobó el video V17 y la portada V4, corrigió los copies y autorizó explícitamente programar
el video con portada y copy propio en Instagram Efeonce, LinkedIn Efeonce y LinkedIn personal de Julio,
a mediados de octubre, en días hábiles y mejores horas disponibles. No incluye pauta, otros canales o cuentas SKY.

## Programación confirmada

Zona común **America/Santiago**; las fechas siguientes usan **UTC−03:00**.

| Canal/cuenta | Marca Metricool | Fecha y hora local | ID | UUID / planner |
| --- | --- | --- | --- | --- |
| Instagram Efeonce · `@efeoncepro` | `3961547` | martes **2026-10-13 16:00** | `381420638` | [2865505689355437489](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=2865505689355437489) |
| LinkedIn Efeonce · `urn:li:organization:20503593` | `3961547` | jueves **2026-10-15 11:00** | `381420730` | [-6530324135053210327](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=-6530324135053210327) |
| LinkedIn Julio Reyes · `urn:li:person:vj64TIaUfj` | `5105024` | viernes **2026-10-16 11:00** | `381420855` | [5258866990716306833](https://app.metricool.com/planner/calendar?blogId=5105024&openWithPostUuid=5258866990716306833) |

Instagram es `REEL`, visible también en feed, con `isAiGenerated=true`. LinkedIn es `POST` con video nativo.
Las tres publicaciones conservan portada PNG en `videoThumbnailUrl`, separada del MP4 de `media`.

## Horarios y duplicados

- Consulta Metricool: semana 12–18 de octubre. Instagram martes 16:00 = índice 311, máximo devuelto.
- LinkedIn viernes 11:00 = 2914. Se usó para Julio, cuya cola estaba vacía en esa ventana.
- LinkedIn Efeonce viernes 16 a las 11:00 ya tenía el post `381375024`. Se conservó ese post y se eligió
  jueves 15 a las 11:00 = 2790, siguiente pico hábil disponible.
- Los índices LinkedIn fueron iguales entre ambas marcas: señal del conector, no prueba de análisis
  personalizado ni garantía de rendimiento.
- Cola consultada antes de crear y releída después: exactamente un post de esta pieza por canal.

## Entregables aprobados y evidencia

- Video **V17**: `sky-v17-restored-1080p.mp4`, 1080×1920, 29,5 s, 24 fps, 708 cuadros,
  H.264 Rec.709 + AAC estéreo 48 kHz. Se subió sin recodificar.
- Portada **V4**: `sky-cover-v4-green-1080x1920.png`, PNG sRGB. Logo SKY arriba con flecha verde y resto blanco;
  «nos eligió / de nuevo.»; abajo Efeonce y URL Bubble. Sin la frase de apoyo SEO/AEO.
- Copy: versiones con más punch y corrección de voz aprobadas para programar. Institucional primera persona
  plural; perfil personal «mi equipo Efeonce». No recuperar COPY-SOCIAL-V1 como versión programada.
- Readback independiente: cuenta, provider, texto completo, fecha/zona, MP4, portada y estados coinciden.
- Se descargaron en streaming las seis URLs re-alojadas por Metricool: HTTP 200, MIME correcto y hashes
  idénticos al archivo aprobado, incluidos video y audio dentro del MP4. No se afirma escucha perceptual.

| Archivo | SHA-256 |
| --- | --- |
| Video V17 | `2800c93815414fe9d7b22d037726cc8eae2474925835a07d5d81db8015c59136` |
| Portada V4 | `0c6231629a20c719a09dd847fbe1624fb64913dd5b78aadbea97f14269ea69c4` |

## Ubicación y continuidad

La campaña conserva criterio e índice en OneDrive `Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/`.
Las entregas viven en `Alineación/5. Contenidos/11. Spot/02. SKY - SEO y AEO/`:

- `Video/sky-v17-restored-1080p.mp4`.
- `Portada/sky-cover-v4-green-1080x1920.png`.
- `COPY-PROGRAMACION-APROBADO.json`: texto exacto por canal.
- `PROGRAMACION.md`: entrega operativa y enlaces.

Evidencia local: `ai-generations/2026-09-24_cmp003-sky-reel-cover/scheduling/` contiene
`metricool-readback.json`, `posts-approved.json`, `remote-media-verification.json`, `media-hashes.json`
y `best-times.json`. Este CDR conserva el resumen verificable en Git; no incorpora binarios ni copias del brief.

### Para el siguiente agente

1. **No crear de nuevo estos posts.** Resolver por cuenta + ID/UUID de esta tabla y releer la cola.
2. Si se autoriza una corrección, actualizar el post existente conservando todos los campos; Metricool puede
   cambiar el ID, mientras el UUID permanece. Registrar el nuevo ID y releer.
3. No inferir publicación desde este documento: después de las fechas, comprobar `PUBLISHED` y `publicUrl`.
4. No hay monitor activo creado para estas publicaciones. `mediaAltText` es null para los videos;
   no afirmar alt text nativo ni verificación visual de posts todavía no publicados.
5. La autorización directa de programación gobierna esta operación; no constituye evidencia documental
   de firma de adenda. No reabrir producción o gasto basándose en los pendientes históricos de V10–V17.

Método reusable: skill `social-media-studio`, referencia `video-delivery-metricool.md`, espejada en
`.codex/skills/` y `.claude/skills/`. No cambia arquitectura o APIs: CDR de activación de esta campaña.

## Alcance documental

Se actualizan el registro de campaña, Handoff y referencias de una skill existente; no se crea una skill
ni cambia un contrato transversal. `project_context.md` fue revisado y conserva su router estable.
No se agrega un delta de arquitectura al changelog: la cronología y evidencia de esta activación viven aquí.
Los avisos heurísticos de closure-check sobre registro de skill/contexto se resuelven con este alcance.
