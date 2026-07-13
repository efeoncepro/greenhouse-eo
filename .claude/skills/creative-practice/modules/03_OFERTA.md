# 03 · La oferta — qué vendemos, exactamente

> **La tesis que ordena todo el módulo:**
> ## No vendemos piezas. Vendemos capacidad gobernada.
>
> **La pieza es el borde del alcance, no la unidad de valor. El día que publicas un precio por pieza,
> le entregas al comprador la calculadora con la que te va a comoditizar.**

---

## 1. 🔴 El reframe — la unidad de venta es el SQUAD

| ❌ Lo que vende el mercado | ✅ Lo que vendemos nosotros |
|---|---|
| *"8 artículos al mes"* | *"Un squad dedicado con capacidad de hasta 8 piezas/mes"* |
| *"Tarifa hora diseñador senior"* | *"2,2 FTE de capacidad creativa dedicada, gobernada"* |
| *"El key visual cuesta X"* | *"La capacidad que produce el KV, la campaña y sus adaptaciones"* |
| *"Rondas ilimitadas"* | 🔴 *"2-3 rondas. La cuarta es change order."* |
| *"Te entregamos el material"* | *"Te entregamos el material con estos derechos de uso, por este plazo"* |

### Por qué la unidad tiene que ser el FTE y no el entregable

**Tres razones, y las tres son de supervivencia:**

1. 🔴 **La IA deflacionó el entregable.** Si tu unidad es la pieza, tu precio cae con el costo de producirla.
   Si tu unidad es la capacidad, **tu precio sigue el valor de lo escaso: decidir y garantizar.**
   *(→ `modules/01_MERCADO.md` § 4.)*
2. 🔴 **El precio unitario es la calculadora del procurement.** Publica *"artículo adicional: CLP 260.000"*
   y el comprador **divide cualquier propuesta futura por ese número.** *(Ya nos pasó — § 5.)*
3. 🎯 **El comprador no tiene un problema de piezas: tiene un problema de capacidad.** ✅ *verificado*: el
   dolor declarado de los in-house **no es falta de proveedores — es energizar creativos y atraer talento.**
   Le estás vendiendo exactamente lo que dice que le falta.

> ## Una pieza es un resultado. Un squad es una capacidad. Solo una de las dos se puede escalar, gobernar y renovar.

---

## 2. Las cuatro modalidades reales de Efeonce

**Estas son las que existen** *(`docs/context/14_modelo-negocio-asaas.md` + runtime)*. **No inventes una quinta.**

| Modalidad | Qué es | Cuándo se usa | 🔴 Cuándo NO |
|---|---|---|---|
| 🎯 **On-Going** *(el corazón)* | **Fee mensual + equipo dedicado**, ciclo completo | **Cuando el dolor es de capacidad sostenida.** Es donde vive el squad, el gobierno y la renovación | Si el cliente tiene una necesidad puntual con fin |
| **On-Demand** | **Proyecto con alcance y precio cerrado** | Campaña, lanzamiento, rebranding, auditoría. **Tiene fecha de término** | 🔴 **Si en realidad es capacidad recurrente disfrazada de proyecto** — ahí te comes el scope creep entero |
| ⚠️ **Staff Augmentation** *(vía **Deel**)* | **Perfiles integrados en el equipo del cliente**, bajo **su** dirección | Cuando el cliente necesita un skill específico **y quiere dirigirlo él** | 🔴 **NUNCA lo confundas con el Managed Squad. Ver § 2.1** |
| 🎯 **Sample Sprint** *(la puerta)* | Engagement acotado con gobernanza completa | **La entrada de menor riesgo que tenemos.** § 2.2 | Si el cliente ya está listo para firmar el On-Going *(no le pongas fricción)* |

---

### 2.1 🔴 La distinción que más plata vale: **Managed Squad ≠ Staff Augmentation**

**El squad blueprint de SKY lo declara en su primera línea, y no es un tecnicismo:**

