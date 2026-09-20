# Fotografía de marca Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.1
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Bitácora del caso](../social/2026-09-19-efeonce-photographic-language-production-method.md) · [Corrida de evidencia](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md)

Esta carpeta guarda el **Lenguaje Fotográfico de la marca propia de Efeonce**, aprobado por el operador (Julio
Reyes) el 2026-09-19 («todas me gustaron»). Aplica a fotografía e imagen fotorrealista de Efeonce. No aplica a
piezas de clientes ni a trendjacking que toma prestada una estética ajena.

Estado: **sistema aprobado y consistente, no activo distintivo medido**. Llamarlo activo distintivo exige antes la
prueba de reconocimiento descrita en los pendientes del documento maestro.

## Comandos de producción (empieza por acá)

```bash
pnpm foto:doctor                         # comprueba la cadena local sin generar ni gastar
pnpm foto:prompt --ficha-ejemplo          # plantilla de ficha de toma
pnpm foto:prompt <ficha.json> --batch <out.json>   # arma el prompt; el formato sale de UNA tabla
pnpm foto:validar <plate.png>             # valida las seis reservas sobre el plate limpio
```

`foto:prompt` existe porque dos veces se coló un valor de un formato dentro de un bloque compartido
(«Vertical 4:5.», «bottom 18%») y ninguna se vio hasta medir. `foto:validar` es el arnés de reservas, promovido
desde una carpeta de corrida el 2026-09-20 porque una herramienta dentro de una carpeta fechada no la encuentra
nadie. Detalle en [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) §4.2 y §5.

## Documentos

| # | Documento | Qué resuelve | Autor |
|---|---|---|---|
| 1 | [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) | Documento maestro: alcance, origen en el posicionamiento, la idea «El oficio a la vista», principios, qué no es Efeonce, historia de decisiones y pendientes | Claude |
| 2 | [`EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md`](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) | La firma: primer plano desenfocado planeado desde la toma, catálogo de lechos, reglas medibles, logo y selección colaborativa AXIS | Claude |
| 3 | [`EFEONCE_PHOTO_COLORIMETRY_V1.md`](./EFEONCE_PHOTO_COLORIMETRY_V1.md) | Colorimetría: roles de color (azul, naranja, lima), balance de blancos, métricas Lab y rangos objetivo | Otro agente |
| 4 | [`EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md`](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) | Catálogo de cámaras, lentes y ángulos probados, con su uso, su lecho y lo medido | Otro agente |
| 5 | [`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) | Bloques de prompt (realismo, impacto, FOREGROUND), ficha de toma y pipeline de producción con scripts | Otro agente |
| 6 | [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) | Personas: casting, gesto, mirada, piel; Julio y Nexa (referencias, identidad, QA); uniforme | Claude |
| 7 | [`EFEONCE_PHOTO_LEVERS_CATALOG_V1.md`](./EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) | **Catálogo de palancas**: las quince aprobadas (qué es, cómo se logra, marcadores verbatim, evidencia, qué no), las cuatro descartadas con su razón medida y las tres reglas que gobiernan el catálogo | Claude |

## Registros y evidencia

| Recurso | Ruta | Qué contiene |
|---|---|---|
| Bitácora del caso | [`docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md`](../social/2026-09-19-efeonce-photographic-language-production-method.md) | Ronda por ronda: qué se probó, qué resultó, qué decidió el operador, qué se aprendió, fallos con números |
| Corrida de evidencia | [`ai-generations/2026-09-19_lenguaje-fotografico-efeonce/`](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md) | Prompts verbatim por ronda (`batch*.json`, `*.txt`), bloques de prompt, scripts de medición y composición. Las imágenes son locales (gitignoreadas) |
| Entrega en OneDrive | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/` | Carpeta de entrega de la versión 1 para el equipo |
| Manual de uso | [`docs/manual-de-uso/marketing/fotografia-de-marca-efeonce.md`](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md) | Paso a paso para producir una foto de marca (lo escribe otro agente) |

## Orden de lectura recomendado

| Perfil | Orden |
|---|---|
| Quien decide o revisa la marca | 1 → 2 → bitácora |
| Quien produce una foto con IA | Manual → 5 → **7** → 2 → 3 → 4 → 6 |
| Quien produce una foto con personas reales o con Julio/Nexa | 6 → 2 → 4 → **7** |
| Quien quiere entender por qué es así | Bitácora → 1 |

## Reglas de la carpeta

- El documento maestro manda sobre los demás en alcance y principios; cada documento temático manda en su tema.
- Los números vienen de mediciones hechas en la corrida del 2026-09-19. Se marcan como **[medido]**; las decisiones
  del operador como **[decisión del operador]**; las recomendaciones propias como **[criterio]**; lo no resuelto como
  **[pendiente]**.
- Una regla nueva entra con su evidencia (ruta de la pieza y medición), no de memoria.

## Piloto de reservas nuevas — 2026-09-20 **[medido]**

Tres plates que prueban los bloques `SELECTION TARGET` (§3.8.1) y `MARGIN FIELD` (§3.8.2). **Son la referencia
vigente** para pedirle a la IA una foto que después aloje una caja de selección o una cita al margen.

| Dónde | Qué hay |
|---|---|
| Repo (índice + medición) | [`ai-generations/2026-09-20_piloto-reservas/README.md`](../../../ai-generations/2026-09-20_piloto-reservas/README.md) |
| Repo (prompts verbatim) | `ai-generations/2026-09-20_piloto-reservas/rondas/p1/batch-{45,169}.json` |
| **OneDrive (imágenes)** | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/referencias/11-piloto-reservas-2026-09-20/` |

Las imágenes del repo están gitignoreadas: **la copia compartible es la de OneDrive**, con su `LEEME.md` al lado.

Resultados: `MARGIN FIELD` pasa en 4:5 y en 16:9 nativo con **banda continua hasta 0,60 del alto** (el caso
aprobado «¿Claude o Codex?» llegaba a 0,35). `SELECTION TARGET` sirve **con padding de 0,02 del lienzo** (3,29:1);
pegado al objeto falla (1,02:1) porque el objeto trae su propio borde claro, y con 0,04 vuelve a fallar porque la
caja toca a las personas. Hay punto dulce, no monotonía.

## Delta 2026-09-19 (tarde)

- [**Reserva de espacio en la toma**](EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — **aprobado (capa fotográfica)**: las cuatro reservas (texto, objeto para enmarcar, lecho de firma, aire para cursores), tono declarado, límite de cabezas, formato nativo, nunca scrim, medir antes de componer.
- [Espacio para texto y formatos nativos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md) — bitácora de la ronda: zona de titular con tono declarado y límite de cabezas; 4:5, 9:16 y 16:9 nativos. **Su capa de composición no está aprobada** (ver estado abajo).

> **Estado 2026-09-19:** aprobado el **lenguaje fotográfico** (maestro, firma, colorimetría, cámaras, personas,
> prompts/pipeline). **NO aprobada** la capa de composición gráfica sobre la foto: las pruebas de
> `EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md` fueron rechazadas por el operador y ese documento vale por sus
> reglas y prohibiciones, no por sus ejemplos.
