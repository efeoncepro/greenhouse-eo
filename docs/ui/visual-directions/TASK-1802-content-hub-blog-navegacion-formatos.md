# TASK-1802 — Dirección visual del Content Hub Efeonce

> Estado: contrato inicial; requiere checkpoint con contenido real antes de `UI ready: yes`.
> Modo: `source-led` desde la marca Efeonce, PDR-003/PDR-018 y los patrones aprobados en Demo 35.

## Tesis

El hub debe sentirse como una publicación contemporánea y útil, no como un theme de magazine ni como una grilla
corporativa. La firma es un cuaderno editorial de ritmo amplio: tipografía con voz, jerarquía fuerte, abundante
espacio respirable, evidencia visual selectiva y cambios de escala que ayudan a orientarse.

La sofisticación no proviene de animación ni de llenar la página de cards. Proviene de que lo último, los formatos,
los temas y el archivo formen un sistema legible, y de que los descansos full-bleed interrumpan el feed con intención.

## Alternativas comparadas

| Dirección | Ventaja | Riesgo | Decisión |
|---|---|---|---|
| Adaptar Demo 35 | módulos y ritmos existentes | conserva semántica, copy y deuda visual de demo | descartada |
| Portal de recursos por cards uniformes | orden y escalabilidad | borra jerarquía editorial y se siente SaaS | descartada |
| Cuaderno editorial multiformato | identidad, lectura y navegación profunda | exige queries y jerarquía bien resueltas | seleccionada |

## Dirección seleccionada

- Hero sobrio con tesis editorial, una ruta primaria a explorar y acceso visible al Archivo.
- Navegación local por formatos como índice, no como tabs decorativas client-only.
- Ritmo mixto: bloques editoriales, lista/grilla densa donde corresponde y dos descansos full-bleed como máximo.
- Glitch conserva voz y marca propias dentro del sistema, sin competir con los temas.
- Tools/Videos/Webinars muestran affordance de formato y valor, no un tratamiento de “otro post”.
- Newsletter como cierre útil, conectado a un formulario real.

## Targets

- Desktop 1440: composición editorial asimétrica con lectura clara y archivo visible sobre el primer tercio.
- Laptop 1280: jerarquía intacta sin sidebar estrecho de theme.
- Tablet 890: dos columnas sólo cuando el contenido lo tolera.
- Mobile 390: una columna, tipos navegables, paginación táctil y descansos sin recortes destructivos.
- 200% zoom, teclado y reduced motion forman parte del target, no del cierre opcional.

## Firma y antipatrones

Firma:

- cambios de escala con propósito;
- etiquetas de formato breves;
- metadata sobria;
- imágenes con art direction y foco;
- archivo y siguiente acción siempre reconocibles.

Antipatrones:

- carruseles, autoplay, parallax o scroll hijacking;
- mosaico de cards idénticas;
- sidebar Ohio con promo/autor superpuestos;
- lorem, assets stock demo o enlaces `#`;
- ocultar contenido antiguo detrás de una lupa o un “load more” sin URL.

## Token y primitive mapping

- Reusar tipografía, color, radios, spacing y botones públicos Efeonce/AXIS disponibles; no inventar literales aislados.
- Extender widgets Elementor públicos como primitives adaptables: hero/latest, feed/archive, topics, Glitch,
  resources, feature break y newsletter.
- Superficies full-bleed usan overlay/contraste verificado y responsive image contract.
- Focus visible, targets mínimos y estados active/current pertenecen al primitive, no a CSS ad hoc de la página.