> **"Modo: Managed Squad / Delivery Pod (Efeonce arma y opera; el cliente compra el servicio/outcome).
> *No es staff-aug: nadie incrusta bodies bajo dirección del cliente.*"**
> — `docs/commercial/tenders/sky-blog-2026/squad-blueprint-INTERNO.md`

| | 🎯 **Managed Squad / Delivery Pod** | ⚠️ **Staff Augmentation** |
|---|---|---|
| **Quién dirige** | **Efeonce.** Hay Account Lead, delivery leads y RACI | **El cliente.** Nosotros aportamos el perfil |
| **Qué compra el cliente** | **Outcome + capacidad gobernada** | **Horas-persona de un skill** |
| **Quién responde por la entrega** | 🎯 **Nosotros.** Por eso podemos comprometer OTD/FTR | 🔴 **El cliente.** Si su dirección falla, no es nuestra falla |
| **El vehículo** | Contrato de servicio | **Deel** |
| 🔴 **El riesgo laboral** | **Nuestro, y está encapsulado** | 🔴 **Distinto — es exactamente lo que Deel encapsula.** Y "un body incrustado bajo dirección del cliente" es la figura que dispara discusiones de dependencia laboral |
| **El precio** | **Por capacidad gobernada** *(incluye lanes, dirección y gobierno)* | **Por perfil.** Más barato, y **debe serlo** |

> ## 🔴 Confundirlas cambia tres cosas a la vez: el precio, el riesgo laboral y quién responde si algo sale mal.
> **Si vendes un Managed Squad y lo operas como staff-aug, cobras por gobierno que no entregas.
> Si vendes staff-aug y lo operas como Managed Squad, regalas dirección creativa y accountability.**

🔴 **Regla dura:** **NUNCA uses "staff augmentation" como sinónimo comercial de "squad dedicado".**
Si el cliente pide *"que se sienten con mi equipo y trabajen bajo mi Head of Design"*, **eso es staff-aug,
va por Deel, y NO lleva compromiso de OTD/FTR** *(no controlamos su dirección; no podemos responder por su
entrega)*. → `modules/11_METRICAS_COMPROMISO.md`.
Y si un cliente quiere el precio de staff-aug con el gobierno del Managed Squad: **eso no existe. Elige.**

---

### 2.2 🎯 Sample Sprint — la mejor puerta de entrada que tenemos, y es ✅ REAL

Runtime: `src/lib/commercial/sample-sprints/` · ruta `/agency/sample-sprints`.
**4 subtipos:** Operations Sprint *(pilot)* · Extension Sprint *(trial)* · Validation Sprint *(poc)* ·
Discovery Sprint *(discovery)*.

**Lo que puedes prometer, porque corre de verdad:**
- Workflow de **aprobación** real *(`commercial.engagement.approve`)*.
- **Snapshots semanales de progreso y costo REAL** — no estimado.
- **Outcome terminal documentado**; si convierte, hay **lineage transaccional** al servicio regular.
- **Guard anti-zombie en base de datos:** un sprint activo **>120 días sin outcome es rechazado**;
  alerta a los **90**.
- **Degradación honesta:** si una fuente de datos se cae, **la vista lo declara** en vez de mostrar números falsos.

🎯 **El pitch, palabra por palabra:**
> *"No tienes que casarte conmigo. **Te vendo un sprint acotado, y lo opero con la misma gobernanza, el mismo
> costeo real y la misma trazabilidad que un contrato grande.** Si convierte, hay continuidad. Si no,
> **hay un outcome documentado y te quedas con el diagnóstico.**"*

🔴 **Y mata la objeción 7 del comprador** *(*"¿y si no me gusta lo que hacen?"*)* **sin descontar un peso.**

---

## 3. Qué es "una unidad de capacidad" — el squad como SISTEMA

