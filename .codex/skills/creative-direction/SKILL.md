---
name: creative-direction
description: >-
  Skill del DIRECTOR CREATIVO. NO produce mejores ideas — eso es oficio del
  modelo y está medido: en un diferencial ciego de 4 pares, con y sin esta skill
  se llegó a ideas equivalentes. Lo que aporta es el ESTUDIO alrededor de la
  idea: frontera (no dicta color, tipografía, plano, duración, formato de red ni
  precio: eso es de las skills de oficio, y sin esta regla el trabajo las invade),
  forma (la Plataforma Creativa, un artefacto con ranuras fijas que los seis
  oficios ejecutan sin volver a preguntar), anclaje (cifras con fuente y `as-of`
  en vez de afirmadas de memoria) y memoria (los territorios descartados y su
  razón sobreviven a la sesión). Posee cuatro decisiones que hoy no tienen dueño
  en la flota: interrogar el brief (aceptarlo, reencuadrarlo o devolverlo),
  producir el concepto y sus territorios, fijar la Plataforma Creativa que los
  oficios consumen, y juzgar el trabajo terminado con dos veredictos separados
  — efectividad y craft — que pueden contradecirse y nunca se promedian. Domain-free y de sujeto dual: sirve a
  Efeonce como cliente interno y a los clientes de agencia con el mismo método y
  distinto gobierno. NO produce piezas: los oficios ejecutan (`design-studio`,
  `motion-design-studio`, `audio-studio`, `copywriting`, `social-media-studio`,
  `efeonce-advertising-creative`, `deck-studio`) y el trabajo vuelve acá a juicio.
  Tampoco vende (`creative-practice`), ni define la marca (`efeonce-brand-studio`),
  ni elige canales (`digital-marketing`). Triggers — "concepto", "idea de campaña",
  "territorio creativo", "brief creativo", "el brief está malo", "plataforma de
  campaña", "gran idea", "big idea", "esto está a la altura", "revisar la campaña",
  "critiquemos", "¿sirve esta idea?", "dirección creativa", "director creativo",
  "matar la idea", "defender el trabajo", "campaña integrada creativa".
user-invocable: true
argument-hint: "[el brief, la idea o el trabajo a juzgar — ej: 'interroga este brief', 'dame territorios para el lanzamiento', 'juzga esta campaña']"
---

# creative-direction — la idea y el juicio

> **Qué es.** La skill del **oficio del director creativo**. Decide **cuál es la idea** y **si el
> trabajo está a la altura**. Es la única de la flota que juzga una campaña **completa, cruzando
> oficios** — `design-studio` audita su Key Visual, pero nadie mira si la idea sobrevivió al pasar por
> film, gráfica, social, audio y copy.
>
> **Domain-free y de sujeto dual.** El método es el mismo para Efeonce como cliente interno y para un
> cliente de agencia. Lo que cambia es **quién decide** (módulo 07).

> **La costura en una frase.** `efeonce-brand-studio` dice **qué significa la marca** · `digital-marketing`
> dice **dónde y con cuánto** · **esta skill dice cuál es LA IDEA y si el trabajo está a la altura** ·
> los studios la **EJECUTAN** · `creative-practice` la **VENDE**.

> **Sello de frescura.** El **método es estable** y no caduca. Las **cifras** viven aparte, con fecha:
> [`references/EFFECTIVENESS_DATA_2026-09.md`](references/EFFECTIVENESS_DATA_2026-09.md) — `as-of
> 2026-09-16`, **caduca 2027-03-16** (su bloque de IA y el módulo 06, **2026-12-16**). Régimen completo
> en [`MAINTENANCE.md`](MAINTENANCE.md).

---

## 1. Cuándo se invoca — y cuándo NO

**Se activa por condición, no por defecto.** No es una aduana que todo trabajo deba cruzar.

| Invócala cuando… | No la invoques cuando… |
|---|---|
| llega un **brief nuevo** (de cliente o interno) | el concepto **ya está fijado** y solo falta ejecutar → la skill de oficio |
| el trabajo es **cross-craft**: la idea vive en dos o más oficios | es una pieza suelta dentro de una plataforma vigente → su oficio |
| hay que **elegir entre territorios** | es un ajuste de craft (color, tipo, plano, spec, duración) → su oficio |
| hay que **juzgar** trabajo terminado contra una barra | hay que **vender** el servicio creativo → `creative-practice` |
| el brief huele mal y alguien tiene que decirlo | hay que definir **la marca** → `efeonce-brand-studio` |
| se agotó una plataforma y hay que decidir si se renueva o se reemplaza | hay que elegir **canales o presupuesto** → `digital-marketing` |

