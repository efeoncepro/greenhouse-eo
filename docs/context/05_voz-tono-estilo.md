# 05 · Voz, Tono y Estilo

> Para un agente: esto gobierna **todo el texto visible en Greenhouse** —labels, botones, estados vacíos, mensajes de error, tooltips, emails del sistema, nombres de secciones. El copy es producto. Un microcopy genérico rompe la marca tanto como un bug rompe la función.

## Punto de partida

La voz de Efeonce no nace de adjetivos genéricos ("profesional y cercano") sino de **creencias específicas sobre el mercado**. Todo texto que escribas debería poder rastrearse a una de las creencias contrarias.

## Las 7 creencias contrarias (el ADN narrativo)

1. **El marketing sin sistema es caro accidentalmente.** El problema no es creatividad ni presupuesto: es arquitectura.
2. **La integración real es operativa, no organizacional.** Estar bajo un mismo holding es cohabitación; integración es que los datos de Evolve alimenten el brief de Express sin copy-paste humano.
3. **Las vanity metrics son un acuerdo de silencio entre agencia y cliente.** Efeonce rompe ese pacto.
4. **La IA sin gobernanza produce más caos, no menos.**
5. **La creatividad que no se mide no se defiende.** Medir no es enemigo de la creatividad: es su escudo.
6. **El funnel está jubilado.** La gente circula, no hace fila.
7. **La transparencia operativa no es un diferenciador, es un mínimo.** ← *Esta es la que Greenhouse encarna directamente.*

## Personalidad (constante, no cambia entre canales)

1. **Arquitecto con las manos sucias** — piensa en sistemas, ejecuta en trinchera.
2. **Honestidad incómoda** — prefiere decir que hay un problema estructural a vender un parche bonito. Nunca agresiva; viene con la solución al lado.
3. **Obsesión por la prueba** — cada afirmación con dato, caso o mecanismo causal.
4. **Impaciencia productiva** — critica el status quo solo cuando ya tiene la alternativa funcionando.
5. **Profundidad accesible** — un CMO y un CFO entienden lo mismo en la primera lectura, sin perder el matiz.
6. **Generosidad intelectual con dirección** — comparte frameworks; la generosidad es prueba de capacidad.

## Voz

**Suena como:** un director de estrategia que construyó el sistema que opera. Autoridad porque diseñó la arquitectura, no porque leyó sobre ella. Técnico cuando hace falta, directo siempre. **No decora. No rellena. Cada oración tiene un trabajo.**

**NO suena como:** consultora Big 4 (abstracciones elegantes sin aterrizar) · startup bro ("hacks", "growth") · agencia tradicional (se esconde tras la creatividad para no hablar de resultados) · manual corporativo que nadie lee.

**Registro:** profesional-directo. **Tratamiento "tú" siempre** en comunicación de marca y de cliente (el "usted" solo en legales/contratos, por requisito formal). Vocabulario técnico cuando aporta precisión; lenguaje claro cuando el tecnicismo solo sería barrera. Nunca jargon por jargon.

---

## Tono según contexto (la voz no cambia; el tono sí)

Greenhouse vive principalmente en dos contextos: **docs internos/UI operativa** y **comunicación con clientes**.

| Contexto | Tono | Densidad |
|---|---|---|
| **UI operativa interna (Agency, Admin)** | El más directo y técnico. Sin performance. Claridad operativa. | Lo necesario. |
| **UI de cara al cliente (Dashboard, 360)** | Profesional, cálido sin ser blando. Transparente sobre problemas, proactivo con soluciones. | Conciso. El dato primero, la interpretación después. |
| **Emails del sistema / notificaciones** | Como un partner que está de tu lado pero no te dice que sí a todo. | 2–4 oraciones. |
| **Landing / marketing del producto** | Conciso, con filo. Cada frase compite por su lugar. | 1–2 oraciones. |

**Patrón mental al escribir cualquier texto:** ¿estoy *instruyendo* (UI interna), *demostrando con datos* (UI cliente), o *condensando con filo* (marketing)? La respuesta define el tono.

---

## Microcopy de Greenhouse: ejemplos aplicados

Cómo aterriza la voz en el portal (úsalos como calibración):

