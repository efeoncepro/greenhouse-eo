# 08 · Outbound y ABM — la base instalada es territorio

> El método de prospección, secuencias y cadencias es de **`commercial-expert`**.
> Este módulo aporta el **dominio**: a quién, con qué señal, y con qué punto de vista.

---

## 1. 🎯 La motion que casi nadie está corriendo: la base instalada

✅ Desde el **2025-11-17**, el deal-based model dice: *"Partners will receive commission for any MRR they
cross-sell on any product line"* — **sin importar quién trajo la cuenta.**

> **Toda cuenta de HubSpot en tus mercados es territorio vendible.**
> Las que vendió otro partner. Las que vendió el directo. Las que nadie está atendiendo.
> **Y a nadie le están vendiendo el segundo Hub.**

Es la **motion más barata del programa**: el cliente ya validó el producto, ya pagó, ya está adentro.
No estás vendiendo HubSpot — estás vendiendo **el Hub que le falta**.

### Cómo se construye la lista
1. **El directorio de clientes de HubSpot** no es público, pero las cuentas **se delatan**: `hs-sites.com`,
   formularios de HubSpot, el chat widget, el tracking code, el blog en Content Hub, los emails con
   `hubspotemail.net`.
2. **Semrush / builtwith-style**: filtro tecnográfico por HubSpot en el mercado objetivo.
3. **El propio grader**: si corres el AI Visibility Grader sobre una lista de ICP y ves quién usa HubSpot,
   tienes **el problema y el stack** en el mismo movimiento.
4. **Tu red**: ex-clientes, gente que se cambió de empresa y llevó HubSpot con ella.

### 🔴 La regla dura del cross-sell a base instalada
- **Registra el deal el día que lo detectas.** El deal registration es obligatorio y exclusivo ✅.
- **Consigue el POI firmado.** Rige **Best Partner Wins**: gana quien obtiene la firma del cliente, no quien
  trabajó más.
- **Coordina el shared deal con el Growth Specialist** que gestiona la cuenta. ❌ El proceso operativo no está
  publicado — **pídeselo al PDM y documéntalo en `modules/02` § 5.**

### Y la advertencia que corta para tu lado
**Tus cuentas también son territorio de otros.** Un cliente tuyo que sigue en HubSpot y al que dejaste de
atender es una cuenta que **otro partner puede firmar mañana** — y llevarse los puntos sourced de una cuenta
que **tú** originaste. → `modules/03_MOTOR_LIBRO.md` § 2.

---

## 2. Enriquecimiento de cuentas — CRM + sitio + fuentes públicas

El MCP/API de HubSpot es el **intake de la cartera**, no la verdad completa sobre la empresa. En particular,
`country` puede estar vacío, obsoleto, derivado de un contacto, representar la casa matriz o no reflejar los
mercados donde la cuenta realmente opera.

🔴 **Nunca excluir una cuenta sólo porque `country` está vacío o no coincide con el mercado objetivo.** Para
una revisión Chile/México/Colombia/Perú, incluir cuentas con país objetivo **y** cuentas sin país que tengan
dominio, website, teléfono, dirección, contactos o actividad que permitan investigarlas.

### Protocolo obligatorio de tres pasadas

| Pasada | Qué revisar | Qué aporta |
|---|---|---|
| **1. HubSpot** | Nombre, dominio, website, `country` raw, ciudad, teléfono, industria, tamaño, owner, lifecycle, productos, actividad y contactos asociados | Relación existente, historial comercial y campos candidatos; no confirmar geografía sólo con una property |
| **2. Sitio oficial** | Home, about, contacto, locations, footer/legal, idioma, moneda, teléfonos, oferta, clientes, equipo, careers y tecnología observable | País/sede y mercados operativos; qué vende, a quién, madurez digital, señales de escala y wedge probable |
| **3. Internet público** | LinkedIn Company, buscador, prensa reciente, directorios/registro empresarial cuando aplique, vacantes, expansión, funding y cambios ejecutivos | Corroboración, triggers recientes, tamaño aproximado y contexto ausente del CRM/sitio |

El sitio oficial es evidencia primaria para identidad y operación declarada; LinkedIn y buscadores ayudan a
corroborar y descubrir cambios recientes. Un dominio o TLD geográfico es una señal, **no prueba suficiente**.
Una empresa `.com` puede operar en LATAM y una `.cl` puede ser filial de una compañía global.