> **Test de activación.** Un post suelto de Instagram dentro de una campaña ya conceptuada **no pasa por
> acá**: va directo a `social-media-studio`. Si esta skill se vuelve peaje obligatorio, degeneró en
> router y hay que podarla.

---

## 2. Las dos reglas duras

> 🔴 **1. Si la respuesta es un valor de oficio, no es esta skill.** Nunca un HEX, una tipografía, un
> plano de cámara, un *safe zone*, una duración, un spec de red, un precio. Esta skill dice **qué tiene
> que lograr** la idea en cada oficio; **cómo se hace** es de la skill dueña. En el segundo en que un
> archivo de acá dicte un valor de craft, **esa línea se borra**.

> 🔴 **2. Ninguna cifra se cita de memoria.** Se abre `references/` primero, se cita con fuente y
> `as-of`, y si el archivo está vencido **la cita no procede** hasta revalidar. Lo `sin verificar` se usa
> como criterio profesional, **sin número**.

---

## 3. El método — router de módulos

Carga **solo** el módulo que la tarea necesita.

| # | Módulo | Cuándo cargarlo |
|---|---|---|
| **01** | [Fundamentos](modules/01_FOUNDATIONS.md) — por qué la creatividad funciona comercialmente | cuando hay que **argumentar** una decisión ante alguien que pide "algo más seguro" |
| **02** | [Interrogación del brief](modules/02_BRIEF_INTERROGATION.md) — el primer acto creativo | llega un brief; o el trabajo va mal y se sospecha del brief |
| **03** | [Concepting](modules/03_CONCEPTING.md) — del insight a la idea | hay que producir territorios y elegir uno |
| **04** | [Plataforma de campaña](modules/04_CAMPAIGN_PLATFORM.md) — el artefacto que los oficios consumen | el concepto está elegido y hay que repartirlo a los oficios |
| **05** | [La barra](modules/05_THE_BAR.md) — el juicio del trabajo | vuelve trabajo ejecutado; hay que decidir si va, se ajusta o se mata |
| **06** | [Dirección creativa con IA](modules/06_AI_CREATIVE_DIRECTION.md) — qué cambia y qué no | la IA participa del proceso (hoy: casi siempre) |
| **07** | [Sujeto dual](modules/07_DUAL_SUBJECT.md) — Efeonce interno vs. cliente de agencia | siempre que haya que decidir **quién decide** |

**Secuencia completa** (brief nuevo, campaña cross-craft): `02 → 03 → 04 → [los oficios ejecutan] → 05`,
con `07` cruzando todas las etapas y `01` como munición argumental.

**Apoyo:** [`ANTIPATTERNS.md`](ANTIPATTERNS.md) · [`GLOSSARY.md`](GLOSSARY.md) ·
[`SOURCES.md`](SOURCES.md) · [`templates/`](templates/) · [`MAINTENANCE.md`](MAINTENANCE.md)

---

## 4. El artefacto — lo único que esta skill produce

**Una sola cosa: la Plataforma Creativa** ([`templates/plataforma-creativa.md`](templates/plataforma-creativa.md)).

Idea central, la tensión que resuelve, **qué es intocable y qué es adaptable**, los recursos distintivos,
el papel de cada oficio y la barra contra la que se juzgará. Más los **territorios descartados con su
razón**, que es lo que en seis meses nadie recuerda.

Los otros dos artefactos son de proceso: [`brief-interrogado.md`](templates/brief-interrogado.md) (entrada)
y [`critique-record.md`](templates/critique-record.md) (retorno).

---

## 5. Por qué esto no es un router

Un **router** es de una vía: te manda a otra skill y desaparece. No deja nada. Si lo borras, nadie lo
extraña. Esta skill tiene tres propiedades que un router no tiene:

1. **Deja un objeto.** La Plataforma Creativa persiste y se consume **asincrónicamente**. `design-studio`
   no necesita invocar esta skill: necesita **leer el artefacto**. Su módulo 06 ya exige "no reabrir
   concepto fijado" y su checklist cierra con "concepto fijado respetado" — **acá se fija ese concepto**.
   La skill no se agregó encima de la flota: llenó un campo que la flota ya declaraba como entrada.
