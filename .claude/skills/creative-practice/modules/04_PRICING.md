# 04 — PRICING: capacidad, loaded cost, piso, descuentos

> **La regla que ordena todo el módulo:**
> **Un precio sin loaded cost detrás no es un precio: es una corazonada con decimales.**

---

## 1. La tesis — el precio no se elige, se computa

En creativo, el precio se "siente". Alguien mira la propuesta, dice *"pongámosle 4 millones"*, y esa cifra
sale de un lugar que nadie puede auditar: la última vez que cobramos algo parecido, más un poco.

**Eso se acabó.** Tenemos un cotizador con costo cargado real, confidence score de la base de costo, y un
guard que bloquea bajo el piso (`src/lib/finance/pricing/pricing-engine-v2.ts`, **sin flag, en producción**).
🎯 **Casi ninguna agencia del mercado sabe cuánto le cuesta su propia gente. Nosotros sí. Eso es una ventaja —
y desperdiciarla cotizando de memoria es imperdonable.**

La secuencia, y no hay otra:

```
1. Dimensiona el squad      → greenhouse-talent-people-operator (squad blueprint: roles, seniority, % dedic)
2. Computa el loaded cost   → greenhouse-finance-accounting-operator (§3 de este módulo: el hallazgo 🩸)
3. Aplica buffer de riesgo  → §4
4. Computa el PISO          → §5   (piso = loaded × (1+buffer) / (1 − 0,45))
5. Elige el precio de lista → §6   (arriba del piso, anclado al VALOR y al comparable correcto)
6. Verifica en el cotizador → margin-health debe pasar en verde
```

🔴 **Si saltaste el paso 2, no tienes un precio. Tienes una apuesta.**

---

## 2. Qué NO se vende — y por qué

### 🔴 La hora está muerta. No la resucites.

✅ *verificado*: **WPP** abandonó el pricing por horas → output/return-based. **1 de cada 3 agencias** ya
recibió un pedido de **"descuento por IA"**. La IA comprime el entregable **3-4×**.

| Si vendes… | El cliente aprende que compra… | Y entonces… |
|---|---|---|
| **Horas** | Tu **costo** | 🔴 Te negocia el costo. Y cuando la IA te lo baja, **te exige el descuento.** |
| **Piezas** | Un **commodity con precio unitario** | 🔴 Divide cualquier propuesta futura por ese número. **Le diste la calculadora.** |
| 🎯 **Capacidad gobernada** | Un **equipo que cumple** | 🎯 Te compara con **el costo de tener ese equipo** — que es 5-10× más caro. |

> ## Facturar por hora es poner tu estructura de costos en la factura para que te la negocien.
> **Y en 2026, tu propio ahorro de IA se convierte en el argumento del cliente para pagarte menos.**

### 🔴 Y la pieza suelta tampoco

🩸 **Ya cometimos este error, y está vivo:** la oferta económica de SKY publica **"artículo adicional: CLP
260.000"**. Desde ese día, **SKY puede dividir cualquier propuesta nuestra por 260.000** y preguntarnos por qué
el plan de 8 artículos no cuesta 2,08M.

**Regla:** el precio unitario **no se publica.** Si el cliente exige un valor de referencia para el ad-hoc,
ver §7 (y tiene que costar **más**, no menos).

---

## 3. 🩸 El loaded cost — el hallazgo que hay que cerrar ANTES de la próxima cotización

El squad blueprint de SKY computa el loaded cost como:

```
loaded_cost = Σ ( % dedicación_rol × costo_del_rol_en_nómina )
            = CLP 2.260.000 / mes   (para 2,2 FTE, 9 roles)
```

🩸 **Hay tres cosas que esa fórmula puede estar dejando afuera. Cada una empuja el piso hacia arriba.**

### 🩸 (a) ¿El "costo de nómina" es el sueldo bruto o el costo empresa?

No es una sutileza contable: **cambia el piso.**

| Tipo de rol | Qué se le suma al sueldo | Nota |
|---|---|---|
| **Empleado en Chile** *(ej. Creative Copywritter, CLP 650k)* | Cargas sociales, provisiones, vacaciones | El costo empresa **no** es el bruto |
| **Contractor internacional vía Deel** *(los roles en USD)* | Fee de plataforma, FX, sin cargas locales | Estructura **distinta**, no aplicable el mismo multiplicador |

