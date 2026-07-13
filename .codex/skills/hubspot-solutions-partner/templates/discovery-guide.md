# Guía de discovery — HubSpot

> El **método** (MEDDIC y primos, calificación, deal review) es de **`commercial-expert`**.
> Esto es solo lo que aplica a HubSpot. Doctrina: `modules/10_DISCOVERY_SCOPING.md`.

---

## 🔴 Las tres que no puedes saltarte

| # | Pregunta | Qué decide |
|---|---|---|
| **1** | *"¿Ya tienen un **admin de Salesforce en planilla**?"* | Si sí → **se te cae medio argumento de TCO** (el delta lo hace el admin, no la licencia: USD 162k vs USD 189k = 17%). **Cambia el eje a adopción.** Mejor saberlo ahora que en el comité |
| **2** | *"¿Tienen **Dynamics 365 en producción**, o tienen **Microsoft 365**?"* | En el ~80% es lo segundo → **no hay sinergia que perder**. Si corren D365 sobre Dataverse con el ERP → **retírate** |
| **3** | *"¿**Cuántos custom objects, cuántos registros, qué throughput de API**?"* | *"'No escala' es una afirmación **sin unidades**."* Te posiciona como el adulto de la sala **y** te da los datos para descalificar honestamente |

---

## Descalificación — corre esto ANTES de invertir

| Pregunta | Respuesta que descalifica |
|---|---|
| ¿Cuántas **entidades de negocio propias** modelan? | **>10** → techo de 10 custom objects ✅ |
| ¿Tienen **gobernanza formal de cambios** (dev→QA→staging→prod) o auditoría regulatoria? | Sí → **1 sandbox, sync inicial de 5.000 contactos.** No hay UAT representativo |
| ¿El pliego exige **ISO 27001 del proveedor de software**? | Sí → 🔴 ✅ **HubSpot no lo reclama para sí mismo.** Verifica bajo NDA. **No lo afirmes** |
| ¿Exigen **residencia de datos** en LATAM/Brasil/UK/India? | Sí → ✅ **No existe** |
| ¿Necesitan **sync bidireccional en tiempo real** con ERP o core bancario? | Sí → límites de API |
| ¿Tienen **territory management**? | Sí → ⚠️ no hay role hierarchy |
| ¿**Cuántos contactos B2C**? | Millones → **Adobe/Salesforce salen más baratos a escala** |
| ¿Corren **D365 Finance/Supply Chain**? | Sí → **retírate** |
| ¿Corren **AEM + Analytics + Target** con equipo? | Sí → casa Adobe real. *(⚠️ Creative Cloud **NO** cuenta)* |
| ¿**Cuántas personas** y hay **equipo de marketing**? | <30 y no → **Zoho/Pipedrive es más barato y tienen razón** |
| ¿Tienen **Apex / managed packages / CPQ** críticos? | Sí → no migran. **Cotiza la reescritura o descalifica** |

**La frase:**
> *"Con lo que me cuentan, HubSpot **no** les da el ancho — y se lo digo ahora, no dentro de seis meses.
> [El límite, con el número.] Lo que sí puedo hacer es [alternativa honesta]. Y si el problema cambia, acá estoy."*

---

## Dimensionar sin sub-cotizar

**Cada línea que no preguntes es margen que pagas tú.**

### Seats
- [ ] ¿Cuántos **crean/editan** vs solo **ven**? *(View-only = **USD 0** ✅ — **regálalos**)*
- [ ] ¿Cuántos crean/editan **quotes**? → **Revenue Seat**
- [ ] ¿Sales Hub Pro/Ent? → **Sales Seat**. ¿Service? → **Service Seat**
- [ ] ⚠️ **Multi-hub → cotización oficial.** El accounting de core seats cross-hub es ambiguo

### Contactos de marketing
- [ ] ¿Cuántos contactos **comercializables** hoy?
- [ ] 🔴 **¿A cuántos llegan en 12 meses?** Saltos **escalonados**: 2.000 → 2.001 = **+USD 250/mo** ✅
- [ ] ¿Cuántos emails al mes? Cap: **10× (Pro) / 20× (Ent)** el tier ✅

### Créditos de Breeze
- [ ] ¿Customer Agent? → **USD 0,50 por conversación resuelta** ✅. ¿Cuántas al mes?
- [ ] ¿Prospecting Agent? → **USD 1,00 por lead** ✅
- [ ] 🔴 **NO sumar créditos entre hubs.** Cuatro hubs Ent = **5.000, no 20.000** ✅. **Sin rollover**

### Implementación
- [ ] ¿Cuántas integraciones? ¿Cuáles custom vía API?
- [ ] ¿Cuántos registros migran? ¿De dónde?
- [ ] 🔴 ¿Hay **Apex / managed packages / Visualforce / CPQ**? → **no migran**
- [ ] ¿Cuántos workflows hoy? *(Suelen consolidarse ~6:1)*
- [ ] ¿Reportes históricos y forecasting a rehacer? → **se rehacen**
- [ ] 🔴 **¿Los datos están sucios?** → **cotiza la limpieza o no migres**

### Onboarding
- [ ] 🔴 **Es obligatorio** ✅. Marketing **USD 3.000/USD 7.000** · Sales y Service USD 1.500/USD 3.500
- [ ] ❌ **Bundle Customer Platform: NO publicado. PÍDELO.**

---

## Triggers — la ventana está abierta ahora

- [ ] ¿Cambió el **CMO / CRO / VP RevOps** en los últimos 6 meses?
- [ ] 🔴 **¿Cuándo renuevan Salesforce / Marketo / Dynamics?** *(Trabájalo 6 meses antes)*
- [ ] ¿Levantaron ronda? ¿Hubo M&A?
- [ ] ¿Hay un **mandato de IA** desde el directorio?
- [ ] ¿El **tráfico orgánico está cayendo**? → 🎯 **la cuña AEO**
- [ ] ¿Ya tienen HubSpot **con un solo Hub**? → 🥇 **la venta más barata que existe**
- [ ] ✅ ¿Construyeron sobre **Custom Assistants**? → **se les rompió el 2026-07-13**

---

## El comité

| Rol | Qué le importa | 🔴 Qué NO le digas |
|---|---|---|
| **CMO** | Pipeline, atribución, velocidad | Arquitectura |
| **CRO** | Adopción, forecast | Que Gartner los puso Niche Player en SFA |
| **RevOps** | El modelo de datos. **No volver a migrar en 2 años** | 🔴 **Nunca le mientas. Te va a verificar** |
| **IT / Seguridad** | SOC 2, SSO, sandboxes, API, residencia | 🔴 **Nunca afirmes ISO 27001** |
| **CFO** | **El costo del admin.** Ese es el número | El TCO contra la *lista* de Salesforce (van a descontar) |
| **Champion** | Que el proyecto **no lo haga quedar mal** | Un big bang |

> 🎯 **RevOps decide, y decide por miedo — miedo a migrar dos veces.**
> El vendedor que le lleva los límites documentados **antes** de que los pregunte se gana el deal.
