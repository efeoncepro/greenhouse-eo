# 14 · ASO complementario — venderlo sin volver al humo

> **Qué es:** cómo se vende ASO a un cliente que tiene app. **El oficio** (qué se hace y cómo
> se mide) vive en `seo-aeo/modules/10_ASO_APP_DISCOVERY.md`. **La estructura de la extensión**
> (líneas, RACI, hipótesis de pricing, gates) vive en
> `docs/business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md`.
> **As-of 2026-09-10.** Estado: `Proposed` · `hypothesis_only`. **Casos citables de ASO: cero.**

---

## 0. La tesis

> ## No vendemos "ASO". Vendemos que la app se encuentre y se entienda igual en Google, en los
> ## motores de IA y dentro de la tienda.

- **ASO es una superficie, no un producto nuevo.** El producto sigue siendo visibilidad
  (encuadre B de `03_OFERTA.md`); la tienda es la siguiente superficie de la capa de expansión.
- 🎯 **Acá la prueba sí existe.** En AEO no hay atribución a revenue (`01_MERCADO_2026.md`). En
  ASO la tienda reporta instalaciones por fuente, y los experimentos nativos (Product Page
  Optimization de Apple, Store Listing Experiments de Google) aleatorizan el tráfico. Es el primer
  lugar de la práctica donde *"puedes verlo sin creernos"* se cumple **en la consola del cliente**.
- 🎯 **El diferencial es el cruce.** Las agencias de ASO puras optimizan la ficha sin mirar la
  web; las de SEO ignoran la tienda. La investigación del 2026-09-10 no encontró en LATAM una
  agencia que venda ASO + AEO en español ⚠️. Es inferencia, no prueba de que no exista: no se usa
  como claim público.

---

## 1. A quién y cuándo

**Por dónde entra:** como **expansión de un cliente SEO existente** que tiene app (Berel es el
caso vivo: `efeonce/ESTADO_ACTUAL.md`). En frío solo tiene sentido si la app es el producto.

**La landing** (`/servicios/aso/`, `TASK-1862`, PDR-023) no captura demanda —el ASO casi no se busca en
español—: es el destino que se **envía 1:1** mientras la extensión esté en `Approved for validation` y que se
enlaza desde SEO y AEO sólo cuando esté `Commercially approved`. Antes de eso, no se comparte.

**Triggers de compra** *(inferencia; no hay encuesta pública)*: lanzamiento o relanzamiento de la
app · entrada a un país nuevo · crisis de reseñas · alza del costo de adquisición pagada · primera
inversión en Apple Ads o Google App campaigns.

**Verticales donde la tienda pesa** *(inferencia)*: fintech y banca, retail y e-commerce,
delivery, aerolíneas y viajes, telco, salud y medios.

🔴 **En LATAM, Google Play primero.** Android tiene entre 66% y 82% de las páginas vistas móviles
en CL, MX, CO y PE (StatCounter, ago-2026), y casi todo lo nuevo de Apple con IA es solo EE. UU.

**Quién decide** *(detalle en la extensión, §8)*: el operador es quien responde por la ficha y los
releases de la app (growth móvil, product marketing o UA). El sponsor suele ser el mismo del SEO
(CMO o gerencia digital). El equipo de la app es un stakeholder nuevo que hay que ganar: controla
el acceso a las consolas.

---

## 2. Las líneas, en una tabla

| Línea | Engagement | Qué compra el cliente | Qué NO es |
|---|---|---|---|
| **App Visibility Diagnostic** | Diagnóstico | Línea base por fuente y prioridades para el próximo release | Una auditoría sin fin. Sin acceso a consolas, todo es estimado ◑ |
| **Store Foundation** | Sprint, precio fijo | La base: metadata por tienda, mapa de intención con datos de tienda, arquitectura de CPP/CSL, setup de reseñas, puente web→tienda medible | Producción creativa (Globe) ni cambios de código |
| **Launch / Release Visibility Sprint** | Sprint | Un lanzamiento o release con la ficha, los eventos y la web alineados | Compra de medios (Reach) |
| **Store Visibility Operations** | Lane recurrente | Iteración por release, experimentos con muestra, operación de reseñas, readout mensual por fuente | Un precio por keyword, CPP o reseña respondida |
| **AI App Discovery** | Módulo dentro de Operations o add-on | Que los asistentes describan y recomienden bien la app (panel de prompts + entidad + especificación de App Intents/Engage SDK) | Una promesa de instalaciones |
| **Expansión** | Cambio de alcance | + app · + plataforma · + país · + idioma | — |

🔴 **Sin "etc."** Lo que está en otra capability se compone, no se absorbe: Apple Ads y App campaigns
→ Reach · screenshots, video e íconos → Globe · eventos de app y atribución → Measurement &
Analytics · App Intents, deep links y Engage SDK → ingeniería del cliente o Web Experience 360.

---