🔴 **Por eso NO se puede "multiplicar todo por 1,3" y seguir.** El loaded cost es **heterogéneo por rol**, y
solo `greenhouse-finance-accounting-operator` puede decirte qué incluye realmente el
`loaded_monthly_cost_usd` de `sellable-roles-store`.

### 🩸 (b) ¿Y las herramientas?

Un squad creativo consume licencias: Adobe, Figma, stock, IA generativa, fuentes. ✅ *Referencia de mercado:
un in-house carga **USD 1.200–2.400/año por persona** solo en software.* **Si eso no está en el loaded cost,
lo estás pagando del margen.**

### 🩸 (c) 🎯 Y la trampa grande: **el % de dedicación asume que el 100% del tiempo dedicado es productivo**

**No lo es. Nunca lo es.** ✅ *verificado*: la utilización promedio de la industria es **65% firmwide**
(75% en junior/producción, **33% en directores**). Y donde hay scope creep, aparece un **gap de 15 puntos**
entre las horas agendadas y la utilización realmente entregada.

> 🩸 **Traducción:** un rol al **30% de dedicación en el papel** puede estar consumiendo **~46% de su
> capacidad real** (30% / 0,65). Si dimensionaste el squad al 100% de eficiencia,
> **sobrevendiste capacidad y subvaloraste el costo — al mismo tiempo.**

**Y el que primero paga esa cuenta no es el margen: es el equipo.** Un squad dimensionado sin holgura quema
gente, y en creativo **quemar gente es destruir el activo que vendes.**

### 🩸 La sensibilidad — lo que está en juego

*(Escenario SKY. **No son afirmaciones: son el rango que hay que cerrar con finance.**)*

| Si el loaded real es… | Piso a 45% *(con buffer 12%)* | Margen real cerrando a **5,2M** *(precio de lista actual)* |
|---|---|---|
| **2,26M** *(lo declarado)* | **CLP 4,60M** ← el piso vigente | **56,5%** ✅ |
| 2,50M *(+10%)* | CLP 5,09M | 46,2% ⚠️ |
| 2,70M *(+19%)* | CLP 5,50M | 🔴 **41,8% — bajo el piso** |
| 2,94M *(+30%)* | CLP 5,99M | 🔴 **43,5% — bajo el piso** *(y el piso queda ARRIBA del precio de lista)* |

> 🩸 **Si el loaded real está ~20% arriba de lo declarado, el precio de lista de SKY ya está EN el piso —
> y el "margen de negociación" que creemos tener no existe.**
>
> 🔴 **Acción, antes de cotizar el próximo squad creativo:** confirmar con
> `greenhouse-finance-accounting-operator` qué incluye el loaded cost. **No es contabilidad: define si
> podemos descontar o no.**

---

## 4. El buffer de riesgo — lo que se suma antes del piso

El loaded cost es el costo **si todo sale bien.** Nunca sale todo bien. **Se le suma un buffer explícito
antes de computar el piso**, y el buffer se **declara**, no se intuye:

| Riesgo | Cuándo aplica | Buffer sugerido |
|---|---|---|
| **Penalidades contractuales** | Licitaciones con multa por incumplimiento | **+10–15%** *(SKY usó 12%)* |
| **Comisión de plataforma** | Wherex, Ariba, Coupa, portal de compras | según el portal *(se computa, no se estima)* |
| **Rondas de revisión sobre el cap** | Cliente nuevo, sin historial de RpA | **+10%** hasta tener 3 meses de RpA real |
| **Brief inmaduro** | No hay owner claro, la marca no tiene lineamientos | **+15%** — o **descalifica** (módulo 08) |
| **FX** | Costos en USD, precio en CLP | ver §9 |

🎯 **El buffer no es pesimismo: es el precio del riesgo que el cliente te está transfiriendo.**
Si el cliente quiere el buffer más bajo, **que baje el riesgo** (rondas acotadas, owner nombrado, sin
penalidades). **Eso es una negociación honesta.** Bajarle el buffer sin bajarle el riesgo es regalarle margen.

---

## 5. El piso — 45% de margen bruto, aprobado por el dueño

