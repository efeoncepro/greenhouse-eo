# PROPOSAL — Iteración de paleta de color (TASK-1053)

> **Para qué sirve este doc:** registro agent-facing para iterar la paleta RÁPIDO sin perder
> el razonamiento entre sesiones. El operador itera **visualmente** en el mockup
> `/admin/design-system/mockup/brand-color-system` (yo lo voy actualizando); **este archivo es la
> memoria del porqué + los valores candidatos + el log de rondas.** Léelo primero antes de tocar
> colores. No es la spec — la spec durable es `docs/tasks/in-progress/TASK-1053-*.md`; acá se
> itera hasta converger y recién entonces se vuelca a la spec + se tokeniza.
>
> **Reglas duras que NO se mueven al iterar:** neutrales/gray invariantes · AA (texto blanco sobre
> fill ≥4.5:1, o ink separado) · warning amber traffic-sign (texto oscuro) · SoT-deriva-todo (cero
> parches, cero hex inline en JSX). El lever del primary es `src/configs/primaryColorConfig.ts`
> (`settings.primaryColor`), NO `axisRamp.primary`.

---

## Lo que el mockup React renderiza HOY (verbatim — dirección D)

> Espejo exacto de `src/views/greenhouse/admin/design-system/BrandColorSystemMockupView.tsx`
> (`/admin/design-system/mockup/brand-color-system`). Hex **literales** (el mockup NO tokeniza
> nada todavía). Esto es lo que el operador ve en pantalla. Es el punto de partida de la iteración.

**Brand spine + marca**
- `navy` (identidad: shell/nav/header) — 500 **#023C70** · ramp `#F2F5F8 #E1E8EE #BDCCDA #90A9C0 #4E779B #023C70 #02325E #01294C #011F3A #011628`
- `action` (CTA/links/foco/activo) — 500 **#024C8F** · ramp `#F2F6F9 #E1EAF2 #BDD0E2 #90B0CE #4E82B1 #024C8F #024078 #013461 #01284A #011B33`  ← **el azul que se ve pesado en charts**
- `greenCanon` (verde de trabajo) — 500 **#3E7A12** · ink de marca
- `greenVivid` (pop decorativo) — 500 **#6EC207** · dark-fg #8FD45A
- `orange` (accent puntual) — 500 **#FF6500** · ink #9A3D00
- spine helpers: `support` (tint acción) **#E8F1F8** · `actionDark` **#6BA6E8**

**Semánticas de feedback (4 roles × 6 sub-valores)**
| Rol | fill | onFill | ink | tint | border | dark-fg |
|---|---|---|---|---|---|---|
| Info | #1F6FD4 | #FFFFFF | #155CAD | #E8F1FD | #C2DBF7 | #6FB0F0 |
| Success | #157F47 | #FFFFFF | #11703F | #E7F6EE | #BCE6CF | #5FC891 |
| Warning | #FFB703 | #2A1A00 | #8A5A00 | #FFF4D6 | #F5D98A | #E8B84B |
| Error | #DC2E39 | #FFFFFF | #C01D27 | #FDECEC | #F5C2C4 | #F08A8F |

