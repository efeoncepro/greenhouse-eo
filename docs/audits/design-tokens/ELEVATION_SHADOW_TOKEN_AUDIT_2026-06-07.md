# Audit — Elevation / shadow token debt (Greenhouse Floating Surface + UI Platform)

> **Tipo:** Auditoria tecnica / decision input  
> **Fecha:** 2026-06-07  
> **Autor:** Codex (sesion de discovery solicitada por el operador)  
> **Alcance:** sombras, elevacion, overlay depth y documentacion de tokens para Greenhouse UI Platform  
> **Disparador:** el operador observo que la sombra actual de la primitive `GreenhouseFloatingSurface` se siente anticuada/"2000s" y pidio investigar con alta profundidad antes de aprobar un plan.  
> **Estado:** **ABIERTO** — este audit NO implementa cambios. Sirve como input normativo para `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md` y `docs/tasks/to-do/TASK-1049-greenhouse-elevation-shadow-token-system.md`.

---

## 0. TL;DR

1. **Si, tenemos sombras en runtime, pero no tenemos un sistema semantico Greenhouse de elevacion.** Hoy existen `theme.shadows` y `theme.customShadows` heredados de Vuexy/MUI, pero el contrato documentado sigue hablando en numeros (`boxShadow: 6`) y no en roles (`floating`, `modal`, `dock`, etc.).
2. **La primitive `GreenhouseFloatingSurface` usa `elevation={6}` directamente.** Eso delega el look al stack MUI multi-layer de `theme.shadows[6]`, que es exactamente el tipo de sombra pesada y mecanica que el operador percibio como vieja.
3. **La documentacion esta incompleta tras el split.** `GREENHOUSE_DESIGN_TOKENS_V1.md` documenta una tabla corta de sombras numericas; `DESIGN.md` solo dice "flat-to-soft"; `ui-platform/STACK.md` prohibe `elevation > 0` en cards internas, pero no define un contrato positivo para overlays/floating surfaces.
4. **`customShadows` no debe ser tratado automaticamente como Greenhouse Design Tokens.** Es un runtime heredado util para Vuexy/MUI y estados coloreados, pero no expresa intencion de producto ni variantes de overlay.
5. **La remediacion robusta es una capa semantica pequena de elevacion Greenhouse.** Debe nacer como token runtime + docs + tests + primer consumidor (`GreenhouseFloatingSurface`), no como parche visual local.

---

## 1. Evidencia del repo

### 1.1 Runtime actual

| Archivo | Evidencia | Lectura |
|---|---|---|
| `src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx` | `Paper elevation={6}` | La primitive no usa un token semantico; usa el indice MUI directo. |
| `src/@core/theme/shadows.ts` | array MUI 0..24 con tres capas por nivel | Es una escala numerica de infraestructura, no un contrato Greenhouse de intencion. |
| `src/@core/theme/customShadows.ts` | `xs/sm/md/lg/xl` + sombras coloreadas `primary/error/success/...` | Es un set Vuexy/MUI channel-based; util, pero ambiguo para primitives Greenhouse nuevas. |
| `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6 | tabla `boxShadow: 0/1/2/4/6/8/16` + `var(--mui-customShadows-*)` | Documenta numeros, no roles. |
| `DESIGN.md` §Elevation & Depth | "Depth is restrained"; popovers/dialogs pueden subir | Buen criterio editorial, pero no especifica tokens ni runtime. |
| `docs/architecture/ui-platform/STACK.md` | "No usar `elevation > 0` en cards internas" | Regla negativa valida; falta la regla positiva para overlays/floating. |
| `docs/architecture/ui-platform/PRIMITIVES.md` | `Floating Surface` como primitive canonica | La primitive ya existe; su chrome no esta tokenizado por elevacion semantica. |

### 1.2 Estado de Floating Surface

`GreenhouseFloatingSurface` ya esta bien gobernada en posicionamiento, a11y, variants/kinds, reduced motion, GVC hooks y portal/focus behavior. El gap no es de engine ni de primitive governance: es **chrome depth**.

Estado actual simplificado:

```tsx
<Paper
  elevation={6}
  sx={theme => ({
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: `${theme.shape.customBorderRadius.md}px`
  })}
