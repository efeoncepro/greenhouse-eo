# Evaluar la superficie

Una tool registrada no es una tool que funciona: los tests prueban el cableado. Lo que hay que
medir es si **un agente logra la tarea real**.

## 🔴 Primero, la advertencia que gobierna todo lo demás

Una auditoría de validez sobre cuatro harnesses de tool-calling, con 496 tareas revisadas por
expertos, encontró:

- **18,5% de desacuerdo** entre el evaluador automático y el humano.
- **23 corridas repetidas del MISMO setup dieron entre 57,9% y 76,8%** — una dispersión de
  **18,9 puntos porcentuales**.

**Una corrida única no es evidencia para decidir.** Si tu eval corre una vez y reportas el número,
estás reportando ruido. Corre varias veces y reporta la dispersión, o no reportes.

## Cómo se construye uno que sirva

**El criterio de éxito más confiable es la verificación programática del ESTADO** — comprobar que
el mundo quedó como debía, no que el texto de salida se parezca al esperado. La segunda mejor
opción es una rúbrica híbrida: chequeos programáticos + juez ciego + **penalización por errores de
tool**.

Reglas de autoría de casos:

- **Independientes** entre sí, **verificables** con una respuesta clara.
- **Complejos**: que exijan varias llamadas y exploración real.
- 🔴 **Estables.** La regla que casi todos los evals caseros omiten: **no preguntes por estado
  "actual" que cambia solo.** Ancla en datos históricos o cerrados, o tu eval se pudre.
- Instrucciones difusas, **sin nombrar la tool**: si el prompt dice qué tool usar, no estás
  midiendo selección.

## Qué medir, y qué jamás promediar

Mide varias dimensiones **por separado**:

- precisión de **elección de tool**;
- precisión de **argumentos** — y contar como FALLO elegir un valor en silencio cuando lo correcto
  era no elegir ninguno;
- **contención de daño**: en los casos marcados "esto no debe gastar / no debe escribir", ¿evitó
  la tool que gasta o escribe?;
- cantidad de llamadas, tokens consumidos, tasa de error.

🔴 **NUNCA las promedies.** Colapsarlas esconde la mitad cara: la precisión de tool puede ser 100%
mientras la de argumentos es 60%, y el promedio diría 80%.

## Higiene del runner

- 🔴 **Sin credenciales, el runner FALLA; no se salta.** Un `skipped` se lee como verde y **afirma
  haber medido**. Es peor que no tener eval.
- El catálogo que se le presenta al modelo se **introspecta del servidor vivo**, jamás una copia.
- Fija el commit y la versión del modelo al publicar un resultado, y guarda la entrada.
- **La evidencia de benchmark no reemplaza los tests de producto.**

## Contexto para leer resultados ajenos

- Adjuntar MCP indiscriminadamente **degradó** el rendimiento un ~9,5% promedio en un estudio
  grande (~20.000 llamadas, 6 modelos, 30 suites de tools) — con la salvedad de que midió tareas
  que los modelos ya resolvían solos. Es evidencia contra el **acople indiscriminado**, no contra
  MCP donde el dato externo hace falta.
- Los servidores oficiales 1:1 puntúan bajo (16–21% pass@1) en benchmarks de terceros. Ése es el
  argumento medido contra los envoltorios crudos.
