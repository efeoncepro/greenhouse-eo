# 10 · Discovery, scoping y descalificación

> El **método** de discovery (MEDDIC y sus primos, calificación, deal review) es de **`commercial-expert`**.
> Este módulo aporta lo que **solo** aplica a HubSpot: qué preguntar para no sub-cotizar, y **cuándo no vender**.

---

## 0. 🔴 La pregunta que va ANTES de las otras tres: ¿quién es el champion?

> **Sin champion no hay adopción. Sin adopción hay churn. Y el churn te corta la comisión y te mata el tier.**

**Caso GyT Group (Efeonce, 2026):** compraron HubSpot, lo probaron, **nunca hubo adopción real**.
*"Faltó un champion que liderara el proyecto adentro."* Churnearon. **No es recuperable.**
Y en el camino se llevaron: la comisión, los puntos, el GRR, y el costo hundido de la implementación.

⚠️ Y no es anecdótico: la **baja adopción explica ~38% de los fracasos de proyectos CRM** — más que cualquier
causa técnica. **El 75%+ de los fracasos son de personas y proceso, no de tecnología.**

### Las cuatro preguntas del champion

1. **¿Quién, con nombre y apellido, va a liderar esto adentro?** *(No "el área de marketing". Una persona.)*
2. **¿Qué le pasa a esa persona si el proyecto funciona? ¿Y si fracasa?**
   Si la respuesta a las dos es "nada", **no tienes champion: tienes un contacto.**
3. **¿Tiene autoridad para pedirle al equipo que cambie cómo trabaja?** Si no, el CRM se compra y no se usa.
4. **¿Cuánto tiempo semanal le va a dedicar?** Si es "lo que pueda", el proyecto ya fracasó.

### 🔴 La regla dura

| Situación | Qué haces |
|---|---|
| **No hay champion identificable** | ❌ **No vendas Pro ni Enterprise.** Vende **Starter** o **Free**, consigue adopción real primero, y **expande** cuando el champion emerja |
| **El champion es el que firma pero no el que opera** | ⚠️ Bandera roja. Necesitas al **operador** comprometido, no solo al pagador |
| **El champion se va durante el proyecto** | 🔴 **Para y renegocia.** Un proyecto sin champion es un churn con fecha |

> **Un deal que cierras sin champion no es un ingreso: es un churn diferido con costo de implementación
> hundido.** Perderlo a tiempo es más barato que ganarlo.

---

## 1. Las tres preguntas que cambian el deal

Si no haces estas tres en la **primera** llamada, vas a descubrir la respuesta en la propuesta — tarde.

### 1️⃣ *"¿Ya tienen un admin de Salesforce en planilla?"*
🔴 **El delta de TCO contra Salesforce lo hace el admin, no la licencia** ($162k vs $189k a 3 años = **17%**).
Si ya lo tienen y no lo van a despedir, **la mitad de tu argumento se cae.**
**Mejor saberlo ahora que en el comité.** Y si la respuesta es sí → cambia el eje a **adopción y velocidad**.

### 2️⃣ *"¿Tienen Dynamics 365 en producción, o tienen Microsoft 365?"*
En el ~80% de los casos, *"ya tenemos Microsoft"* significa **Teams y Outlook**. **Ahí no hay ninguna sinergia
que perder** — HubSpot integra igual de bien. Si de verdad corren **D365 sobre Dataverse con el ERP**,
**retírate**.

### 3️⃣ *"¿Cuántos custom objects, cuántos registros, qué throughput de API?"*
> *"'No escala' es una afirmación **sin unidades**. Díganme el número."*

Esa pregunta hace tres cosas a la vez: **te posiciona como el adulto de la sala**, **te da los datos para
descalificar honestamente**, y **desarma la objeción antes de que la levanten**.

---

## 2. Dimensionar sin sub-cotizar — el checklist

**Cada línea que no preguntes es margen que pagas tú.**

