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

## Pendientes del operador (no decidir por tu cuenta)

- «Growth» del eslogan en el cierre del deck: blanco (como el canvas) o el acento de la línea (regla vigente).
- Contraste de Engine y Voice sobre sus fondos (≥ 4,5 en el token).
- El magenta de Revenue-HubSpot.
- Prueba de atribución sin logo (600 personas) y firma A/B: la órbita es un sistema consistente, **no** un activo
  distintivo demostrado.
- Umbral de contraste de la burbuja URL (4,5 vs 3:1).
- Firma de correo: instalar en Outlook; si `people@efeoncepro.com` es un área aparte; la URL de LinkedIn de la empresa.
- **Logo dentro de la órbita:** el muro de recepción (4.3), el reverso de la tarjeta (4.6), el banner de LinkedIn
  (4.1) y el cierre del deck (4.2, `deckSlideHtml('close')`) ponen el logo dentro de su órbita; el manual §8.3 n.º 8 y la
  lámina 5.4 prohíben la órbita alrededor del logo; la contraportada de Insights (7.2) lo deja afuera. Mientras no se
  decida: en objetos nunca; los cierres de marca aprobados se reproducen como su lámina; en piezas nuevas, consultar.
- **Órbitas interiores en el banner de LinkedIn (4.1) y el fondo de Teams (4.3):** se dibujaron con una órbita interior
  alrededor de contenido, contra la regla de un solo anillo (2026-09-26). La guía indica reproducirlas con un solo
  anillo; confirmar.
- **Archivos de impresión y plantillas editables:** ninguna pieza física tiene aún archivo final de imprenta (manual §12).
- **Halo sobre papel:** el manual lo lleva a la mitad y el render del motion también (`haloScale: 0.5`), pero el
  contrato 0.3.0 pinta las mismas paradas en ambas superficies. Decidir si el contrato debe reducirlo.
- **Anillo propio de la esfera** (`sphereRing` en tokens y contrato): existe, pero ninguna fuente dice cuándo se usa.
- **Banco de pares pregunta/respuesta:** candidato, sin aprobar.
- **Convergencia con el lenguaje fotográfico:** 12 reglas propuestas (P1–P12) y 9 conflictos entre ambos canon (P-1 a
  P-9), en `photography-convergence.md` §6 y §9. Hasta que el operador decida, rigen las reglas vigentes de cada canon.

## Versiones publicadas

| Fecha | Paquete | Versión | Qué trae |
|---|---|---|---|
| 2026-09-26 | tokens, contracts, registry, brand-assets | 0.3.0 | contrato `graphic-line-orbit` 0.3.0 estable, líneas de servicio, trayectoria, `lens.anatomy`, `pieces`, `portrait`, selección 0.3.0 |
| 2026-09-26 | axis-graphic-line | 0.3.1 | el paquete de la órbita (recetas, deck fiel a 4.2, motion CSS, React y Web Component) |
| 2026-09-26 | tokens, contracts | 0.3.2 | tokens `emailSignature` y contrato `efeonce.email-signature` (sin `motion`) |
| 2026-09-26 | axis-tokens | 0.3.3 | `efeonceGraphicLine.motion` (el lenguaje de movimiento) |
| 2026-09-26 | tokens, contracts | 0.3.4 | firma de equipo: `emailSignature.team.areas`, variante `team` (`area-mark`, errores `team-has-no-portrait` y `area-mark-only-for-team`, respuesta con área) |

Greenhouse: tokens 0.3.3, contracts/registry/brand-assets 0.3.0 en `develop` (llega a producción con el próximo release); no usa todavía el contrato de firma.
