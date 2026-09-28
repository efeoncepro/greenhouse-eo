# La voz Efeonce (el sistema que todo copy debe encarnar)

> Fuente canónica: `docs/context/05_voz-tono-estilo.md`. Este archivo la resume para el craft;
> ante cualquier duda, ese doc manda. La *doctrina* de la voz es de `efeonce-agency`; aquí la
> **crafteas** en copy real.

> **Frontera de speaker:** este sistema rige copy institucional de Efeonce/Greenhouse. No se aplica
> automáticamente a contenido firmado por Julio Reyes; resolver primero el router de
> `JULIO_REYES_VOICE_SYSTEM.md`. Las convicciones pueden compartirse, los giros personales no.

## El principio raíz

La voz de Efeonce **no nace de adjetivos genéricos** ("profesional y cercano") sino de
**creencias específicas sobre el mercado**. Todo texto debe poder rastrearse a una de las 7
creencias contrarias. Si tu copy podría ser de cualquier agencia, no tiene la voz.

## El Why (de dónde nacen las creencias)

Debajo de las 7 creencias hay **un Why de marca** que ordena todo: ***No te entregamos crecimiento. Lo construimos contigo —y te dejamos más capaz de sostenerlo.*** El crecimiento se **co-construye** (co-creación), se **educa** (te hacemos más capaz, no dependiente) y es **integral** (nace de la relación que compone, no del número). Casi todo copy de marca Efeonce puede leerse como este Why tensionado contra el status quo de la industria. Comunicación inside-out (Sinek): abre por el Why, no por el What.

**Regla de craft anti-humo:** "co-creación", "integralidad", "partner" son palabras de agencia commodity si van solas. **Nunca escribas el Why sin su mecanismo al lado** (el login, el grader, el número, el ciclo) — es la misma "obsesión por la prueba" de la personalidad. **SSOT del Why:** `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce.

## Las 7 creencias contrarias (el ADN narrativo)

1. **El marketing sin sistema es caro accidentalmente.** El problema no es creatividad ni
   presupuesto: es arquitectura.
2. **La integración real es operativa, no organizacional.**
3. **Las vanity metrics son un acuerdo de silencio entre agencia y cliente.** Efeonce lo rompe.
4. **La IA sin gobernanza produce más caos, no menos.**
5. **La creatividad que no se mide no se defiende.**
6. **El funnel está jubilado.** La gente circula, no hace fila.
7. **La transparencia operativa no es un diferenciador, es un mínimo.** ← la que Greenhouse encarna.

Úsalas como **ángulos**: casi todo headline/lead/narrativa Efeonce sale de tensionar una de estas
creencias contra el status quo de la industria (`../modules/04`).

## Personalidad (constante, no cambia entre canales)

- **Arquitecto con las manos sucias** — piensa en sistemas, ejecuta en trinchera.
- **Honestidad incómoda** — dice que hay un problema estructural antes que vender un parche;
  nunca agresiva, viene con la solución al lado.
- **Obsesión por la prueba** — cada afirmación con dato, caso o mecanismo causal (converge con
  "prueba > hype", `../modules/05`).
- **Impaciencia productiva** — critica el status quo solo cuando ya tiene la alternativa funcionando.
- **Profundidad accesible** — un CMO y un CFO entienden lo mismo en la primera lectura.
- **Generosidad intelectual con dirección** — comparte frameworks como prueba de capacidad.

## Cómo suena / cómo NO suena

- **Suena como:** un director de estrategia que construyó el sistema que opera. Técnico cuando
  hace falta, directo siempre. **No decora. No rellena. Cada oración tiene un trabajo.**
- **NO suena como:** consultora Big 4 (abstracción sin aterrizar) · startup bro ("hacks",
  "growth" como muletilla) · agencia tradicional (se esconde tras la creatividad) · manual
  corporativo.
- **Registro:** profesional-directo. **Tuteo siempre** ("usted" solo en legales/contratos).
  **Sin voseo**, sin modismos argentinos. Vocabulario técnico cuando aporta precisión; nunca
  jargon por jargon.

## Tono por contexto (la voz no cambia; el tono sí)

| Contexto | Tono | Densidad |
|---|---|---|
| UI operativa interna (Agency/Admin) | el más directo y técnico, sin performance | lo necesario |
| UI de cara al cliente (Dashboard/360) | profesional, cálido sin ser blando, transparente | conciso; dato primero |
| Emails del sistema | un partner que está de tu lado pero no te dice que sí a todo | 2–4 oraciones |
| Landing / marketing | conciso, con filo; cada frase compite por su lugar | 1–2 oraciones |

**Patrón mental:** ¿estoy *instruyendo* (UI interna), *demostrando con datos* (UI cliente), o
*condensando con filo* (marketing)? La respuesta define el tono.

## Slogan / tagline

- Tagline de marca: **"Empower your Growth"** (`src/config/efeonce-brand.ts`). No lo reescribas ni
  lo traduzcas ad-hoc; es SSOT. Nota: Efeonce ≠ Greenhouse — respeta la arquitectura de marca
  (doctrina en `efeonce-agency`).
- **Dónde va en un brochure o una propuesta** (operador, 2026-09-27): **nunca en la portada** (ahí habla la voz
  pregunta–respuesta de la línea gráfica). En la contraportada de una **propuesta comercial** es el mensaje
  principal (la propuesta llega después de conversar); en la de un **brochure**, el mensaje es «¿Conversamos? Cuando
  quieras.» y el eslogan firma debajo. Norma: `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md`
  §4.6.

## Banco de pares pregunta–respuesta aprobados (línea gráfica «La órbita»)

La voz de la línea gráfica es **pregunta real del cliente → respuesta de 1–3 palabras** que cierra con la esfera (se
escribe sin punto en el dato; el punto lo pone la esfera) y mide ≥ 3× la pregunta, más una evidencia con **una**
palabra en negrita. Estos pares están **aprobados por el operador** dentro de su pieza; fuera de ella vuelven a ser
candidatos. Fuente exacta: `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`
(slots `question` / `answer`) y `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6.
**Única excepción al largo** (TASK-1928, `voice.maxWords` por receta en AXIS): `decision-testimonial` cita al cliente
textual y admite hasta seis palabras; el resto de las recetas sigue en tres.

