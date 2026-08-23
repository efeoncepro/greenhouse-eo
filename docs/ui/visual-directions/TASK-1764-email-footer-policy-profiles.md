# TASK-1764 — Email Footer Policy Profiles Visual Direction

## Mode and source

- Mode: `repo-native-benchmark`
- Durable source: `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`
- Provenance / approval: correcciones explícitas del operador, 2026-08-22
- Selected frame/state: footer Efeonce semántico, compacto y gobernado por `EmailType`
- Approval state: `approved starting contract`; no requiere una nueva exploración visual antes de implementar
- Reference route: `/admin/emails/footer-profiles/mockup`

## Alternatives

1. **Footer universal:** logo/tagline + disclaimer + unsubscribe opcional en una sola composición.
2. **Footer editorial por template:** cada dominio diseña su cierre según el mensaje.
3. **Bloques semánticos gobernados:** estructura visual estable; identidad, contexto, ayuda, preferencias y legal se
   agregan sólo cuando la policy lo exige.

## Decision

Se selecciona la alternativa 3. El footer universal produce copy absurdo fuera de contexto y el modelo editorial
mantiene la improvisación. Los bloques gobernados preservan ritmo visual y permiten diferencias funcionales sin
duplicar el componente.

## Visual thesis

- First-fold reading order: contenido → cierre/firma opcional → separación → identidad Efeonce → contexto → links permitidos
- Dominant decision: comprender quién envía y por qué llegó el mensaje
- Density: compacta; máximo tres niveles tipográficos y sin repetir el cuerpo
- Depth model: fuera de la card principal, sin nueva card ni sombra
- Typography role: motivo de recepción e instrucciones funcionales en `body2` 400, links funcionales en `caption`
  600 y subrayados, razón social/RUT 600, metadata legal 400; máximo tres niveles y sin reducir la metadata por
  debajo de `caption`
- Color role: `secondary` para el motivo y la ayuda, `primaryHover` para links funcionales de 13 px y `muted` para
  identidad legal, países, dirección y referencias. Las instrucciones legales conservables usan `secondary`; una
  advertencia de seguridad usa `warning` sobre `warningBg`. `primary` no se usa como tinta pequeña porque queda en
  4.17:1 sobre `background`; `primaryHover` llega a 6.10:1 y `muted` conserva 4.51:1
- Signature details: Efeonce siempre visible; Greenhouse sólo como descriptor de plataforma
- Email-safe assets: wordmark gris y cuatro isotipos sólidos de bordes redondeados desde Font Awesome Brands —
  `square-youtube`, `square-instagram`, `linkedin` y `square-threads`—, rasterizados como PNG transparentes con
  `EMAIL_COLORS.muted`; sin contenedor visible añadido, dibujos manuales, icon fonts, SVG remoto ni filtros CSS
- Institutional layer: RRSS opcionales en suscripción y obligatorias en marketing; YouTube, Instagram, LinkedIn y
  Threads se muestran como isotipos sólidos y redondeados con nombre accesible, debajo de controles y sin competir con
  el CTA del mensaje
- Legal layer: razón social + RUT + casa matriz en todos los perfiles; países como lista compacta separada por `·`
  sólo en `full`, en el último nivel de jerarquía, con wrap legible, sin el rótulo `Operación en` y sin presentar
  Chile como límite geográfico

## Desktop target

Email de 560 px dentro de viewport 720 px. Footer centrado bajo la card; la firma, cuando exista, permanece alineada
a la izquierda dentro del cuerpo. Separación suficiente para que nunca se lean como el mismo bloque.

## Mobile target

Viewport 390 px, una columna. Links en líneas separables, sin `white-space: nowrap`, sin tablas densas ni dirección
legal comprimida lateralmente.

## Token mapping

| Cue               | Canonical token / primitive / recipe      | Deviation                          |
| ----------------- | ----------------------------------------- | ---------------------------------- |
| Fondo exterior    | `EMAIL_COLORS.background`                 | ninguna                            |
| Identidad/footer  | `EMAIL_COLORS.muted` + `EMAIL_FONTS.body` | ninguna                            |
| Links funcionales | `EMAIL_COLORS.primaryHover` con underline | contraste AA a 13 px               |
| Separación        | `EMAIL_COLORS.border`                     | ninguna                            |
| Marca             | wordmark Efeonce desde SSOT existente     | Greenhouse no es variante de marca |

## Anti-patterns

- Botón de unsubscribe en transaccionales.
- “Contacta a tu administrador” para audiencias externas sin administrador Greenhouse.
- Firma de equipo dentro del footer legal.
- Presentar Greenhouse y Efeonce como marcas equivalentes.
- Promociones, cross-sell o CTA comercial en correos de servicio.
- Dirección legal hardcodeada en JSX.
- RRSS universales, a color o presentadas como “Síguenos” dentro de mensajes transaccionales.
- Disclaimer de confidencialidad genérico aplicado a todos los propósitos.
- Cambiar todos los templates mediante el default de `EmailLayout`.

## Acceptance signature

- Average ≥4.5/5; hierarchy, surface economy, visual impact, fidelity and generic-template resistance each ≥4.5/5.
- No dimension <4/5.
- Fidelity ≥4.5/5.
- Generic-template resistance ≥4.5/5.
- Desktop/mobile y versión con imágenes bloqueadas por cada cohorte.
- La implementación demuestra paridad con la ruta de referencia en jerarquía, espaciado, contraste, wordmark,
  legal, iconografía social y controles elegibles.
- Una desviación requiere limitación medida, before/after y aprobación explícita; la preferencia del agente no basta.
- La fidelidad se valida en Outlook Desktop Windows, Outlook Web, Gmail y un cliente WebKit; con imágenes bloqueadas,
  el contenido y el fallback textual/accesible de RRSS conservan significado.
