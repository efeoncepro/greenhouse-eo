# 11 — LAS MÉTRICAS COMO COMPROMISO: el arma de doble filo

> **La métrica que te distingue es la misma que te puede matar.**
>
> Somos la única agencia que le muestra al cliente, en su propio login, si estamos cumpliendo.
> **Eso es el moat. Y es el riesgo. Y la diferencia entre las dos cosas es una decisión comercial que se toma
> ANTES de firmar — nunca después.**

🔴 **No improvises en este módulo. Un compromiso métrico mal escrito no se puede deshacer: el cliente lo ve
todos los días.**

---

## 1. La tesis — mostrar no es prometer

Hay tres cosas distintas, y **el 90% de los problemas viene de confundirlas:**

| | Qué es | Qué te obliga |
|---|---|---|
| **Telemetría** | *"Acá está el dato. Míralo cuando quieras."* | A **mostrarlo**, incluso cuando es feo |
| **Target** | *"Apuntamos a 90%."* | A **explicarte** si no llegamos |
| 🔴 **SLA** | *"Garantizamos 90%. Si no, pasa X."* | A **pagar** |

> ## Mostrar un número no es prometerlo.
> **Pero si no dices en cuál de los tres estás parado, el cliente va a asumir el tercero. Siempre.**

🔴 **Regla base:** **todo lo que muestras se convierte en una promesa implícita el día que se pone feo.**
Por eso lo que se muestra y lo que se firma **se deciden juntos, al principio, y por escrito.**

---

## 2. 🎯 La escalera de compromiso — no saltes escalones

**Nunca empieces arriba. Cada escalón se gana con datos del escalón anterior.**

```
Nivel 0 — TRANSPARENCIA        "Te muestro OTD, FTR, RpA. Sin umbral comprometido."
   ↓                            Riesgo: bajo.  Valor comercial: ALTÍSIMO. ← empieza SIEMPRE acá
Nivel 1 — TARGET DECLARADO     "Apuntamos a OTD ≥90%. Si no llegamos, te explicamos por qué."
   ↓                            Requiere: 3 meses de baseline real con ESTE cliente.
Nivel 2 — SLA CON REMEDIO      "Si bajamos de 90% dos meses seguidos, hay un plan de recuperación
   ↓                             (o un crédito en capacidad)."
Nivel 3 — SLA CON PENALIDAD    "Si no cumplimos, descuento monetario."
                                🔴 Solo con: baseline + atribución + buffer de precio. Ver §5.
```

🔴 **Nadie puede saltar del Nivel 0 al Nivel 3 para ganar un deal.** Es exactamente el movimiento que se siente
brillante en la reunión y se paga durante dos años.

🎯 **Y acá está lo mejor:** **el Nivel 0 ya te da casi todo el valor comercial.** El cliente no está pidiendo
una garantía — está pidiendo **dejar de estar a ciegas.** Ninguna otra agencia le muestra nada.
**La transparencia sola ya es el diferencial. La garantía es un extra que casi nunca hace falta regalar.**

---

## 3. 🔴 Nunca prometas un umbral sin baseline

**La pregunta que hay que responder ANTES de escribir "OTD ≥ 90%" en una propuesta:**

> ## ¿Cuál es nuestro OTD real hoy?

⚠️ **[VERIFICAR — y es urgente: no tenemos publicado un baseline de OTD / FTR / RpA propio, agregado, de los
engagements creativos vivos. Sin ese número, cualquier umbral que firmemos es una apuesta.]**

**El umbral óptimo del registry** (OTD 90-100%, FTR 80-100%, RpA 0-1,5) **es una meta de producto, NO una
declaración de nuestro desempeño actual.** Confundir las dos cosas es cómo se firma un SLA imposible.

🔴 **Regla dura:** **antes de comprometer un umbral con un cliente, mide 3 meses de baseline real con ESE
cliente.** El OTD de una cuenta con briefs maduros y el de una cuenta caótica **no son el mismo número** — y
el que hace la diferencia **no somos nosotros: es él.**

🎯 **Y eso, dicho en voz alta, es un argumento de venta enorme:**
> *"No te voy a firmar un porcentaje el día uno, porque sería mentirte: todavía no sé cómo funciona tu
> operación. Lo que sí te firmo es que vas a ver el número desde el primer mes. A los tres meses tendremos un
> baseline real de los dos, y ahí sí conversamos un compromiso que ambos podamos sostener."*
>
> **Un vendedor que dice esto suena como alguien que ya operó de verdad. Los otros suenan a folleto.**

---

## 4. Qué se puede comprometer y qué NO