**Portadas y cierres (2026-09-27):** ¿Qué hace Efeonce? **Crecer.** (brochure general y sección de servicios) ·
¿Cómo crecemos en 2027? **Con foco.** (propuesta; evidencia «Preparada para **[Cliente]** · Confidencial») ·
¿Conversamos? **Cuando quieras.** (contraportada de brochure) · por línea: ¿Lo medimos? **Siempre.** · ¿Quién crea mi
contenido? **Tu squad.** · ¿Te encuentra la IA? **Visible.** · ¿Dónde invierto? **Donde rinde.** · ¿Y el reporte del
viernes? **Ya lo viste.**

**Láminas del deck (las 69 aprobadas el 2026-09-27):**

| Lámina | Par |
|---|---|
| Tríptico | ¿Cómo trabajamos? **Escucha. Crea. Mide.** (una palabra por toma, cada una con su esfera) |
| Cotización (tabla y escena) | ¿Cómo se cotiza? **Por capacidad.** |
| Cotización en vivo | ¿Cuánto cuesta? **Sin letra chica.** |
| Próximos pasos | ¿Y ahora qué sigue? **Empecemos.** |
| Sección partida, esquina abajo | ¿Cuánto tarda tu campaña? **En días.** |
| Sección partida, panel a la derecha | ¿Qué responde la IA? **Tu marca.** |
| Secciones (lente, clásica, a sangre, partida) | ¿Quién decide el corte? **El dato.** |
| Quiénes somos · por qué lo hacemos | ¿Quiénes somos? **Un solo equipo.** · ¿Por qué lo hacemos así? **Contigo.** |
| Equipo · stack · sección del equipo | ¿Quién trabaja en tu cuenta? **Personas reales.** · ¿Con qué trabajamos? **Con lo mejor.** · ¿Quién hace crecer tu marca? **Este equipo.** |
| Texto · viñetas · agenda | ¿Con quién crece tu marca? **Contigo.** · ¿Qué recibes al trabajar con nosotros? **Un sistema.** · ¿Qué veremos hoy? **Cinco temas.** |
| Día a día y «vívelo» | ¿Cómo es un día con nosotros? **Así.** · ¿Cómo trabajamos contigo? **Así.** · ¿Cómo avanza tu proyecto? **A la vista.** · ¿Cómo va? **En vivo.** |
| Método | ¿Qué pasa al empezar? **Movimiento.** · ¿Quién hace el trabajo? **Personas y agentes.** · ¿Te recomienda la IA? **Capa por capa.** · ¿Cómo te ve la IA? **Mídelo.** · ¿Listos para la carrera? **Vamos.** |
| Prueba | ¿Cuántos cortes pasan a la primera? **A la primera.** · ¿Quién confía en nosotros? **Marcas líderes.** · ¿Con quién construimos? **Con los grandes.** · ¿Y si no funciona? **Empiezas chico.** · ¿Qué cambió con Sky? **Más rápido.** · ¿Cuánto más rápido? **Un cuarto.** · ¿Por qué Efeonce? **Por esto.** |
| Propuestas por línea | ¿Cómo escalas tu contenido? **Con sistema.** · ¿Para quién es tu web? **Para todos.** · ¿Tu CRM vende contigo? **Con agentes.** · ¿Tu marca en cada pantalla? **En todas.** · ¿Te encuentra la IA? **Visible.** |
| Hoja de contactos · respiro | ¿Cuál sale al cliente? **Ésta.** · ¿Y el cliente? **Aprobó.** |

**Cómo se usan:** un par se toma con su lámina; si la pregunta o la evidencia no caben (cruzan la órbita o al sujeto),
**se acorta la frase**, nunca se mueve la composición. Un par con una promesa medible («En días», «Un cuarto») exige su
prueba con fuente en la lámina o en la siguiente. Un par nuevo se propone como candidato y lo aprueba el operador.

## Reglas duras

- **NUNCA** copy que no se rastree a una de las 7 creencias (sería genérico).
- **NUNCA** decorar/rellenar: cada oración tiene un trabajo (obsesión por concisión, `../modules/07`).
- **NUNCA** afirmar sin prueba (obsesión por la prueba es parte de la voz).
- **NUNCA** voseo/modismos argentinos; tuteo es-CL neutro.
- **NUNCA** usar `con manzanitas`, `te lo explico con manitas` u otros running motifs de Julio en
  copy institucional o de terceros, salvo cita textual atribuida.
- **SIEMPRE** validar el wording final de superficies de producto con `greenhouse-ux-writing`.
