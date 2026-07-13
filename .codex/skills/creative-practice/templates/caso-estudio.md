# Template — Caso de estudio *(INTERNO · se abre el DÍA 1 del engagement, no al final)*

> 🔴 **La verdad que hace existir este archivo:**
> ## Hoy NO tenemos ni un solo caso creativo formalizado con métrica de negocio verificable y autorización escrita. Ninguno.
> *(`efeonce/ESTADO_ACTUAL.md` § 6.)* **No es porque no hicimos el trabajo. Es porque no lo diseñamos como caso.**
>
> ```
> CASO = métrica verificable  +  relación sana  +  autorización ESCRITA
>        (con baseline día 0)     (no churneado)    (firmada, no "de palabra")
> ```
>
> ### 🔴 Un mockup lindo en un deck NO es un caso.
> Es una imagen. **No prueba que salió, ni que sirvió, ni que el cliente nos deja contarlo.**
> **Mostrar mockups como si fueran casos es la forma más rápida de que un comité te descubra.**
>
> 🎯 **Y lo único que NO se puede recuperar después es el baseline.** Si no lo congela la semana 0, en el mes 9
> va a tener un cliente contento y **cero forma de demostrar por qué.**
>
> **Fuente:** `modules/07_PRUEBA.md` §§ 2 y 6 · `efeonce/ESTADO_ACTUAL.md` § 6.

---

## 0 · Metadata

| | |
|---|---|
| **Cliente** | `{{cliente}}` |
| **Engagement** *(nombre del servicio / squad)* | `[completar]` |
| **Tipo** | ☐ Squad creativo ☐ Sample Sprint ☐ Proyecto acotado ☐ `[otro]` |
| 🔴 **Fecha de inicio del engagement** | `{{YYYY-MM-DD}}` |
| 🔴 **Fecha en que se abrió ESTE archivo** | `{{YYYY-MM-DD}}` ← **debe ser semana 0. Si es posterior, anote por qué** |
| **Owner del caso** *(persona, no equipo)* | `[completar]` |
| **Owner del brief del lado del cliente** *(nombre)* | `[completar]` |
| **Sponsor / champion** *(quién nos defiende internamente)* | `[completar]` |

🔴 **Si este archivo se abre en el mes 6, ya perdió el baseline. Ábralo igual, pero declárelo:**
`[El baseline no se congeló el día 1 porque: ______. Consecuencia: este caso no podrá afirmar un delta.]`

---

## 1 · 🔴 La autorización — **bloqueante**

> 🔴 **La autorización se pide en el CONTRATO, no un año después.**
> Pedirla al final es pedirle un favor a alguien que ya no le debe nada — y encima lo obliga a pasar por su
> legal, su comunicación y su marca **sin ningún incentivo.** La respuesta por defecto es *"déjame
> consultarlo"*, que en corporativo significa **no**.
>
> **Pedirla en el contrato cuesta un párrafo. Pedirla después cuesta el caso.**

| | |
|---|---|
| **¿Hay cláusula de referenciabilidad en el SOW/contrato?** | ☐ **Sí** ☐ **No** → 🔴 **ver el bloqueo de abajo** |
| **Cláusula / sección** | `[nº y nombre]` |
| **Fecha de firma** | `[YYYY-MM-DD]` |
| **Quién firmó** *(nombre + cargo)* | `[completar]` |
| **Qué autoriza exactamente** | ☐ Nombrar al cliente ☐ Usar su logo ☐ Mostrar piezas ☐ Publicar métricas de delivery ☐ Publicar métricas de negocio ☐ Testimonio citable |
| **Dónde se puede mostrar** | ☐ Deck de venta ☐ Sitio público ☐ Redes ☐ Licitaciones ☐ Prensa |
| **Vigencia** | `[hasta cuándo]` |
| **Restricciones declaradas por el cliente** | `[completar]` |

### 🔴 BLOQUEO — si la casilla de arriba dice "No"

> 🔴 **SIN AUTORIZACIÓN ESCRITA, ESTE ARCHIVO NO PUEDE SALIR DE EFEONCE.**
> No va a un deck. No va a una propuesta. No va a una licitación. No se "menciona en una reunión".
> **Ni siquiera "sin nombrar al cliente pero que se entienda cuál es".**

**Acción inmediata:** `[quién pide la cláusula]` → `[para cuándo]`
**Redacción de la cláusula:** → **`legal-privacy-ip-operator`.** *(Alcance comercial — qué mostramos, dónde,
con qué logo — se decide en `modules/07_PRUEBA.md` § 2; la letra la escribe legal.)*

---

## 2 · 🔴 El punto de partida — **el baseline** *(solo se puede capturar el día 1)*