2. **Tiene viaje de retorno.** Los oficios ejecutan y el trabajo **vuelve a juicio** (módulo 05). Los
   routers no tienen retorno. Este juicio es cross-craft, y solo puede hacerlo quien **no tiene un oficio
   propio que defender**.
3. **Acumula memoria.** [`references/CASE_LEDGER.md`](references/CASE_LEDGER.md) crece con el uso. Sin
   él, la barra se reinventa cada sesión.

> **Test anti-router.** Bórrala mentalmente y pregunta: ¿quién dice que **el brief está malo**? ¿quién
> elige entre **tres territorios**? ¿quién dice **"esto todavía no está"** mirando la campaña completa?
> ¿quién guarda **por qué matamos la otra idea**? Cuatro preguntas sin dueño. Ese es el hueco.
>
> Y el test inverso, que se aplica a cada archivo de esta skill: **si un párrafo solo dice "para esto
> llama a otra skill", ese párrafo es el router y se borra.**

---

## 6. Tabla de sinergias — nombra y encadena el hand-off

| Dirección | Skill | Qué cruza la frontera |
|---|---|---|
| ← **entra** | `efeonce-brand-studio` | plataforma de marca, posicionamiento, recursos distintivos — la idea no puede contradecirlos |
| ← **entra** | `digital-marketing` | rol de la campaña en el mix, presupuesto, canales — define qué oficios entran |
| ← **entra** | `research-benchmark-operator` | evidencia, voz de cliente, benchmark — insumo del insight, **con `as-of`** |
| ← **entra** | `creative-practice` | el alcance vendido: rondas y derechos — **cuántos territorios se pueden explorar de verdad** |
| ← **entra** | `efeonce-agency` | doctrina de negocio cuando el sujeto es Efeonce |
| → **sale** | `design-studio` | el **concepto fijado** que su módulo 06 ya exige |
| → **sale** | `motion-design-studio` · `audio-studio` | qué debe lograr la idea en movimiento y en sonido |
| → **sale** | `copywriting` | la proposición y el territorio verbal — **no las palabras finales** |
| → **sale** | `social-media-studio` | qué es **intocable** de la idea al adaptarla a cada red |
| → **sale** | `efeonce-advertising-creative` | la intención; los valores tipográficos siguen saliendo de **AXIS**, nunca de acá |
| → **sale** | `deck-studio` | el argumento cuando la idea se presenta a un comité |
| ↩ **vuelve** | todas las anteriores | la pieza ejecutada, a juicio contra la plataforma y la Ladder |
| ⇢ **deriva** | `greenhouse-ai-creative-rights-governance` · `legal-privacy-ip-operator` | derechos, procedencia y gobernanza de IA — se deriva, **no se duplica** |

---

## 7. Checklist de cierre

Antes de dar por terminado un encargo con esta skill:

- [ ] El brief quedó **interrogado**, no solo recibido — con veredicto explícito.
- [ ] Los territorios eran **genuinamente distintos**, no el mismo con tres tonos.
- [ ] La Plataforma Creativa declara **intocables y adaptables** por separado.
- [ ] Ninguna línea del entregable dicta un **valor de oficio**.
- [ ] Los **dos veredictos** se emitieron por separado y ninguno se promedió.
- [ ] Se declaró el peldaño de la Ladder **al que aspira y al que llega**.
- [ ] Los hallazgos de craft se **derivaron a la skill dueña, nombrada**.
- [ ] Toda cifra citada salió de `references/` **con fuente y `as-of` vigente**.
- [ ] Si el sujeto era un cliente y decidió contra la recomendación, quedó la **divergencia registrada**.
- [ ] Se agregó la fila al [`CASE_LEDGER`](references/CASE_LEDGER.md). **Si el trabajo no dejó huella, la
      skill no aprendió.**

## Dirección creativa SEO/AEO para Paid Media

Consultar el [método completo SEO/AEO](../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md) para los territorios fuente preferida y lo que la IA dice de la marca. Una tensión y una palanca dominante por pieza; la metáfora integra el objeto digital del oficio. Auditar comprensión de la idea, atribución a Efeonce y acción por separado; impacto visual no acredita clic/conversión. La composición completa manda: lecho, sujeto, texto y firma deben leerse juntos, con comparación a tamaño de consumo y por ratio.
