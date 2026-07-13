# ANTIPATTERNS — lo que NUNCA se hace

> Los marcados **🩸 son bugs VIVOS de Efeonce**: no son advertencias teóricas, son cosas que **ya hicimos**
> o que **están pasando ahora mismo**. Cada uno tiene un fix propuesto.
> **Si vas a cotizar, proponer o pitchear algo esta semana, lee la § 1 completa.**

---

## 1. 🩸 Bugs vivos — lo que está roto hoy

### 🩸 A. Publicamos un precio unitario, y le dimos al cliente la calculadora

**Qué pasó:** la oferta económica de SKY publica **"artículo adicional: CLP 260.000"**.

**Por qué es grave:** desde ese día, SKY puede **dividir cualquier propuesta futura por 260.000** y
preguntarnos por qué el plan de 8 artículos no cuesta CLP 2,08M. **Le enseñamos a comprarnos por unidad**, que
es exactamente la unidad que la IA está deflacionando.

**Fix:** el precio unitario **no se publica**. Si el cliente exige una referencia de ad-hoc, va **sin precio de
lista** o con un valor que **supere** el marginal del plan (ver B).

---

### 🩸 B. El ad-hoc es más barato que el marginal del plan — premiamos romper la planificación

| | Valor |
|---|---|
| Ad-hoc publicado *(SKY)* | **CLP 260.000** |
| Marginal del plan ampliado | **CLP 425.000** |
| | 🔴 **El ad-hoc cuesta 165.000 MENOS.** |

**Por qué es grave:** el ad-hoc **rompe la planificación, consume coordinación no presupuestada y desordena la
cola** — o sea, **cuesta más de producir.** Y le estamos poniendo el precio **más barato**. Estamos pagándole
al cliente para que nos desordene la operación.

**Fix:** **el ad-hoc SIEMPRE cuesta más que el marginal del plan.** Propuesta para SKY: **≥ CLP 550.000**, o
sin precio de lista publicado.

---

### 🩸 C. El plan ampliado está **dominado** — un analista de compras lo ve en 30 segundos

| Opción | Cálculo | Total |
|---|---|---|
| Plan **ampliado** (12 artículos) | lista | **CLP 6.900.000** |
| Plan **base + 4 ad-hoc** | 5.200.000 + (4 × 260.000) | **CLP 6.240.000** |
| | | 🔴 **El ampliado cuesta CLP 660.000 MÁS por lo mismo** |

**Por qué es grave:** no es solo que perdemos el upsell. Es que **cuando el analista lo detecte, no va a pensar
*"qué error"*. Va a pensar *"¿en qué más me están inflando?"*** — y pierdes la credibilidad de **toda** la
oferta, incluida la parte que estaba bien.

**Fix:** el plan mayor **siempre** más barato por unidad que el menor + ad-hoc. Es la condición **mínima** de
coherencia de un tarifario escalonado.

---

### 🩸 D. El loaded cost puede estar subestimado — y entonces el piso está mal

El squad blueprint computa `loaded = Σ (% dedicación × costo del rol en nómina) = CLP 2,26M`.
**Tres preguntas abiertas, cada una empuja el piso hacia arriba:**

1. ¿Ese "costo de nómina" es **sueldo bruto** o **costo empresa**? *(En Chile el costo empresa es ~1,25-1,3×
   el bruto. Los contractors USD vía Deel tienen otra estructura — **no aplica el mismo multiplicador**.)*
2. ¿Están las **herramientas**? *(Referencia: un in-house carga USD 1.200-2.400/año por persona en software.)*
3. 🎯 ¿El **% de dedicación asume 100% de tiempo productivo**? **La utilización real de la industria es 65%.**
   Un rol al 30% en el papel puede consumir **~46% de su capacidad real**.

**Lo que está en juego:** si el loaded real está ~20% arriba, **el precio de lista de SKY (5,2M) ya está EN el
piso**, y el margen de negociación que creemos tener **no existe**.

**Fix:** confirmar con `greenhouse-finance-accounting-operator` qué incluye `loaded_monthly_cost_usd` en
`sellable-roles-store` — **antes de la próxima cotización de squad creativo.**
→ `modules/04_PRICING.md` §3.

---

### 🩸 E. "Creative Hub" no existe — y es justo lo que un vendedor de creativo querría decir

Los viewCodes **`creative-hub`, `roi-reports`, `exports`, `cvr-quarterly`, `staff-augmentation`,
`brand-intelligence`** están sembrados en el registry **sin `page.tsx`**. **No existen.**

**Por qué es grave:** el nombre *"Creative Hub"* es tan tentador en un pitch creativo que es **cuestión de
tiempo** que alguien lo prometa. Y el día del onboarding, el cliente abre el menú y **no está**.

