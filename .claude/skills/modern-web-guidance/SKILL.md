---
name: modern-web-guidance
description: Consultar la guidance oficial de Chrome (GoogleChrome/modern-web-guidance, Apache 2.0, Google I/O 2026) — retrieval semántico OFFLINE de 128 use-cases + 102 features de plataforma web verificados por expertos (Forms, Performance, UX, Passkeys, Built-in AI, A11y, CSS). Invocar al diseñar, construir, auditar o refactorizar CUALQUIER UI/web-platform de Greenhouse, junto a las skills de diseño del repo. Triggers: "patrón moderno", "cómo se hace hoy", "best practice web", "API nativa", "custom select", "scroll-driven", "view transitions", "popover", "dialog", "form moderno", "performance web", "modern web guidance", "Chrome guidance".
---

# Modern Web Guidance (Chrome) — consulta canónica

CLI oficial de Chrome que inyecta patrones de plataforma web **verificados por expertos** vía retrieval semántico **offline** (TensorFlow.js — sin red, sin API keys, sin telemetría si la apagás). Benchmark interno de Google: +37 pts de adherencia a best-practices web cuando un agente la consume. **Es conocimiento de referencia, NO un runtime del producto.**

## Cuándo consultarla

Al diseñar/construir/auditar/refactorizar CUALQUIER UI o capacidad de plataforma web de Greenhouse — **junto a** (no en vez de) `modern-ui`, `greenhouse-ux`, `state-design`, `forms-ux`, `motion-design`, `a11y-architect`, `dataviz-design`, `typography-design`. Especialmente fuerte en: **Forms** (custom select, validación, autofill), **Performance** (scheduling, batching, rendering), **UX** (animaciones, scroll effects, dialogs, tooltips, popover, view transitions), **Passkeys**, **Built-in AI** del navegador, **A11y**.

Encaja en la **Fase 1 (divergencia/dirección de arte)** del loop `product-design-loop`: fija el bar de "cómo se hace HOY en la plataforma web" antes de generar conceptos o elegir patrón.

## Comandos (on-demand, sin instalar nada global)

```bash
# El repo usa Node vía nvm — exportar PATH en cada llamada Bash:
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"

# 1. Buscar el patrón (devuelve JSON rankeado por similitud)
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "<consulta en inglés>"
#   → [{ id, description, category, featuresUsed[], tokenCount, similarity }, ...]

# 2. Traer la guía completa (markdown con patrón + ejemplo + gotchas + fallbacks)
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest retrieve "<guide-id>"

# 3. Actualizar el índice de guías
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest update
```

- **`DISABLE_TELEMETRY=1` SIEMPRE** — Google recolecta stats anónimas por default; lo apagamos.
- Consultas en **inglés** (el modelo de embeddings está entrenado en inglés). El query describe el *intent* ("accessible animated tooltip on hover", "batch analytics without blocking main thread").
- `npx -y` lo corre desde caché npm; no instala plugin ni toca config global.

## Workflow canónico

1. **`search`** el intent → revisar top 3-5 por `similarity` + `category`.
2. **`retrieve`** la(s) guía(s) relevante(s) → leer patrón, ejemplo, gotchas, fallbacks.
3. **Extraer la INTENCIÓN/UX**, no el código literal (ver caveat Greenhouse abajo).
4. **Mapear a Greenhouse**: primitives `src/components/greenhouse/*` / wrappers Vuexy `Custom*` / MUI base + tokens AXIS + escala tipográfica SoT + spacing 4n + motion tokens.
5. **GVC en loop** para verificar el render real.

## Caveat Greenhouse (crítico) — intención, no literal

La guidance es **plataforma-web-nativa**: CSS moderno (`appearance: base-select`, `::picker(select)`, `::checkmark`, `popover`, `@starting-style`, `view-transition`, scroll-driven timelines), HTML/DOM y JS APIs nativas. Greenhouse renderiza con **MUI v7 + Vuexy + tokens AXIS**, con lint gates que bloquean hardcode.

- **NUNCA** pegar el CSS/HTML crudo de una guía dentro de un componente Greenhouse si bypasea el theme, los wrappers `Custom*` o los lint (`no-hardcoded-hex-color`/`no-hardcoded-fontfamily`/`no-fontsize-inline-typography`). El HEX/px/fontFamily del ejemplo es ilustrativo → mapear a tokens.
- Muchas guías de Forms estilizan el `<select>` nativo — en Greenhouse el equivalente es `CustomAutocomplete`/`CustomTextField`/MUI `Select`. Extraer el **patrón de UX/a11y/interacción**, no reemplazar la capa MUI por un `<select>` nativo.
- Donde la guía aporta una **API de plataforma genuinamente nueva sin equivalente MUI** (ej. `popover` top-layer, View Transitions, scroll-driven animation, Built-in AI del navegador), evaluar adoptarla detrás de la primitive/wrapper canónico (Floating Surface, Motion primitive) + fallback honesto + `prefers-reduced-motion`, siguiendo el protocolo Primitive+Variants+Kinds. Reportar la decisión (reuse/extend/new) antes de codear.
- Respetar la jerarquía de motion del repo (CSS Tier 1 = theme; framer-motion; GSAP via `useGreenhouseGSAP`) — no introducir una capa de animación nueva solo porque una guía la muestre.

## Hard Rules

- **NUNCA** correr `npx modern-web-guidance` sin `DISABLE_TELEMETRY=1`.
- **NUNCA** instalarla como dependencia del producto ni cablearla a un flujo runtime — es referencia de diseño, se consulta on-demand.
- **NUNCA** transcribir literal HEX/px/fontFamily/CSS nativo de una guía a un componente Greenhouse — tokenizar/mapear a la capa MUI.
- **NUNCA** declarar "listo" en UI por seguir una guía sin captura GVC mirada.
- **SIEMPRE** consultarla junto a las skills de diseño del repo, no como sustituto del contrato visual Greenhouse (`DESIGN.md`, tokens AXIS, primitives).

## Procedencia

- Repo: `GoogleChrome/modern-web-guidance` (Apache 2.0). Fuente: `GoogleChrome/modern-web-guidance-src`.
- 128 use-cases en 9 categorías + 102 features de plataforma. Retrieval offline TF.js.
- Plugin oficial Claude Code (opcional, solo sesión Claude, no multi-agente): `/plugin install modern-web-guidance@googlechrome`. Esta skill committeada prefiere el path on-demand para que Codex también la herede.
