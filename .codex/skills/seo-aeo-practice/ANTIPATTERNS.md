# ANTIPATTERNS — lo que NUNCA se hace al vender SEO/AEO

> 🔴 **Cada uno de estos ya destruyó una agencia. Varios los estamos haciendo hoy.**
> **Los marcados 🩸 son bugs vivos de Efeonce.**

---

## A. Precio

| # | Antipatrón | Por qué mata | Qué hacer |
|---|---|---|---|
| **A1** | 🩸 **Cotizar sin loaded cost** | **Un precio sin costo detrás no es un precio: es una corazonada con decimales.** *(Berel: 52.000 MXN, sin blueprint, sin piso, sin margen conocido)* | **Cotizador siempre.** `templates/calculadora-piso.md` |
| **A2** | 🩸 **Publicar un precio unitario por artículo** | 🎯 **Le entregas al cliente la calculadora para comoditizarte.** *(SKY ya sabe que un artículo nuestro vale 260k)* | **Capacidad declarada**, no precio unitario |
| **A3** | 🩸 **Ad-hoc más barato que el marginal del plan** | **Premias salirse del plan.** *(SKY: ad-hoc 260k vs marginal 425k)* | **Ad-hoc SIEMPRE más caro** |
| **A4** | 🩸 **Un plan dominado por otro** | 🔴 **Un analista de compras lo ve en 30 segundos.** Parece descuido o mala fe *(SKY: ampliado 6,9M > base+4 ad-hoc 6,24M)* | **Haz la aritmética del comprador antes de mandar** |
| **A5** | **Bajar el precio para cerrar** | 🎯 **Eso no es un descuento: es una donación.** Y le enseñas que tu precio era mentira | 🔴 **Baja el ALCANCE, nunca el precio** |
| **A6** | 🩸 **Descontar la plataforma** | Margen puro **+ devalúas tu único diferenciador** | **Descuenta horas. Nunca la plataforma** |
| **A7** | **Cerrar bajo 45% de margen** | 🔴 **Viola la política aprobada (2026-07-13).** El mercado: bajo 40% el delivery está roto | **No se cotiza. Punto** |
| **A8** | 🩸 **"Todo incluido… etc"** | El "etc" no tiene borde. **Las expectativas se expanden, el margen se evapora — y churnean igual** | **Lista cerrada** |
| **A9** | **Pricing por performance** | **Controlas el 40% del resultado y te llevas el 100% del riesgo.** Y en AEO **no hay atribución que lo sostenga** | Bonus sobre un piso sano, con techo |
| **A10** | 🩸 **Facturar en moneda local sin cláusula FX** | **Un −12% de margen silencioso** cuando el MXN se mueve | **Precio en USD, factura local, cláusula de revisión** |

---

## B. La promesa

| # | Antipatrón | Por qué mata |
|---|---|---|
| **B1** | 🔴 **Prometer rankings / "primera página"** | 🎯 **Es LA promesa que rompió la confianza de la categoría.** Al decirla, **te conviertes en el que le falló** |
| **B2** | 🔴 **Prometer revenue atribuido a IA** | **No existe el modelo.** Los estudios se contradicen **en el signo** (+900% a −13%) |
| **B3** | 🔴 **Vender "el tráfico de ChatGPT"** | Es el **1,08%** del total. **El cliente lo verifica en su GA4 en el mes 6 y cancela** |
| **B4** | 🔴 **"Vas a recibir +35% de clics"** | **Es una correlación de un estudio, no una garantía.** Lo correcto: *"las marcas citadas **reciben**…"* |
| **B5** | **"En 3 meses ves resultados"** | Mentira. **Firmar eso es firmar el churn del mes 9** |
| **B6** | 🔴 **Inventar un caso** *(o "ilustrativo", o redondeado)* | 🩸 **Hoy tenemos CERO citables.** Inventar uno es la única forma de destruir la práctica de un golpe |
| **B7** | **Citar un CTR plano sin preguntar la industria** | Salud −70%, e-commerce −30%. **Un número mal citado te cuesta la credibilidad de todo lo demás** |

---

## C. La conversación

