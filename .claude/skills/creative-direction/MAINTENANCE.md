# Contrato de mantenimiento — creative-direction

> **Por qué existe este archivo.** La creatividad no es estática, pero **no todo se mueve a la misma
> velocidad**. Los fundamentos de cómo funciona la memoria de marca no cambiaron en veinte años; el
> estado de la IA cambia cada trimestre. Meterlos en el mismo archivo obliga a revalidar todo cada vez,
> que es exactamente la razón por la que nadie revalida nada.
>
> **Regla de diseño: el sello de frescura es POR CAPA, no por skill.**

---

## 1. Las dos capas

| Capa | Qué contiene | Archivos | Caducidad |
|---|---|---|---|
| **Estable** | fundamentos, método, criterio, oficio | `modules/01` a `05`, `07`, `ANTIPATTERNS.md`, `GLOSSARY.md`, `templates/` | **sin fecha** |
| **Volátil** | cifras, estado de la industria, reglas de terceros | `references/EFFECTIVENESS_DATA_2026-09.md`, `modules/06` | **con fecha, obligatoria** |

**La capa estable no se revisa por calendario.** Se revisa cuando aparece investigación que **contradice**
el canon — no cuando pasan seis meses. Un módulo de fundamentos que se reescribe cada semestre no es
riguroso: es inseguro.

**La capa volátil caduca siempre.** Hoy:

| Archivo / bloque | `as-of` | Caduca | Ventana |
|---|---|---|---|
| `references/EFFECTIVENESS_DATA_2026-09.md` | 2026-09-16 | **2027-03-16** | 6 meses |
| └ su §5 (IA en el proceso creativo) | 2026-09-16 | **2026-12-16** | 3 meses |
| `modules/06_AI_CREATIVE_DIRECTION.md` | 2026-09-16 | **2026-12-16** | 3 meses |

---

## 2. Los tres disparadores de revalidación

El calendario solo no basta: un dato puede quedar obsoleto el martes siguiente a la revisión.

### 2.1 Temporal — el calendario del oficio

| Cuándo | Qué se revisa |
|---|---|
| **Junio-julio** (post Cannes Lions) | reglas de integridad, divulgación de IA, qué está ganando, volumen de inscripciones |
| **Actualizaciones de la base System1** | distribución de estrellas, costo del *dull* |
| **IPA Effectiveness Awards / EffWorks** | multiplicador creativo, largo y corto, el 60/40 |
| **WARC Rankings + Creative Effectiveness Ladder** | vigencia del marco de juicio |
| **Cada 3 meses, sin excusa** | estado de la IA (§5 y módulo 06) |

### 2.2 Por evento — no esperan al calendario

- Un escándalo de integridad o una revocación de premios que cambie el estándar de procedencia.
- Una regla nueva de divulgación de IA (festival, plataforma publicitaria o regulador).
- Regulación de IA aplicable a publicidad en los mercados donde Efeonce opera.
- Investigación mayor que **contradiga** un fundamento de la capa estable — este es el único disparador
  que toca la capa estable.

### 2.3 Por uso — el que de verdad protege

> 🔴 **Antes de citar una cifra en un entregable a cliente, si la capa volátil está vencida, la acción
> falla.** No se cita "con una nota de que puede estar desactualizada". No se cita de memoria. Se
> revalida o se omite el número y se argumenta con criterio.

Esto es deliberado: una medición vence en segundos, así que **la acción tiene que fallar si el estado se
movió**. Un aviso pasivo lo ignora cualquiera con prisa a las 11 de la noche.

---

## 3. Estados de una cifra

Toda cifra load-bearing vive con **fuente + `as-of` + estado**. Los estados son tres:

| Estado | Qué significa | Se puede citar a cliente |
|---|---|---|
| ✅ **verificado** | fuente abierta y leída | sí, con fuente y `as-of` |
| ⚠️ **secundario** | viene de una fuente que cita a otra, sin abrir la primaria | sí, **declarando que es secundaria** |
| 🔴 **sin verificar** | la afirmación circula pero las fuentes la formulan distinto | **no**. Se usa como criterio profesional, sin número |

El caso vivo hoy es la caída del multiplicador creativo (12×→4×): la formulación difiere entre fuentes,
así que queda `sin verificar` hasta abrir el IPA. **Marcar el `sin verificar` es trabajo terminado, no
trabajo pendiente**: convierte un hueco silencioso en un dato operativo.

> **Por qué esta disciplina.** Las herramientas de IA alucinan entre 17% y 33% de las citas. La
> verificación es un requisito **estructural**, no una buena práctica. Es la misma regla que gobierna
> `research-benchmark-operator`.

---

## 4. La memoria del oficio

`references/CASE_LEDGER.md` es la única parte de la skill que **crece con el uso**. Sin ella la barra se
reinventa en cada sesión y la skill repite en vez de aprender.