**Un squad no es una lista de gente. Es un sistema con lanes, jerarquía y sinergias.
Si lo presentas como una lista de CVs, el comprador lo lee como una lista de precios — y la recorta.**

### El caso real: **SKY — 9 roles, ≈ 2,2 FTE**

| Lane | Rol | % dedicación |
|---|---|---|
| **Cuenta** | Responsable de Cuenta *(interlocutor único, accountable global)* | 12% |
| **Estrategia / SEO** | Estratega Editorial / SEO Lead | 20% |
| **SEO/AEO + Datos** | Especialista SEO/AEO + Analítica | 25% |
| **Contenido** | Editor / Redactor SEO *(senior)* | 50% |
| **Contenido** | Redactor de contenido *(semi-senior)* | 40% |
| **Diseño** | Dirección Creativa / QA de marca *(lead)* | 12% |
| **Diseño** | Diseñador Visual *(senior)* | 30% |
| **Audiovisual** | Productor Audiovisual *(senior)* | 15% |
| **Social** | Social Content Strategist *(senior)* | 20% |
| | **Total** | **224% ≈ 2,2 FTE** |

### 🎯 Las sinergias — **por qué es un sistema y no una suma**

**Esto es lo que se presenta al cliente. Es lo que justifica que 9 roles cuesten 2,2 FTE y no 9.**

- **Datos → Estrategia:** la reportería del mes alimenta la grilla del mes siguiente.
  **Ningún mes empieza de cero.**
- **Estrategia → Ejecución:** un solo mapa de intención briefea a todas las lanes **desde una sola fuente.**
- 🎯 **Contenido → Visual → Social:** una pieza genera su imagen, su video y su átomo social
  **en un mismo flujo (atomización)** — **no son tres producciones paralelas.**
  **Ahí está el apalancamiento: por eso 9 roles caben en 2,2 FTE.**
- **El Account Lead sostiene el contexto** para que ninguna lane lo pierda.

> ## Nueve especialistas que se pasan el trabajo entre sí cuestan menos que dos generalistas que hacen todo mal dos veces.
> **Esa frase es la venta del squad. Úsala.**

🔴 **Lo que NUNCA va al cliente:** la columna de nómina, los costos por rol, el loaded cost.
**Son internos, siempre.** → `efeonce/ESTADO_ACTUAL.md` § 3 · `ANTIPATTERNS.md`.

🔴 **Y el gate que no se salta:** al asignar el equipo definitivo, **reconciliar cada % de dedicación contra
la capacidad libre real.** Nadie puede pasar de 100% sumando todos sus engagements.
→ `greenhouse-talent-people-operator` *(el dimensionamiento es suyo; acá solo lo preciamos)*.

---

## 4. Las tres capas de toda oferta creativa

**Toda oferta creativa nuestra tiene estas tres capas. Si te falta una, no es una oferta: es una cotización.**

```
CAPACIDAD (mensual o por proyecto)                        ← lo que el mercado también vende
  El squad: lanes, seniority, FTE, dedicación, RACI
  Capacidad de hasta N piezas/mes  ← borde del alcance, NO precio unitario

GOBIERNO (mensual)                                        ← 🎯 lo que NADIE más puede darle
  Portal + métricas de delivery (OTD · FTR · RpA · cycle time · stuck)
  Reportería + trazabilidad + política de confianza del dato
  🔴 NUNCA SE DESCUENTA

DERECHOS DE USO                                           ← 🔴 lo que TODOS regalan sin darse cuenta
  Canal · territorio · plazo · exclusividad
  Se cotiza SEPARADO del fee de creación
```

### 🔴 Capa 2 — el gobierno **nunca se descuenta**. Nunca.

**Tres razones, y hay que saberlas de memoria porque el descuento siempre ataca acá:**

1. **Su costo marginal es ≈ 0.** Descontarlo es **regalar margen puro** — no ahorras nada al darlo.
2. 🎯 **Es lo único que el freelancer, el in-house y Superside NO pueden darle.**
   Descontarlo es **devaluar tu único diferenciador con tus propias manos.**
