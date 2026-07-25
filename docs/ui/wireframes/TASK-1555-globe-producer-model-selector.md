# Wireframe — Globe Producer Model Selector (TASK-1555)

> **Contrato de diseño** del selector de modelo del Producer. Robusto y aterrizado, NO stub. El implementador
> construye la superficie DESDE acá sin re-decidir arquitectura.
>
> **Dirección visual ELEGIDA (design-studio Step 1-2):** [`docs/ui/visual-directions/TASK-1555-globe-producer-model-selector-direction.md`](../visual-directions/TASK-1555-globe-producer-model-selector-direction.md) — Dirección A "Galería de láminas" (poster-first).
> **Base aprobada del Producer:** [`docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`](../visual-directions/TASK-1505-globe-creative-producer-approved-direction.md)
> **Superficie hermana (jerarquía del composer):** [`docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`](TASK-1552-globe-producer-composer-focused-creation.md)
> **Dato (SoT):** reader `globe.producer.fleet.list` (TASK-1554) — rutas con `availability` + `recommendedDefaults`.
> **Copy (SoT):** `efeonce-globe/apps/studio-web/src/producer-copy.ts` (`composer.route`, `routePending`, `routeDisclosure`).

## 0. Delta 2026-07-25 — el control es un desplegable, no una galería

> **Esta sección manda sobre el layout descrito abajo.** El resto del contrato (estados, data
> mapping, a11y, no-slug) sigue vigente sin cambios.

- **Control:** desplegable compacto (`details`/`summary` + `role="listbox"`), no una grilla de
  láminas. Razón y evidencia en la [dirección visual §Decisión revisada](../visual-directions/TASK-1555-globe-producer-model-selector-direction.md).
- **Fila de modelo:** `[isotipo real] Nombre · versión — estado` (+ `✦ Recomendado`, `✓` si elegido).
  El isotipo viene de un set curado y licenciado; **NUNCA** transcrito a mano.
