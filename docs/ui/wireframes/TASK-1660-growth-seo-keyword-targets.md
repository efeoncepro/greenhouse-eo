# Wireframe — TASK-1660 · Keywords objetivo y avance contra objetivo

> **Tipo de documento:** Wireframe (contrato de layout y estados)
> **Creado:** 2026-08-07 por Claude (TASK-1660)
> **Task:** [TASK-1660](../../tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md)
> **Flow:** [TASK-1660-...-flow.md](../flows/TASK-1660-growth-seo-keyword-targets-flow.md)
> **Superficie base:** `/admin/growth/seo/keywords` — nodo S3 del
> [master UI flow de EPIC-022](../flows/EPIC-022-search-visibility-360-UI-FLOW.md)

## Qué pregunta responde esta superficie

La pantalla vigente responde **"de lo que ya tengo, ¿qué empujo?"**. Esta extensión agrega la
pregunta que Search Console **no puede** responder: **"¿dónde quiere estar el cliente, y cuánto
nos falta?"**.

Son preguntas distintas y no deben compartir el mismo lienzo sin separación explícita. Un objetivo
en posición 60 no es una oportunidad mala: es un compromiso a plazo. Mezclarlos en la misma tabla
sin distinción hace que el objetivo parezca un fracaso permanente y que la mediana de posición del
cliente se vea peor de lo que es.

## Decisión de composición

**No es una pantalla nueva.** Es una **segunda lente sobre la misma superficie**, porque el objeto
es el mismo (el set monitoreado) y partirla obligaría a mantener dos veces el veredicto, los
filtros y la tabla.

La lente se elige con `CustomTabsNav` a nivel de contenido (el mismo primitive que ya separa
Overview / Rendimiento / Keywords a nivel de módulo):

```
┌──────────────────────────────────────────────────────────────────────┐
│  Growth › SEO                    [Overview][Rendimiento][Keywords]   │  ← tabs de módulo (existe)
├──────────────────────────────────────────────────────────────────────┤
│  Space ▾        Ventana ▾                     Datos hasta 2026-08-05  │  ← contexto (existe)
├──────────────────────────────────────────────────────────────────────┤
│  ( Oportunidades )  ( Objetivos · 12 )                                │  ← LENTE (nuevo)
└──────────────────────────────────────────────────────────────────────┘
```

⚠️ El contador en la pestaña **Objetivos** no es decoración: es lo que hace descubrible que el
carril existe cuando está vacío. Sin él, un cliente sin objetivos declarados no tiene ninguna
señal de que puede declararlos.

## Lente "Objetivos" — regiones

```
┌──────────────────────────────────────────────────────────────────────┐
│  R1 · VEREDICTO DE AVANCE                                            │
│                                                                      │
│  4 de 12 objetivos ya están en primera plana                         │
│  Declarados por Ana Pérez · último cambio hace 6 días                │
│                                                                      │
│  ┌──────────────┬──────────────┬──────────────┐                      │
│  │ En 1.ª plana │  Avanzando   │  Sin avance  │  ← leyenda Y filtro  │
│  │      4       │      5       │      3       │    (mismo patrón     │
│  └──────────────┴──────────────┴──────────────┘     que Oportunidades)│
│                                                     [+ Declarar]      │
├──────────────────────────────────────────────────────────────────────┤
│  R2 · TRAYECTORIA                                                    │
│  Una línea por objetivo: posición en el tiempo, eje Y invertido      │
│  (arriba = mejor). Meta implícita = línea de primera plana en 10.    │
├──────────────────────────────────────────────────────────────────────┤
│  R3 · TABLA DE OBJETIVOS                                             │
│  Keyword · Posición hoy · Δ desde que se declaró · Página · Declarado│
│  por · Desde · [Volumen] [Dificultad]* · acción                      │
└──────────────────────────────────────────────────────────────────────┘

* Volumen y Dificultad sólo cuando TASK-1661 haya aterrizado. Hasta entonces
  las columnas NO se renderizan — no se pintan vacías ni con "—".
```

### R1 · Veredicto de avance

Espeja deliberadamente la banda de veredicto de Oportunidades: titular derivado de la distribución
real + tres segmentos que son **leyenda y filtro a la vez**. Reusar el patrón no es pereza — es lo
que hace que el operador no tenga que aprender dos gramáticas en la misma pantalla.

**Diferencia clave con Oportunidades:** el titular de Oportunidades nombra el hallazgo dominante
(*"42 de 50 son canibalización"*). Acá el titular es **progreso contra compromiso**, porque el
objetivo ya fue elegido: la pregunta no es "qué persigo" sino "cómo vamos".

Los tres segmentos:

