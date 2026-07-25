# TASK-1552 — Composer del Producer de Globe · Flow Contract

> **Migrado 2026-07-25** desde `TASK-1564`, retirada por duplicación. El dueño del composer es `TASK-1552`.


## Meta

- Owner task: `TASK-1552 — Globe Producer Composer Focused Creation`
- Related wireframe: `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`
- Related motion: `docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`
- Surfaces coordinadas: composer (`/producer/compose`) · feed (`/producer/feed`) · viewer (diálogo)
- Flow type: `spend-gated sequence` — el flujo cruza una frontera de **gasto real**

## Por qué este flujo necesita contrato

No es navegación entre pantallas: es una secuencia donde un paso **mueve dinero**. Tres cosas lo hacen
peligroso y son las que el contrato fija:

1. hay un valor mostrado (el estimado) que puede desincronizarse de lo que se va a ejecutar;
2. hay dos llamadas (`prepare` → `execute`) que tienen que compartir una clave de idempotencia;
3. el resultado aparece en **otra superficie** (el feed), así que el usuario puede creer que no pasó nada.

## El flujo, con sus compuertas

```
   ┌──────────────────────┐
   │ 1. Escribir prompt   │  campos vacíos, estimado "—"
   └──────────┬───────────┘
              │  cambio en CUALQUIER campo
              ▼
   ┌──────────────────────┐   invalida el estimado EN EL ACTO (antes del debounce)
   │ 2. Estimado no       │   ← el valor anterior queda atenuado y marcado
   │    vigente           │   ← Generar DESHABILITADO
   └──────────┬───────────┘
              │  debounce 400ms → estimate
       ┌──────┴───────┐
       │              │
   falla            OK
       │              │
       ▼              ▼
 ┌───────────┐  ┌──────────────────────┐
 │ bloqueado │  │ 3. Estimado vigente  │  Generar HABILITADO (si hay grant)
 │ con razón │  │    "12 cr"           │
 │ Generar   │  └──────────┬───────────┘
 │ deshab.   │             │  Generar / Cmd+Enter
 └───────────┘             ▼
                ┌──────────────────────┐
                │ 4. prepare           │  genera la CLAVE de idempotencia
                │    (reserva)         │  Generar en pendiente, no re-apretable
                └──────────┬───────────┘
                     ┌─────┴─────┐
                  rechaza      reserva OK
                     │            │
                     ▼            ▼
              ┌───────────┐  ┌──────────────────────┐
              │ razón     │  │ 5. execute           │  MISMA clave que el prepare
              │ visible;  │  │    (GASTA)           │
              │ no gastó  │  └──────────┬───────────┘
              └───────────┘             │
                                        ▼
                             ┌──────────────────────┐
                             │ 6. corrida en vuelo  │  isotipo animado + progreso textual
                             │    anunciada         │  live region: "Generando…"
                             └──────────┬───────────┘
                                        │ el FEED la recoge en su próximo ciclo (≤4s)
                                        ▼
                             ┌──────────────────────┐
                             │ 7. pieza en el feed  │  → viewer para inspeccionarla
                             └──────────────────────┘
```

## Las cuatro compuertas, y qué pasa si falta cada una

| Compuerta | Regla | Si falta |
|---|---|---|
| **G1 — estimado vigente** | `execute` no está disponible sin estimado correspondiente a la recipe en pantalla | el operador ve "12 cr", cambia cantidad a 4, ejecuta creyendo que gasta 12 |
| **G2 — grant de execute** | sin `lab.experiment.execute` el botón está deshabilitado con razón, y el resto del composer **sigue usable** | o se bloquea toda la superficie (no puede ni estimar), o se deja apretar y falla después de escribir todo |
| **G3 — clave compartida** | la clave nace en `prepare` y se reusa en `execute` | un reintento con clave nueva es, para el servidor, una operación nueva: **gasto duplicado** |
| **G4 — no re-apretable** | mientras `prepare`/`execute` están en vuelo el botón está en pendiente | doble click = dos corridas. La idempotencia lo cubre en el transporte, pero la UI no debe depender sólo de eso |

