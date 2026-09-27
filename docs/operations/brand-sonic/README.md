# Identidad sonora de Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.3
> **Creado:** 2026-09-26 por Claude
> **Última actualización:** 2026-09-27 por Claude
> **Estado de la identidad sonora:** recomendada, no canon (no cambia). Glitch tiene su diseño sonoro propio, aprobado
> (B), y su música propia, aprobada; los dos son sólo de Glitch, en la norma de Glitch §13.11 y §13.12

Esta carpeta guarda la identidad sonora de la marca propia de Efeonce: el logo sonoro «Tres puntos que se vuelven uno»,
la etiqueta con voz, el sonido del motion del logo y las piezas largas. No aplica a clientes ni a la UI de Greenhouse.

| Recurso | Dónde | Qué es |
|---|---|---|
| Canon operativo | [`EFEONCE_SONIC_IDENTITY_V1.md`](./EFEONCE_SONIC_IDENTITY_V1.md) | Concepto, motivo, registros, acentos, voz, tiempos del motion, mapa de uso, reglas, ficha técnica, método de producción y trampas |
| Decisión (ADR) | [`EFEONCE_SONIC_IDENTITY_DECISION_V1.md`](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md) | Qué se decidió, alternativas descartadas, consecuencias y reversibilidad |
| Referencia viva | [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) · [JSON](https://axis.efeonce.org/references/sonic-brand.json) | Página y JSON para agentes (PR AXIS #4, squash `55486aa`; publicados 2026-09-26) |
| Archivos | `gs://efeonce-group-axis-public-media/sonic/v1/` | 65 archivos: `masters/` y `web/` |
| Producción | [`ai-generations/2026-09-26_branding-sonoro/`](../../../ai-generations/2026-09-26_branding-sonoro/LEEME.md) | Motor, kit, guía e historia de las rondas |
| Sonido de Glitch (aprobado, versión B, 2026-09-27) | [norma de Glitch](../brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) §13.11 · [axis.efeonce.org/references/glitch/#sonido](https://axis.efeonce.org/references/glitch/#sonido) · archivos en `gs://efeonce-group-axis-public-media/glitch/sound/v1/` | **Sólo de Glitch**, no de esta identidad: no se usa en piezas de Efeonce ni se mezcla con este kit |
| Música de Glitch (aprobada, tema B + cama post-punk, 2026-09-27) | [norma de Glitch](../brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) §13.12 · [axis.efeonce.org/references/glitch/#musica](https://axis.efeonce.org/references/glitch/#musica) · archivos en `gs://efeonce-group-axis-public-media/glitch/music/v1/` | **Sólo de Glitch**, no de esta identidad: no se usa en piezas de Efeonce ni de clientes |

## Documentación para personas

- Funcional: [Identidad sonora de Efeonce](../../documentation/creative/identidad-sonora-efeonce.md)
- Manual de uso: [Usar la identidad sonora de Efeonce](../../manual-de-uso/creative/usar-identidad-sonora-efeonce.md)

## Reglas de la carpeta

- La norma manda en reglas; los archivos del kit mandan en el sonido. Nunca se regeneran el logo, la voz ni la esfera.
- Mientras no se canonice, los valores no viven en `@efeoncepro/axis-tokens`; al canonizar pasan a tokens junto a
  `efeonceGraphicLine.motion.sound`.
- Relacionados: [línea gráfica «La órbita»](../brand-graphic-line/README.md).