> 🎯 **Esto es lo único irrecuperable del template.** Después de la semana 2, estos números ya están
> contaminados por nuestro propio trabajo. **Sin baseline no hay caso: hay anécdota.**
>
> **Los números salen del diagnóstico de la reunión de la cuña** *(`templates/guion-reunion-diagnostico.md`,
> preguntas 1-4)*. **Si no los anotó ahí, pregúntelos AHORA — semana 0, antes de tocar una pieza.**

### Cómo estaban ANTES *(declarado por el cliente — anote quién lo dijo)*

| Dimensión | Valor al día 0 | Quién lo declaró | ¿Verificable? |
|---|---|---|---|
| **Rondas de cambio por pieza** *(RpA)* | `[X]` | `[nombre]` | ☐ Sí ☐ Estimado ☐ *"no lo medían"* |
| **Cycle time** *(días de brief a publicación)* | `[X]` | `[nombre]` | ☐ Sí ☐ Estimado ☐ *"no lo medían"* |
| **Entregas a tiempo** *(OTD%)* | `[X]%` | `[nombre]` | ☐ Sí ☐ Estimado ☐ *"no lo medían"* |
| **Piezas trabadas esperando aprobación** | `[X]` | `[nombre]` | ☐ Sí ☐ Estimado ☐ *"no lo medían"* |
| **Volumen mensual** *(piezas / formatos / marcas)* | `[X]` | `[nombre]` | ☐ Sí ☐ Estimado |
| **Tamaño y saturación del equipo interno** | `[X]` | `[nombre]` | ☐ Sí ☐ Estimado |

🎯 **Si el cliente contestó *"no lo medíamos"* — ANÓTELO ASÍ, literal. Es un hallazgo, no un hueco.**
*"No tenían el número"* es, en sí mismo, la mitad del caso.

### 🔴 El denominador declarado *(sin esto, cualquier delta es discutible)*

> **Ejemplo:** *"Piezas de la marca X, canales social + web, entre marzo y agosto de 2026."*

`[completar — sea específico. Un denominador vago es como te desarman el caso en un comité.]`

---

## 3 · Qué hicimos — **el método, no el mockup**

> 🔴 **Esta sección NO es una galería.** Es lo que sustituye al portafolio mientras no tengamos casos —
> y es **más verificable que un reel.** *(→ `modules/07_PRUEBA.md` § 3, nivel 2.)*

| Qué | Detalle |
|---|---|
| **El squad** *(roles, dedicación en FTE, seniority)* | `[completar — sale de `greenhouse-talent-people-operator` → `templates/squad-blueprint.md`]` |
| **El RACI** *(quién decide, quién ejecuta, quién aprueba)* | `[completar]` |
| **El gobierno del alcance** *(rondas incluidas, change order, derechos de uso)* | `[completar]` |
| **Qué cambiamos de su operación** *(el owner del brief, el reloj de feedback, el tope de rondas…)* | `[completar]` |
| **Las lanes / disciplinas del pod** | `[completar]` |
| **Cadencia de gobierno** *(QBR, reviews, snapshots)* | `[completar]` |

🔴 **La versión INTERNA del squad blueprint NUNCA se entrega al cliente ni se pega acá si este archivo va a
circular.** Trae **loaded cost y piso de negociación.** → `ANTIPATTERNS.md` § "El pecado del arbitraje".

---

## 4 · Las métricas

### 4.1 · ✅ Delivery *(nuestras, medidas en el portal — son las que SÍ podemos afirmar)*

| Métrica | Día 0 *(baseline)* | Mes 3 | Mes 6 | Mes 12 | Óptimo del registry |
|---|---|---|---|---|---|
| **RpA** *(rondas por pieza)* | `[ ]` | `[ ]` | `[ ]` | `[ ]` | **0 – 1,5** |
| **OTD%** *(entrega a tiempo)* | `[ ]` | `[ ]` | `[ ]` | `[ ]` | **90 – 100%** |
| **FTR%** *(primera entrega correcta)* | `[ ]` | `[ ]` | `[ ]` | `[ ]` | **80 – 100%** |
| **Cycle time** *(días)* | `[ ]` | `[ ]` | `[ ]` | `[ ]` | **0 – 7** |
| **Throughput** | `[ ]` | `[ ]` | `[ ]` | `[ ]` | política interna |
| **Stuck assets** | `[ ]` | `[ ]` | `[ ]` | `[ ]` | **steady 0** |

🔴 **Declare la política de confianza de cada número.** *(`metric-trust-policy.ts`: sample size mínimo **10**;
`qualityGateStatus` healthy / degraded / broken.)* **Un mes con muestra insuficiente NO se reporta como dato
duro.** Marque: ☐ healthy ☐ degraded ☐ broken.