🔴 **PISO DURO: 45% de margen bruto. Aprobado por el dueño (2026-07-13). No es una guía. Es la regla.**

Respaldo de mercado: **50%+ es el margen sano de una agencia; bajo 40% el delivery está roto** (no hay con qué
pagar la supervisión, el QA, ni la capacidad ociosa que la operación necesita para no quemar gente).

### La fórmula — el piso se computa, no se siente

```
piso = loaded_cost × (1 + buffer) / (1 − 0,45)
     = loaded_cost × (1 + buffer) × 1,8182
```

**Verificación con SKY:** `2.260.000 × 1,12 = 2.531.200` → `/ 0,55 = ` **`CLP 4.602.182`** ✅
*(coincide con el piso vigente de 4,6M)*

### 🔴 Lo que el piso significa de verdad

**El piso no es "el precio mínimo que aceptamos". Es el precio bajo el cual el trabajo destruye valor.**

Cerrar bajo el piso no es "ganar un cliente con poco margen". Es:
- **firmar un compromiso de capacidad que no puedes sostener** sin sobrecargar al equipo;
- **quemar gente** para tapar la diferencia;
- y — lo peor — **anclar al cliente en un precio que nunca vas a poder subir.**

> ## Un cliente cerrado bajo el piso no es un cliente. Es una deuda con tu propio equipo.

### El margen de negociación real

```
margen_de_negociación = precio_de_lista − piso
```

**SKY:** `5.200.000 − 4.602.000 = ` **`CLP 598.000` (11%)** — **no 1,3M (25%), como se creía.**

🩸 *(Y si el hallazgo del §3 se confirma, es aún menos.)*

🔴 **Ese número se computa ANTES de entrar a negociar. Nunca durante.** Entrar a una negociación sin saber tu
piso es cómo se regala el margen: no por debilidad, **por ignorancia aritmética en tiempo real.**

---

## 6. La rate card de capacidad — **herramienta interna, NO tarifario publicado**

🔴 **Esto es una calculadora de composición interna. NUNCA se le entrega al cliente, ni se publica, ni se
menciona un precio por rol en una propuesta.** *(Publicar precio por rol = publicar precio unitario = regla
dura 3. Le entregas la calculadora para comoditizarte, y además le enseñas a comparar rol por rol con un
freelancer.)*

### Cómo se construye

Para cada rol del squad:

```
precio_venta_rol (100% dedic) = loaded_cost_rol × (1 + buffer) / (1 − margen_objetivo)

precio_línea = precio_venta_rol × % de dedicación del rol en el squad
```

Y el precio del squad es la suma de las líneas **más la capa de gobierno** (§8).

### La base de costo creativa real *(INTERNA — del squad blueprint SKY)*

| Rol | Costo declarado *(mensual, 100%)* | Nota |
|---|---|---|
| Creative Operations Lead *(dirección creativa / QA de marca)* | **USD 1.250** | 🩸 verificar si es bruto o costo empresa |
| Senior Visual Designer | **USD 800 – 927** | 🩸 ídem |
| Creative Social Media Strategist | **USD 800** | 🩸 ídem |
| Creative Copywritter | **CLP 650.000** | 🩸 empleado CL → **cargas aparte** |
| Creative Content Creator | **USD 327** | 🩸 ídem |
| *Roles de estrategia/cuenta* | `[EST]` — **no están en el subset de nómina** | ⚠️ se estiman a comp senior CL hasta fijar dotación |

🔴 **Estos números son INTERNOS y jamás llegan al cliente, ni en un anexo, ni en un "desglose de
transparencia", ni verbalmente.** → `ANTIPATTERNS.md` § *El pecado del arbitraje*.

---

## 7. El precio de las modalidades

### (a) Squad on-going *(el producto principal)*
Precio mensual = suma de líneas de capacidad + capa de gobierno. Contrato ≥ 12 meses (ideal 24).
**Es lo que se debe empujar siempre.**

### (b) Proyecto cerrado *(on-demand)*
Se dimensiona el squad **para la ventana del proyecto** y se aplica la misma fórmula.
🔴 **Con un recargo:** un proyecto cerrado tiene **costo de arranque y de cierre** que un on-going amortiza
en 12 meses. **Un proyecto no es "un mes de retainer".** Si lo cobras como si lo fuera, pierdes plata.

