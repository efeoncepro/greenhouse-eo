# Formateo locale-aware

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.1
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Task:** TASK-429
> **Arquitectura relacionada:** [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md#formatting-locale-aware-task-429)
> **Manual relacionado:** [Formatear fechas, montos y numeros](../../manual-de-uso/plataforma/formateo-locale-aware.md)

## Para que sirve

TASK-429 dejo una capa unica para mostrar fechas, horas, monedas, numeros, porcentajes, plurales y textos relativos en Greenhouse. Antes cada modulo podia formatear datos con `Intl.*` o `toLocale*` directamente; ahora el contrato canonico vive en `src/lib/format/`.

El objetivo es que Finance, Payroll, HR, PDFs, Excel, emails y vistas del portal muestren datos regionales de forma consistente sin mezclar reglas de negocio, timezone operacional y preferencias de presentacion.

## Que cambio

- Se creo `src/lib/format/` como foundation reusable.
- El default inicial del portal es `es-CL`.
- La timezone operacional default es `America/Santiago`.
- Las fechas `YYYY-MM-DD` se formatean sin drift de dia.
- Las monedas visibles usan helpers canonicos en vez de `Intl.NumberFormat` inline.
- Los formatos contables negativos son opt-in con `formatAccountingCurrency`.
- Se agrego `formatTime` para horas visibles sin fecha.
- Los helpers aceptan `locale` como segundo argumento cuando no hay opciones (`formatNumber(value, 'es-CL')`) y como tercer argumento cuando si hay opciones (`formatNumber(value, { maximumFractionDigits: 2 }, 'es-CL')`).
- La regla ESLint `greenhouse/no-raw-locale-formatting` detecta usos crudos en surfaces visibles; el baseline del portal quedo en 0 warnings el 2026-05-06.

## Helpers canonicos

| Helper | Uso |
| --- | --- |
| `formatDate` | Fecha visible para personas. |
| `formatDateTime` | Fecha y hora visible. |
| `formatTime` | Hora visible sin fecha. |
| `formatISODateKey` | Key operacional `YYYY-MM-DD`; no es copy visible. |
| `formatCurrency` | Monto monetario visible. |
| `formatAccountingCurrency` | Monto monetario con convencion contable, por ejemplo negativos entre parentesis. |
| `formatNumber` | Numero decimal visible. |
| `formatInteger` | Entero visible. |
| `formatPercent` | Porcentaje visible. |
| `formatRelative` | Texto relativo corto, por ejemplo para actividad reciente. |
| `selectPlural` | Pluralizacion simple desde un conteo. |

## Como funciona ahora

Cada caller debe importar desde `@/lib/format` y pasar el dato real mas el contexto de presentacion cuando aplique. Si no se entrega contexto, el sistema usa el default actual: `es-CL` y `America/Santiago`.

```ts
import { formatCurrency, formatDate, formatTime } from '@/lib/format'

formatCurrency(121963, 'CLP')
formatDate('2026-05-06')
formatTime('2026-05-06T12:30:00.000Z')
```

Para un locale distinto, el override debe ser explicito:

```ts
formatCurrency(1500, 'BRL', 'pt-BR')
formatDate('2026-05-06', { timeZone: 'America/Sao_Paulo' }, 'pt-BR')
formatTime('2026-05-06T12:30:00.000Z', 'pt-BR')
```

## Brasil u otro pais

TASK-429 no traduce la interfaz. Para Brasil, esta capa ya permite mostrar montos, numeros y fechas con `pt-BR`, `BRL` y `America/Sao_Paulo`. La traduccion de textos como "Finiquito", "Fecha termino" o "Liquido a pagar" vive en el programa de dictionary/i18n (`TASK-266`, `TASK-430` y sus derivadas).

El camino robusto para activar Brasil es:

1. Definir el origen canonico del locale por tenant, organizacion o usuario.
2. Resolver `locale`, `timeZone` y moneda default desde ese contexto.
3. Pasar el contexto a los helpers de `src/lib/format`.
4. Traducir copy visible mediante la capa dictionary, no mediante helpers de formato.

## Reglas de negocio

- Locale no es timezone. Un usuario puede ver formato `pt-BR` sin cambiar automaticamente la timezone operacional de un proceso de payroll chileno.
- Moneda de computo y moneda visible son decisiones separadas. No convertir FX dentro de `formatCurrency`.
- `formatISODateKey` es para claves operacionales; no debe usarse como reemplazo de una fecha visible.
- Los documentos auditables deben preservar el dato fuente y usar formatting solo en la capa de presentacion.

## Guardrails

- No usar `new Intl.*` directo en `src/views`, `src/components` ni `src/app`.
- No usar `toLocaleString`, `toLocaleDateString` o `toLocaleTimeString` directo en UI visible.
- No crear singletons locales `new Intl.DateTimeFormat(...)`; ampliar `src/lib/format` si falta una variante.
- Si el helper no cubre un caso, ampliar `src/lib/format/` con test unitario antes de crear un formatter local.
- Si un modulo necesita parsing por locale, no improvisar: parsing no fue scope de TASK-429 y requiere contrato separado de inputs, validacion y errores.

## Que no resuelve TASK-429

- Traduccion de copy visible.
- Persistencia de locale por tenant o usuario.
- UI para elegir idioma o pais.
- Conversion FX.
- Parsing locale-aware de inputs.

## Validacion aplicada

La entrega de TASK-429 paso:

- TypeScript.
- Tests unitarios de `src/lib/format`.
- Tests de finance, payroll final settlement y emails afectados.
- Lint rule test para `greenhouse/no-raw-locale-formatting`.
- `pnpm lint`, `pnpm test`, `pnpm build`.
- CI remoto, Playwright smoke y deploy de staging.
