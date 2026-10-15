# Nativas recompuestas para el brochure 360 (2026-10-15)

Copias de `ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/native/` (deck SEO/AEO, línea Engine) adaptadas al tramo donde
quedan en el 360, según la regla registrada el 2026-10-15 en `EFEONCE_SURFACE_COMPOSITION_V1.md`: una lámina que viene de otra línea se
recompone en el acento del tramo.

| Archivo | Lámina del 360 | Cambios |
|---|---|---|
| `Insights-Llega.html` | 22 «¿Cómo te llega? Como la necesites.» (Growth) | acento `#0375db` → `#36c8bf` (esfera, anillo, selección, arcos, curva); fondo `#091951` → `#001a33` |
| `Insights-Formatos.html` | 23 «¿Y el PPT del comité? Ya está.» (Growth) | ídem |
| `familia.html` | 10 «¿Qué hay dentro? Cuatro piezas.» (Engine) | sólo fondo `#091951` → `#001a33`; conserva el azul de Engine |

Se hornean con el script del deck SEO: `node ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs <html> <png>`
(Playwright, 1920×1080). El lockup de Insights es el archivo oficial de `@efeoncepro/axis-brand-assets`, sin recolorear.
No son recetas del catálogo: si otro deck Growth las necesita, se promueven como variante de línea.
