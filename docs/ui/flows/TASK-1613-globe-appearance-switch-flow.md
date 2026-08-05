# Flow — El modo de color cruzando las superficies de Globe (TASK-1613)

> **Estado:** implementado y medido. Cada afirmación de este documento tiene un gate que la sostiene.
> **Última actualización:** 2026-07-31

## Por qué esto es un flow y no un toggle

El interruptor vive en una superficie, pero el modo que elige **viaja por el origen**: se guarda en
`localStorage`, y toda superficie servida desde el mismo host lo puede leer. Eso convierte una
preferencia local en un estado cross-surface, y ahí es donde estuvo el defecto real.

## El recorrido

```
        elige en el Producer                     abre otra superficie
  ┌──────────────────────┐                  ┌──────────────────────────┐
  │  menú de cuenta      │                  │  share board             │
  │  ☾ Oscuro │ ☀ Claro  │                  │  (el cliente ve la pieza)│
  └──────────┬───────────┘                  └────────────┬─────────────┘
             │ applyMode()                                │
             ▼                                            ▼
   data-theme en <html>  ──┐                  ¿declaró `themable`?
   localStorage            │                       │           │
                           │                    sí │           │ no
                           ▼                       ▼           ▼
              :root[data-theme="light"]      honra el modo   PINEA OSCURO
              override sobre las claves                       (default)
              del @theme
```

## Los tres momentos que importan

### 1 · Aplicar antes del primer pintado

`MODE_BOOTSTRAP_SCRIPT` va **inline en el `<head>`**, con el nonce de la CSP. Si el atributo se
escribiera desde React, quien eligió claro vería un frame oscuro en cada carga mientras el bundle baja
e hidrata.

En un visor de piezas eso no es cosmético: es el fondo contra el que se juzga el trabajo, cambiando
delante de quien lo evalúa.

### 2 · Un solo knob mueve utilidad y CSS plano

El override es **un bloque** sobre las claves del `@theme` — no una segunda tabla de 198 valores. Sólo
los **31 tokens que cambian** entran. Y apunta a la clave del theme (`--color-canvas`), no al nombre
corto: el `:root` proyecta (`--canvas: var(--color-canvas, …)`), así que overridear el nombre corto
quedaría pisado y el tema se aplicaría a medias **en silencio, con el CSS válido y el build verde**.

Gate: `src/gates/root-theme-equivalence.test.ts` → *«el override del modo claro apunta a la propiedad
que de verdad manda»*.

### 3 · 🔴 Una superficie honra el modo sólo si lo DECLARÓ

**El defecto que este flow existe para cerrar.** El share board heredaba el modo claro del
`localStorage` del mismo origen. No tiene interruptor, así que el cliente nunca lo eligió — y le habría
mostrado la pieza entregada sobre un fondo que el diseñador no aprobó.

No se veía mal. Se veía perfectamente bien en claro, y ese es exactamente el punto: **el defecto no era
feo, era incorrecto**, y ningún barrido de contraste lo habría encontrado.

`ShellOptions.themable` es explícito y su **default es NO**. El Producer lo pide; toda otra superficie
queda fijada en oscuro. El default va en ese sentido a propósito: que una superficie nueva tenga que
**pedir** el tematizado evita heredarlo por descuido. Al revés, cada superficie futura nacería themable
y nadie se enteraría hasta que un cliente viera la pieza distinta.

| Superficie | `themable` | Por qué |
|---|---|---|
| Producer | `true` | Es donde vive el interruptor y donde se produce, no donde se aprueba la entrega |
| Share board | `false` | Es donde el **cliente** ve la pieza; su fondo es parte de la entrega |
| Launch / error | `false` | Sin interruptor propio; heredar sería una elección que nadie hizo |

Gate: `scripts/light-contrast-audit.mjs` afirma el bi-condicional (honra ⇔ declaró) sobre las dos
superficies, y se verificó poniéndolo rojo al invertir la declaración.

## Degradación

`localStorage` lanza en modo privado y en iframes de terceros. Ambos caminos —el bootstrap y
`applyMode`— van envueltos en `try/catch`: **que no se pueda recordar la elección no impide aplicarla**.
El atributo ya se escribió; se pierde la persistencia, y eso degrada a «vuelve al oscuro al recargar»,
que es el default declarado.

## Lo que este flow NO resuelve

- **`prefers-color-scheme`.** Deliberadamente ignorado: el modo lo elige quien mira, no su sistema
  operativo. Que la pieza se vea distinta según cómo alguien configuró su laptop es lo contrario de lo
  que se busca (ADR-017 §1).
- **Preferencia por cuenta.** Vive en `localStorage`, por dispositivo. Moverla al perfil es una decisión
  de producto con su propio contrato programático (Full API Parity), no un efecto colateral de esta task.

## GVC Scenario Plan

Los escenarios de este flow son **cross-surface**: lo que hay que ejercitar no es una pantalla sino el
recorrido del modo entre superficies del mismo origen.

| Escenario | Cómo se ejercita | Qué afirma |
|---|---|---|
| Elegir claro y recargar | Producer 1440 y 390, `localStorage` poblado antes de navegar | persiste y aplica **antes** del primer pintado (sin destello) |
| Cruzar al share board con claro guardado | share board 1440 y 390 con `globe.theme=light` | `data-theme` ausente y `--canvas` en `#25293c`: **no hereda** |
| Bi-condicional del tematizado | ambas superficies, declaración vs comportamiento | honra el modo **si y sólo si** declaró `themable` |
| Contraste en ambos modos | ambas superficies, ambos anchos | el claro no introduce ningún fallo que el oscuro no tenga |

- Quality profile: `premium`
- Decisión de baseline: el baseline es el **oscuro vigente**; la comparación es contra él, no contra un
  piso absoluto, porque hay 14 textos que fallan en los dos modos y son deuda preexistente.
- scroll-width: el modo no cambia layout, sólo color; el barrido a 390 px cubre el reflow del control.
- Evidencia durable: `docs/ui/evidence/task-1613/producer-{light,dark}-1440.png`.
- Verificado en rojo: se invirtió la declaración `themable` del share board y el gate lo acusó antes de
  darlo por bueno.

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `themable` opt-in, default `false` | Opt-out, o global | Un default permisivo hace que cada superficie futura nazca themable y nadie se entere hasta que un cliente vea la pieza distinta |
| El share board queda fijado en oscuro | Darle su propio interruptor | Es la superficie de ENTREGA: el fondo es parte de lo que se juzga, y el cliente no debería tener que elegirlo bien |
| Override sobre las claves del `@theme` | Override sobre los nombres cortos | La proyección de TASK-1612 pisaría el nombre corto y el tema se aplicaría a medias, en silencio y con el build verde |
| Emitir sólo los 31 tokens que cambian | Emitir el mapa completo | El diff **es** la lista de lo que el tema decide; 198 valores repetidos la esconden |
| Bootstrap inline con nonce | Aplicar en React | Un frame oscuro antes de hidratar, en la superficie donde se juzga el trabajo |
| `localStorage`, por dispositivo | Preferencia en el perfil | Mover la preferencia a la cuenta necesita su propio contrato programático (Full API Parity), no un efecto colateral |