| Métrica | ¿Se puede firmar? | Por qué |
|---|---|---|
| **OTD%** *(entrega a tiempo)* | ✅ **Sí** — es lo más firmable | Depende mayormente de nosotros… **si el brief llegó a tiempo** *(ver §5)* |
| **Cycle Time** | ✅ **Sí, con condiciones** | Depende del cap de rondas y de la velocidad de feedback **del cliente** |
| **FTR%** *(primera entrega correcta)* | ⚠️ **Con mucho cuidado** | 🔴 Un FTR bajo puede ser **brief malo**, no trabajo malo. Firmarlo solo **te hace dueño del brief de otro** |
| **RpA** *(rondas por activo)* | ⚠️ **Como target, no como SLA** | 🔴 **Es la métrica que MÁS depende del cliente.** Firmarla es firmar el comportamiento de él |
| **Throughput** | ✅ Sí *(es capacidad, y la capacidad la vendemos)* | Con la condición de que el input llegue |
| **Stuck Assets** | ✅ Sí *(steady 0)* | Es higiene operativa nuestra |
| 🔴 **Ventas / awareness / share / ROI** | 🔴 **JAMÁS** | **No controlamos el mercado del cliente.** Regla dura 10 del `SKILL.md` |
| 🔴 **BCS** *(Brief Clarity Score)* | 🔴 **NO EXISTE** | **Data-empty.** No lo menciones siquiera *(→ `efeonce/ESTADO_ACTUAL.md`)* |
| 🔴 **Attributable Lateness** | 🔴 **NO — está en shadow** | Ver §5. **La más tentadora y la más peligrosa** |

---

## 5. 🩸 El atraso imputable — la métrica que asigna culpa

**Attributable Lateness** responde exactamente la pregunta que todo el mundo quiere responder: *"¿de quién es
la culpa de que esto llegara tarde?"*

🩸 **Estado real:** **Accepted (shadow).** El flag se prendió **marcado ⚠️ ALTO RIESGO**, sin los ≥30 días de
shadow ni sign-off. **NO está madura.**

🔴 **Y es, con diferencia, la métrica más peligrosa de todo el catálogo — no por técnica, sino por política.**

> **Una métrica que asigna culpa cambia la relación con el cliente el día que le dice que la culpa es suya.**
> Y en creativo, **muchas veces lo es**: el brief llegó tarde, el feedback se demoró 9 días, el stakeholder
> nuevo apareció en la ronda 3.

**Eso es cierto. Y decirlo mal te cuesta la cuenta.**

🎯 **La forma correcta de usarla — cuando madure:**

| 🔴 Como arma | ✅ Como espejo |
|---|---|
| *"No cumplimos porque **ustedes** se demoraron"* | *"El 60% de nuestros atrasos arrancan con un feedback que llegó fuera del reloj. **¿Cómo lo resolvemos juntos?**"* |
| Es una acusación. **Genera defensa.** | Es un dato compartido. **Genera un cambio de proceso.** |
| Ganas la discusión, pierdes la cuenta | **Ganas la cuenta** |

🔴 **Regla:** **la atribución de atraso NUNCA se usa en una negociación de penalidad hasta que esté madura y
haya baseline.** Y cuando se use, **se usa en el QBR, con tono de diagnóstico compartido**, nunca en un correo
de defensa.

🔴 **Y el corolario duro:** **NUNCA aceptes una penalidad contractual por incumplimiento de un SLA sin
atribución.** Si te penalizan por un atraso causado por un feedback que el cliente entregó 9 días tarde,
**estás pagando por su desorden.** Sin atribución madura → **la penalidad va al precio como buffer**
*(→ `modules/04_PRICING.md` §4: SKY usó 12%)* **o no se acepta.**

---

## 6. 🎯 La política de confianza — el argumento que nadie más puede hacer

`src/lib/ico-engine/metric-trust-policy.ts`: cada métrica lleva **tipo de benchmark**, **sample size mínimo
(10)** y **`qualityGateStatus`** (healthy / degraded / broken). El portal **declara cuándo un número no es
confiable** en vez de pintarlo bonito. Y las projections **declaran en banner** cuándo una fuente está caída,
en vez de mostrar ceros.

**Esto parece un detalle técnico. Es un argumento de venta de primer nivel.**

> ## Un dashboard que nunca falla es un dashboard en el que nadie cree.
> **El nuestro te dice cuándo no confiar en él. Eso es lo que hace que puedas confiar en él.**