🎯 **El caso creativo que SÍ podemos construir hoy es exactamente este:**
> *"Su operación creativa pasó de `[X]` rondas / `[Y]` días / `[Z]%` a tiempo → a `[X']` / `[Y']` / `[Z']` —
> **medido en su propio portal, no en el nuestro.**"*
> **Ese caso es nuestro, es verificable, y no lo tiene nadie.**

### 4.2 · ⚠️ Negocio del cliente *(SOLO si lo autoriza Y es verificable)*

> 🔴 **Regla dura 10 del `SKILL.md`: NUNCA prometemos ni atribuimos una métrica de negocio del cliente**
> *(ventas, awareness, share, ROI)*. **No la controlamos.**
> ⚠️ **Reportar un número de negocio del cliente en un caso NO es lo mismo que atribuírnoslo.**
> Si va, va **como contexto del cliente, con su fuente y su denominador — y sin la palabra "gracias a".**
> 🔴 **`SOURCES.md` § Datos que NO se citan: cualquier ROI de creatividad atribuido a nuestro trabajo. No
> tenemos modelo de atribución.**

| Métrica | Valor | Fuente *(del cliente)* | ¿Autorizada por escrito? | ¿Verificable por un tercero? |
|---|---|---|---|---|
| `[ ]` | `[ ]` | `[ ]` | ☐ Sí ☐ No → **no va** | ☐ Sí ☐ No → **no va** |
| `[ ]` | `[ ]` | `[ ]` | ☐ Sí ☐ No → **no va** | ☐ Sí ☐ No → **no va** |

🔴 **Si una fila no tiene las dos casillas en "Sí": se borra. No se "matiza".**

---

## 5 · 🔴 Lo que salió mal, y qué aprendimos — **sección OBLIGATORIA**

> ## Un caso sin fricción no es creíble. Es un folleto.
> **Todo comprador enterprise ya vio un reporte de agencia todo verde mientras el proyecto se caía.**
> 🎯 **Un mes malo, mostrado y explicado, construye más confianza que tres meses buenos escondidos.**
> *(Y el cliente ya lo vio en su propio dashboard — esconderlo solo lo convierte a usted en el que oculta.)*

| # | Qué se trabó | Causa raíz | ¿De quién fue? | Qué cambiamos | ¿Se resolvió? |
|---|---|---|---|---|---|
| 1 | `[ ]` | `[ ]` | ☐ Nuestra ☐ Del cliente ☐ Compartida | `[ ]` | ☐ Sí ☐ No |
| 2 | `[ ]` | `[ ]` | ☐ Nuestra ☐ Del cliente ☐ Compartida | `[ ]` | ☐ Sí ☐ No |
| 3 | `[ ]` | `[ ]` | ☐ Nuestra ☐ Del cliente ☐ Compartida | `[ ]` | ☐ Sí ☐ No |

🔴 **Si la causa fue del lado del cliente, se cuenta como diagnóstico compartido — NUNCA como acusación.**
*(✅ Como espejo: "el 60% de los atrasos arrancó con feedback fuera del reloj — ¿cómo lo resolvemos juntos?"
🔴 Como arma: "no cumplimos porque ustedes se demoraron" → ganas la discusión, pierdes la cuenta.)*
🔴 **Y no cite `Attributable Lateness` como métrica madura: está en shadow, sin sign-off, y ASIGNA CULPA.**
*(→ `modules/11_METRICAS_COMPROMISO.md` § 5.)*

**La lección que se lleva la práctica:** `[completar — esto es lo que hace útil el archivo hacia adentro]`

---

## 6 · Las piezas *(con derechos de uso confirmados)*

> 🔴 **Antes de poner una pieza en un deck, verifique que TENEMOS derecho a mostrarla.**
> ✅ Recuerde: **el fee de creación y el fee de uso se cotizan por separado.** Que la hayamos hecho **no**
> significa que la podamos exhibir. *(Y si el cliente compró un buyout exclusivo, puede que explícitamente
> no podamos.)*

| # | Pieza | Canal / uso real | ¿Salió publicada? | ¿Podemos mostrarla? | Restricción |
|---|---|---|---|---|---|
| 1 | `[ ]` | `[ ]` | ☐ Sí ☐ No | ☐ Sí ☐ No | `[ ]` |
| 2 | `[ ]` | `[ ]` | ☐ Sí ☐ No | ☐ Sí ☐ No | `[ ]` |
| 3 | `[ ]` | `[ ]` | ☐ Sí ☐ No | ☐ Sí ☐ No | `[ ]` |