### Seats
- ¿Cuántas personas necesitan **crear/editar** vs solo **ver**? *(View-only seats: **$0** ✅ — regálalos)*
- ¿Cuántas van a crear/editar **quotes**? → **necesitan Revenue Seat** ✅
- ¿Cuántas usan Sales Hub Pro/Ent? → **Sales Seat**. ¿Service? → **Service Seat**
- ⚠️ **Multi-hub:** el accounting de core seats cross-hub es **ambiguo en la web pública**.
  🔴 **Exige la cotización oficial de HubSpot antes de prometer un número.**

### Contactos de marketing
- ¿Cuántos contactos **comercializables** tienen hoy? *(No cuántos contactos: cuántos **marketing contacts**)*
- 🔴 **¿A cuántos van a llegar en 12 meses?** Los saltos son **escalonados**: un Pro que pasa de 2.000 a
  2.001 salta **+$250/mo** ✅. **Modela el crecimiento, no la foto.**
- ¿Cuántos emails mandan al mes? ✅ El cap es **10× (Pro)** / **20× (Ent)** el tier de contactos.
  **Si lo exceden, el modelo de precio no les sirve.**

### Créditos de Breeze
- ¿Van a usar Customer Agent? → **$0,50 por conversación resuelta** ✅. ¿Cuántas conversaciones al mes?
- ¿Prospecting Agent? → **$1,00 por lead recomendado** ✅
- 🔴 **Los créditos NO se suman entre hubs.** Cuatro hubs Enterprise = **5.000 créditos, no 20.000** ✅.
  **Y no hay rollover.** Si cotizaste sobre la suma, la diferencia sale de tu bolsillo.

### Onboarding
- 🔴 **Es obligatorio en Pro y Enterprise** ✅. Marketing: **$3.000 / $7.000**. Sales y Service: $1.500 / $3.500.
- ❌ **El fee del bundle Customer Platform NO está publicado.** Es la diferencia entre $7K y $14K+ en la
  primera factura. **Pídelo por escrito antes de cotizar.** → `modules/11` § 2 (el arbitraje).

### Implementación
- ¿Cuántas integraciones? ¿Cuáles son custom vía API?
- ¿Cuántos registros migran? ¿De dónde?
- ¿Hay **Apex, managed packages, Visualforce o CPQ**? → **no migran. Se reescriben o se pierden**
- ¿Cuántos workflows/automatizaciones tienen hoy? *(Suelen consolidarse ~6:1)*
- ¿Hay reportes históricos y forecasting que haya que rehacer? **Se rehacen.**

---

## 3. 🔴 La matriz de descalificación

**Corre esto ANTES de invertir en el deal.** Cada fila es una razón legítima para no vender.

| Pregunta | Si la respuesta es… | Veredicto |
|---|---|---|
| ¿Cuántas **entidades de negocio propias** modelan? | **>10** | ❌ **Descalifica.** Techo de 10 custom objects ✅ |
| ¿Tienen **gobernanza formal de cambios** (dev→QA→staging→prod) o auditoría regulatoria? | Sí | ❌ **1 sandbox, 200K registros, sync inicial de 5.000 contactos** ✅. No puedes hacer UAT representativo |
| ¿El pliego exige **ISO 27001 del proveedor de software**? | Sí | 🔴 ✅ **HubSpot NO lo reclama para sí mismo.** Verifica bajo NDA. **No lo afirmes** |
| ¿Exigen **residencia de datos** en LATAM/Brasil/UK/India? | Sí | ❌ **No existe.** Y con HIPAA activo, **nunca** puedes migrar de datacenter |
| ¿Necesitan **sync bidireccional en tiempo real** con ERP o core bancario? | Sí | ❌ Límites de API. 🔴 Las apps públicas OAuth topan en **110 req/10s** y **el add-on NO lo levanta** |
| ¿Tienen **territory management** o jerarquía de roles compleja? | Sí | ❌ ⚠️ HubSpot tiene teams + permission sets, **no role hierarchy** |
| ¿**Cuántos contactos B2C**? | Millones | ❌ Ent a 500K+ = $60 por cada 10.000. **Adobe/Salesforce salen más baratos a escala** |
| ¿Corren **D365 Finance/Supply Chain**? | Sí | ❌ **Retírate.** El CRM en Dataverse es legítimo |
| ¿Corren **AEM + Analytics + Target** con equipo? | Sí | ❌ Casa Adobe real. *(⚠️ **Creative Cloud NO cuenta**)* |
| ¿**Cuántas personas** y hay **equipo de marketing**? | <30 y no | ❌ Zoho/Pipedrive es más barato **y tienen razón** |
| ¿Necesitan **CPQ multinivel** con aprobaciones complejas? | Sí | ⚠️ Revenue Hub llegó en 2026. **Trae al SE. No prometas solo** |
| ¿Tienen **Apex / managed packages críticos**? | Sí | ⚠️ No migran. **Cotiza la reescritura o descalifica** |