🎯 **El guion, frente a un comité de compras o un CFO:**
> *"Van a ver meses donde una métrica aparece marcada como no confiable, porque no hubo volumen suficiente para
> que el número signifique algo. Preferimos decírselo a inventarles un porcentaje. Si alguna vez ven un
> dashboard donde todo está siempre verde, desconfíen — de ese, y de quien se los dio."*

**Esa frase hace dos cosas a la vez: te da credibilidad, y siembra duda sobre todos los demás.**
*(Y es verdad, que es lo mejor de todo.)*

---

## 7. 🔴 El doble filo — estas métricas también nos miden a nosotros

**No hay forma de mostrarle el espejo al cliente sin quedar adentro del espejo.**

| Si el número sale mal… | El cliente ve… | Y hay que estar listo para… |
|---|---|---|
| **OTD** bajo | Que **entregamos tarde** | Explicar **con atribución**, no con excusas |
| **FTR** bajo | Que **nuestro trabajo no da en el clavo a la primera** | 🔴 Es **nuestro** problema, salvo que el brief sea malo — **y hay que poder demostrarlo** |
| **RpA** alto | Que **cada pieza necesita muchas rondas** | Puede ser de los dos. **El dato solo no dice de quién** |
| **Stuck assets** > 0 | Que **algo está trabado y nadie lo movió** | 🔴 **Esto siempre es nuestro.** No hay excusa |

🔴 **Regla operativa:** **el equipo comercial NUNCA presenta una métrica que no ha mirado antes.**
Entrar a un QBR sin haber visto el dashboard del cliente **es entrar a que el cliente te lo muestre a ti.**
*(Y esa es la única forma garantizada de perder una renovación.)*

🎯 **Pero acá está lo contraintuitivo, y es lo que hay que entender:**

> ## Un mes malo, mostrado y explicado, construye más confianza que tres meses buenos escondidos.
> **El cliente no espera perfección. Espera no ser sorprendido.**
> **La agencia que aparece con el problema antes que él lo descubra es la que no se cambia nunca.**

---

## 8. Lo que va en la propuesta — el bloque exacto

**Copia esta estructura. No la improvises.**

```markdown
## Cómo vas a saber si estamos cumpliendo

Desde el primer mes tienes acceso al portal, donde ves — por proyecto y con tendencia mensual:

- **Entrega a tiempo (OTD)** — qué % de lo comprometido salió en fecha
- **Primera entrega correcta (FTR)** — qué % pasó sin rondas finales de cambio
- **Rondas por pieza (RpA)** — cuántas revisiones necesita cada entregable
- **Tiempo de ciclo** — días desde el brief hasta la entrega
- **Trabajo trabado** — qué lleva más de 72h sin moverse, y por qué

**Los primeros 3 meses son de baseline.** No te vamos a firmar un porcentaje antes de conocer cómo funciona
tu operación — sería una promesa sin sustento. A partir del cuarto mes definimos juntos los umbrales, con
datos reales de los dos.

**Cuando un dato no sea confiable, el sistema te lo va a decir.** No maquillamos números.
```

🔴 **Lo que ese bloque NO dice, deliberadamente:** ningún porcentaje comprometido, ninguna garantía, ninguna
penalidad. **Y aun así es más de lo que cualquier otra agencia te va a ofrecer.**

---

## 9. Checklist antes de comprometer cualquier métrica

- [ ] ¿En qué **nivel de la escalera** estamos parados *(0/1/2/3)*, y **el cliente lo sabe**?
- [ ] Si es Nivel 1+: ¿hay **3 meses de baseline real con ESTE cliente**?
- [ ] ¿La métrica **depende de nosotros**, o depende del **comportamiento del cliente**?
- [ ] Si depende de él: ¿está el **owner del brief** nombrado y el **reloj de feedback** en el SOW?
      *(→ `modules/05_SCOPE_SOW.md`)*
- [ ] Si hay **penalidad**: ¿hay **atribución madura**? Si no → **buffer en el precio, o no se firma**
- [ ] ¿Estamos comprometiendo alguna métrica de **negocio del cliente**? → 🔴 **PARA. Regla dura 10**
- [ ] ¿Estamos mencionando **BCS** o **Attributable Lateness**? → 🔴 **PARA. No están maduras**
- [ ] ¿El equipo que va a operar la cuenta **sabe qué firmamos**?
      🔴 *(Vender un SLA que delivery no sabe que existe es la forma más rápida de incumplirlo.)*

---

**→ Siguiente:** las métricas son la prueba que reemplaza a los casos que todavía no tenemos →
**`modules/07_PRUEBA.md`**. Y son también lo que sostiene la renovación →
**`modules/12_RETENCION_EXPANSION.md`**.
