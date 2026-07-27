# ADR-016 — Motor de estilos del payload cliente de Globe: Tailwind v4 sobre el SSOT de tokens

> **Tipo:** Architecture Decision Record
> **Estado:** `Proposed` — requiere aceptación del operador antes de ejecutar
> **Creado:** 2026-07-27
> **Dueño de implementación:** `TASK-1485` (Globe Design System Governance and Pattern Registry)
> **Supersede parcialmente:** [ADR-014](./EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) — sólo en la
> elección de motor de estilos; el resto de ADR-014 (Vite + React + shell propio + CSP por nonce) sigue vigente
> **Relacionados:** `TASK-1552`, `TASK-1556`, `TASK-1560`, `TASK-1561`

---

## Contexto

El payload cliente (ADR-014) nació con **CSS global plano** más un SSOT de 98 tokens y tres gates de diseño.
La decisión fue correcta para arrancar: sin dependencias, sin runtime, compatible con la CSP por nonce.

Pero la migración del Producer expuso el límite del modelo, y no como opinión sino como incidentes medidos
durante la sesión del 2026-07-27:

| # | Colisión observada | Naturaleza |
|---|---|---|
| 1 | `.prompt-actions` está en `position:absolute` en la hoja legacy; al recomponerla los botones flotaron sobre el feed | legacy pisa lo nuevo |
| 2 | `.icon-pill` es circular de tamaño fijo; con label recorta el texto | legacy pisa lo nuevo |
| 3 | `.control-title`, `.number-shape-field`, `.helper`, `.availability` ganaron por especificidad | legacy pisa lo nuevo |
| 4 | `.estimate-rail > div` tiene **cuatro** reglas, dos con `!important` forzando `display:grid` | legacy pisa lo nuevo |
| 5 | Renombrar a `pc-*` para escapar de lo anterior **desconectó el glow del prompt** | lo nuevo se corta de lo que quería heredar |
| 6 | `producer-composer.css` no existía como tal: 66 de 84 clases vivían en la hoja legacy | dependencia invisible |

**El patrón es uno solo: CSS global sin scope, con dos hojas conviviendo.** Ninguna de las seis es un error de
criterio; todas son consecuencia estructural de que cada clase compite en un único espacio de nombres.

Además, el estado del arte se movió. A julio 2026, Tailwind es el motor dominante del ecosistema React
—shadcn/ui, la mayoría de las librerías de componentes, los generadores con IA— y **v4 resolvió la objeción
que lo descartaba acá**: su theming es CSS-first y single-source-of-truth, así que puede consumir un SSOT
existente en vez de competir con él.

## Decisión

**Adoptar Tailwind v4 como motor de estilos del payload cliente (`apps/studio-client`), con el SSOT de tokens
existente como su theme.**

Cinco condiciones que hacen que esto no sea "sumar una herramienta más":

1. **El SSOT manda.** `src/tokens/tokens.ts` no se duplica ni se reemplaza: se expone como theme de Tailwind.
   Un token nuevo se declara **una vez**, ahí.
2. **Los tres gates se reescriben, no se retiran.** Hoy detectan literales en CSS; con Tailwind el literal vive
   en `className="text-[#4db8ff]"`. Un gate que deja de morder al cambiar de motor **no era un gate, era un
   accidente de ubicación**.
3. **Migración por superficie, nunca big-bang.** El orden lo fija el retiro del legacy, no la comodidad.
4. **Cero reescritura sin referencia de diff.** Reescribir reglas es lo que produjo la regresión del feed —
   está documentado en el propio código. Toda superficie migrada se compara contra su render anterior.
5. **La CSP por nonce y el shell no cambian.** Tailwind compila a CSS estático en build; no agrega runtime.

## Alternativas consideradas

### A · Seguir con CSS global plano — rechazada
Es el estado que produjo las seis colisiones. Mantenerlo garantiza repetirlas en cada superficie nueva, y el
backlog tiene 19 tasks apuntando al composer.

### B · CSS Modules — rechazada como destino, válida como paso intermedio
Resuelve el scope (que es el 90% del dolor) sin cambiar de paradigma ni tocar los gates. Pero **no aporta
sistema de diseño**: los tokens se siguen cableando a mano. Si el destino es Tailwind, pasar por CSS Modules
es reescribir dos veces.

### C · Zero-runtime tipado (StyleX / Vanilla Extract / Panda) — rechazada por ahora
Más control y tipado que Tailwind, y compatible con RSC. Pero ecosistema mucho menor, y el equipo no tiene
masa crítica en ninguna. La ventaja no compensa el costo de adopción.

### D · Tailwind v4 — **seleccionada**
Resuelve scope y sistema de diseño a la vez, es el estándar del ecosistema, y su theming CSS-first convive con
el SSOT en vez de competir.

## Consecuencias

**Aceptadas**
- Reescribir los tres gates de diseño es **precondición**, no follow-up. Sin eso el payload queda sin control.
- El riesgo de regresión visual es real y se mitiga con diff contra el render anterior, no con confianza.
- Las superficies ya migradas a CSS propio (feed 29 KB, viewer, share) conviven hasta que les toque su turno.
  **La convivencia es temporal y con dueño**, que es la diferencia con la deuda actual.

**Lo que esto destraba**
- **El Slice 0 de `TASK-1552` se retira.** Existía para que el composer dejara de depender de `producerStyles`;
  una superficie reescrita en Tailwind tampoco depende. Mover 272 reglas que se van a tirar es trabajo
  desechable.
- **`TASK-1560`** (retiro del legacy) se destraba por el mismo camino.

**Lo que NO cambia**
- ADR-014 sigue vigente en todo lo demás: Vite, React 19, React Router, shell propio, CSP por nonce, CDN.
- El contrato de motion (3 capas) y su regla de `prefers-reduced-motion`.
- La prohibición de importar primitives de Greenhouse, MUI o AXIS dentro de `apps/studio-client`.

## Invariantes que nacen con esta decisión

- **NUNCA** declarar un valor de diseño en `className` (`text-[#4db8ff]`, `p-[13px]`). Todo valor sale del theme,
  que sale del SSOT. Es la misma regla de siempre, en otra sintaxis — y el gate reescrito debe morderla.
- **NUNCA** migrar una superficie sin su referencia de diff visual previa.
- **NUNCA** dejar dos motores activos en la misma superficie: una superficie está en CSS o está en Tailwind.
- **SIEMPRE** que se agregue un token, se agrega en `tokens.ts` y se expone al theme — nunca al revés.

## Estado y siguiente paso

`Proposed`. No se ejecuta hasta aceptación explícita del operador. Al aceptarse, la implementación es un slice
de **`TASK-1485`** — no una task nueva: el barrido por dominio confirma que esa task ya es dueña de tokens,
patterns, components, motion y runtime del Design System de Globe.