### (c) Ad-hoc / trabajo fuera del plan
🩸 **BUG VIVO:** hoy el ad-hoc de SKY (**CLP 260.000/artículo**) es **más barato que el marginal del plan
ampliado (CLP 425.000)**. **Estamos premiando salirse del plan** y regalándole al cliente el incentivo de
romper la planificación — que es justo lo que destruye la capacidad.

🔴 **Regla:** **el ad-hoc SIEMPRE cuesta MÁS que el marginal del plan.** Rompe la planificación, consume
coordinación no presupuestada y desordena la cola. **Fix propuesto para SKY: ad-hoc ≥ CLP 550.000 — o, mejor,
sin precio unitario publicado.**

### (d) 🩸 BUG VIVO — el plan ampliado está **dominado**

| Opción | Cálculo | Total |
|---|---|---|
| Plan **ampliado** (12 artículos) | precio de lista | **CLP 6.900.000** |
| Plan **base + 4 ad-hoc** | 5.200.000 + (4 × 260.000) | **CLP 6.240.000** |
| | | 🔴 **El ampliado cuesta CLP 660.000 MÁS por lo mismo.** |

> 🔴 **Un analista de compras lo ve en 30 segundos.** Y cuando lo vea, no va a pensar *"qué error"*:
> va a pensar ***"¿en qué más me están inflando?"*** — y perdiste la credibilidad de toda la oferta.

**Fix:** el plan mayor **siempre** tiene que ser más barato por unidad que el menor + ad-hoc. **Es la
condición mínima para que un tarifario escalonado sea coherente.**

### (e) Sample Sprint *(la puerta de entrada)*
Se precia **al costo real + margen**, no como loss-leader.
🎯 **El sprint no se regala: se acota.** Regalarlo enseña que el trabajo no vale; acotarlo enseña que el
alcance importa. *(Y ya tiene gobernanza real: aprobación, snapshot de costo real, anti-zombie, lineage.)*

### (f) Staff augmentation
🔴 **Es otro producto, con otro precio y otro riesgo.** No lo confundas con el Managed Squad
(→ `modules/03_OFERTA.md`). En staff-aug el cliente dirige; en Managed Squad **nosotros operamos y respondemos
por el outcome**. **Cobrar un Managed Squad a precio de staff-aug es regalar la parte que más vale: el gobierno.**

---

## 8. La capa de gobierno — la línea que NUNCA se descuenta

Toda oferta creativa tiene **tres capas**, y se cotizan por separado:

| Capa | Qué es | Descontable |
|---|---|---|
| **Capacidad** | El squad (FTE × roles) | ⚠️ Sí, **bajando alcance** *(menos capacidad = menos precio)* |
| 🎯 **Gobierno** | Portal, métricas (OTD/FTR/RpA), reportería, account lead, QA | 🔴 **NUNCA** |
| **Derechos de uso** | Licencia, exclusividad, plazo, territorio | Se **negocia**, no se regala (→ `modules/05_SCOPE_SOW.md`) |

🔴 **Por qué el gobierno no se descuenta:** su costo marginal es ≈ 0 **y es lo único que el freelancer, el
in-house y Superside no pueden darle.** Descontarlo es regalar **margen puro** *y* **devaluar tu único
diferenciador** en el mismo movimiento.

> ## Descuenta capacidad. Nunca descuentes el gobierno.
> **Si el cliente quiere pagar menos, que reciba menos capacidad — no menos transparencia.**

---

## 9. FX — el riesgo silencioso

**Costos en USD** *(los contractors del squad)* **+ precio en CLP** *(el contrato)* = **exposición cambiaria
que se come el margen sin que nadie la vea.** SKY es a **2 años, sin reajuste.**

🔴 **Reglas:**
- El FX del cotizador es un **snapshot** (`costBasisSnapshotDate`). **Un contrato largo en CLP con costos en
  USD necesita buffer de FX explícito o cláusula de reajuste.**
- **NUNCA** cotices un contrato multianual sin declarar el supuesto de FX. Si el peso se deprecia 15%,
  tu 45% de margen se convierte en ⚠️ [VERIFICAR con finance: el delta exacto depende de la mezcla USD/CLP del
  squad] — y no te vas a dar cuenta hasta el cierre del año.