/>
```

Problema: `elevation={6}` selecciona una sombra generica MUI. No sabe si el surface es `actionMenu`, `evidencePeek`, `inlineEditor` o `validationBubble`; tampoco sabe si la separacion visual deberia venir mas de borde/contraste que de drop shadow.

---

## 2. Research externo sintetizado

Este audit no copia valores visuales de otros sistemas. Los usa para entender patrones de gobierno.

| Sistema | Patrón relevante | Link |
|---|---|---|
| Material 3 | Elevation es una propiedad de `Surface`, no solo una sombra aislada; separa jerarquia visual, color/surface y sombra. | https://developer.android.google.cn/develop/ui/compose/designsystems/material3?hl=en |
| Material 3 Compose `Surface` | `Surface` agrupa color, content color, tonal elevation, shadow elevation, border y shape. | https://composables.com/docs/androidx.compose.material3/material3/components/Surface |
| Atlassian Design System | Elevation se documenta con tokens nombrados por rol (`surface`, `raised`, `overlay`), no por indice numerico. | https://design-system-docs-proxy.services.atlassian.com/foundations/elevation/ |
| Fluent 2 | La elevacion comunica jerarquia y foco; documenta relaciones entre capas, no solo CSS shadows. | https://fluent2.microsoft.design/elevation |
| USWDS | Shadow tokens son discretos y nombrados; el uso esperado esta documentado como parte de design tokens. | https://designsystem.digital.gov/design-tokens/shadow/ |

Lectura comun:

- Los sistemas maduros tratan elevacion como **relacion entre superficies**.
- La sombra no es el unico mecanismo: se combina con surface color, border, opacity, scrim, motion y stacking.
- Los tokens utiles son semanticos o discretos, no "usa el numero 6 porque se ve bien".
- El contrato debe explicar **donde no usar sombra** tanto como donde usarla.

---

## 3. Diagnostico

### L1 — Falta un source of truth semantico

Greenhouse ya tiene SoT fuertes para color AXIS, tipografia y motion. Elevacion esta rezagada: los agentes solo encuentran numeros MUI o `customShadows`. Eso obliga a elegir por gusto local.

**Impacto:** cada primitive puede inventar su sombra; el sistema termina con popovers, docks, drawers, cards y menus compitiendo visualmente.

### L2 — La documentacion actual normaliza indices MUI

`GREENHOUSE_DESIGN_TOKENS_V1.md` §6 dice:

- `boxShadow: 4` dropdown/popover
- `boxShadow: 6` tooltip/floating UI
- `boxShadow: 8` modal/dialog
- `boxShadow: 16` floating dock

Esto es mejor que nada, pero sigue acoplando decision de diseno a indices heredados. Para una primitive Greenhouse nueva, el agente deberia leer "usa `floating`" o "usa `modal`", no "elige 6 u 8".

### L3 — `customShadows` esta documentado, pero no gobernado como token Greenhouse

`customShadows.xs/sm/md/lg/xl` deriva de `--mui-mainColorChannels-${mode}Shadow`. Tiene modo light/dark y es util para Vuexy. Pero:

- no define roles de producto;
- no separa overlay/floating/modal/dock;
- los colored shadows son de estado/acento, no de profundidad estructural;
- no esta enlazado a una pagina viva del design system ni a drift guards Greenhouse.

Conclusión: `customShadows` puede ser input o compat layer, pero no debe ser la respuesta final para primitives Greenhouse.

### L4 — Floating Surface usa una sombra generica para seis variants distintas

Las variants oficiales tienen necesidades distintas:

| Variant | Necesidad de profundidad |
|---|---|
| `richTooltip` | sombra minima; borde + contraste suelen bastar. |
| `actionMenu` | separacion clara, pero compacta y sobria. |
| `evidencePeek` | un poco mas de presencia por contenido rico. |
| `inlineEditor` | separacion y foco, sin parecer modal. |
| `validationBubble` | bajo ruido; puede apoyarse en tone/border. |
| `commandPreview` | capa transitoria de preview, posiblemente mas ancha. |

`elevation={6}` aplica una misma receta visual a todas.

### L5 — El split documental dejo el tema en tierra de nadie

El split reciente movio UI Platform a `docs/architecture/ui-platform/`, pero los tokens visuales siguen repartidos entre:

- `DESIGN.md` como contrato compacto agent-facing.
- `GREENHOUSE_DESIGN_TOKENS_V1.md` como spec extensa.
- docs tematicos de `ui-platform/` para primitives/stack/governance.
- runtime files (`axis-tokens`, `typographyScale`, `motion`, etc.).

Para sombras falta el mismo cierre que ya existe para tipografia/color: una fuente runtime + docs + regla de consumo.

---

## 4. Recomendacion tecnica

Crear una capa semantica de elevacion Greenhouse, pequena y estable, antes de cambiar el look de Floating Surface.

### 4.1 Tokens propuestos

| Token semantico | Uso permitido | No usar para |
|---|---|---|
| `none` | outlined surfaces, cards internas, layouts que ya separan por spacing/border | overlays o menus flotantes |
| `raised` | feedback local de hover/selection en componentes interactivos puntuales | card resting state masivo |
| `floating` | popovers, action menus, rich tooltips, evidence peeks, inline editors, validation bubbles | dialogs, destructive/legal/financial confirmations |
| `overlay` | command previews, floating docks, temporary high-z contextual surfaces | drawers full-height o page sections |
| `modal` | MUI Dialog / temporary Drawer / blocking decisions | anchored popovers |
| `overflow` | shadows internos de scroll affordance o sticky table edge, si se formaliza | profundidad de contenedor |

La implementacion puede exponer estos tokens como objeto/factory, no necesariamente como MUI `theme.shadows`:

```ts
type GreenhouseElevationLevel =
  | 'none'
  | 'raised'
  | 'floating'
  | 'overlay'
  | 'modal'
  | 'overflow'