## 3. Precio — reglas, no cifras

1. 🔴 **Cotizador y piso de 45%**, como todo en la práctica (`04_PRICING.md`).
2. 🔴 **Nunca precio por keyword, por screenshot, por CPP ni por reseña respondida.** Es la misma
   trampa que el precio por artículo: le entregas la calculadora. La unidad es la **capacidad
   declarada** sobre un sobre app × plataforma × país.
3. 🔴 **La Foundation nunca va gratis.** El diagnóstico sí puede ser la cuña para un cliente SEO
   actual (decisión abierta D2 de la extensión).
4. **Referencia de mercado, solo como orden de magnitud** ⚠️: los retainers de ASO de USD
   2.000–10.000/mes coinciden en ≥2 fuentes secundarias sin metodología; las auditorías, USD
   2.000–15.000. ❌ Ninguna agencia LATAM publica tarifas. **No es ancla de precio.**
5. **La herramienta no justifica el precio.** AppTweak parte en ~USD 79/mes ⚠️ y DataForSEO cobra
   fracciones de centavo por ficha ✅. Igual que en AEO: *el margen no está en el medidor, está en
   el criterio.*
6. 🔴 **No se cobra la línea de plataforma por la tienda.** El portal hoy no mide tiendas
   (`12_ACTIVOS.md`): cobrar transparencia que no existe es la promesa rota de la regla 8.

---

## 4. Prueba sin mentir

| ✅ Se dice | 🔴 No se dice |
|---|---|
| *"Este cambio de ficha subió la conversión X, con Y% de confianza, en un experimento nativo"* | *"Cada estrella más te da +89% de conversión"* (sin fuente) |
| *"Tus visitas desde búsquedas de categoría en Play, que la consola llama Explore, subieron X"* | *"Tu 'Search' en Play subió"* sin aclarar que solo cuenta búsquedas de tu marca |
| *"App Store Search, neto de Apple Ads"* | App Store Search presentado como orgánico |
| *"Según Apple, las Custom Product Pages convierten en promedio 2,5 puntos más"* | *"Vas a convertir 2,5 puntos más"* |
| *"En ChatGPT apareces en N de M respuestas a este panel de preguntas, a esta fecha"* | *"ChatGPT te está trayendo instalaciones"* |

🔴 **Muestra mínima:** en una app con poco tráfico los experimentos no llegan a significancia. Se
dice antes de firmar, no en el QBR.

---

## 5. Displacement

| Contra quién | Qué te van a decir | Qué decimos |
|---|---|---|
| **Agencia de ASO pura** | *"Nosotros sí somos especialistas en tiendas"* | *"Para la ficha, bien. Pero la tienda y los asistentes ya describen tu app con lo que dicen tu metadata, tu web y tus reseñas juntas. Nosotros ya operamos tu web: te cuidamos las tres."* |
| **La herramienta** *(AppTweak, Appfigures)* | *"Con 79 dólares al mes tengo los datos"* | *"Tienes el dato. Te falta decidir qué cambiar en cada release y que alguien lo haga."* |
| **El equipo interno** *(UA, product marketing)* | *"Eso lo hace el equipo de la app"* | Se **extiende**, no se reemplaza: la lane toma lo que el equipo no alcanza a hacer en cada release |
| **No hacer nada** | *"La app ya tiene descargas"* | *"¿Cuántas son búsquedas de categoría y cuántas de gente que ya te conocía? La consola lo separa; revisémoslo juntos."* |

---

## 6. Descalificación

Los seis casos en que no se vende ASO están en `06_DESCALIFICACION.md` §7: juegos, apps internas,
poco tráfico en la ficha, casi todo pagado, sin acceso a consolas y el que pide instalaciones
garantizadas o reseñas compradas.

---

## 7. Reglas duras

1. 🔴 **ASO entra como superficie de Search Visibility 360, no como producto suelto.**
2. 🔴 **Nunca prometas ranking en la tienda, instalaciones ni rating.**
3. 🔴 **Nunca atribuyas instalaciones a una recomendación de IA.** No hay fuente que lo mida.
4. 🔴 **Nunca vendas como activa una superficie de IA que no verificaste en el país** (Ask Play,
   Personalized Collections, App Store tags).
5. 🔴 **Nunca compres ni incentives reseñas o instalaciones, ni para el cliente ni "por él".** Apple
   expulsa al developer también por lo que hace un tercero en su nombre
   (`seo-aeo/ANTIPATTERNS.md` §"Borde black-hat en tiendas de apps"). El SOW lo prohíbe por escrito.
6. 🔴 **Sin acceso a App Store Connect o Play Console, todo lo que entregues es estimado ◑**, con
   fecha.
7. 🎯 **El primer caso vale más que el segundo cliente.** Berel es el candidato: medir con las
   consolas desde el día uno, verificar y pedir autorización (`efeonce/ESTADO_ACTUAL.md` §2).