- Matriz canónica de monedas y política FX → `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` +
  `greenhouse-finance-accounting-operator`.

---

## 10. Descuentos — qué se puede dar y qué no

| Palanca | ¿Se puede? | Condición |
|---|---|---|
| Bajar **alcance/capacidad** | ✅ Sí | Es la palanca sana: menos FTE, menos lanes, menos volumen |
| **Plazo largo** *(24 meses vs 12)* | ✅ Sí | A cambio de **compromiso real**, no de intención |
| **Pago anticipado** | ✅ Sí | Descuento financiero, computado contra el costo del dinero |
| **Volumen** *(más marcas / mercados)* | ✅ Sí | Solo si hay **economía de escala real** en el squad |
| **Piloto → contrato** | ✅ Sí | El Sample Sprint, acotado. **No regalado.** |
| 🔴 Bajar el **precio a secas** | 🔴 **NO** | Si el precio no aguanta, **el problema es el alcance** |
| 🔴 Descontar el **gobierno** | 🔴 **NUNCA** | §8 |
| 🔴 Regalar **derechos de uso** | 🔴 **NUNCA** | Es 2-3× el trabajo regalado → `modules/05_SCOPE_SOW.md` |
| 🔴 Cerrar **bajo el piso** | 🔴 **NUNCA** | §5. **Es aritmética, no voluntad.** |

🎯 **El guion cuando piden descuento sin bajar alcance:**

> *"El precio refleja el equipo que este alcance necesita para cumplir lo que estamos comprometiendo. Puedo
> bajarlo, pero bajando capacidad — y eso cambia lo que puedo garantizarte en tiempos y en rondas. ¿Prefieres
> que ajustemos el alcance, o prefieres mantenerlo y revisamos el plazo del contrato?"*

**Nunca digas "déjame ver qué puedo hacer".** Eso enseña que el precio era negociable desde el principio, y a
partir de ahí **todo lo que digas vale menos.**

---

## 11. Cuándo levantarse de la mesa

🔴 **El precio que el cliente puede pagar está bajo el piso → no es una negociación. Es aritmética.**

El guion:

> *"Con el alcance que necesitas, ese presupuesto nos deja bajo el nivel en que podemos sostener el equipo que
> lo entrega. No te voy a vender algo que sé que no vamos a poder cumplir. Tengo dos opciones honestas: bajamos
> el alcance a lo que ese presupuesto sí sostiene, o te digo con franqueza que hoy no somos tu proveedor —
> y te digo quién sí podría serlo."*

🎯 **Levantarte de la mesa con elegancia es lo que te deja volver el año siguiente.** El que baja el precio
para cerrar **nunca vuelve a subirlo, y además enseñó que su primer precio era mentira.**

---

## 12. Checklist antes de mandar cualquier precio

- [ ] ¿El squad está dimensionado en un **squad blueprint**? *(`greenhouse-talent-people-operator`)*
- [ ] ¿El **loaded cost** está confirmado con finance — bruto vs costo empresa, herramientas, utilización? 🩸
- [ ] ¿El **buffer** está declarado y justificado?
- [ ] ¿El **piso** está computado *(no sentido)*?
- [ ] ¿El **margen de negociación** está calculado **antes** de la reunión?
- [ ] ¿Pasó `margin-health` en el cotizador, en verde?
- [ ] ¿La oferta **NO publica** precio unitario por pieza ni por rol?
- [ ] ¿El **ad-hoc cuesta MÁS** que el marginal del plan?
- [ ] ¿El **plan mayor NO está dominado** por el menor + ad-hoc?
- [ ] ¿La capa de **gobierno** está cotizada y **marcada como no descontable**?
- [ ] ¿Los **derechos de uso** están cotizados aparte?
- [ ] ¿El supuesto de **FX** está declarado si el contrato es multianual?

🔴 **Si hay una sola casilla sin marcar, el precio no sale.**

---

**→ Siguiente:** el precio protege el margen del lado de la entrada; **el alcance lo protege del lado de la
salida.** Y ahí es donde el creativo realmente sangra → **`modules/05_SCOPE_SOW.md`**.
