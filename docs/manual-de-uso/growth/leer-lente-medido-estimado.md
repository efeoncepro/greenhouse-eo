# Leer y reportar la lente de un dato SEO (● medido / ◑ estimado)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-29 por Claude Opus 5 (TASK-1785)
> **Documentacion funcional:** [lente-medido-vs-estimado.md](../../documentation/growth/lente-medido-vs-estimado.md)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §5](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

## Para qué sirve

Para no reportarle a un cliente un número que no significa lo que parece. Cada cifra SEO viaja con
su **lente** (de qué naturaleza es) y su **as-of** (de cuándo es). Este manual explica cómo leerlas
y qué nunca hacer con ellas.

## Antes de empezar

- La organización necesita el módulo `seo_v2` asignado.
- Nada que hacer para "activar" esto: la lente viaja sola en toda respuesta del módulo.

## Paso a paso — reportar una cifra SEO

1. **Mira la lente antes que el número.** En la respuesta viene `provenance`, con `lens`, `source`
   y `capturedAt` por cada parte del resultado.
2. **Di siempre las dos cosas: el número y su naturaleza.** "Posición 7 ◑ estimada al 28-ago" es
   reportable. "Posición 7" no lo es.
3. **Si son dos lentes, preséntalas lado a lado.** Nunca una sola cifra que las resuma.
4. **Cita el as-of.** Un dato sin fecha se lee como vigente para siempre.

## Paso a paso — pedir las dos lentes de una vez

Cuando la pregunta es *"¿dónde está rankeando este cliente?"*, pide la lectura dual en lugar de
juntar dos consultas por tu cuenta:

- Herramienta MCP: `get_seo_dual_lens_visibility`
- Ruta interna: `GET /api/platform/ecosystem/growth/seo/dual-lens-visibility`

Devuelve `measured` y `estimated` **separadas**, cada una con su lente, su as-of y su propia ventana
de fechas.

## Qué significan los estados

| Lo que ves | Qué significa |
|---|---|
| `lens: measured` (●) | Search Console: usuarios reales de tu dominio |
| `lens: estimated` (◑) | DataForSEO: el mercado, consultado por el proveedor |
| `magnitude: null` | **No se midió.** No es cero |
| `position: null` en un día | Ese día no hubo medición — un hueco, no un cero |
| `capturedAt: null` | No hay ninguna captura fechable en ese alcance |
| `unavailable: { reason }` | Esa lente no se pudo servir, y dice por qué. La otra sigue valiendo |
| `keywordsWithoutData` | Keywords que pediste y no tienen dato en esa lente. Se nombran, no se ocultan |

## Qué NO hacer

- 🔴 **Nunca promediar, sumar ni combinar una cifra ● con una ◑.** No comparten referente: el
  resultado no corresponde a ninguna realidad medible.
- 🔴 **Nunca compararlas punto a punto.** "Subió de 9 a 7" mezclando lentes no es una mejora, es
  un artefacto de haber cambiado de instrumento.
- **Nunca leer un `null` como `0`.** Cero es una medición; ausencia es otra cosa.
- **Nunca reportar una cifra sin su as-of.**
- **Nunca inferir la lente por tu cuenta** a partir del nombre del campo o de la herramienta. Viene
  declarada; úsala.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| La lente ◑ vuelve `unavailable: target_not_resolved` | La organización tiene varios mercados activos y no se eligió uno | Pasar `?market=` (ISO-2 o location_code). La lente ● sigue sirviéndose |
| Las dos ventanas (`range`) no coinciden | Normal: la serie comprada suele empezar después que el historial medido | Reportar cada ventana con su serie, no forzar una común |
| Una keyword aparece en `keywordsWithoutData` | No hay dato de esa keyword **en esa lente** | Nombrarla como sin dato; puede tener dato en la otra |
| Un campo numérico nuevo no trae lente | Un reader se agregó sin declarar procedencia | El guard de contrato debería haberlo bloqueado en CI — reportarlo, es un bug del gate |

## Referencias técnicas

- Vocabulario único: `src/lib/growth/seo/lens.ts`
- Guards: `src/lib/growth/seo/lens-coverage.ts` · `lens-surface-manifest.ts`
- Lectura dual: `src/lib/growth/seo/composed/read-dual-lens-visibility.ts`
- Invariantes de superficie agéntica: [MCP_TOOL_SURFACE_INVARIANTS.md](../../architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)