| Segmento | Significado | Por qué existe |
|---|---|---|
| **En primera plana** | posición ≤ 10 | el objetivo se cumplió |
| **Avanzando** | mejoró desde que se declaró | va bien aunque falte |
| **Sin avance** | igual o peor desde que se declaró | 🔴 es el que dispara la conversación |

⚠️ **"Sin avance" NO es "mala keyword".** Puede ser un objetivo declarado hace una semana. La
columna "Desde" es obligatoria en la tabla justamente para que nadie lea un objetivo joven como un
fracaso.

### R2 · Trayectoria

Line chart (ECharts, `AppECharts` — el mismo que ya usa la pantalla), una serie por objetivo,
**eje Y invertido** para que subir en el gráfico signifique subir en el ranking. Línea de
referencia en la posición 10 = primera plana.

Con más de ~8 objetivos las series se vuelven ilegibles: por sobre ese umbral se muestran las
series del filtro activo y el resto se colapsa en un agregado, con el conteo dicho explícitamente
(nunca truncar en silencio).

**Estado sin datos:** un objetivo declarado hoy no tiene serie. Se muestra como punto único con la
fecha de declaración, no como línea plana desde el origen — una línea plana afirmaría mediciones
que no ocurrieron.

### R3 · Tabla de objetivos

`DataTableShell` desde `md`, lista de cards en `xs` (mismo contrato que la tabla de Oportunidades,
resuelto por CSS y no por `useMediaQuery`, para no reintroducir el mismatch de hidratación de
TASK-1657).

Columnas:

| Columna | Origen | Nota |
|---|---|---|
| Keyword | `seo_keyword_set_members.keyword` | link a Rendimiento con su serie aislada |
| Posición hoy | rank capture diario | `Sin medición aún` si todavía no corrió |
| Δ desde que se declaró | posición actual vs primera medida | con icono + signo, **nunca sólo color** |
| Página | la URL que rankea | vacío legítimo si no rankea |
| Declarado por | autoría del objetivo (TASK-1659) | un compromiso tiene autor |
| Desde | fecha de declaración | contexto obligatorio para leer el Δ |
| Volumen · Dificultad | TASK-1661 | **no se renderizan** hasta que existan |
| Acción | dejar de seguir | mismo command, con deshacer |

## Estados

| Estado | Qué se muestra |
|---|---|
| **Sin objetivos declarados** | Estado vacío con las 5 piezas: ícono, "Aún no hay keywords objetivo", explicación de que un objetivo es dónde el cliente quiere estar aunque hoy no aparezca, CTA **Declarar objetivos**, y link a Oportunidades como camino alternativo |
| **Objetivos sin medición** | La keyword aparece con `Sin medición aún` y la fecha de declaración; **no** se pinta posición 0 ni 100 |
| **Objetivo que no rankea** | Posición vacía honesta + "Fuera del top 100". 🔴 Nunca `0` ni `—` ambiguo |
| **Cargando** | Skeleton dimensionado a las 3 regiones, igual que el `loading.tsx` de la ruta |
| **Sin permiso para declarar** | La lente se ve, el CTA **no se renderiza** (mismo criterio que la columna Seguir de Oportunidades: sin capability no hay affordance) |
| **Search Console no conectado** | Hereda el estado de la ruta: la lente no se muestra |
| **Techo del set alcanzado** | El CTA queda deshabilitado con el motivo explícito y el camino: liberar cupo dejando de seguir |

## Copy

Todo el copy visible sale de `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_KEYWORDS`), extendido con un
bloque de objetivos. **Ninguna string literal en JSX** — regla del repo (lint
`greenhouse/no-untokenized-copy`).

Registro: es-CL, tuteo, sin voseo. Validar con `greenhouse-ux-writing` antes de escribir.

⚠️ Evitar "target"/"goal" en el copy visible: la pantalla es del operador y el cliente lee el
reporte que sale de ella. **Objetivo** es la palabra.

## Tokens y primitives

- Sin HEX ni px literales: `theme.palette.*` / `theme.axis.*`, spacing `4n`, radius desde
  `theme.shape.customBorderRadius.*` como longitud CSS en `sx`
- Primitives existentes: `CustomTabsNav`, `DataTableShell`, `AppECharts`, `GreenhouseChip`,
  `GreenhouseDatePicker` si aparece rango
- **No** nace primitive nueva: la trayectoria es un `AppECharts` con configuración, y el veredicto
  reusa el componente de banda de Oportunidades extraído a compartido

## Verificación visual

Scenario GVC nuevo con `qualityProfile: 'premium'`, desktop 1440 + 390px, cubriendo: lente vacía,
lente con objetivos, objetivo sin medición, y el drawer de declaración abierto. Sin `fullPage`
(sidebar fijo — ver el gotcha del helper de captura).
