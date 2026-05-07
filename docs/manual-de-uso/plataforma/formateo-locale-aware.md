# Formatear fechas, montos y numeros

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Ruta en portal:** Transversal
> **Documentacion relacionada:** [Formateo locale-aware](../../documentation/plataforma/formateo-locale-aware.md)
> **Arquitectura relacionada:** [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md#formatting-locale-aware-task-429)

## Para que sirve

Esta guia explica como usar la capa de formateo creada en TASK-429 cuando una pantalla, PDF, Excel o email necesita mostrar fechas, horas, monedas, numeros o porcentajes.

## Antes de empezar

- Usa siempre `@/lib/format`.
- Decide si estas mostrando un dato visible o generando una key operacional.
- No conviertas monedas dentro de un formatter.
- No cambies timezone operacional solo porque cambia el idioma o pais de presentacion.

## Paso a paso

1. Importa el helper correcto:

```ts
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatISODateKey,
  formatNumber,
  formatPercent
} from '@/lib/format'
```

2. Para montos visibles, usa `formatCurrency`:

```ts
formatCurrency(121963, 'CLP')
```

3. Para fechas visibles, usa `formatDate`, `formatDateTime` o `formatTime`:

```ts
formatDate('2026-05-06')
formatDateTime(new Date())
formatTime(new Date())
```

4. Para keys operacionales `YYYY-MM-DD`, usa `formatISODateKey`:

```ts
formatISODateKey(new Date())
```

5. Si el tenant o usuario requiere Brasil, pasa contexto explicito:

```ts
formatCurrency(1500, 'BRL', 'pt-BR')
formatDate('2026-05-06', { timeZone: 'America/Sao_Paulo' }, 'pt-BR')
formatTime(new Date(), 'pt-BR')
```

## Que helper usar

| Necesitas mostrar | Usa |
| --- | --- |
| Monto normal | `formatCurrency` |
| Monto contable negativo | `formatAccountingCurrency` |
| Fecha | `formatDate` |
| Fecha y hora | `formatDateTime` |
| Hora sin fecha | `formatTime` |
| Key `YYYY-MM-DD` | `formatISODateKey` |
| Numero decimal | `formatNumber` |
| Entero | `formatInteger` |
| Porcentaje | `formatPercent` |
| Texto relativo | `formatRelative` |
| Singular/plural simple | `selectPlural` |

## Brasil

Para Brasil no debes crear formatters nuevos por modulo. Usa la misma capa:

- Locale: `pt-BR`
- Timezone sugerida: `America/Sao_Paulo`
- Moneda: `BRL`

Esto cambia la forma de mostrar datos, no traduce labels. Los textos visibles se resuelven en la capa dictionary/i18n.

## Que no hacer

- No usar `new Intl.NumberFormat(...)` directo en una vista.
- No usar `new Intl.DateTimeFormat(...)` directo en una vista.
- No usar `value.toLocaleString(...)` directo en UI, PDF, Excel o emails.
- No crear formatters locales singleton para esquivar ESLint.
- No formatear fechas `YYYY-MM-DD` con `new Date(value)` sin pasar por el helper.
- No sumar monedas distintas para "arreglar" una visualizacion.
- No usar `formatCurrency` para convertir FX.

## Problemas comunes

| Problema | Causa probable | Que hacer |
| --- | --- | --- |
| La fecha aparece un dia antes o despues | Se parseo una fecha date-only con timezone implicita | Usar `formatDate` para visible o `formatISODateKey` para key operacional. |
| Brasil muestra moneda con formato chileno | Falta pasar `locale: 'pt-BR'` o `currency: 'BRL'` | Pasar contexto explicito hasta que exista locale por tenant. |
| ESLint advierte `no-raw-locale-formatting` | Hay `Intl.*` o `toLocale*` directo | Migrar el call site a `@/lib/format`. |
| Necesito parsear un input por locale | TASK-429 solo cubre display | Crear task separada para parsing/validacion de forms. |

## Referencias tecnicas

- `src/lib/format/`
- `eslint-plugins/greenhouse/rules/no-raw-locale-formatting.mjs`
- [TASK-429](../../tasks/complete/TASK-429-locale-aware-formatting-utilities.md)