### Campos de trabajo para cada cuenta

No colapsar todo en una sola etiqueta `country`. Mantener durante el análisis:

- `crm_country_raw`: valor exacto encontrado en HubSpot, incluso vacío.
- `hq_country_inferred`: sede probable o confirmada.
- `operating_markets`: países donde vende, atiende o tiene operación visible.
- `company_context`: oferta, segmento, buyer, tamaño/señales y stack observable.
- `trigger`: evento reciente útil para abrir conversación.
- `wedge`: hipótesis comercial HubSpot/Efeonce derivada del contexto.
- `evidence_urls`: URLs concretas que sostienen geografía, contexto y trigger.
- `confidence`: `high`, `medium` o `low`, con `verified_at`.

**Confianza alta:** sitio oficial + segunda fuente coherente. **Media:** una fuente sólida o varias señales
indirectas coherentes. **Baja:** inferencia por nombre, TLD, idioma o teléfono sin corroboración. Las cuentas de
confianza baja permanecen como `unknown/research`, no se descartan ni se presentan como dato confirmado.

### Qué debe producir la revisión

Cada fila del shortlist debe responder, antes del outreach:

1. ¿Es la empresa correcta y cuál es su dominio canónico?
2. ¿Dónde está su sede y en qué mercados opera realmente?
3. ¿Qué vende, a quién y con qué complejidad comercial/de servicio?
4. ¿Qué señal observable abre una conversación ahora?
5. ¿Qué wedge y Champion probable corresponden?
6. ¿Qué sabemos por CRM y qué inferimos desde fuentes públicas?

No escribir inferencias de vuelta a HubSpot automáticamente. Primero entregar propuesta de enriquecimiento con
evidencia, confianza y conflictos; cualquier mutación del CRM requiere confirmación y preserva el valor raw.

---

## 3. El punto de vista — qué vendes realmente

**❌ No vendas HubSpot.** Nadie se despierta queriendo comprar un CRM.

**✅ Vende el costo de lo que ya está pasando:**

| El dolor | Cómo lo nombras |
|---|---|
| **Stack fragmentado** | *"Marketing mira un número, ventas mira otro, y nadie sabe cuál es verdad."* |
| **El FTE invisible** | *"Están pagando un admin de Salesforce de $X al año para mantener algo que debería mantenerse solo."* |
| **La atribución rota** | *"¿Cuánto pipeline generó marketing el trimestre pasado? Si la respuesta tarda más de un minuto, ahí está el problema."* |
| 🎯 **La visibilidad en IA** | *"Su tráfico orgánico cayó. Y cuando su comprador le pregunta a ChatGPT, aparece su competidor."* → **la cuña** |
| **La memoria comercial** | *"Si su mejor vendedor renuncia mañana, ¿qué se lleva en la cabeza?"* |

**La cuña AEO (`modules/07`) es el mejor abridor en frío que tienes**, porque no pide nada: **regala un
diagnóstico verdadero y verificable** antes de mencionar un producto.

---

## 4. Prioridad de cuentas — por costo de adquisición ascendente

| # | Segmento | Costo | Señal de entrada |
|---|---|---|---|
| **1** | **Tus clientes con un solo Hub** | 🟢 Casi cero — ya eres su partner admin | El health check del QBR |
| **2** | **Tus clientes dormidos / con acceso desactivado** | 🟢 Bajo — la relación existió | *"Vimos que siguen en HubSpot. Queremos volver."* |
| **3** | **Base instalada de otro partner, desatendida** | 🟡 Medio | El Hub que les falta + el grader |
| **4** | **Prospectos con trigger activo** (`modules/04` § 2) | 🟡 Medio | El trigger. La ventana está abierta ahora |
| **5** | **ICP frío perfecto** | 🔴 Alto | Solo con la cuña AEO |

> **Trabaja de arriba hacia abajo.** Cada nivel que saltas multiplica tu costo de adquisición.
> Un partner que hace outbound frío teniendo clientes con un solo Hub está resolviendo el problema difícil
> antes que el fácil.

---

## 5. Señales tecnográficas — qué mirar antes de escribir

