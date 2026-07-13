# 04 · ICP, señales y comité de compra

> El método de ICP, scoring y calificación es de **`commercial-expert`**. Este módulo aporta **el dominio**:
> quién compra HubSpot, quién **no debería**, y qué señales predicen un deal.

---

## 1. El ICP — y el dato que lo enmarca

✅ **ARPU de HubSpot: $11.722/año.** Un deal de seis cifras es **10× su cliente promedio**.

> **El producto está diseñado para el mid-market.** Vender enterprise es vender en el extremo derecho de su
> distribución. Se puede — HubSpot lo declara como su tesis de crecimiento en un filing público — pero
> **cada límite del producto se vuelve material** (→ `modules/01` § 6).

### Perfil que compra bien

| Dimensión | Señal buena |
|---|---|
| **Tamaño** | 50-500 empleados · 10-100 usuarios de CRM. Mid-market real |
| **Equipo de marketing** | **Existe** y tiene presupuesto propio. Es el comprador natural — y donde HubSpot es Leader |
| **Dolor** | Stack fragmentado · marketing y ventas sobre datos distintos · atribución rota · nadie sabe cuánto pipeline hay |
| **Madurez de datos** | Modelo de negocio **estándar**: contactos, empresas, deals, tickets. **<10 entidades propias** |
| **Ambición** | Quieren una **plataforma**, no un tracker. Van a necesitar marketing + servicio en 18 meses |
| **Cultura** | Valoran **adopción** y velocidad por sobre configurabilidad infinita |

### 🔴 El requisito que no aparece en ninguna tabla: **el champion**

> **Sin champion no hay adopción. Sin adopción hay churn. El churn te corta la comisión y te mata el tier.**

**Caso GyT Group (Efeonce, 2026):** compraron, probaron, **nunca hubo adopción real**. *"Faltó un champion
que liderara el proyecto adentro."* Churnearon, y **no es recuperable**.

**Es un requisito de ICP, no un detalle de delivery.** Una empresa con el tamaño perfecto, el dolor perfecto
y el presupuesto perfecto **pero sin un dueño interno del proyecto NO es tu ICP**.
→ Las cuatro preguntas del champion: `modules/10_DISCOVERY_SCOPING.md` § 0.

**Sin champion:** vende **Starter** o **Free**, consigue adopción, **expande cuando el champion emerja**.
Nunca Pro ni Enterprise.

### 🔴 Perfil que NO deberías vender — descalifica temprano

| Señal | Por qué |
|---|---|
| **No hay un champion interno identificable** | 🔴 **El más caro de todos.** GyT Group. Adopción cero → churn → comisión cortada → tier |
| **Cliente muy chico en tier Starter** | ⚠️ **Caso GeaAmbiental:** suite Starter, empresa demasiado pequeña. MRR mínimo → comisión mínima → **puntos managed mínimos**. El costo de servir supera el retorno. **No todo cliente que se puede cerrar vale la pena cerrarlo** |
| **>10 entidades de negocio propias** | Techo de 10 custom objects ✅. Seguros, manufactura, healthcare, logística, banca |
| **Gobernanza formal de cambios** (dev→QA→staging→prod) o auditoría regulatoria | **1 sandbox, 200K registros, sync inicial de 5.000 contactos** ✅. No puedes hacer UAT representativo |
| **El pliego exige ISO 27001 del proveedor de software** | ✅ **HubSpot no lo reclama para sí mismo.** Verifica bajo NDA — no lo afirmes |
| **Requisito de residencia de datos en LATAM / Brasil (LGPD) / UK / India** | ✅ **No existe.** Y con HIPAA activo, **nunca** puedes migrar de datacenter |
| **Sync bidireccional en tiempo real con ERP o core bancario** | Límites de API. 🔴 Las apps públicas OAuth topan en 110 req/10s **y el add-on no lo levanta** |
| **Organización matricial global con territory management** | ⚠️ No hay role hierarchy ni territorios como Salesforce |
| **B2C con millones de contactos** | Ent a 500K+ = $60 por cada 10.000; envío capado a 20×. **Adobe/Salesforce salen más baratos a escala** |
| **Corren D365 Finance/Supply Chain (ERP)** | El CRM en el mismo Dataverse es un argumento legítimo. **Retírate** |
| **Casa Adobe real** (AEM + Analytics + Target en producción, con equipo) | Retírate elegante. *(Ojo: **Creative Cloud NO es "ser casa Adobe"**)* |
| **<30 personas, sin equipo de marketing, presupuesto duro** | Zoho/Pipedrive es más barato **y tienen razón**. Perder rápido es ganar tiempo |

---

## 2. Triggers de compra — las señales que abren la ventana

Ordenadas por poder predictivo.

### 🔴 De máxima señal
| Trigger | Por qué | Cómo se detecta |
|---|---|---|
| **Cambio de CMO / CRO / VP de RevOps** | Los primeros 90 días son cuando se reevalúa el stack. **La ventana se cierra rápido** | LinkedIn, prensa, cambio en el sitio |
| **Renovación de Salesforce / Marketo / Dynamics** | El único momento del año en que el costo está sobre la mesa. **Trabájalo 6 meses antes** | Discovery. Pregunta directo: *"¿cuándo renuevan?"* |
| **Ronda de inversión / M&A** | Presupuesto nuevo + presión de reporting + consolidación de stacks | Prensa, Crunchbase |
| **Mandato de IA desde arriba** | El directorio pidió "IA". Nadie sabe qué significa. **Tú sí.** El outcome-based pricing es la respuesta honesta | Conversación, contenido del CEO |

