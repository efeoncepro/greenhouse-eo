# PDR-026 — Cada landing deriva su patrón de diseño de su necesidad

> **Tipo:** Product Decision Record de doctrina de diseño del sitio público.
> **Estado:** Accepted · decidido por el operador el 2026-10-18.
> **Caso fuente:** landing Inbound Marketing, [`/agencia-inbound-marketing/`](https://efeoncepro.com/agencia-inbound-marketing/)
> (página WordPress `242601`), rediseño «La órbita» publicado el 2026-10-18.
> **Alcance:** toda landing y superficie de conversión de `efeoncepro.com`, existente o futura.
> **Registro de mecanismos reutilizables:** [PRIMITIVES.md del sitio público](../../architecture/public-site/PRIMITIVES.md).
> **Documentación del caso fuente:** [funcional](../../documentation/public-site/inbound-marketing.md) ·
> [manual](../../manual-de-uso/public-site/operar-inbound-marketing.md).
> **Skills afectadas:** `efeonce-public-site-wordpress`, `greenhouse-ai-design-studio`, `growth-marketing-cro`,
> `copywriting`, `greenhouse-growth-ctas`, `greenhouse-growth-forms`.

## Contexto

El 2026-10-18 se publicó el rediseño de la landing Inbound Marketing. Tiene una composición muy reconocible: la órbita,
el hero «El loop.», once secciones en un orden propio, una única sección clara (`vivo`), el gráfico del ciclo, la
interacción «Arma tu primer ciclo», un diálogo de reunión que muestra sólo el agendador flotando sobre la página
desenfocada, y botones con una piel específica.

Al cerrar ese trabajo, el operador dejó explícito cómo debe leerse:

> «este es un estilo de landing pero no quiero que sea este mismo para todas las landing ni que se entienda así, cada
> landing tiene su necesidad y en base a eso se construye su patrón de diseño no al revés»

El riesgo es concreto: el sitio ya tiene varias landings compiladas desde canvas (Agencia Creativa, Agencia de Medios,
Performance Marketing, Servicios HubSpot, Inbound) y comparten núcleo técnico. Un agente que ve una landing reciente,
aprobada y con buena ejecución tiende a tomarla como punto de partida de la siguiente y rellenarla. Eso invierte el
orden: la forma decide antes que la necesidad.

## Decisión

**El patrón de diseño de cada landing se deriva de la necesidad de esa landing. Ninguna landing es plantilla, estilo de
la casa ni punto de partida por defecto de otra.**

1. **La necesidad va primero.** Antes de componer, cada landing declara a quién le habla, en qué etapa de compra está
   esa persona, qué oferta y qué prueba existen, y qué tiene que decidir quien visita. La estructura, el orden de las
   secciones, el tono visual, las interacciones y la piel de los componentes salen de ahí.
2. **El aspecto de una landing pertenece a esa landing.** En el caso fuente, la órbita, el hero «El loop.», las once
   secciones y su orden, la sección clara, el gráfico del ciclo, «Arma tu primer ciclo», el aspecto del diálogo de
   reunión, la piel de los botones, los colores y la tipografía son decisiones de Inbound. Lo mismo vale para las
   landings anteriores: Performance o Medios tampoco son «el patrón».
3. **Lo reutilizable son mecanismos, no aspectos.** Pueden y deben compartirse:
   - el núcleo del compilador desde canvas (`scripts/public-website/lib/source-led-compiler.cjs`) y sus guardas
     (`verify-source-led-compilers.cjs`, `verify-source-led-render.php`);
   - el carril acotado de publicación (paquete, deploy con allowlist, publicación con guarda de hash, rollback desde
     snapshot);
   - el lanzador de reunión de la base común (`EO_Source_Led_Landing_Base_Widget`, `<gh-meeting-cta>` con override de
     ubicación por placement);
   - la primitive de todo el sitio `EfeonceMention`;
   - la integración con Growth Forms y Growth CTA;
   - las lecciones técnicas registradas (por ejemplo, que `<greenhouse-cta>` necesita ancho explícito, o que un botón de
     contorno sobre el límite de una foto necesita fondo propio).

   Cada landing decide si usa cada mecanismo y le pone su propia piel.
4. **Una composición no se promueve a primitive por existir.** Para que algo de una landing pase al
   [registro de primitives](../../architecture/public-site/PRIMITIVES.md), tiene que ser un mecanismo que otra landing
   necesite y que se pueda vestir distinto, no una sección que se vea bien.

## Alternativas descartadas

| Alternativa | Por qué no |
| --- | --- |
| Tomar la última landing aprobada como plantilla de la siguiente | Invierte el orden: la forma decide antes que la necesidad, y todas las landings terminan pareciéndose aunque hablen a públicos y etapas distintas. |
| Definir un «estilo de landing» único del sitio | Mismo problema a escala de sitio; además fija decisiones que en Inbound respondieron a un mensaje concreto (el ciclo). |
| No compartir nada entre landings | Repite trabajo técnico y errores ya resueltos (carril, guardas, CTA, mención). El problema nunca fue compartir mecanismos. |

## Consecuencias

### Para agentes

- **Nunca** describir Inbound, Performance ni ninguna landing como «el estilo», «la plantilla» o «el patrón» del sitio,
  en docs, skills, briefs ni respuestas.
- **Nunca** empezar una landing nueva copiando el layout, el orden de secciones o la piel de otra y rellenándolo. Empezar
  por la necesidad declarada; el diseño se compara contra esa necesidad, no contra la landing anterior.
- **Sí** reutilizar los mecanismos de la lista y documentar en la landing nueva cuáles usa y cómo los viste.
- Al documentar una landing, separar lo que es decisión de diseño de esa landing de lo que es mecanismo compartido. El
  caso fuente lo hace: la piel del diálogo de reunión vive en `inbound-source/page.css` y se documenta como decisión de
  Inbound, no como estándar del CTA.
- Al registrar algo en `PRIMITIVES.md`, registrar el mecanismo (contrato, override, a11y, guardas), nunca la composición
  visual de la landing que lo estrenó.

### Para las próximas landings

- El brief o la task de una landing nueva incluye la declaración de necesidad (público, etapa, oferta, prueba,
  decisión) antes que la dirección visual.
- La revisión de diseño pregunta si la composición responde a esa necesidad, no si se parece a una landing aprobada.
- Una landing nueva puede consumir el lanzador de reunión, `EfeonceMention`, Growth Forms o el carril compartido con
  otra piel o no consumirlos; ambas son decisiones válidas si responden a su necesidad.
- Las landings existentes no cambian por esta decisión: se publicaron con diseños propios y siguen así.

## Enlaces

- [Registro de primitives del sitio público](../../architecture/public-site/PRIMITIVES.md)
- [Landing Inbound Marketing — documentación funcional](../../documentation/public-site/inbound-marketing.md)
- [Operar la landing Inbound Marketing](../../manual-de-uso/public-site/operar-inbound-marketing.md)
- [PDR-022 — Landing Performance Marketing](PDR-022-landing-performance-marketing-posicionamiento.md)
- [PDR-025 — Landing Agencia de Medios](PDR-025-landing-agencia-de-medios-posicionamiento.md)
