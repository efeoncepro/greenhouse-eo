# Fotografía de marca Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-19 por Claude
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Bitácora del caso](../social/2026-09-19-efeonce-photographic-language-production-method.md) · [Corrida de evidencia](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md)

Esta carpeta guarda el **Lenguaje Fotográfico de la marca propia de Efeonce**, aprobado por el operador (Julio
Reyes) el 2026-09-19 («todas me gustaron»). Aplica a fotografía e imagen fotorrealista de Efeonce. No aplica a
piezas de clientes ni a trendjacking que toma prestada una estética ajena.

Estado: **sistema aprobado y consistente, no activo distintivo medido**. Llamarlo activo distintivo exige antes la
prueba de reconocimiento descrita en los pendientes del documento maestro.

## Documentos

| # | Documento | Qué resuelve | Autor |
|---|---|---|---|
| 1 | [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) | Documento maestro: alcance, origen en el posicionamiento, la idea «El oficio a la vista», principios, qué no es Efeonce, historia de decisiones y pendientes | Claude |
| 2 | [`EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md`](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) | La firma: primer plano desenfocado planeado desde la toma, catálogo de lechos, reglas medibles, logo y selección colaborativa AXIS | Claude |
| 3 | [`EFEONCE_PHOTO_COLORIMETRY_V1.md`](./EFEONCE_PHOTO_COLORIMETRY_V1.md) | Colorimetría: roles de color (azul, naranja, lima), balance de blancos, métricas Lab y rangos objetivo | Otro agente |
| 4 | [`EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md`](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) | Catálogo de cámaras, lentes y ángulos probados, con su uso, su lecho y lo medido | Otro agente |
| 5 | [`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) | Bloques de prompt (realismo, impacto, FOREGROUND), ficha de toma y pipeline de producción con scripts | Otro agente |
| 6 | [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) | Personas: casting, gesto, mirada, piel; Julio y Nexa (referencias, identidad, QA); uniforme | Claude |

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
| Quien produce una foto con IA | Manual → 5 → 2 → 3 → 4 → 6 |
| Quien produce una foto con personas reales o con Julio/Nexa | 6 → 2 → 4 |
| Quien quiere entender por qué es así | Bitácora → 1 |

## Reglas de la carpeta

- El documento maestro manda sobre los demás en alcance y principios; cada documento temático manda en su tema.
- Los números vienen de mediciones hechas en la corrida del 2026-09-19. Se marcan como **[medido]**; las decisiones
  del operador como **[decisión del operador]**; las recomendaciones propias como **[criterio]**; lo no resuelto como
  **[pendiente]**.
- Una regla nueva entra con su evidencia (ruta de la pieza y medición), no de memoria.

## Delta 2026-09-19 (tarde)

- [Espacio para texto y formatos nativos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md): zona de titular planificada con tono declarado y límite de cabezas; 4:5, 9:16 y 16:9 nativos; compositor `titular.mjs` con autoajuste.