**Ramps semánticos** (50→900): info `#EEF4FD…#0C376A` · success `#EDF7F1…#073219` · warning `#FFFBF0…#472F00` (fill = step 400 #FFB703) · error `#FDEDEE…#560C11`

⚠️ **Divergencias del mockup vs tus decisiones ya tomadas** (a alinear cuando iteremos el mockup):
1. **El mockup pinta el neutral como SLATE `#5B6472`** (ramp `#F8F9F9…#1B1E22`, label "Neutral — slate"). Tú decidiste **neutrales INVARIANTES = el gray de Greenhouse `#97939e`**; el slate NO se adopta. El mockup todavía muestra el slate.
2. **El primary del mockup = `#024C8F`** (el oscuro que estás cuestionando). La iteración apunta a cambiarlo.

---

## Estado / problema (2026-06-08)

- Dirección D oscureció el primary a **action blue `#024c8f`**.
- **Observado en runtime:** charts que usan `primary` quedaron con ese azul muy oscuro → se ven
  mal (apagados, pesados, mala lectura, se confunden con fondos oscuros).
- **Duda del operador (textual):** *"estoy empezando a dudar si la paleta la elegí bien si tengo
  que cambiar tanto para que no usen el primary."*

### Diagnóstico (no es una sola causa — son tres, combinadas)

1. **El primary está sobre-oscurecido.** `#024c8f` es navy-institucional. Un primary de propósito
   general (CTA + links + acentos + series de chart + estado activo) necesita **más luminancia y
   croma**. Bajar tanto la luminancia lo vuelve "lodo" en superficies decorativas.
2. **Crowding de azules (gap #4 de la design review, ahora se siente en la práctica):**
   `navy #023c70` + `action #024c8f` son **casi el mismo azul oscuro**. Dos roles colapsados en un
   tono. Más `info #1f6fd4` encima = 3 azules apretados.
3. **Los charts NO deberían usar `primary` como color de serie.** Necesitan **paleta categórica
   propia** (gap #6, ya foldeado a TASK-1053 con los one-offs de 1048). Un chart toma su color del
   token semántico/primary por accidente, no por diseño.

> **Reframe clave:** la salida anterior fue "desacoplar el CTA del primary" — pero eso es tratar el
> síntoma (esconder un primary feo). La causa raíz es que **el oscurecido del primary fue
> probablemente el error**. Conviene **separar los wins de dirección D de la parte controvertida**:
> - **WINS que se quedan (son la mejora real, arreglan AA texto-sobre-blanco):** `success → emerald
>   #157f47`, `error → vermilion #dc2e39`, `info → azure #1f6fd4`, `secondary` ramp corregido (sin
>   el hue-shift a teal), warning invariante.
> - **CONTROVERTIDO que se revisa/dropea:** oscurecer el **primary** a `#024c8f`. Si el primary se
>   queda vibrante (≈ `#0375db`, el core actual, ya probado en charts), **desaparece la necesidad de
>   sacar el primary de los CTA** y de la mayoría del trabajo de "desacople". Mucho menos blast
>   radius, mismo resultado moderno.

---

## Hipótesis de iteración

- **H1 (recomendada): no oscurecer el primary.** Mantener un azul de acción **vibrante** que sirva
  para CTA + links + charts sin verse pesado, y dejar **navy como token institucional aparte**
  (shells/headers), con separación de luminancia clara entre `navy` / `action` / `info`.
- **H2: charts con paleta categórica dedicada** (colorblind-safe), nunca `primary` por defecto.
- Si H1 se confirma, la "Open Question del token de acción" de la spec se simplifica: no hace falta
  un `action` desacoplado para esconder el primary — el primary *es* el azul de acción, bien
  elegido. (Podría seguir teniendo sentido un `navy` separado para lo institucional, eso sí.)

---

## Candidatos de azul (a renderizar en el mockup, lado a lado)

Luminancia aproximada para entender la separación (mayor = más claro/vibrante).

| # | Dirección | Navy (institucional: shell/header) | Primary/Action (CTA·links·charts·activo) | Info (semántico) | Lectura rápida |
|---|---|---|---|---|---|
| **A** | **Revertir el oscurecido** (H1) | `#023c70` | `#0375db` (core actual, probado en charts) | `#1f6fd4` | ⚠️ primary `#0375db` e info `#1f6fd4` quedan **cerca** → revisar crowding (¿info más distinta?) |
| **B** | **Mid blue** | `#023c70` | `#0a5fc0` (intermedio entre core y action-D) | `#1f6fd4` | primary algo más sobrio que A, sigue usable en chart; revisar AA fill+blanco |
| **C** | **Action separado, navy oscuro** | `#011f3a` (navy muy oscuro, solo masthead) | `#1f6fd4` (azul brillante como acción) | `#3a86e0`+ (info se corre para no chocar) | navy y action MUY distintos; pero action≈info → mover info |
| **D** | **Status quo dirección D** (lo que se vio mal) | `#023c70` | `#024c8f` | `#1f6fd4` | referencia "antes"; el que el operador reportó pesado en charts |

> Notas para llenar al iterar: por cada opción elegida, validar en el mockup (a) botón primario
> contained, (b) link, (c) 1 chart de barras + 1 de líneas con 3-4 series, (d) estado activo de nav,
> (e) foco/ring, en light + darkSemi. Anotar AA del fill con texto blanco.

---

## Paleta categórica de charts (separada de los semánticos)

Pendiente de diseñar con `dataviz-design` (colorblind-safe). Principio: las series de chart NO salen
de `primary`/semánticos — salen de una rampa categórica propia (serie 1..N) con suficiente
separación de hue+luminancia. Reservar pos/neg de cashflow (`#3DBA5D`/`#FF4D49`) y tag-blue
(`#eaf3fc`) — los one-offs foldeados de 1048 — como categóricos, no semánticos.

| Serie | Hex | Notas |
|---|---|---|
| 1 | `#0375DB` azul | = el acento de marca |
| 2 | `#6EC207` lima | verde de marca |
| 3 | `#FF6500` naranja | sub-brand |
| 4 | `#7C3AED` violeta | vibrante |
| 5 | `#06B6D4` cian | vibrante |
| 6 | `#EC4899` magenta | vibrante |
| pos (cashflow) | `#3DBA5D` (de 1048) | revisar AA si lleva texto |
| neg (cashflow) | `#FF4D49` (de 1048) | |

---

## Open questions de ESTA iteración

1. ¿Confirmamos **H1** (no oscurecer el primary; primary vibrante ≈ A o B) y dropear el desacople
   masivo del CTA? → simplifica TASK-1053 enormemente.
2. Si primary se queda vibrante y cerca de info, **¿qué se mueve para evitar el crowding** — info, o
   un nudge del primary?
3. ¿Se conserva un token `navy` institucional separado (shells/headers) aunque el primary no se
   oscurezca?
4. Charts: ¿paleta categórica nueva acá, o se difiere a una task de dataviz?

---

## ✅ Propuesta RESTRAINT v1 — APROBADA (operador 2026-06-08)

> **Aprobada completa** (charts vibrantes + dark retocado): *"me quedé con tu propuesta completa, me encantó."*
> Esta es la dirección a tokenizar. Render aprobado: `/admin/design-system/mockup/brand-color-comparison`
> (`BrandColorComparisonMockupView.tsx`). La hoja D completa sigue intacta en `brand-color-system` como
> referencia del "antes". Valores autoritativos consolidados también en la spec TASK-1053 §"Paleta APROBADA".

Basada en la crítica de `modern-ui` + `dataviz-design`: el sistema ya era moderno, pero el spine de
marca tenía 5 hues compitiendo + doble-navy oscuro → leía corporativo-conservador, no agencia
moderna. Fix = **restraint: un acento confiado + todo lo demás subordinado.**

**Role map (lo que cambia vs dirección D):**

| Rol | Restraint v1 | vs Dirección D | Por qué |
|---|---|---|---|
| **Accent / primary** (botón·link·foco·activo·chart single-series) | **#0375DB** (vibrante, AA blanco 4.6:1) | era #024C8F oscuro | el acento carga la energía del día a día; no se oscurece |
| **Navy** (shell/header institucional) | **#023C70 = accent-800** (mismo azul, shade oscuro) | era hue aparte casi igual al action | colapsa dos azules en UNA familia → cero crowding |
| **Green marca** | pop **#6EC207** + ink crisp **#4B8405** | eran DOS (olivo #3E7A12 + lima) | un solo verde nítido; se elimina el olivo muddy |
| **Orange** | **#FF6500 = sub-brand (Reach)**, fuera del UI diario | estaba en el spine como pop general | no es color de UI; vive solo en su sub-marca |
| **Info / Success / Warning / Error** | **intactos** (#1F6FD4 / #157F47 / #FFB703 / #DC2E39 + 6 sub-valores) | iguales | ya eran modernos + AA; no se relitigan |
| **Neutral** | **Greenhouse gray** (#97939e, invariante) | el mockup mostraba slate #5B6472 | decisión operador: gray real, no slate |

**Paleta categórica de charts — VIBRANTE, anclada a la marca** (feedback operador: la base
Okabe-Ito salía pastel; un chart debe llamar la atención):
`#0375DB azul · #6EC207 lima · #FF6500 naranja · #7C3AED violeta · #06B6D4 cian · #EC4899 magenta`
+ cashflow pos/neg `#3DBA5D`/`#FF4D49`. Single-series → el acento. **Nunca el navy.** Las 3 primeras
series son los colores reales de la marca. Verificar con Coblis + regla "color nunca solo" (la red/lima
juntas son el riesgo de deuteranopia → no adyacentes + ícono/label).

**Ramp del acento** (50→900): `#EAF3FC #CFE4FA #A6CDF5 #6FACF0 #2E8BE8 #0375DB #0362BA #024C8F #023C70 #00284D`
— nota que `#024C8F` (el "action" de D) y `#023C70` (navy) son simplemente los **steps oscuros** de
este mismo azul. Una familia, no tres.

**Dark mode (derivación propia, no invertir):** acento → `#6FACF0`; semánticas → su dark-fg
(info `#6FB0F0` · success `#5FC891` · warning `#E8B84B` · error `#F08A8F`); charts → paleta levantada
`#3B8EE8 #7FD42A #FF8A3D #9B6BF0 #22C9E4 #F25BAC`; jerarquía de superficie bodyBg `#25293C` + paper `#2F3349`.

**Checks pendientes en esta propuesta (a mirar en el mockup):**
- Crowding acento `#0375DB` (sólido) vs info `#1F6FD4` (tonal): ¿se distinguen bien? Si no, nudge de info.
- ¿El verde de marca + emerald-success se leen distintos en contexto?
- Refina decisión G (3→2 verdes): confirmar que estás de acuerdo con eliminar el olivo.

## Log de iteraciones

- **2026-06-08 · v1 (Restraint):** evaluación con `modern-ui` + `dataviz-design` → el sistema es
  moderno pero el spine de marca leía corporativo-pesado (5 hues + doble-navy oscuro). Propuesta
  Restraint: acento único `#0375DB` vibrante, navy = su shade oscuro, un verde crisp (olivo fuera),
  orange a sub-brand, semánticas intactas, charts con paleta categórica. Renderizada como comparación
  D vs Restraint en `brand-color-comparison`. Iterado: charts a paleta vibrante anclada a marca + dark
  mode con derivación propia. **APROBADA por el operador 2026-06-08** (propuesta completa). Checks abiertos
  para tokenización: crowding acento/info + Coblis del chart palette.
- **2026-06-08 · v0 (estado inicial):** dirección D con primary `#024c8f`. Reporte del operador:
  charts con primary se ven muy oscuros/pesados. Se abre re-pick de azules. Diagnóstico = primary
  sobre-oscurecido + crowding de azules + charts usando primary por accidente. Próximo paso:
  renderizar candidatos A/B (y D como referencia "antes") en el mockup para comparar.