⚠️ **G3 y G4 son defensa en profundidad de lo mismo, y las dos hacen falta.** G4 evita el segundo click; G3
evita que, si el segundo click ocurre por cualquier camino (teclado, reintento del transporte, doble evento),
el servidor lo cuente como gasto nuevo.

## Frontera con el feed — desacople deliberado

El composer **no le avisa** al feed. Termina la ejecución y el feed la descubre en su propio ciclo de
reanudación (≤4s), por watermark.

**Por qué no un callback directo:** un empujón del composer al feed crearía un segundo camino por el cual una
pieza entra al snapshot, y ese camino no pasa por el reconciliador — o sea sin fusión por `revision` ni avance
de marca. Dos caminos de entrada al mismo estado es exactamente cómo se duplica un item o se pierde uno.

**El costo:** hasta 4 segundos entre "ejecuté" y "lo veo en el feed". Se paga con **feedback local en el
composer**: el isotipo animado y el progreso textual viven en el composer desde el momento del `execute`, así
que el usuario nunca queda sin señal. Lo que llega tarde es la card, no la certeza.

## Cancelación

`Cancelar` durante una corrida despacha `lab.experiment.cancel`. Tres cosas que no son obvias:

1. **`Esc` NO cancela una ejecución.** Cierra popovers. Cancelar un gasto en curso con la misma tecla que
   cierra un menú es un accidente esperando.
2. La cancelación es una **solicitud**: el estado pasa a `cancellation_requested` y el servidor confirma. La
   UI no puede afirmar "cancelado" antes de la confirmación — la corrida puede haber terminado en el proveedor.
3. Una corrida cancelada **puede haber gastado**. El riel de créditos lo refleja; la UI no promete devolución.

## Recuperación de sesión en medio del flujo

Si la sesión muere entre `prepare` y `execute`, el transporte rota la sesión y reintenta **una vez** con la
misma clave de idempotencia. Si el refresh falla:

- se muestra el bloque de sesión expirada;
- **el prompt y toda la recipe se conservan** — el operador no pierde lo que escribió;
- la reserva del `prepare` queda del lado del servidor y expira sola. La UI no intenta liberarla: un `cancel`
  con una sesión inválida no llegaría, y prometerlo sería falso.

## Estados del flujo por superficie

| Paso | Composer | Feed | Viewer |
|---|---|---|---|
| 1-3 | activo | indiferente | cerrado |
| 4-5 | pendiente, no re-apretable | indiferente | cerrado |
| 6 | isotipo + progreso | recoge en ≤4s | cerrado |
| 7 | listo para el próximo | card con thumbnail | disponible |

## Focus & keyboard

- `Cmd/Ctrl+Enter` ejecuta desde cualquier campo del composer.
- Después de `execute`, el foco vuelve al **prompt**, listo para el siguiente. No al botón: el botón queda en
  pendiente y un foco en un control deshabilitado se pierde.
- Los popovers devuelven el foco a su trigger.
- El anuncio del paso 6 va por live region `polite` y **no** mueve el foco.

## Verificación del flujo

El canary tiene que ejercitar la secuencia completa, no los pasos por separado:

1. escribir prompt → estimar → cambiar cantidad → **afirmar que Generar quedó deshabilitado**;
2. esperar el nuevo estimado → afirmar habilitado;
3. doble click en Generar → **contar una** llamada a `execute`;
4. afirmar que la clave de idempotencia del `execute` **es igual** a la del `prepare`;
5. matar la sesión entre `prepare` y `execute` → afirmar un refresh, un reintento, **misma clave**;
6. cancelar → afirmar que la UI dice "cancelación pedida" y no "cancelado".