- **Título de la región:** `Modelo`. "Ruta" es vocabulario de ruteo del backend y no aparece en la
  cara del producto (también salieron "Ruta seleccionada" de la barra de ejecución y "Curada ·
  modelo real").
- **Alcance de la lista:** toda la flota de la **modalidad activa**, no sólo lo que el modo activo
  puede correr. Un modelo que necesita otro modo se muestra con lo que necesita
  ("Necesita cuadros" / "Necesita referencias") y, si ese modo tiene chip, **elegirlo cambia el
  modo**. Esconderlo detrás de un chip que hay que adivinar hace que el operador nunca sepa que
  existe — que es justo lo que la task venía a resolver.
- **Nunca un affordance falso:** un modelo con `minReferences ≥ 1` (Gemini Omni) o que exige
  keyframes (Veo) **no** se ofrece como ejecutable en un modo sólo-prompt; reventaría en
  `assertInputModeSatisfied` después de reservar crédito.
- **Barra de ejecución:** `data-compact-route` refleja el modelo elegido (antes era un placeholder
  estático que prometía una selección que nunca mostraba).
- **Markers `data-capture` vigentes:** `producer-model-picker`, `producer-model-trigger`,
  `producer-model-list`, `producer-model-option`, `producer-model-recommended`
  (reemplazan `producer-model-grid` / `producer-model-card`).

## 1. Qué reemplaza

Hoy la región "Ruta, modelo y formato" del composer es un **placeholder estático**
(`efeonce-globe/apps/studio-web/src/producer-ui.ts`, `data-producer-static-route` — botón `aria-disabled` con
"El catálogo publicará aquí sus límites válidos"). Este selector la reemplaza por una **galería de modelos
data-driven, availability-aware**, que escala a toda la flota sin hand-edits por modelo.

## 2. Regiones (dentro del composer, región `producer-route`)

```
┌─ Ruta y modelo ────────────────────────────── [recomendado ✦] ─┐
│  Segmento activo = modalidad del composer (Imagen | Video | Audio) │
│                                                                    │
│  ┌── grid de tarjetas de modelo (por capacidad de la modalidad) ──┐│
│  │  [✦ Nano Banana · Pro]   [Seedream · 5 Pro]   [GPT Image · 2]  ││
│  │   disponible · elegido    disponible           bloqueado ⓘ     ││
│  │                                                                ││
│  │  [GPT Image · 1.5]        …escala a N modelos…                 ││
│  │   bloqueado ⓘ                                                  ││
│  └────────────────────────────────────────────────────────────────┘│
│  helper: routeDisclosure (modelo real visible; datos de proveedor nunca) │
└────────────────────────────────────────────────────────────────────┘
```

- El selector vive en la región `producer-route` del composer; NO es una superficie flotante nueva (extiende el
  patrón existente de Globe Producer, no crea uno paralelo).
- Sólo se muestran los modelos de la **capacidad de la modalidad activa** (Imagen → `image-generate`, etc.),
  filtrando el reader por `capability`/`modality`.
- Orden: el `recommendedDefault` primero (marcado ✦), luego `available`, luego `gated`, luego `blocked`.

## 3. Anatomía de una tarjeta de modelo

| Elemento | Fuente | Nota |
|---|---|---|
| Nombre + versión | `route.model` (`{name, version}`) | público (ADR-003); NUNCA slug |
| Estado | `route.availability` | `available` \| `gated` \| `blocked` |
| Razón (si no disponible) | `route.gateReason` → copy | `not_promoted` → "Próximamente"; `provider_verifier_pending` → "Requiere habilitación del proveedor" |
| Marca recomendado | `recommendedDefaults[capability] === routeId` | ✦ "Recomendado" |
| Selección | click/Enter/Space | sólo si `available` |

- **NUNCA** se muestra el slug del proveedor, costo vendor ni margen (el reader ya no los expone; la UI tampoco los infiere).

## 4. Estados (state inventory — todos obligatorios)

- **Default / loading:** skeleton de tarjetas mientras resuelve `fleet.list`; nunca "0 modelos" en falso.
- **available:** tarjeta elegible (contorno/affordance de selección); una sola seleccionada a la vez.
- **selected:** la ruta elegida se refleja en el resumen compacto del composer (`data-compact-route`) + alimenta el run (`referenceRoute`).
- **gated (`not_promoted`):** tarjeta legible pero **no ejecutable**, con "Próximamente" — honesta, no un control falso.
- **blocked (external gate):** tarjeta no ejecutable con la razón (ej. "Requiere habilitación del proveedor"); `ⓘ` con tooltip accesible.
- **empty (capacidad sin rutas):** mensaje breve; no pared vacía dominante.
- **error:** mensaje canónico + retry contextual; no depender sólo de toast.
- **permission denied:** si falta la capability del reader, estado honesto sin raw error.
- **recommended preselect:** si no hay selección previa y el `recommendedDefault` está `available`, queda preseleccionado; si NO está `available`, no se preselecciona una ruta ejecutable (se respeta el estado real).
- **mobile / 390px:** grid colapsa a columna única; targets 44px; sin overflow horizontal.
- **keyboard/focus:** navegación por grid (flechas/Tab), foco visible, selección por Enter/Space; `gated`/`blocked` no roban foco de acción.
- **reduced motion:** cambios de estado sin transición espacial; significado por texto/estado.

## 5. Copy (es-CL) — extender `producer-copy.ts`

Reusar: `composer.route` ("Ruta y modelo"), `composer.routeDisclosure`. **Nuevos ids** (agregar a `producer-copy.ts`, no hardcodear en JSX):
- `composer.modelAvailable`: "Disponible"
- `composer.modelRecommended`: "Recomendado"
- `composer.modelGated`: "Próximamente"
- `composer.modelBlockedProviderVerifier`: "Requiere habilitación del proveedor"
- `composer.modelSelectAria`: "Elegir el modelo {model}" (aria-label por tarjeta)

## 6. Data mapping (Full API Parity — cero lógica de negocio en el browser)

- Reader: `globe.producer.fleet.list` (TASK-1554), vía el mismo BFF same-origin del Producer; el browser sólo consume el proyectado.
- `routes[]` → tarjetas (filtradas por la modalidad activa). `availability` decide el estado; `gateReason` decide la razón; `recommendedDefaults` decide el ✦.
- Selección → `referenceRoute` del run (contrato existente de estimate/prepare/generate; sin endpoint/command nuevo).
- La disponibilidad es **server-authoritative**: la UI nunca computa promoción/ceiling; sólo renderiza `availability`.

## 7. Primitive decision

- `extend` — la región `producer-route` del composer + el patrón de tarjetas de Globe Producer. **NO** crear un design system nuevo ni una primitive Greenhouse (Globe tiene su propio registry/CSS). Sin card-on-card; una sola galería.

## 8. Accesibilidad

- Grid con `role`/`aria` de lista de opciones (radiogroup semántico: una selección); `aria-checked` en la elegida.
- `gated`/`blocked` = `aria-disabled` + razón en `aria-describedby`; nunca un botón habilitado sin evidencia de disponibilidad.
- Contraste AA; foco visible; targets 44px; tooltips accesibles (no sólo hover).

## 9. Verificación visual (GVC)

- Escenario `task-1555-model-selector` sobre `/producer`; viewports `1440×1000` + `390×844`; perfil `premium`.
- Capturas: galería con available+gated+blocked, recomendado ✦, selección, modalidad Image/Video/Audio, empty, mobile.
- Markers `data-capture`: `producer-route`, `producer-model-grid`, `producer-model-card`, `producer-model-recommended`.
- Aserciones: cero slug/costo/margen en el DOM; una sola selección; `gated`/`blocked` no ejecutables; `scrollWidth === clientWidth` desktop+390px.

## 10. Nota de dirección visual

La galería hereda la dirección aprobada del Producer (TASK-1505): premium, jerarquía clara, un momento visual
dominante (la galería de modelos como decisión creativa, no un dropdown técnico). El pase visual premium final
(loop de 3 conceptos con `greenhouse-ai-design-studio`) se ejecuta en implementación sobre este contrato de
layout/estado; este wireframe fija QUÉ y CÓMO se comporta, no reemplaza ese pase.
