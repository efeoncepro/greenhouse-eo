# Registro de decisiones y versiones

> Documento vivo. Cada decisión del operador y cada versión publicada se registra acá con su fecha, en el mismo commit
> que la aplica. Lo que no está aquí no se da por decidido.

## Decisiones del operador (vigentes)

| Fecha | Decisión |
|---|---|
| 2026-09-25 | «La órbita» es la línea gráfica canónica de la marca propia Efeonce y su familia: rodea, mide y enfoca. |
| 2026-09-26 | Efeonce firma todas las piezas; Globe, Wave, Reach y Greenhouse son contexto. Verk y Kortex quedan fuera por ahora. |
| 2026-09-26 | La palabra del eslogan es de la línea de servicio: Growth (Efeonce/Greenhouse, «el producto que controla todo»), Brand (Globe), Engine (Wave), Voice (Reach), Revenue (RevOps). |
| 2026-09-26 | RevOps es sublínea de Efeonce operada sobre HubSpot o Salesforce: dos acentos (HubSpot magenta berenjena `#e86bd0`/`#8e1b82`, Salesforce cielo `#2fb8ff`/`#00739e`). |
| 2026-09-26 | Firma de una pieza: logo de Efeonce centrado; la burbuja URL sólo reemplaza al logo cuando éste ya aparece en la imagen. |
| 2026-09-26 | La órbita no sustituye el lenguaje fotográfico: se declara a propósito (lente, medida, progreso, foco, cierre) y nunca cruza sujeto, reservas, lecho ni firma. |
| 2026-09-26 | Trayectoria: un dato es la posición de la esfera (parte a las 12, sentido horario, valor × 360°) con estela corta; la órbita recorre, nunca se llena como un loader; al 100 % la esfera se queda. |
| 2026-09-26 | Todas las formas del canvas se soportan en el paquete (halo, plana, satélites, mapa de familia, foco, estado, cierre). |
| 2026-09-26 | La esfera que cierra el texto es parte del texto: guías, marcas, selección y cursores la incluyen. |
| 2026-09-26 | Un solo anillo alrededor del contenido; las órbitas interiores sólo en una órbita vacía. |
| 2026-09-26 | Las recetas reproducen la composición del canvas pieza por pieza (lente, foco, deck, firma de correo). |
| 2026-09-26 | Motion del logo V1.1 aprobado (reveal 3,6 s, apertura 2,4 s, sting 1,6 s; más punch; eslogan al 64 % del logo) y su lenguaje de movimiento como norma, con valores en tokens. |
| 2026-09-26 | Firma de correo v3.1 con franja de partners (contrato `efeonce.email-signature`). |
| 2026-09-26 | Firma de equipo (buzón de un área), variante `team`: sin foto; la zona `area-mark` dibuja la misma órbita del retrato alrededor del ícono del área; nombre = el área con su punto («Talent.»); sólo el correo del área. Áreas en `emailSignature.team.areas` (talent, finance, commercial); un área nueva nace en esos tokens. |
| 2026-09-26 | La línea gráfica converge con el lenguaje fotográfico, que sigue vigente: se enriquecen mutuamente (ver `photography-convergence.md`). |
| 2026-09-26 | **Contraste del acento (D1):** 3:1 contra su fondo para gráfico (arco, esfera, halo) y texto ≥ 24 px; el acento **nunca** en texto de menos de 24 px (ahí navy `#023c70` sobre claro, blanco sobre oscuro). Medido: Growth `#0e8c82`/papel 3,87 · Engine `#0375db`/`#091951` 3,60 · Voice `#f83902`/papel 3,53: pasan 3:1; Engine y Voice conservan sus colores. Token `efeonceGraphicLine.accentContrast` (axis-tokens 0.3.5) y chequeo del adapter `accent-text-min-size` (contrato `graphic-line-orbit` 0.3.1). |
| 2026-09-26 | **Revenue-HubSpot (D2):** el magenta queda como está (`#e86bd0` oscuro 5,9:1 · `#8e1b82` claro 7,5:1). El naranja de HubSpot no se usa: choca con Globe/Reach y es el color del partner. |
| 2026-09-26 | **Cierre del deck (D3):** «Growth» del eslogan va en el acento de la línea, no en blanco (8,5:1 sobre `#001a33`). `deckSlideHtml('close')` pinta la palabra en el acento (axis-graphic-line 0.3.2). |
| 2026-09-26 | **Burbuja URL (D4):** umbral de contraste 4,5:1, token `urlBubble.minContrast: 4.5`. |
| 2026-09-26 | **Logo dentro de la órbita (D5):** sólo en cierres de marca —cierre del deck, cierre de video y muro de recepción—, con su resguardo X respetado (el anillo queda fuera). **Nunca** en el banner de LinkedIn (4.1) ni en el reverso de la tarjeta (4.6): en objetos, el logo va solo en el dorso. En todo lo demás rige el manual §8.3 n.º 8 (la órbita nunca rodea el logo). |
| 2026-09-26 | **Órbitas interiores del banner de LinkedIn (4.1) y del fondo de Teams (4.3) (D6):** se reproducen con un solo anillo. |
| 2026-09-26 | **Halo sobre papel (D7):** a media intensidad. Token `efeonceGraphicLine.orbit.haloOnLightScale: 0.5`; el resolver del contrato multiplica la opacidad de cada parada del halo por ese factor en superficie clara, y el render del motion lee el mismo token. |
| 2026-09-26 | **Anillo propio de la esfera (D8):** `sphereRing` queda reservado a «en vivo»: el eco del pulso de impacto en movimiento y el estado activo / «en el aire». El intent de `orbit` suma `live?: boolean` y el contrato rechaza `sphereRing: true` sin `live: true` (código `sphere-ring-only-live`). |
| 2026-09-26 | **Sinergia con la fotografía (D9):** aprobadas las reglas P1–P12 de `photography-convergence.md` §6. P5 y P9 necesitan código: se abre una task «foto:prompt y chequeos de la lente» (sin ID todavía). |
| 2026-09-26 | **Conflictos entre canon (D10):** P-1 el oscurecimiento de la lente cuenta como la reserva del texto (el «nunca scrim» sigue en piezas sin lente) · P-2 se pide el lecho igual (= P12) · P-3 el 55 % es del círculo visible de la lente: se ajusta la toma · P-4 un anillo en la escena cuenta como órbita → otro plate · P-5 capa gráfica sobre foto aprobada sólo en los casos de la línea (voz, lente, medida con fuente) · P-6 1200×627 nativo en `foto:prompt` (task), nunca recortado de 16:9 · P-7 el retrato de perfil es categoría propia del lenguaje fotográfico, se permite mirar a cámara, su barra está por escribir · P-8 el límite del 36 % de cabezas y manos sólo con reserva de texto (task) · P-9 en piezas con lente manda el encuadre; las palancas que llenan el cuadro sólo en piezas sólo foto. |
| 2026-09-26 | **Firma de correo (D11):** cada persona la instala en Outlook desde el HTML generado; `people@efeoncepro.com` usa la firma de equipo del área **Talent**. |
| 2026-09-26 | **«Te hacemos visible» (D15, regla reafirmada):** revisión legal antes de cualquier pauta. |
| 2026-09-26 | **Íconos planos, color (D18):** consistente dentro de cada línea de servicio (fondo, tinta y el acento de la línea) y cambia de acento según la línea; nada de colores por objeto ni tintes inventados. La primera exploración a mano quedó descartada. |
| 2026-09-26 | **Íconos, especificación (D17): aprobada.** Grilla 24 con margen 2; trazo 1,5 (1,75 en 20 px o menos; tope de 4 px sobre 64 px); remates y uniones redondos; esfera rellena de radio 1,75 en el acento con 0,5 de aire; respuesta desde 20 px; responde sólo el ícono activo o protagonista, descansa si la pieza ya tiene esfera y nunca va como viñeta. Documentada en `iconography.md`. |
| 2026-09-26 | **Íconos (D16): híbrido A + B.** El trazo limpio es el ícono (estado **reposo**); la esfera es un estado (**respuesta**), no parte del dibujo: una pieza del glifo se vuelve esfera (reemplaza) o la esfera aparece donde la acción se resuelve (completa). Tinta blanco/navy; el acento sólo en la esfera. La dirección C (órbita abierta, contornos con corte) queda descartada. Canvas de trabajo: claude.ai/artifact/Y9mx42L72zYc6iLg4j3Maj. |