**Fix:** `efeonce/ESTADO_ACTUAL.md` §2 tiene la lista de rutas **reales**. **Solo esas se muestran.**

---

### 🩸 F. Cero casos creativos citables — y nadie está construyendo el primero

**No hay ni un solo caso creativo con métrica verificable + relación sana + autorización escrita.**
*(Sky, Bresler y Berel son casos de SEO/contenido, no de creatividad de marca.)*

**Por qué es grave:** cada engagement que cierra sin iniciar su caso es **munición perdida para siempre**.
Rescatar un caso un año después es pedir un favor; documentarlo desde el día 1 es un proceso.

**Fix:** **todo engagement creativo arranca su `templates/caso-estudio.md` el día 1**, y **la autorización de
portafolio se pide EN EL CONTRATO** *(cláusula, no favor)*. → `modules/05_SCOPE_SOW.md` §4.

---

### 🩸 G. No tenemos baseline propio de OTD / FTR / RpA creativo

**Y sin baseline, cualquier umbral que firmemos es una apuesta.** El umbral óptimo del registry
(OTD 90-100%) es **una meta de producto, no una declaración de nuestro desempeño real.**

**Fix:** **Nivel 0 de la escalera de compromiso** *(transparencia sin umbral)* hasta tener 3 meses de baseline.
→ `modules/11_METRICAS_COMPROMISO.md` §3.

---

### 🩸 H. El BCS se promete en el pitch de ICO — y no produce datos

`docs/context/07_ico.md:52` dice *"sin BCS mínimo no entra a producción"*. **El BCS es data-empty.**
**Ese gate no existe en el producto.** Si alguien lo dice en una reunión, está prometiendo un control que no
opera.

---

## 2. El pecado capital — 🔴 el arbitraje

> ## NUNCA vendas, insinúes o dejes entrever que somos más baratos porque somos LATAM.

**Ni en un desglose "de transparencia". Ni en un anexo. Ni verbalmente. Ni "entre nosotros".**

Los costos de nómina del squad (`USD 327` – `USD 1.250`) son **INTERNOS**. Que nuestro squad completo cueste
menos que un art director in-house de EE.UU. **es una consecuencia de nuestra estructura — no es la propuesta
de valor.**

**Por qué es el pecado capital:**

| Si vendes arbitraje | Lo que pasa |
|---|---|
| Te anclas al **costo**, no al valor | El cliente negocia contra tu costo, para siempre |
| Te vuelves **sustituible** | Siempre hay un país más barato |
| Te comparan con **BPO**, no con una agencia | Y el precio del BPO es una fracción del tuyo |
| Devalúas a tu propio equipo | Le dices al cliente que su trabajo vale poco |

🎯 **Lo correcto:** el precio refleja **la capacidad, el criterio y el gobierno** que entregamos. El costo es
**nuestro problema**, y es lo que nos permite ser rentables a un precio justo. **No es un argumento de venta:
es una ventaja competitiva que se protege callándola.**

---

## 3. Antipatrones de precio

| 🔴 NUNCA | Por qué |
|---|---|
| **Cotizar sin pasar por el cotizador** | Un precio sin loaded cost es una corazonada con decimales |
| **Vender horas o "bolsa de horas"** | Pones tu costo en la factura para que te lo negocien. Y la IA lo desploma |
| **Publicar precio por pieza o por rol** | Le entregas la calculadora para comoditizarte |
| **Descontar la capa de gobierno** *(portal, métricas, reportería)* | Costo marginal ≈ 0 y es tu **único** diferenciador. Descontarlo es regalar margen puro **y** devaluar el moat |
| **Cerrar bajo el 45%** | No es voluntad: **es aritmética**. Un cliente bajo el piso es una deuda con tu equipo |
| **Decir "déjame ver qué puedo hacer"** ante un pedido de descuento | Enseña que el precio era negociable desde el inicio. A partir de ahí, **todo lo que digas vale menos** |
| **Bajar el precio sin bajar el alcance** | Es la definición operativa de regalar margen |
| **Cobrar un Managed Squad a precio de staff-aug** | Regalas la parte que más vale: **el gobierno** |
| **Cotizar multianual en CLP con costos en USD sin buffer de FX** | El margen se evapora sin que nadie lo vea hasta el cierre del año |

---

## 4. Antipatrones de alcance

