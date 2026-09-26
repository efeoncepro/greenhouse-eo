# 2026-09-19 — Lenguaje Fotográfico Efeonce

> **Tipo de documento:** README de corrida de generación
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Documentación relacionada:** [Índice de fotografía de marca](../../docs/operations/brand-photography/README.md) · [Lenguaje fotográfico V1](../../docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma](../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Bitácora](../../docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md) · [Índice de corridas](../INDEX.md)

## Propósito

Definir cómo fotografía Efeonce su propia marca para que «incluso al ver una foto y su colorimetría se pueda sentir
que es un elemento o foto de la agencia» (Julio Reyes). La corrida recorre 14 rondas: del grade navy descartado a la
idea aprobada **«El oficio a la vista»**, con su firma (primer plano desenfocado planeado + logo), roles de color,
catálogo de cámaras, bloques de prompt y pruebas con Julio y Nexa.

**Estado:** ✅ dirección aprobada por el operador el 2026-09-19 («todas me gustaron»). Piezas de exploración:
ninguna publicada ni programada. No es activo distintivo medido (falta prueba de reconocimiento).

## Motor

| Uso | Modelo | Ajustes |
|---|---|---|
| Escenas sin identidad | `gpt-image-2.5-flare` | `--quality high --size 1152x1440` (4:5) |
| Identidad (Julio, Nexa) y ediciones con máscara | `gpt-image-2.5-sunburst` | Igual; referencias con rol |
| Masters | `xhigh` | Sólo para masters (1,8× costo; comparación `rondas/impacto/high-vs-xhigh.jpg`) |

Comando base: `pnpm ai:image --batch <json> --out <dir> --model gpt-image-2.5-flare --quality high --size 1152x1440`.
Costo total ≈ USD 6–7 en ~95 generaciones (≈ USD 0,05 por imagen `high`; ediciones ≈ 0,07–0,10).

## Estructura

| Ruta | Contenido | En git |
|---|---|---|
| `prompts/bloque-realismo-v2.txt` | Bloque de realismo vigente («no se siente IA», sin suciedad) | Sí |
| `prompts/bloque-impacto-v1.txt` | Bloque de impacto vigente (luz con carácter, momento decisivo, composición gráfica, tres planos, bloque azul) | Sí |
| `prompts/PROPUESTA_LENGUAJE_FOTOGRAFICO_V1.md` | Propuesta intermedia con grade navy (descartada; su método de prueba de reconocimiento sigue vigente) | Sí |
| `prompts/BRIEF_ANALISIS.md`, `prompts/BRIEF_V3.md` | Briefs a subagentes (análisis y rediseño tras el rechazo de la V2) | Sí |
| `rondas/<ronda>/batch*.json`, `*.txt` | Prompts verbatim por pieza | Sí |
| `rondas/<ronda>/*.png`, `*.jpg` | Plates, finales firmados, hojas de contacto, grillas (216 archivos) | No (gitignoreados) |
| `scripts/` | Medición y composición (abajo) | Sí |

## Rondas