## Pendientes del operador (no decidir por tu cuenta)

- **Banco de pares pregunta/respuesta (D12):** el operador lo revisa y aprobará **2 pares por línea de servicio** con
  respuestas verificables. Hasta entonces el banco es candidato: calibra el tono, no es copy aprobado.
- **Archivos de impresión (D13):** se empieza por la tarjeta de presentación y el muro de recepción, en PDF vectorial
  salido de las recetas. **Bloqueado** hasta tener la especificación de la imprenta. Hoy ninguna pieza física tiene
  archivo final de imprenta (manual §12).
- **Prueba de atribución sin logo (D14)** (600 personas) y firma A/B: va **antes de cualquier pauta con la órbita**;
  proveedor y presupuesto los decide el operador. Hasta correrla, la órbita es un sistema consistente, **no** un activo
  distintivo demostrado.
- **Firma de correo:** la URL de LinkedIn de la empresa.
- **Íconos:** el inventario del set (qué íconos necesita la marca) y si reemplaza a los Tabler outline de la firma de
  correo y de equipo. La **iconografía plana** complementaria (rayo, paleta, pincel, cuentagotas, bombillo, tablet,
  laptop, Mac de escritorio, teléfono) está en exploración: tres tratamientos en el canvas; no se usa hasta decidir.

