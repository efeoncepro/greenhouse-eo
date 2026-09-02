# ISSUE-168 — El CTA hereda el esquema del sistema operativo, no de la página que lo hospeda

## Ambiente

production — `efeoncepro.com/greenhouse-cta-prueba/` (motor CTA con
`GROWTH_CTA_ENGINE_ENABLED` ON desde 2026-07-18). El renderer es el mismo bundle en
todos los hosts, así que el defecto es del contrato, no de WordPress.

## Detectado

2026-09-01, por el operador mirando la pantalla: *«esto desaparece»* sobre el eyebrow, y
después *«el mismo fondo de la web es blanco, no hay contraste, las letras desaparecen»*.

Lo destapó el ojo humano, no una medición. Las tres mediciones que yo había hecho antes
pasaron por al lado del defecto porque **estaban mal encuadradas** — ver §Método.

## Síntoma

Un visitante con su sistema operativo en **modo oscuro**, entrando a una página
**blanca**, ve una tarjeta **navy** pegada sobre el fondo blanco. Dentro de esa tarjeta:

| Elemento | Contraste medido | Mínimo WCAG 2.2 AA |
|---|---|---|
| Eyebrow «DIAGNÓSTICO GRATUITO» | **1.57:1** | 4.5:1 (1.4.3) |
| Relleno del botón primario vs. la tarjeta | **1.63:1** | 3:1 (1.4.11) |
| Etiquetas del formulario embebido | **1.02:1** | 4.5:1 (1.4.3) |

## Causa raíz

Los tokens del CTA usan `light-dark()`, que resuelve mirando `prefers-color-scheme` —
**la preferencia del SISTEMA del visitante**. La página anfitriona no participa de esa
decisión y en este caso ni siquiera declara `color-scheme` en el tag.

🔴 **El `<greenhouse-cta>` es un invitado: vive incrustado en la página de otro.** Un
widget que decide su superficie mirando el sistema operativo en vez de la casa donde
está parado se ve como cuerpo extraño — y acá se veía roto literalmente.

Esa sola causa explica **los tres síntomas**, que parecían defectos independientes:

1. La tarjeta se pinta oscura sobre una página clara.
2. El acento de marca (`--gh-cta-accent: #023c70`, un navy pensado para superficies
   claras) queda usado como **tinta** sobre esa tarjeta oscura — y el eyebrow lo usa a
   la vez para su texto **y** para su propio chip al 10%, así que ambos se hunden juntos.
3. El mismo acento queda usado como **relleno** del botón sobre la tarjeta oscura: el
   control deja de existir como forma, y sólo se ve su texto blanco flotando.
4. El `<greenhouse-form>` que se monta adentro trae la variante `diagnostic_premium`,
   una **hoja blanca premium** cuya paleta asume superficie clara; sobre la tarjeta
   oscura sus etiquetas caen a 1.02:1.

## Método — por qué mis primeras tres mediciones no lo encontraron

Vale más que el bug, porque se repite:

1. **Medí sólo el formulario, no la tarjeta.** Acoté el barrido a `.ghc-form-slot` y
   hablé como si hubiera auditado todo. El eyebrow estaba fuera del recorte. *Una vista
   parcial no es un inventario.*
2. **No componía el alpha.** El chip del eyebrow es el acento al 10%; mi función tomaba
   el primer color translúcido que encontraba en vez de mezclarlo con lo de abajo, y
   reportó `1.00` — un número que ni siquiera era el correcto (1.57).
3. **Medí sólo texto.** El relleno del botón contra su superficie no es contraste de
   texto sino de **componente** (1.4.11). Su texto contra su propio relleno daba 11.15,
   perfecto — cualquier auditoría centrada en tipografía lo habría dado por bueno.

## Impacto

- **Accesibilidad y cumplimiento.** Tres fallos AA simultáneos en una superficie pública
  embebida en sitios de clientes.
- **Comercial.** El eyebrow es el gancho («Diagnóstico gratuito») y el botón es la
  conversión. Un visitante en modo oscuro veía el gancho invisible y el botón sin forma.