| 🔴 NUNCA | Por qué |
|---|---|
| **"Rondas ilimitadas" / "hasta que quede bien"** | Un alcance sin borde es una forma lenta de quebrar mientras todos se felicitan |
| **Aceptar un brief sin owner nombrado** | Sin alguien que apruebe **no hay ronda 1: hay rondas infinitas** |
| **Ceder derechos perpetuos/exclusivos/ilimitados en el fee base** | Regalas **2-3× el trabajo**. Y nadie se entera: simplemente el margen nunca llega |
| **Entregar archivos abiertos "de buena onda"** | Le entregas la capacidad de reproducirte |
| **Olvidar la autorización de portafolio en el contrato** | Después es un favor. En el contrato es una cláusula que nadie discute. **Y sin ella, cero casos** |
| **Ejecutar trabajo extra y facturarlo después** | Facturar una sorpresa es cómo se pierden clientes. **El change order va ANTES** |
| 🔴 **Cobrar la corrección de un error NUESTRO** | **Jamás.** Comer tus errores en silencio es lo que te da el derecho moral a cobrar los cambios de él |

---

## 5. Antipatrones de venta

| 🔴 NUNCA | Por qué |
|---|---|
| **Pitchear "somos mejores que tu equipo interno"** | Insultaste al único con poder de veto y le dijiste al CMO que se equivocó al contratarlo |
| **Decir que Superside/el freelancer son malos** | **Son buenos, y el cliente lo sabe.** Descalificarlos te hace ver defensivo. **Reencuadra, no ataques** |
| **Defenderte de "eso lo hago con IA"** | El cliente ya la usó y ya vio que funciona. **Dale la razón y mueve la conversación a gobierno** |
| **Competir por precio unitario / horas / portafolio** | Son los tres terrenos donde **siempre** hay alguien más barato, más rápido o más famoso |
| **Llevar al pitch un equipo que no va a trabajar en la cuenta** | La química que compraron es falsa. **El churn empieza el día 1** |
| **Hacer spec work gratis** | Regalas lo único que vendes **y** te posicionas como commodity. → `modules/10_PITCH.md` §4 |
| **Prometer una métrica de negocio del cliente** *(ventas, awareness, share)* | **No controlamos su mercado.** Regla dura 10 |
| **Mostrar una superficie del portal que no existe** | 🩸 E |
| **Firmar un umbral sin baseline** | 🩸 G |
| **Aceptar penalidad sin atribución madura** | Pagas por el desorden del cliente |
| **Entrar a un QBR sin haber mirado el dashboard del cliente** | Vas a que **él** te lo muestre a ti. Es la forma garantizada de perder la renovación |

---

## 6. Antipatrones de verdad

| 🔴 NUNCA | Por qué |
|---|---|
| **Citar las cifras de fricción de ICO** *(21 hrs/sem · 68% · 30%)* | **Pendientes de auditoría de fuente.** No tienen origen verificado |
| **Apilar "120+ empresas" + "80% renovación" + "10 años" + "win rate 50%"** en la misma lámina | Vienen de **fuentes distintas y no reconciliadas**. **Cita una, con su fuente** |
| **Decir "el attention span es de 8 segundos"** | **Fabricado.** No existe el estudio |
| **Decir "el 90% de lo que procesa el cerebro es visual"** | Mito de deck de agencia. Sin fuente seria |
| **Citar el 82% de in-housing como dato chileno** | Es **ANA / EE.UU.** Citarlo como local es falsificar la fuente |
| **Citar los múltiplos de usage rights como "estándar publicitario"** | Vienen del mundo creator/UGC. Son **direccionales**, no autoridad |
| **Inventar un caso, o presentar un mockup como si fuera trabajo entregado** | 🩸 F. **Y si te pillan una vez, todo lo demás que dijiste se cae** |
| **Decir un número que no está en `SOURCES.md`** | Si no está, **verifícalo antes de decirlo.** No lo recuerdes: **verifícalo** |

---

## 7. Antipatrones de skill *(para el agente que la usa)*

| 🔴 NUNCA | En su lugar |
|---|---|
| Reinventar el **método de venta** | → `commercial-expert` |
| Reinventar el **motion GTM** | → `gtm-architect` |
| Reimplementar **el oficio** *(cómo se diseña/anima/escribe)* | → los studios |
| Redactar la **cláusula legal** de derechos de uso | → `legal-privacy-ip-operator` *(esta skill decide **qué cobrar**; esa decide **cómo se redacta**)* |
| Duplicar el **pricing de SEO/contenido** | → `seo-aeo-practice` *(esa lane es suya)* |
| Componer el **deck** a mano | → `deck-studio` + Artifact Composer. **La fuente es el repo, no el PDF** |
| Guardar un **hecho de mercado de memoria** | → `SOURCES.md` + WebSearch. **Esta skill no recuerda: verifica** |
