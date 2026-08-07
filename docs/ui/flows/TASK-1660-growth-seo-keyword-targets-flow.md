# Flow — TASK-1660 · Declarar keywords objetivo y seguir su avance

> **Tipo de documento:** Contrato de flujo (coordinación entre superficies)
> **Creado:** 2026-08-07 por Claude (TASK-1660)
> **Task:** [TASK-1660](../../tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md)
> **Wireframe:** [TASK-1660-...](../wireframes/TASK-1660-growth-seo-keyword-targets.md)
> **Master flow:** [EPIC-022 · Search Visibility 360](EPIC-022-search-visibility-360-UI-FLOW.md) — esta
> superficie extiende el **nodo S3**

## Por qué este flujo existe

Declarar un objetivo **compromete gasto recurrente** igual que seguir una oportunidad: la keyword
entra al ciclo diario de captura y se le paga al proveedor por cada ciclo, indefinidamente. Pero a
diferencia de una oportunidad —que se elige de una lista ya acotada por el reader— un objetivo se
**escribe a mano**, así que no hay nada que limite lo que alguien puede meter.

Ese es el riesgo que este flujo tiene que contener: **texto libre que compromete presupuesto**.

## Actores

| Actor | Qué puede hacer | Gate |
|---|---|---|
| Operador Efeonce con `growth.seo.target.configure` | declarar, dejar de seguir, ver avance | capability |
| Operador sin esa capability | ver avance | el CTA no se renderiza |
| Nexa / MCP | proponer y —tras confirmación humana— ejecutar | scope `efeonce.mcp.seo.write` + loop propose→confirm→execute |
| Cliente | **nada en V1** — ver `Fuera de alcance` | — |

## Journey principal — declarar objetivos

```
Keywords › lente Objetivos
        │
        │ [+ Declarar objetivos]
        ▼
┌─────────────────────────────────────────────┐
│ DRAWER · Declarar objetivos                 │
│                                             │
│  Una keyword por línea                      │
│  ┌───────────────────────────────────────┐  │
│  │ pintura industrial                    │  │
│  │ recubrimiento epóxico                 │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Vas a agregar 2 al ciclo diario.           │
│  Cupo: 14 de 200.                           │
│                                             │
│  [Cancelar]              [Declarar]         │
└─────────────────────────────────────────────┘
        │
        ▼  POST /api/admin/growth/seo/keywords/track  (intención = objetivo)
        │
        ├─ todas ok       → snackbar "2 objetivos declarados" + Deshacer
        ├─ parcial        → 🔴 la lista queda con el resultado POR keyword visible
        └─ techo alcanzado→ mensaje explícito + camino para liberar cupo
```

### Por qué un drawer y no un modal

Los objetivos se declaran **en lote** y contra la lista que ya está en pantalla ("¿cuáles ya
tengo?"). Un modal tapa esa lista; el drawer la deja visible al costado. Es el mismo criterio del
Adaptive Sidecar del repo: si el usuario necesita seguir viendo el contexto mientras opera, no es
un modal.

### Por qué textarea multilínea y no un campo por keyword

Un objetivo rara vez viene solo: viene de una reunión de kickoff con una lista. Obligar a agregar
de a uno convierte una tarea de 30 segundos en una de cinco minutos, y empuja al operador a
pedirlo por MCP —donde no hay confirmación visual del cupo—.

### El contador de cupo es parte del flujo, no adorno

🔴 **El costo tiene que ser visible ANTES de confirmar, no después.** El drawer muestra cuántas se
van a agregar y cuánto cupo queda. Sin eso, el operador descubre el techo cuando el command lo
rechaza, que es tarde y se lee como un error del sistema en vez de como un límite de presupuesto.

## Resultado por keyword — el contrato que no se puede colapsar

El command devuelve un outcome **por keyword**, nunca un booleano. La UI debe reflejarlo así:

| Outcome | Qué ve el usuario |
|---|---|
| declarada | entra a la lista, marcada como nueva |
| ya era objetivo | se dice explícito, no se cuenta como nueva |
| era oportunidad, ahora objetivo | 🔴 se dice que **cambió de intención** — pasó algo, no es "ya estaba" |
| techo alcanzado | queda fuera, con el motivo |
| inválida | queda fuera, con el motivo |

⚠️ Un lote de 10 donde 7 entran y 3 no **no es un éxito ni un fracaso**: es un resultado mixto y la
UI tiene que poder decirlo. Colapsarlo a "listo" o a un error rojo pierde información que el
operador necesita.

## Deshacer

Ventana de segundos con **Deshacer** en el snackbar, igual que Seguir en Oportunidades. Llama a
`untrack`, que cierra la ventana sin borrar.

⚠️ Deshacer **no es un rollback perfecto y hay que decirlo**: la keyword deja de consumir
presupuesto, pero si vuelve a declararse empieza una ventana nueva y los días fuera quedan como
hueco permanente en su serie. En una declaración recién hecha da igual; el copy no debe prometer
reversibilidad total como principio general.

## Salidas del flujo

| Desde | A dónde | Por qué |
|---|---|---|
| Keyword de la tabla | `/admin/growth/seo/performance` con su serie aislada | ver la trayectoria completa, no sólo el Δ |
| Página que rankea | la URL real, en pestaña nueva | verificar qué está compitiendo |
| Lente vacía | lente Oportunidades | camino alternativo: convertir una oportunidad en objetivo |
| Objetivo existente | cambiar intención a oportunidad | el carril inverso, mismo command |

## Nexa / MCP

Reads directos. Writes **sólo** por el loop gobernado `propose → confirmación humana → execute`:
Nexa nunca declara un objetivo por su cuenta, porque declarar compromete gasto. La confirmación
humana es la misma que en la UI, y el actor queda registrado como el consumidor máquina para que la
procedencia del gasto sea auditable.

## Motion

Sin motion no trivial: apertura del drawer y transición del snackbar con los tokens existentes de
`motion/core/tokens.ts`. Respetar `prefers-reduced-motion`. **No** se declara contrato de motion
propio.

## Accesibilidad

- El drawer atrapa foco, cierra con `Escape` y devuelve el foco al CTA que lo abrió
- El resultado por keyword se anuncia en una región `aria-live="polite"`; un resultado mixto **no**
  puede comunicarse sólo por color
- Los tres segmentos del veredicto son controles con estado presionado, no chips decorativos
- El Δ de posición lleva icono y signo además de color

## Fuera de alcance

- **Que el cliente declare objetivos desde su portal.** V1 es interno (equipo Efeonce). El carril
  cliente necesita su propio modelo de permisos y una decisión sobre quién asume el gasto que el
  cliente compromete; es aditivo y va aparte.
- Metas por objetivo (posición y fecha). Acá el objetivo es binario: primera plana o no.
- Sugerir objetivos automáticamente. Eso es keyword gap y depende de datos de mercado.