- **Alcance.** Todos los CTA del motor, en todos los hosts, para cualquier visitante con
  el sistema en oscuro sobre una página clara. No es un caso de borde: el modo oscuro es
  el default de muchos sistemas.

## Solución aplicada

1. **`resolveHostSurfaceScheme`** (`src/growth-cta-renderer/host-surface.ts`): el
   elemento mide el primer fondo **opaco** subiendo desde sí mismo y hereda de ahí. Una
   declaración explícita del host siempre manda sobre la medición; si no se puede medir
   **no fuerza nada** y decide `prefers-color-scheme` (comportamiento histórico). Un
   fondo translúcido no define superficie: sigue subiendo.
2. **Rama `[data-color-scheme='dark']` explícita** en el CSS. Sólo existía la `light`,
   así que heredar `dark` no hacía nada — forzar una sola de las dos direcciones es
   medio contrato.
3. **`element.ts` propaga el esquema DERIVADO** al form y al scheduler, no el atributo
   crudo (que en este host era `null`).
4. **El acento pasa a ser scheme-aware en sus DOS roles**, que antes compartían un solo
   valor: `--gh-cta-accent` (relleno) sube a `#0375db` en oscuro —ya es el azul
   brillante de la marca, no un color nuevo—, y nace `--gh-cta-accent-ink` (tinta sobre
   superficie) en `#7fb0e8`.

**Descartado en el camino, y vale registrarlo** porque parecía razonable: meterle una
hoja blanca al formulario dentro de la tarjeta navy. Pasaba contraste, pero era un
parche a una tarjeta que no debería ser oscura, y en esquema claro producía
blanco-sobre-blanco (card-on-card). La causa estaba una capa más arriba.

## Invariantes que se derivan

- 🔴 **Un widget incrustado se adapta a la casa, no al sistema operativo del visitante.**
- 🔴 **Un token de acento tiene DOS roles y un solo valor no sirve para ambos**: como
  relleno el color de marca crudo puede estar bien; como tinta sobre una superficie
  tiene que ser scheme-aware. Mezclarlos fue lo que hundió el eyebrow.
- 🔴 **El contraste de un control es su FORMA contra la superficie (1.4.11), no sólo su
  texto contra su relleno.** Un botón puede tener texto perfecto y no existir.

## Verificación

**Hecha (2026-09-01):**

- **27 nodos de texto de la tarjeta completa** —no sólo del formulario— medidos en vivo
  contra producción, en esquema claro y oscuro, a 1280 y 375 px: **0 bajo AA**.
  Eyebrow 1.57 → 9.33; titular 14.68; peor caso 4.67.
- Sin overflow horizontal en 375 (hoja 301px dentro de tarjeta 343px).
- Tests falsables del helper (verificado revirtiendo el arreglo: 4 rojos sin él, 56/56
  con él). Uno atrapó un defecto real: `lch(50% 40 200)` entregaba sus tres números y se
  leían como RGB — una luminancia inventada que puede dar vuelta el esquema. Se agregó
  allowlist de notaciones.

**Pendiente — la corrección NO está en producción:**

- El bundle desplegado sigue siendo el anterior. Requiere release develop→main.
- ⚠️ El caso de **anfitrión genuinamente oscuro** (dock del informe de Think) está
  verificado **por cálculo sobre los hex, no en vivo**: la página de prueba es blanca, y
  al simular un host oscuro el motor suprimió el CTA (lo había descartado varias veces
  probando y la supresión server-side lo recuerda — comportamiento correcto). Queda para
  el smoke post-release en Think.

## Estado

open — code complete, rollout pendiente

## Relacionado

- `ISSUE-167` — el otro defecto del mismo renderer detectado el mismo día (foco y
  `Escape` del formulario revelado). Independiente en causa, mismo rollout.
- `TASK-1427` (`complete`) — cerró la primera rebanada del motor; ninguno de estos dos
  defectos estaba en su alcance ni en sus criterios.
- `EPIC-023` — dueño del motor CTA.