### Señales de producto (visibles desde afuera)
| Señal | Lectura |
|---|---|
| **Tráfico orgánico cayendo** | El dolor del AEO. **−27% YoY es el promedio según HubSpot** → `modules/07` |
| **No aparece en ChatGPT/Perplexity para su categoría** | 🎯 **Tu diagnóstico gratis.** El AI Visibility Grader lo prueba |
| **Ya tiene HubSpot con un solo Hub** | 🥇 **La motion más barata que existe.** Cross-sell → `modules/08` |
| **Construyó sobre Custom Assistants de HubSpot** | ✅ **Hoy se le rompió algo** (read-only desde 2026-07-13). Puerta de entrada con fecha |
| Ofertas de trabajo de "Salesforce Admin" | Están pagando el FTE que es tu argumento de TCO |
| Stack visible con 6+ herramientas de marketing | Fragmentación. El pitch de consolidación |

### Triggers regulatorios — **son triggers de venta, no compliance**
Una ley nueva de datos personales fuerza consentimiento, trazabilidad, derecho de supresión y auditoría
sobre bases de contactos que hoy viven en planillas y en herramientas sueltas.
**Eso es un proyecto de CRM con fecha de vencimiento impuesta por el Estado.**

⚠️ **Verifica la vigencia y el alcance con `legal-privacy-ip-operator` antes de usarlo en una reunión.**
🔴 **Y ten cuidado:** el mismo marco puede exigir **residencia de datos local** — que es un
**descalificador de HubSpot** (§ 1). El trigger y el dealbreaker viven en la misma ley. **Averigua cuál de
los dos te toca antes de invertir en el deal.**

---

## 3. El comité de compra real

| Rol | Qué le importa | Qué le dices | Qué NO le dices |
|---|---|---|---|
| **CMO / VP Marketing** | Pipeline, atribución, velocidad, no depender de IT | Loop Marketing, AEO, time-to-value | Detalles de arquitectura |
| **CRO / VP Ventas** | Adopción del equipo, forecast confiable | *"Sus vendedores lo van a usar"*. El caso 48%→94% | Que Gartner los puso Niche Player en SFA |
| **RevOps** | **Es tu champion o tu verdugo.** Le importa el modelo de datos y no volver a migrar en 2 años | Los límites reales, **por escrito**. **La honestidad acá te compra el deal** | Nunca le mientas. Te va a verificar |
| **IT / Seguridad** | SOC 2, SSO, sandboxes, API, residencia | Trust Center, el calendario público de deprecación | 🔴 **Nunca afirmes ISO 27001.** Te van a pedir el certificado |
| **CFO** | TCO, no la licencia | **El costo del admin.** Ese es el número | El TCO contra la lista de Salesforce (van a descontar) |
| **Legal** | DPA, SCCs, residencia, retención | El DPA está publicado | → `legal-privacy-ip-operator` |
| **El champion** | Que el proyecto **no lo haga quedar mal** | Un plan de fases con una victoria visible en 30 días | Un big bang |

> 🎯 **RevOps decide, y decide por miedo — miedo a migrar dos veces.** El vendedor que le lleva los límites
> documentados **antes** de que los pregunte se gana el deal. El que se los oculta lo pierde en el mes cuatro.

---

## 4. Descalificar es vender

**Perder un deal honestamente te da la referencia para los próximos tres.** Y protege tu GRR, que es tu tier.

**La frase:**
> *"Con lo que me cuentan, HubSpot **no** les da el ancho. Se lo digo ahora y no dentro de seis meses.
> Lo que sí puedo hacer es [alternativa honesta]. Y si en dos años el problema cambia, acá estoy."*

**El costo de vender un deal que se rompe:** implementación fallida → churn → **comisión cortada** ✅ →
**puntos managed a cero** → **GRR dañado** → tier en riesgo. **Un mal cliente te cuesta el tier, no solo el
proyecto.** → `modules/03_MOTOR_LIBRO.md`.

---

## 5. Mapa de cuentas — por dónde empezar (orden de facilidad)

| Prioridad | Segmento | Por qué |
|---|---|---|
| 🥇 | **Tus propios clientes con un solo Hub** | Ya eres partner admin. Cross-sell paga **sourced** (10 pts/$100) *y* engorda tu managed. **Suma a los dos motores con un movimiento** |
| 🥈 | **Tus clientes dormidos / con acceso desactivado** | Siguen en HubSpot. Siguen siendo comisión. Y bajo **Best Partner Wins** son **territorio abierto para otro partner** |
| 🥉 | **La base instalada de HubSpot que vendió otro partner** | ✅ El deal-based model te deja comisionar igual. Nadie les está vendiendo el segundo Hub |
| 4️⃣ | **Prospectos con trigger activo** (§ 2) | La ventana está abierta ahora |
| 5️⃣ | **Prospectos fríos con ICP perfecto** | El más caro. Solo con la cuña AEO como carta de presentación |

→ Ejecución: `modules/08_OUTBOUND_ABM.md`. Estado real de la cartera de Efeonce: `efeonce/ESTADO_ACTUAL.md`.