| Señal | Dónde se ve | Qué significa |
|---|---|---|
| Tracking code de HubSpot, sin blog en Content Hub | Código del sitio | Tiene el CRM, no tiene marketing |
| Formularios de HubSpot + Salesforce en el footer legal | Sitio | **Convivencia.** El dolor de la doble fuente ya existe |
| Ofertas de trabajo de "Salesforce Admin" | LinkedIn | **Están pagando tu argumento de TCO** |
| Ofertas de "Marketo Ops" | LinkedIn | Perfil caro y escaso. Si se va, se congelan |
| Blog activo pero **sin citaciones en LLM** | El grader | 🎯 **Tu diagnóstico.** Están trabajando y nadie los ve |
| Stack de 6+ herramientas de marketing | Builtwith / el sitio | Fragmentación. El pitch de consolidación |
| Custom Assistants de HubSpot | Discovery | ✅ **Se le rompió el 2026-07-13.** Puerta con fecha |
| Créditos de Breeze agotados | Discovery | Está usando IA de verdad. Upgrade o capacity pack |

---

## 6. La secuencia — estructura, no plantilla

*(La mecánica de cadencias, canales y timing es de `commercial-expert`. Acá va solo lo que es HubSpot.)*

```
T0  · El diagnóstico, sin pedir nada
      "Le preguntamos a ChatGPT, Gemini y Perplexity quién hace [categoría] en [mercado].
       Aparece [competidor]. Ustedes no. Adjunto el output, motor por motor.
       No busco reunión. Si les sirve, úsenlo."

T+4 · El porqué, con el dato de la industria
      "El tráfico orgánico cayó 27% este año — el dato es de HubSpot, no mío.
       Se fue a las respuestas de IA. Ahí es donde no están."

T+9 · La prueba social del mercado, no del vendor
      Un caso real, con un número real, del mismo tamaño y sector.

T+15 · La oferta asimétrica
      "Una hora. Les muestro cómo se cierra esa brecha y qué cuesta.
       Si no aplica, se los digo en la misma reunión."

T+30 · El cierre honesto
      "Cierro el tema. Si el problema cambia, acá estoy. El diagnóstico es suyo, quédenselo."
```

**Registro:** enterprise LATAM → **trato formal de usted**. Formal ≠ frío.
**Copy:** valídalo con `greenhouse-ux-writing` y `copywriting`.

---

## 7. Dogfooding — el activo que no estás usando

**Efeonce corre su propia operación sobre HubSpot + Greenhouse.** Eso no es un detalle de infraestructura:
es **prueba viviente**, y es lo único que un competidor no puede copiar en una reunión.

> *"Le voy a mostrar nuestro propio portal. No una demo — el real. Así operamos nosotros."*

✅ **Y desde marzo de 2026, HubSpot te da créditos mensuales en el portal demo** para demostrar los Breeze
Agents a prospectos. **Use-it-or-lose-it.** Es munición de venta gratis que probablemente se está venciendo
sin usarse todos los meses.

---

## 8. Anti-patrones

| Anti-patrón | Por qué |
|---|---|
| **Hacer outbound frío teniendo clientes con un solo Hub** | Estás resolviendo el problema difícil antes que el fácil (§ 4) |
| **Vender HubSpot en el primer mensaje** | Nadie quiere comprar un CRM. Vende el costo de lo que ya pasa |
| **Ignorar la base instalada** | Es la motion más barata del programa **y casi nadie la corre** |
| **Filtrar sólo por `country` del CRM** | Excluye cuentas válidas con el campo vacío/erróneo y confunde sede con mercado operativo; aplicar las tres pasadas (§ 2) |
| **Detectar un deal y no registrarlo** | Sin deal registration **no hay comisión ni puntos** ✅ |
| **Trabajar un deal sin POI firmado** | **Best Partner Wins.** Puedes perder seis meses de trabajo ante quien firmó primero |
| **Mandar el grader con datos `unknown`** | Un dato malo en una reunión enterprise cuesta más que no tener dato |
| **Prometer una posición en un LLM** | Nadie controla lo que responde un LLM. Prometes medición y mejora relativa |
| **Usar el argumento del admin de USD 110k en un mercado de salario bajo** | Se debilita. Cambia al eje de adopción → `modules/06` Lente 5 |
