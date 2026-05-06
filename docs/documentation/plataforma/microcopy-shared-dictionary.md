# Microcopy shared y dictionary-ready

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Task:** TASK-407
> **Arquitectura relacionada:** [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md#delta-2026-05-02--copy-system-contract-task-265)
> **Manual relacionado:** [Usar microcopy shared](../../manual-de-uso/plataforma/microcopy-shared-dictionary.md)

## Para que sirve

TASK-407 migro el copy shared del shell y de componentes comunes a la capa canonica `src/lib/copy/`. Antes era normal encontrar meses, acciones base, aria-labels, empty states y status maps escritos inline en JSX o en objetos locales. Ahora esas piezas reutilizables viven en un dictionary-ready module que mantiene paridad de claves por locale y prepara el camino para i18n.

El objetivo no es traducir todo el portal todavia. El objetivo es evitar drift: que "Guardar", "Pendiente", "Sin resultados", "Cerrar dialogo" o "Enero" no existan en decenas de variantes locales.

## Que cambio

- `src/lib/copy/` quedo como fuente canonica de microcopy funcional shared.
- `getMicrocopy(locale?)` es la API publica para leer acciones, estados, loading, empty states, meses, aria-labels, errores, feedback y tiempo relativo.
- `buildStatusMap()` permite construir status maps type-safe sin repetir labels inline.
- La regla ESLint `greenhouse/no-untokenized-copy` se extendio para detectar arrays de meses y CTAs JSX text, ademas de los patrones ya existentes.
- El sweep de `src/views`, `src/components` y `src/app` quedo en 0 warnings para `greenhouse/no-untokenized-copy`.
- Los textos de dominio que no son reutilizables siguen cerca del modulo, pero no deben duplicar copy shared.

## Capas canonicas

| Tipo de texto | Fuente canonica | Ejemplo |
| --- | --- | --- |
| Nomenclatura de producto | `src/config/greenhouse-nomenclature.ts` | Pulse, Spaces, Mi Greenhouse, Torre de control |
| Microcopy funcional shared | `src/lib/copy/` | Guardar, Cancelar, Pendiente, Sin resultados, Cerrar dialogo |
| Copy de dominio local | Cerca del dominio | Estado legal especifico de Payroll o Finance |

## Uso basico

```tsx
import { getMicrocopy } from '@/lib/copy'

const t = getMicrocopy()

<Button>{t.actions.save}</Button>
<Chip label={t.states.pending} />
<IconButton aria-label={t.aria.closeDialog} />
```

Para meses:

```ts
const t = getMicrocopy()

const shortMonth = t.months.short[monthIndex]
const longMonth = t.months.long[monthIndex]
```

Para status maps:

```ts
import { buildStatusMap, getMicrocopy } from '@/lib/copy'

const t = getMicrocopy()

const statusLabels = buildStatusMap({
  pending: t.states.pending,
  approved: t.states.approved,
  rejected: t.states.rejected
})
```

## Reglas de decision

- Si el texto aparece en varias superficies y describe una accion, estado, empty, loading, aria-label o mes, debe vivir en `src/lib/copy/`.
- Si el texto nombra una capacidad propia del producto, debe vivir en `greenhouse-nomenclature.ts`.
- Si el texto explica una regla de negocio especifica de una pantalla, puede vivir localmente, con nombre claro y sin duplicar shared copy.
- Si falta una key shared, agregarla al dictionary con paridad de locales y test cuando aplique.
- No crear un namespace nuevo si solo lo usa una superficie.

## Guardrails

- No escribir CTAs base como texto literal en JSX.
- No escribir arrays locales de meses.
- No escribir status maps con `{ label: 'Pendiente' }` cuando el estado existe en `getMicrocopy().states`.
- No usar `eslint-disable greenhouse/no-untokenized-copy` salvo con justificacion puntual y temporal.
- No mover todo copy de dominio a `src/lib/copy/`; la capa shared no es un basurero de strings.

## Relacion con i18n

`src/lib/copy/` ya acepta locale y mantiene `es-CL` como default. El locale `en-US` existe como stub para paridad type-safe. La traduccion real y el runtime i18n viven en el programa `TASK-266`, especialmente `TASK-428` y `TASK-430`.

TASK-407 deja las superficies compartidas listas para ese runtime: cuando los dictionaries reales existan, los consumers no deberian necesitar reescritura.

## Validacion aplicada

La entrega de TASK-407 paso:

- Test unitario de `greenhouse/no-untokenized-copy`.
- Test unitario de `buildStatusMap`.
- ESLint focal sobre `src/views`, `src/components` y `src/app` con 0 warnings `greenhouse/no-untokenized-copy`.
- `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, `pnpm test` y `pnpm build`.