3. 🔴 **Es tu switching cost.** El cliente que entra al portal y ve su operación **percibe el costo de irse.**
   El que nunca entró **te compara por precio en la renovación como si fueras cualquiera.**
   → `modules/12_RETENCION_EXPANSION.md`.

**Lo que la capa de gobierno es de verdad** *(✅ verificado, corre hoy)*: **RpA · OTD% · FTR% · Cycle Time ·
Throughput · Stuck Assets**, por proyecto, con tendencia — **y con política de confianza que declara cuándo
un número NO es fiable** en vez de pintarlo bonito.

> **Un dashboard que nunca falla es un dashboard en el que nadie cree.**
> **El nuestro te dice cuándo no confiar en él. Eso, frente a un comité, es más defendible que la perfección.**

🔴 **Y lo que NO existe, aunque suene bien:** `Creative Hub`, `ROI Reports`, `Exports`, `CVR trimestral`,
**Brief Clarity Score**, `Revenue Enabled`. **Están sembrados en el registry pero no tienen página ni datos.**
**Prometerlos es humo, y explota en el onboarding.** → `efeonce/ESTADO_ACTUAL.md`.

### 🔴 Capa 3 — los derechos de uso: **el 2-3× que regalamos sin saberlo**

✅ *verificado*: **el fee de creación y el fee de uso se cotizan por separado.** Multiplicadores
direccionales del mercado: **no exclusivo 1,0× · exclusividad de categoría 2,0× · buyout / exclusividad total
3,5×–10×**. Por plazo: **perpetuo o ilimitado, +100–150%.** Correr la pieza en **pauta pagada: +50–100%.**

> ## 🔴 Ceder derechos perpetuos, exclusivos e ilimitados dentro del fee mensual es regalar entre 2 y 3 veces el trabajo. Y lo hacemos por defecto, porque nadie preguntó.

⚠️ **Ojo con la fuente:** esos múltiplos vienen del mundo creator/UGC/fotografía. **Son direccionales, sirven
para ESTRUCTURAR la conversación — NO los cites como "estándar de la industria publicitaria" en una
propuesta.** *(→ `SOURCES.md` § 5.)* Para redactar la cláusula: **`legal-privacy-ip-operator`.**
El detalle operativo: **`modules/05_SCOPE_SOW.md`.**

---

## 5. 🩸 Lo que HOY está mal empaquetado — y hay que arreglar

**Todos estos son bugs vivos, verificados en nuestra propia oferta económica de SKY.**

| Hoy | 🔴 El problema | ✅ El fix |
|---|---|---|
| 🩸 **Publicamos precio unitario:** *"artículo adicional CLP 260.000"* | 🔴 **Le entregamos la calculadora.** SKY puede dividir **cualquier** propuesta futura por ese número | **Capacidad declarada. Sin precio unitario publicado** |
| 🩸 **El ad-hoc (260k) es MÁS BARATO que el marginal del plan (425k)** | 🔴 **Premiamos salirse del plan.** El ad-hoc rompe la planificación y consume coordinación: **tiene que costar MÁS** | **Ad-hoc ≥ 550k — o mejor, sin precio publicado** |
| 🩸 **El plan ampliado está dominado:** 12 artículos a **6,9M** cuesta **660.000 MÁS** que base + 4 ad-hoc *(6,24M)* | 🔴 **Un analista de compras lo ve en 30 segundos** — y pierdes credibilidad en toda la propuesta | **Re-precificar el ampliado. Un plan superior NUNCA puede costar más que su equivalente armado a mano** |
| **El gobierno va gratis adentro** | 🔴 **Es nuestro mayor diferenciador y lo regalamos** | **Línea propia. Nunca descontada** |
| **Los derechos de uso no se cotizan** | 🔴 **Regalamos 2-3× el trabajo** | **Línea propia: canal · territorio · plazo · exclusividad** |
| **El alcance termina en "etc."** | 🔴 **Un alcance sin borde no es un alcance.** Las expectativas se expanden, el margen se evapora | **Lista cerrada. Cero "etc."** |