| # | Carpeta | Qué se probó | Resultado |
|---|---|---|---|
| 1 | `rondas/ejemplos/` | Color natural vs grade navy | Gana el natural; grade descartado |
| 2 | `rondas/asiento/` | «Asiento en la mesa»: A/A2 mesa, B silla, C/C2 escritorio; firma v1 | Nace la firma planeada |
| 3 | `rondas/territorios/` | T1/T1b galería, T2 claroscuro, T3 set tonal verde | T3 queda como referencia de serenidad |
| 4 | `rondas/paleta/` | P1 tinta, P2 podcast, P3 claro | HEX laxo; lámparas encendidas = podcast-stock; roles de color |
| 5 | `rondas/v2/` | Grilla V2 de 9 (tinta/cálido, uniforme, sin personas, nave 3D) | Rechazada por genérica |
| 6 | `rondas/oficio/` | 6 piezas «El oficio a la vista» | Idea aprobada; `oficio-a-la-vista.jpg` |
| 7 | `rondas/oficio2/` | Rodaje macro, pipeline con pantalla curada, KV limpio | Método de pantallas por curación generativa |
| 8 | `rondas/oficio3/` | AEO Miami (celular curado), góndola CDMX, retrato con polo, Lima sin personas, fixes | Pantallas integradas; defecto menor en el borde del teléfono |
| 9 | `rondas/camaras/` | Ojo de pez, dron, tilt-shift, contrapicado, reflejo, tele 200 | Catálogo de cámaras; dron sin lecho (pendiente) |
| 10 | `rondas/impacto/` | Nivel +1: harina, set azul, marco, escala, persianas, objeto; high vs xhigh | Bloque de impacto |
| 11 | `rondas/cruce/` | Nivel +1 aplicado: pipeline atardecer, góndola contraluz, reflejo dorado, tilt-shift mediodía | Góndola quemado 9,6% → 1,6% |
| 12 | `rondas/palancas/` | Noche, movimiento, macro, retratos | Regla noche (aplastado 18,5% → 7,1%) |
| 13 | `rondas/curado/` | Set curado 12 sin pintura + K1 KV café, K2b retail bebidas, K3 noche | `set-curado-12.jpg` |
| 14 | `rondas/personas/` | Julio y Nexa: J1, J2, J3, N1, N1b, N2, JN1, JN2, JN3 | Identidad sostenida; `qa-identidad.jpg`, `julio-nexa-firmadas.jpg` |

## Scripts

| Script | Qué hace | Uso |
|---|---|---|
| `scripts/medir.mjs` | Nitidez Sobel (máximo, p99) y luminancia media por caja | `node scripts/medir.mjs <img> '{"lecho":[x0,y0,x1,y1],"rostro":[...]}'` (fracciones del lienzo) |
| `scripts/metricas.cjs` | Métricas Lab D65 a 576 px: L media, p1/p99, % quemado, % aplastado, contraste, croma, dispersión de tono, b\* altas/sombras, áreas azul/naranja/lima, piel | `node scripts/metricas.cjs nombre=<img> …` |
| `scripts/componer.mjs` | Firma v2: logo SVG oficial centrado (centro ≈ 93,5% del alto), color por contraste medido; selección colaborativa AXIS opcional con el renderer oficial | `LOGO=0.15 CSCALE=1.8 node scripts/componer.mjs <plate> <out> '<json selección opcional>'` |
| `scripts/firmar.mjs` | Firma v1 (histórica, ronda `asiento/`) | — |
| `scripts/ui-ref.cjs`, `scripts/ui-ia.cjs` | UI de referencia determinística (pipeline, ficha AEO) como **insumo** para curación generativa de pantallas | — |
| `scripts/efeonce-look.mjs` | Grade «Navy Shadow» + check con umbrales V1 | **Descartado**; sólo histórico |

Copias de trabajo de algunos scripts quedaron dentro de las rondas donde nacieron (`rondas/asiento/`, `rondas/oficio2/`,
`rondas/oficio3/`); la versión de referencia es la de `scripts/`. Promoverlos a comando `pnpm` está pendiente.

## Referencias usadas

- Julio: `../2026-09-17_equipo-vestuario/refs/julio-reyes-01.png`, `-04.png`, `-07.png`.
- Nexa: `../2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png`, `nexa-the-point.png`, `nexa-the-listen.png`.
- Polo: `../2026-09-17_polo-efeonce/final/efeonce-polo-navy-01-frente-1600x1600-v01-fondo-estudio.png`, `efeonce-polo-navy-10-detalle-bordado-1600x1600-v01-fondo-estudio.png`.
- Logo: `public/branding/logo-negative.svg`, `public/branding/logo-full.svg`.

## Entrega

Carpeta OneDrive de la versión 1: `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/`.

## Pendientes

Espacio para texto; 9:16 y 16:9 nativos; firma para dron y tomas todo-enfocadas; scripts a `pnpm`; masters `xhigh`
con limpieza de la inscripción de la cámara y revisión de emblemas; equipo real para piezas publicables; prueba de
reconocimiento; pruebas con Clawd, Codex, logo y nave 3D junto a Julio y Nexa. Archivar binarios pesados con
`pnpm media:archive-ai-generation -- --run ai-generations/2026-09-19_lenguaje-fotografico-efeonce --apply` si se
requiere respaldo remoto.