🔴 **Una pieza que NO salió publicada no va en el caso.** *(Eso es un mockup. Y un mockup no es un caso.)*
🔴 **Si la casilla "¿Podemos mostrarla?" está en No, no se muestra "solo en una reunión privada". No se
muestra.**

---

## 7 · La quote del cliente

> 🎯 **Se pide en un QBR BUENO, no en la renovación.** *(Mes 6-9.)*
> Pedirla cuando hay presión de presupuesto convierte un testimonio en una moneda de cambio — y se nota.

| | |
|---|---|
| **La cita, textual** | *"`[completar]`"* |
| **Quién la dijo** *(nombre + cargo)* | `[completar]` |
| **Fecha** | `[YYYY-MM-DD]` |
| **¿Autorizó por escrito que la citemos?** | ☐ **Sí** *(adjuntar evidencia)* ☐ No → 🔴 **no se cita** |
| **¿Autoriza que aparezca su nombre y cargo?** | ☐ Sí ☐ Solo cargo ☐ Anónima ☐ No |
| **Dónde autorizó usarla** | ☐ Deck ☐ Sitio ☐ Redes ☐ Licitaciones |

🔴 **Una quote "de palabra" no existe.** Si no está por escrito, **no se usa** — ni "parafraseada".

---

## 8 · Estado del caso

| Estado | Qué significa | ¿Se puede usar? |
|---|---|---|
| ☐ **Borrador** | Se abrió el archivo, hay baseline, falta todo lo demás | 🔴 **NO. Solo interno** |
| ☐ **En revisión con el cliente** | Se lo mandamos; esperamos su visto bueno | 🔴 **NO** |
| ☐ **Aprobado por el cliente** | El cliente aprobó el contenido, por escrito | ⚠️ **Solo lo que autorizó, donde lo autorizó** |
| ☐ **Publicable** | Autorización + métricas verificadas + piezas con derechos + relación sana | ✅ **Sí** |
| ☐ **Congelado** | El cliente churneó o la relación se rompió | 🔴 **NO SE CITA. Nunca.** *(Un caso de un cliente que se fue enojado es una bomba: el prospecto lo puede llamar.)* |

**Última actualización:** `{{YYYY-MM-DD}}` por `[quién]`
**Próxima revisión:** `[YYYY-MM-DD]`

---

## ✅ Checklist de publicabilidad — **las 3 condiciones, y son las tres**

- [ ] 🔴 **MÉTRICA VERIFICABLE** — ¿hay **baseline congelado el día 0** y **denominador declarado**?
      *(Sin baseline no hay caso: hay anécdota.)*
- [ ] 🔴 **RELACIÓN SANA** — ¿el cliente **sigue** con nosotros, o salió bien?
      *(El prospecto lo puede llamar. Y a veces lo hace.)*
- [ ] 🔴 **AUTORIZACIÓN ESCRITA** — ¿hay **cláusula firmada**, con alcance y vigencia?

**Y los filtros de honestidad:**

- [ ] 🔴 ¿Estoy insinuando **trabajo creativo donde hubo SEO**? *(SKY y Bresler son casos de **contenido/SEO**.
      El comité va a preguntar *"¿qué campaña le hicieron?"* — y ese silencio cuesta la cuenta.)*
- [ ] 🔴 ¿Hay algún **mockup presentándose como caso**?
- [ ] 🔴 ¿Estoy **apilando credenciales de fuentes distintas**? *("120+ empresas" + "80% de renovación" +
      "10 años" + "win rate 50%" vienen de fuentes **no reconciliadas** → `SOURCES.md` § Datos que NO se citan.
      **Cite una. Con su fuente.**)*
- [ ] 🔴 ¿Hay algún **ROI de creatividad atribuido a nuestro trabajo**? → **PARA. No tenemos atribución.**
- [ ] 🔴 ¿Menciono **BCS** *(data-empty)* o **Attributable Lateness** *(shadow)* como métricas maduras?
- [ ] 🔴 ¿Menciono superficies del portal que **no existen** *(`Creative Hub`, `ROI Reports`, `Exports`)*?
- [ ] ¿La sección **"lo que salió mal"** está **llena de verdad**, o la dejé vacía porque incomoda?
      *(Vacía = el caso no es creíble.)*

---

> ## 🔴 La regla que se olvida cuando el engagement va bien:
> ## El caso se arranca el DÍA 1. La autorización se pide en el CONTRATO. El baseline se congela ANTES de tocar una pieza.
> **Todo lo demás — las métricas, las piezas, la quote — se puede recuperar después.**
> **El baseline y la autorización, no.**