| Situación | ❌ Genérico | ✅ Efeonce |
|---|---|---|
| Estado vacío de proyectos | "No hay proyectos para mostrar." | "Aún no hay proyectos en este espacio. Cuando se cree el primero, verás aquí su RpA y OTD% en vivo." |
| Métrica de impacto | "Buen desempeño este mes 🎉" | "OTD% 94% este mes (+6 vs. anterior). 2 activos en riesgo requieren atención." |
| Error de sync | "Algo salió mal." | "No pudimos sincronizar con HubSpot. Reintentamos en 10 min; tus datos no se perdieron." |
| Onboarding/login | "Bienvenido a la plataforma." | "Este es tu espacio. Aquí ves tu operación con Efeonce en tiempo real —no el reporte del viernes." |
| Tooltip de RpA | "Reviews per Asset." | "Rounds per Asset: rondas de revisión promedio por entregable. Menos es mejor." |

---

## Estilo: reglas de ejecución

**Do's**
- Frases cortas en el punto clave. Contexto antes, remate limpio.
- Datos concretos: "+127% tráfico orgánico", no "mejora significativa".
- Contrastes que iluminan: estructura "no es X, es Y".
- "Nosotros" para capacidad; "tú" para problema/beneficio del cliente.
- Deja que el silencio trabaje: no todo necesita tres párrafos.
- Profundidad accesible: si un CFO y un community manager no entienden lo mismo a la primera, reescribe.

**Don'ts**
- Superlativos vacíos: "el mejor", "líder", "innovador", "de clase mundial".
- Promesas sin mecanismo: si dices que funciona, explica por qué.
- Lenguaje de agencia genérica: "soluciones integrales", "acompañamiento estratégico", "impulsamos tu marca".
- Disculparse por cobrar bien.
- Humor que trivialice (el de Efeonce, cuando aparece, es quirúrgico).
- El running motif **🍏🍏🍏 (manzanitas)** en voz institucional: **es territorio exclusivo de la marca personal de Julio. No va en Greenhouse.**

**Non-negotiable:** toda afirmación de impacto debe poder rastrearse a un dato o caso.

---

## Marca visual (para UI)

Design System: **AXIS** (multi-marca Efeonce/Kortex/Verk), sobre MUI v5/Vuexy. Color: acento primario **azul `#0375DB`** (`primary`; dark `#024C8F`) + secundario **verde `#6EC207`**; el eslogan Efeonce va en **gris `#848484`**. Tipografía: **Poppins** (display/títulos) · **Geist** (cuerpo y numéricos con `tabular-nums`, nunca monospace); pesos 400/600/700/800. Estos son los tokens canónicos: resolverlos siempre desde `theme.axis.*` / `theme.palette.*` y el contrato `DESIGN.md` (nada inline; no introducir paletas/fuentes nuevas sin pasar por el Design System AXIS).

---

## Ejecución en runtime (UX writing)

Este doc fija **la voz y el registro** (estratégico, prosa-doctrina). Se **ejecuta** como strings tokenizados y enforceados en el runtime — esa capa táctica es la skill `greenhouse-ux-writing` + el sistema de copy. Misma relación que marca visual → AXIS/`DESIGN.md`: 05 es la fuente de voz, UX writing su capa de ejecución; ninguno reemplaza al otro.

- **Nomenclatura de producto + navegación** → `src/config/greenhouse-nomenclature.ts`.
- **Microcopy funcional compartido** (CTAs, estados, loading, empty, aria, errores, feedback) → `src/lib/copy/dictionaries/es-CL/*` (`import { getMicrocopy } from '@/lib/copy'`).
- **Copy de dominio reusable** → `src/lib/copy/<dominio>.ts`.
- **Enforcement mecánico** → lint `greenhouse/no-untokenized-copy` (bloquea literales no tokenizados) + reglas es-CL de la skill (tuteo, "Guardar"≠"Salvar", verbo+objeto, error = qué+por qué+cómo arreglar, nunca un número sin contexto).

**Crosswalk contexto → tono operacional** (un solo eje, dos resoluciones — el contexto de marca de este doc se expande en el tone map de la skill, no compite con él):

| Contexto (este doc) | Tono operacional (skill `greenhouse-ux-writing`) |
|---|---|
| UI operativa interna | loading · estados neutrales |
| UI de cara al cliente | success · error · empty · data-alert (el dato primero, la interpretación después) |
| Emails / notificaciones | billing/legal (formal) · toast · info |
| Landing / marketing | onboarding · copy de alto impacto |

---

*Fuente: Brand Voice, Tone & Personality v1.0 + Editorial Style Guide v1.0 + Brand Guideline v1.1. Marca visual canónica: Design System **AXIS** + `DESIGN.md` (cuando el Brand Guideline difiera de los tokens vigentes, prevalece AXIS/runtime). Ejecución de copy: skill `greenhouse-ux-writing` + `src/lib/copy/*` + `src/config/greenhouse-nomenclature.ts`. Última verificación de drift contra runtime: 2026-06-09 (TASK-1064).*