| # | Antipatrón | Por qué mata | Qué hacer |
|---|---|---|---|
| **C1** | **Mandar la propuesta antes del diagnóstico** | **Promesa antes que evidencia.** Eres el anterior | **Grader primero. Siempre** |
| **C2** | 🔴 **No decir lo que NO podemos resolver** | 🎯 **Es el paso que te separa del que le falló.** Sin él, la reunión falló aunque cierres | **Paso 4, obligatorio** |
| **C3** | **Mandar el Grader por correo y esperar** | **Un PDF no vende.** El valor está en la lectura | **Se presenta** |
| **C4** | **Abrir la propuesta con "por qué somos geniales"** | Ya perdiste | **Abre con SU diagnóstico** |
| **C5** | **Decir "nosotros somos distintos"** | 🔴 **Eso dijo el anterior, palabra por palabra** | **Demuéstralo descalificándote** |
| **C6** | **Vender un "piloto pequeño"** | 🎯 **Es la principal fábrica de churn de la categoría.** Un motor a media máquina no arranca — y concluye que no funciona | **Vende la fundación** (tiene fin) |
| **C7** | **Atacar a la agencia titular** | Te hace ver desesperado | 🎯 **Ataca a la MÉTRICA que están mirando** |
| **C8** | **Negar que Semrush es bueno** | **Te hace sospechoso.** Regala el checker y cobra 99/mes | 🎯 **Confírmalo y mueve al criterio** |
| **C9** | **Pelear por precio contra el freelancer** | **Pierdes** | 🎯 **Dile que lo contrate** |

---

## D. Prospección

| # | Antipatrón | Por qué mata |
|---|---|---|
| **D1** | 🔴 **Outbound sin el Grader corrido** | **Sin el dato, eres el número 41 de la semana** |
| **D2** | 🔴 **"SEO" en el asunto del correo** | **Palabra quemada.** Se borra sin abrir |
| **D3** | **Cold email masivo genérico** | Reply <1%. **No es escala: es gasto** — y quema el dominio |
| **D4** | 🔴 **Automatizar la personalización** | 🎯 **Si la automatizas, te comoditizas tú mismo.** La personalización real ES la barrera de entrada |
| **D5** | **Más de 5 toques** | **Perseguir daña la marca más de lo que produce** |
| **D6** | **Ads a "agencia SEO"** | CPC alto, intención comoditizada, **compites con freelancers** — y el CTR pagado cayó 68% |

---

## E. Delivery y retención

| # | Antipatrón | Por qué mata | Qué hacer |
|---|---|---|---|
| **E1** | 🩸 **No congelar el baseline el día 1** | 🔴 **Un caso sin baseline no es un caso: es una anécdota.** *(Es por esto que tenemos cero)* | **Baseline en el mes 0** |
| **E2** | **QBR = dashboard verde** | 🎯 **Es cómo muere un retainer de SEO en el mes 9** | **Abre con lo que NO funcionó** |
| **E3** | **El cliente no ve qué hacemos** *(caja negra)* | **El churn de SEO es un problema de confianza, no de resultados** | 🎯 **El portal. Transparencia como producto** |
| **E4** | **Expandir por "+artículos"** | **Refuerza la métrica que se está deflacionando** | **+mercado · +marca · +superficie** |
| **E5** | **Ignorar que dejó de entrar al portal** | 🔴 **Es la señal de churn más grave que existe** | **Actúa esa semana** |
| **E6** | **Perder al champion y no re-vender** | **Tienes 30 días** | Re-vende desde cero |

---

## F. Los tres que más nos cuestan HOY 🩸

1. 🩸 **A1 — Berel sin loaded cost.** Puede estar al **18% de margen** y nadie lo ha medido.
2. 🩸 **A2+A3+A4 — la oferta de SKY.** Precio unitario publicado, ad-hoc invertido y un plan dominado.
   **En una licitación viva.**
3. 🩸 **E1 — cero baselines congelados.** Por eso tenemos **cero casos citables** — y por eso el precio y el
   Grader están haciendo el trabajo que debería hacer un caso.

---

## G. El meta-antipatrón

> ## Sonar como el que le falló.
>
> **Cada uno de los antipatrones de arriba es una forma distinta de sonar igual que la agencia anterior.**
> **Y en esta categoría, sonar igual que el anterior es SER el anterior.**
>
> 🎯 **Cuando dudes, pregúntate: "¿esto lo diría el que le mintió?"**
> **Si la respuesta es sí, no lo digas — aunque sea verdad.**