type GreenhouseElevationToken = {
  boxShadow: string
  borderColor?: string
  surfaceColor?: string
}
```

### 4.2 Primer consumidor obligatorio

`GreenhouseFloatingSurface` debe dejar de usar `elevation={6}` y consumir el token `floating` (con posibilidad de variant override solo si queda documentado en controller).

Regla esperada:

- `Paper elevation={0}`.
- `boxShadow` desde token semantico.
- `border` y `backgroundColor` desde token/surface theme.
- Variants pueden escoger `floating`/`overlay` si la ADR lo permite, pero no indices MUI.

### 4.3 Documentacion obligatoria

Actualizar juntos:

- `DESIGN.md` §Elevation & Depth: lenguaje compacto para agentes.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6: tabla semantica, no solo indices MUI.
- `docs/architecture/ui-platform/PRIMITIVES.md`: Floating Surface consume elevation tokens.
- `docs/architecture/ui-platform/HISTORIAL.md`: delta de la adopcion.
- Lab interno `/admin/design-system/floating-surfaces` o una futura pagina de tokens de elevacion: mostrar token vivo, no valores route-locales.

### 4.4 Tests / gates

Minimo:

- unit test del resolver/factory de elevation tokens;
- test focal de `GreenhouseFloatingSurface` verificando que no usa `elevation={6}` y que aplica token semantico;
- `pnpm design:lint`;
- GVC `floating-surface-primitives` desktop + mobile;
- captura comparativa before/after si se cambia visualmente la sombra.

---

## 5. Reglas duras propuestas

- **NUNCA** introducir una sombra nueva en primitives Greenhouse como indice MUI (`elevation={6}`, `theme.shadows[8]`) sin mapearla a un token semantico.
- **NUNCA** arreglar la sombra de Floating Surface con un `boxShadow` literal local.
- **NUNCA** tratar `customShadows` como source of truth Greenhouse sin documentar el rol semantico que representa.
- **NUNCA** usar sombra para resolver jerarquia que ya esta clara por spacing, border, densidad o contraste.
- **SIEMPRE** que una primitive nueva sea overlay/floating/modal/dock, declarar su token de elevacion.
- **SIEMPRE** mover juntos runtime + DESIGN.md + V1 + UI Platform docs cuando nace o cambia un token de elevacion.

---

## 6. Preguntas abiertas

1. ¿El token `floating` debe usar una sombra de una sola capa moderna o una composicion doble muy sutil? Recomendacion: resolver en TASK-1049 con GVC before/after.
2. ¿`customShadows.md/lg` se preserva solo como compat Vuexy o se mapea internamente a `raised`/`overlay`? Recomendacion: compat, no SoT.
3. ¿Se debe agregar una pagina viva de elevation tokens en `/admin/design-system` en esta primera task o como follow-up? Recomendacion: si la task toca runtime visual, incluir al menos specimen en el lab de Floating Surface; pagina dedicada puede ser follow-up si el alcance crece.

---

## 7. Fuente de cierre

Este audit deriva en:

- ADR propuesto: `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`
- Task ejecutable: `docs/tasks/to-do/TASK-1049-greenhouse-elevation-shadow-token-system.md`