### Pendiente de implementación (decidido, falta código o texto)

- Íconos de trazo (D16–D17): tokens `efeonceGraphicLine.icons` y los SVG del set (reposo y respuesta) en
  `@efeoncepro/axis-brand-assets`. Hasta entonces la geometría canónica vive en `iconography.md` §9.

- Task «foto:prompt y chequeos de la lente» (sin ID): P5 (chequeos de lecho y reservas para lente y foco;
  `lens-subject-inside-circle` medido), P9 (campo `reservas.lente`), P-6 (formato nativo 1200×627) y P-8 (el límite del
  36 % sólo con reserva de texto). Hasta que llegue, `foto:prompt` sigue emitiendo el límite del 36 % y no genera
  1200×627.
- La barra fotográfica del retrato de perfil (P-7), en el canon fotográfico.
- Publicación de axis-tokens 0.3.5, axis-ui-contracts 0.3.5 y axis-graphic-line 0.3.2 (ver versiones) y su adopción en
  Greenhouse.

## Versiones publicadas

| Fecha | Paquete | Versión | Qué trae |
|---|---|---|---|
| 2026-09-26 | tokens, contracts, registry, brand-assets | 0.3.0 | contrato `graphic-line-orbit` 0.3.0 estable, líneas de servicio, trayectoria, `lens.anatomy`, `pieces`, `portrait`, selección 0.3.0 |
| 2026-09-26 | axis-graphic-line | 0.3.1 | el paquete de la órbita (recetas, deck fiel a 4.2, motion CSS, React y Web Component) |
| 2026-09-26 | tokens, contracts | 0.3.2 | tokens `emailSignature` y contrato `efeonce.email-signature` (sin `motion`) |
| 2026-09-26 | axis-tokens | 0.3.3 | `efeonceGraphicLine.motion` (el lenguaje de movimiento) |
| 2026-09-26 | tokens, contracts | 0.3.4 | firma de equipo: `emailSignature.team.areas`, variante `team` (`area-mark`, errores `team-has-no-portrait` y `area-mark-only-for-team`, respuesta con área) |
| 2026-09-26 | axis-tokens 0.3.5 · axis-ui-contracts 0.3.5 (contrato `graphic-line-orbit` 0.3.1) · axis-ui-registry 0.3.1 · axis-brand-assets 0.3.1 (órbitas estáticas regeneradas) · axis-graphic-line 0.3.2 | publicado (tag `v0.3.5`) | `accentContrast`, `urlBubble.minContrast`, `haloOnLightScale`, `live` + `sphere-ring-only-live`, `accent-text-min-size`, cierre del deck con Growth en acento |

Lab AXIS (`c2affc6`, 2026-09-26): la lámina 6.1 lista las decisiones del 26-09 y lo que sigue abierto; el acento ya no colorea texto de menos de 24 px en 1.2 y en las láminas de Insights; la anatomía de 1.2 ya no dibuja el anillo de la esfera; 5.4, 5.1 y 4.5 al día. Quedan en acento sólo rótulos de cotas en diagramas técnicos («0,20 em», la «X» del resguardo), que no son piezas.

Greenhouse: tokens 0.3.3, contracts/registry/brand-assets 0.3.0 en `develop` (llega a producción con el próximo release); no usa todavía el contrato de firma.
