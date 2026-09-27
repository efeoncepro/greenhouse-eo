# Identidad sonora de Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.0
> **Creado:** 2026-09-26 por Claude
> **Última actualización:** 2026-09-26 por Claude
> **Estado de la identidad sonora:** recomendada, no canon; Glitch pendiente

Esta carpeta guarda la identidad sonora de la marca propia de Efeonce: el logo sonoro «Tres puntos que se vuelven uno»,
la etiqueta con voz, el sonido del motion del logo y las piezas largas. No aplica a clientes ni a la UI de Greenhouse.

| Recurso | Dónde | Qué es |
|---|---|---|
| Canon operativo | [`EFEONCE_SONIC_IDENTITY_V1.md`](./EFEONCE_SONIC_IDENTITY_V1.md) | Concepto, motivo, registros, acentos, voz, tiempos del motion, mapa de uso, reglas, ficha técnica, método de producción y trampas |
| Decisión (ADR) | [`EFEONCE_SONIC_IDENTITY_DECISION_V1.md`](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md) | Qué se decidió, alternativas descartadas, consecuencias y reversibilidad |
| Referencia viva | [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) · [JSON](https://axis.efeonce.org/references/sonic-brand.json) | Página y JSON para agentes (PR AXIS #4, squash `55486aa`; publicados 2026-09-26) |
| Archivos | `gs://efeonce-group-axis-public-media/sonic/v1/` | 65 archivos: `masters/` y `web/` |
| Producción | [`ai-generations/2026-09-26_branding-sonoro/`](../../../ai-generations/2026-09-26_branding-sonoro/LEEME.md) | Motor, kit, guía e historia de las rondas |

## Documentación para personas

- Funcional: [Identidad sonora de Efeonce](../../documentation/creative/identidad-sonora-efeonce.md)
- Manual de uso: [Usar la identidad sonora de Efeonce](../../manual-de-uso/creative/usar-identidad-sonora-efeonce.md)

## Reglas de la carpeta

- La norma manda en reglas; los archivos del kit mandan en el sonido. Nunca se regeneran el logo, la voz ni la esfera.
- Mientras no se canonice, los valores no viven en `@efeoncepro/axis-tokens`; al canonizar pasan a tokens junto a
  `efeonceGraphicLine.motion.sound`.
- Relacionados: [línea gráfica «La órbita»](../brand-graphic-line/README.md).