### La frase que descalifica sin quemar la relación
> *"Con lo que me cuentan, HubSpot **no** les da el ancho — y se lo digo ahora, no dentro de seis meses.
> [El límite concreto, con el número.] Lo que sí puedo hacer es [alternativa honesta].
> Y si en dos años el problema cambia, acá estoy."*

**Perder este deal honestamente te da la referencia para los próximos tres.**

### 💰 El costo real de vender un deal que se rompe
Implementación fallida → churn → ✅ **comisión cortada** → **puntos managed a cero** → **GRR dañado** →
**tier en riesgo**.

> **Un mal cliente no te cuesta un proyecto. Te cuesta el tier.** → `modules/03_MOTOR_LIBRO.md`.

---

## 4. La regla de calificación de escala

| Señal | Veredicto |
|---|---|
| <500K contactos · <10 custom objects · integraciones estándar · sin CPQ complejo | ✅ **Escala. Pelea el deal** |
| Modelo B2B complejo: suscripciones + assets + licencias + tiers de partner | ⚠️ **Diseño de schema up-front obligatorio.** Trae al SE |
| >1,5M registros de custom object · >20 definiciones · Apex crítico · CPQ multinivel · >190 API req/10s sostenido | ❌ **Se rompe. Descalifica** |

---

## 5. El audit como caballo de Troya

**Para prospectos que YA tienen HubSpot** (o el CRM del competidor), el mejor discovery **no es una reunión:
es una auditoría.**

| Audit | Qué revela | Qué habilita |
|---|---|---|
| 🎯 **Visibilidad en IA** (el grader) | No aparecen cuando su comprador pregunta | **Marketing Hub Pro** → `modules/07` |
| **Portal HubSpot** (Kortex) | Datos sucios, workflows rotos, seats sin usar, adopción real | Cross-sell **con evidencia**, no con hipótesis |
| **Stack** | 6 herramientas que hacen lo mismo | Consolidación |
| **Datos** | Duplicados, campos vacíos, sin gobierno | **Data Hub** |

> **Empieza dándole algo verdadero.** Y si en la auditoría encuentras que **está pagando por seats que no
> usa**, díselo y quítaselos. Ese gesto **te compra el derecho** a proponerle el siguiente Hub.

---

## 6. Anti-patrones

| Anti-patrón | Costo |
|---|---|
| **Cotizar sin preguntar por el crecimiento de la base de contactos** | +$250/mo de sorpresa en el mes 3 |
| **Sumar créditos entre hubs** | La diferencia sale de tu bolsillo |
| **Olvidar el onboarding fee** | La conversación de la primera factura es horrible |
| **Cotizar multi-hub sin cotización oficial** | El accounting de seats cross-hub es ambiguo |
| **Descubrir el admin de Salesforce en la propuesta** | Se te cae medio argumento **frente al comité** |
| **No descalificar por "no perder el deal"** | Un cliente que se rompe **te cuesta el tier**, no el proyecto |
| **Prometer sobre custom objects, sandboxes o ISO sin verificar** | RevOps y Seguridad **te van a verificar**. Y te van a encontrar |
| **Vender Enterprise a quien no tiene CRM** | Vende **Starter**, gana adopción, **expande** |