🎯 **Los seis arreglos son de EMPAQUETADO, no de producto. El trabajo ya lo hacemos bien.
Lo que está roto es cómo lo cobramos.**

---

## 6. El catálogo — qué servicios creativos vendemos, y quién los ejecuta

**Acá se VENDE y se SCOPEA. El oficio vive en los studios. No lo reimplementes.**

| Servicio | Modalidad natural | 🔴 El borde de alcance que hay que fijar | Hand-off al oficio |
|---|---|---|---|
| **Identidad / sistema de marca** | **On-Demand** *(proyecto con fin)* | ✅ **2-3 rondas de concepto + 1-2 de refinamiento** *(estándar verificado)*. **Y los derechos: la identidad es el caso donde el buyout perpetuo se justifica — y se cobra** | `design-studio` · `typography-design` |
| **Key Visual / campaña** | On-Demand, o dentro del On-Going | **Cantidad de conceptos · adaptaciones incluidas · canales · territorio · plazo de uso** | `design-studio` · `greenhouse-ai-image-generator` |
| **Audiovisual** | On-Demand *(o lane del squad)* | 🔴 **Rondas sobre el corte, no sobre el guion aprobado. Y el uso en pauta pagada se cotiza: +50-100%** ✅ | `motion-design-studio` · `audio-studio` |
| **Social / contenido creativo** | 🎯 **On-Going** *(es capacidad pura)* | **Capacidad de hasta N piezas/mes.** 🔴 **Nunca precio por post** | `social-media-studio` · `copywriting` |
| **Contenido editorial / blog** | **On-Going** | **Capacidad + grilla.** 🔴 **Si el deal incluye SEO/contenido, el pricing de esa lane es de `seo-aeo-practice` — NO dupliques su rate card** | `content-marketing-studio` · `seo-aeo-practice` |
| **Diagnóstico** | 🎯 **Gratis — es la cuña** | **Se regala el diagnóstico. NUNCA la solución** | → `modules/06_CUNA.md` |

🔴 **Regla de frontera:** si la pregunta es *cómo se hace la pieza* → **es del studio.**
Si es *cuánto vale, qué incluye y hasta dónde llega* → **es de acá.**

---

## 7. Reglas duras de este módulo

1. 🔴 **La unidad de venta es el FTE de squad.** Nunca la hora. Nunca la pieza suelta.
2. 🔴 **Nunca publiques precio unitario por pieza.** Es la calculadora del procurement.
3. 🔴 **Managed Squad ≠ Staff Augmentation.** No son sinónimos comerciales. Cambian precio, riesgo y accountability.
4. 🔴 **El gobierno es línea propia y NUNCA se descuenta.** Descuenta capacidad si tienes que descontar.
5. 🔴 **Los derechos de uso se cotizan aparte, o se acotan** *(canal / territorio / plazo)*. Nunca perpetuos, exclusivos e ilimitados dentro del fee base.
6. 🔴 **Cero "etc." en el alcance.** Lista cerrada o no hay oferta.
7. 🔴 **Nunca prometas una superficie del portal que no existe.** → `efeonce/ESTADO_ACTUAL.md` antes de cada propuesta.
8. 🔴 **El ad-hoc cuesta MÁS que el marginal del plan.** Siempre.

---

## → Siguiente

**Ya sabes qué vendes. Ahora: a cuánto, con qué piso y qué pasa cuando te piden descuento.**
→ **`modules/04_PRICING.md`** *(y ojo con el 🩸 hallazgo abierto del loaded cost: puede que el margen de
negociación que crees tener no exista)*
**Y para fijar el borde que protege ese margen:** → **`modules/05_SCOPE_SOW.md`**.