> **Cláusula vinculante.** Toda sesión que use esta skill para un entregable real — una plataforma
> creativa fijada, un concepto elegido, un juicio emitido — **agrega su fila al `CASE_LEDGER` al
> cerrar**. Si el trabajo no dejó huella, la skill no aprendió.

Se registra especialmente **lo que se descartó y por qué**. En seis meses nadie recuerda por qué se mató
el otro territorio, y esa es justamente la información que evita volver a proponerlo.

---

## 5. Cómo se revalida (procedimiento)

1. **Abre** `references/EFFECTIVENESS_DATA_2026-09.md` y mira el sello. ¿Vencido? Sigue.
2. **Busca fuente primaria** de cada cifra marcada, no notas de prensa que la citan.
3. **Actualiza** el archivo con el nuevo `as-of`, la cifra y su estado. Si una cifra cambió de forma
   material, dilo en la tabla de cambios al final — no la sobrescribas en silencio.
4. **Renombra** el archivo al nuevo período (`EFFECTIVENESS_DATA_AAAA-MM.md`) y corrige las referencias
   en `SKILL.md`, `MAINTENANCE.md` y los módulos que lo citen.
5. **Revisa la capa estable solo si** algo de lo encontrado la contradice. Si no, no la toques.
6. **Corre los gates** de la casa: `pnpm skills:mirrors` y `pnpm local:check`.
7. **Espeja a Codex**: `.codex/skills/creative-direction/` debe quedar byte a byte idéntico. Un espejo
   que nadie valida diverge en silencio, y en esta skill el drift significa **dos barras creativas
   distintas** según qué agente atienda.

---

## 6. La regla editorial — qué se queda y qué se borra

> **Medido, no supuesto.** Esta regla sale del diferencial ciego del 2026-09-16 (`references/CASE_LEDGER.md`,
> entrada 2): 4 pares, mismo encargo, con y sin la skill. Lo que sigue es lo que ese experimento
> demostró, no lo que parecía razonable al escribir la primera versión.

**El principio:** el modelo **ya tiene el oficio**. Lo que le falta es el **estudio**. Una skill de
oficio que intenta enseñar oficio duplica; una que da frontera, forma, anclaje y memoria potencia.

### El test, para cada párrafo de esta skill

| Pregunta | Veredicto |
|---|---|
| ¿Le enseña algo que ya sabe hacer solo? | **se borra** |
| ¿Le pone un límite donde se desborda? | se queda |
| ¿Le fija la forma de salida para que otros la consuman? | se queda |
| ¿Le da algo que no puede tener (memoria, evidencia de la casa)? | se queda |
| ¿Le trae evidencia que tiene pero no recuperaría sin que se la pidan? | se queda |

**El cuarto y el quinto caso se confunden todo el tiempo**, y confundirlos ya costó una decisión
equivocada: se propuso podar el módulo 01 por "enseñar lo que ya sabe", y el experimento mostró que
su base de evidencia apareció en dos de los cuatro `con` y en ninguno de los `sin`. **No enseñaba:
recuperaba.** Antes de borrar un bloque de conocimiento, verifica cuál de los dos es.

### Los cuatro mecanismos que sí potencian

| # | Mecanismo | Qué corrige del comportamiento sin skill |
|---|---|---|
| 1 | **Frontera** | El modelo se desborda hacia oficio ajeno — dicta color, tipografía, plano, duración, formato de red. Es la diferencia **más consistente** de las ocho salidas medidas |
| 2 | **Forma** | Produce prosa excelente que aguas abajo hay que traducir. El artefacto la vuelve consumible sin traducción |
| 3 | **Anclaje** | Afirma cifras de memoria. El `as-of` y la fuente lo obligan a abrir `references/` |
| 4 | **Memoria** | Produce descartes en cada corrida y se evaporan al cerrar la sesión |

Y uno que no se ve en una sola corrida: **consistencia.** El modelo hace bien estas cosas **a veces**;
la skill las hace **siempre**. Bajar la varianza vale aunque la media no suba — es la diferencia entre
un director creativo brillante y un estudio confiable.

### Lo que esta skill NO debe prometer nunca

**Mejores ideas.** Está medido y es falso: en el test con trampa, con y sin la skill se llegó
prácticamente al mismo concepto. Prometer perspicacia quema la credibilidad exactamente donde la
skill sí aporta. Si un párrafo insinúa que produce mejor creatividad, se reescribe o se borra.

---

## 7. Qué NO es mantenimiento

- **Agregar módulos porque sí.** Si un módulo no decide nada que los demás no decidan, se borra.
- **Perseguir tendencias visuales.** Eso es de `design-studio` (su `modules/07_TRENDS_2026`). Acá solo
  entra lo que cambia el **criterio de juicio**, no lo que está de moda.
- **Incorporar cada estudio nuevo.** Un dato entra si cambia una decisión. Si solo confirma lo que ya
  sabíamos, engorda el archivo y no mejora el juicio.
