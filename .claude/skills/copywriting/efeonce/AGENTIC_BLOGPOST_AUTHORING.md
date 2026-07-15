# Authoring agentic de artículos firmados

> **Estado:** método editorial canónico para artículos con byline humano producidos con apoyo de agentes.
> **Principio:** la firma declara autoría y responsabilidad humana, no quién pulsó cada tecla.
> **Frontera:** este archivo gobierna el proceso de authoring. No redefine una voz. Para Julio, cargar primero
> [La voz de Julio Reyes](JULIO_REYES_VOICE_SYSTEM.md); para voz organizacional, cargar
> [la voz de Efeonce](EFEONCE_VOICE_SYSTEM.md). Para craft asistido y señales de slop, usar
> [Copywriting asistido por IA](../modules/09_AI_ASSISTED_COPY.md) y
> [Antipatrones](../ANTIPATTERNS.md).

## 1. Contrato de autoría

Un artículo firmado puede usar agentes para investigar, explorar y producir. Sigue siendo autoría humana solo
si la persona que firma conserva y ejerce la autoridad editorial sustantiva.

**El autor humano conserva:**

- la tesis y el punto de vista;
- la selección final de fuentes;
- la aceptación, formulación y alcance de los claims;
- los límites: qué no afirmar, qué no contar y qué incertidumbre conservar;
- la autorización de experiencias, opiniones y primera persona;
- la decisión editorial sobre casos, analogías, CTA y disclosure;
- la aprobación explícita de la versión final y de su publicación.

**El agente aporta:**

- investigación y fuentes candidatas, con procedencia y frescura;
- mapas de evidencia, preguntas abiertas y contradicciones;
- estructuras, hooks, títulos, analogías y CTA alternativos;
- drafts y reescrituras con cambios trazables;
- checks de claims, links, consistencia, voz, ritmo, SEO/AEO y producción;
- preparación del artefacto en el formato de destino y evidencia de validación.

El agente **propone y comprueba**; el autor **decide y responde**. No convertir una inferencia del agente en
postura del autor, una fuente candidata en fuente aprobada ni un draft fluido en permiso de publicación.

## 2. Router de speaker antes del research

Resolver `author + byline + surface + speaker` antes de escribir.

| Pieza                                           | Voz primaria             | Regla de authoring                                                                                          |
| ----------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Artículo firmado por Julio                      | Julio                    | Aplicar `JULIO_REYES_VOICE_SYSTEM.md` y este método.                                                        |
| Thought leadership de Efeonce firmado por Julio | Julio + doctrina Efeonce | Julio conduce; `En Efeonce...` atribuye práctica o postura organizacional.                                  |
| Artículo institucional sin byline personal      | Efeonce                  | No simular intimidad autoral; este método puede inspirar el control humano, pero no presta la voz de Julio. |
| Artículo firmado por otra persona               | Esa persona              | Capturar su voz desde corpus e iteración propios; nunca usar a Julio como voz humana genérica.              |
| Caso con speaker incierto                       | Sin draft                | Resolver la atribución con el owner editorial antes de producir prosa.                                      |

En piezas híbridas, marcar cada cambio de posición de enunciación. Publicar en un dominio Efeonce no convierte
automáticamente al autor en Efeonce, y una firma humana no convierte doctrina de empresa en experiencia personal.

## 3. Packet de entrada

Antes de un draft largo, reunir o declarar como pendiente:

1. **Tesis del autor:** una a tres frases que el agente no puede sustituir por una versión “más vendible”.
2. **Lector y cambio esperado:** qué debería entender, cuestionar o poder hacer al terminar.
3. **Mapa de fuentes:** fuentes obligatorias, candidatas, descartadas y razones de selección.
4. **Claims y límites:** hechos, inferencias, opinión, doctrina institucional, incertidumbres y prohibidos.
5. **Material personal autorizado:** experiencias, casos, frases o posiciones que sí pueden atribuirse.
6. **Frontera de voz:** personal, institucional o híbrida.
7. **Intención de CTA:** educativa, comercial, híbrida o ninguna.
8. **Política de disclosure:** exigencias legales, contractuales, editoriales y de plataforma por verificar.
9. **Destino de producción:** CMS/formato, estado inicial, reviewers y quién puede publicar.

La ausencia de un dato no autoriza a completarlo con plausibilidad. Marcar `NEEDS AUTHOR`, proponer preguntas y
continuar solo con lo que no dependa de esa decisión.

## 4. Capturar voz desde iteración real

La voz no se obtiene pidiendo “escribe como yo” ni imitando tics de un corpus. Se calibra observando decisiones
reales del autor sobre un texto real.

### Loop de calibración

1. Cargar el sistema de voz vigente y muestras auténticas autorizadas. Para Julio, el corpus canónico ya está
   registrado en `JULIO_REYES_VOICE_SYSTEM.md`; no volver a inventariarlo aquí.
2. Pedir o recuperar la tesis en palabras del autor y, cuando sea posible, una explicación hablada o escrita
   espontánea de por qué le importa.
3. Producir pocas variantes focales: dos o tres hooks, un párrafo explicativo y un cierre. No gastar un artículo
   completo antes de calibrar.
4. Registrar qué elige, corta, reordena o reescribe el autor y preguntar por el motivo cuando no sea evidente.
5. Convertir cada cambio en una hipótesis de voz, no en regla universal.
6. Promover una hipótesis a patrón solo con confirmación explícita o recurrencia en más de una iteración.

### Voice delta

Conservar por cada cambio relevante:

```text
candidato del agente -> edición del autor -> motivo -> hipótesis de voz -> alcance -> confianza
```

Separar patrones estables de preferencias locales del tema. No borrar una aspereza deliberada porque el modelo
prefiera una prosa más lisa. Tampoco canonizar un error, una reacción apurada o un giro privado sin confirmación.

## 5. Mecánica narrativa

### Hook conversacional

El hook debe nacer de una tensión que el autor reconoce, no de una fórmula de engagement. Una captura útil pide:

- qué escena, dato o hábito le incomoda;
- qué supuesto cree que está equivocado;
- qué pregunta quiere que el lector se lleve;
- qué puede prometer explicar sin inflar el alcance.

El agente puede devolver variantes `fiel`, `más concisa` y `más contraria`, pero el autor elige la posición. Una
pregunta abre un movimiento que el artículo debe resolver o complejizar; una cadena de preguntas retóricas no es
conversación. Para la firma narrativa de Julio, aplicar la sección de hook de su sistema de voz.

### Ritmo

- Alternar frases de fijación con desarrollo; evitar párrafos y H2 de largo estadísticamente uniforme.
- Reservar el párrafo aislado para una idea que realmente merece aire.
- Cortar transiciones que solo anuncian lo que el siguiente párrafo ya hace.
- Mantener pequeñas inflexiones humanas confirmadas; no pulir hasta volver anónima la voz.
- Usar listas cuando ordenan decisiones, no para que todo parezca completo y simétrico.
- Después de cerrar la prosa, diseñar una ruta de escaneo con negritas semánticas: normalmente una tesis, dato,
  contraste o etiqueta decisiva por bloque de lectura. No poner en negrita párrafos enteros por sistema, repetir
  el título ni usar énfasis para fabricar autoridad sobre un claim débil.
- Evaluar el énfasis en desktop y móvil. Una frase que funciona como ancla en una línea puede volverse un muro de
  negrita al envolver en una pantalla estrecha.

### Casos

Clasificar cada caso como `real`, `anonimizado`, `compuesto` o `hipotético` y hacerlo visible cuando la distinción
importe. El autor aprueba el derecho a contarlo, la exactitud, el nivel de anonimización y la enseñanza. Nunca
convertir una campaña imaginada, una conversación reconstruida o un caso compuesto en memoria personal.

Un caso funciona cuando cambia la comprensión del mecanismo. Si solo agrega credibilidad ambiental, se corta.

### Analogías

La analogía debe hacer un trabajo cognitivo preciso:

1. nombrar qué aspecto del concepto aclara;
2. mapear la comparación sin deformarla;
3. volver al término técnico correcto;
4. declarar dónde deja de servir si el lector podría sobreextenderla.

Preferir una analogía desarrollada a tres metáforas decorativas. No usar analogías infantiles para fingir
cercanía ni analogías bélicas/médicas en contextos sensibles sin una razón editorial aprobada.

### `con manzanitas` y `te lo explico con manitas`

La definición, variantes y ownership de estos motivos viven en `JULIO_REYES_VOICE_SYSTEM.md`. En authoring:

- insertarlos solo después de que Julio confirme la pieza y exista una necesidad pedagógica real;
- hacer que introduzcan una escena, ejemplo, comparación o secuencia visiblemente más clara;
- preferir una sola aparición en un artículo estándar;
- cerrar toda activación visible del motif con exactamente `🍏🍏🍏`, antes de la puntuación; por ejemplo,
  `Vamos con manzanitas 🍏🍏🍏:`;
- usar `te lo explico con manitas` cuando el gesto, formato hablado o contexto justifican esa variante, no como
  sinónimo automático;
- omitirlos en voz institucional, textos de otros autores, asuntos graves o sensibles, pasajes legales, caveats
  científicos, y cualquier lugar donde puedan sonar condescendientes;
- cortarlos si el párrafo siguiente no cumple la promesa de simplificación.

El motivo no certifica la voz. Usarlo sin función es cosplay autoral.

## 6. Research y ledger de claims

El agente arma el dossier; el autor selecciona la evidencia que sostendrá su firma.

Para cada fuente candidata, registrar autoridad, fecha, relación con el claim, límites, conflicto de interés y
estado de acceso. Una fuente encontrada por ranking, resumen de buscador o cita secundaria no queda aprobada por
haber aparecido primero. Para datos volátiles, reverificar cerca de la aprobación final.

Mantener un ledger mínimo:

| Campo           | Contenido                                                                         |
| --------------- | --------------------------------------------------------------------------------- |
| Claim           | Redacción exacta o rango permitido.                                               |
| Tipo            | Evidencia externa / inferencia / opinión personal / doctrina Efeonce / hipótesis. |
| Soporte         | Fuente primaria o evidencia interna autorizada.                                   |
| Límite          | Qué no demuestra y bajo qué condiciones aplica.                                   |
| Decisión humana | Aprobar / ajustar / retirar / necesita fuente.                                    |
| Estado de prosa | Draft / verificado / aprobado.                                                    |

No hacer citation laundering: una cita cercana no respalda automáticamente todo el párrafo. No vestir la opinión
del autor como consenso ni una práctica de Efeonce como hallazgo independiente.

## 7. Flujo de authoring y reescritura

1. **Contrato:** resolver speaker, tesis, autoridad, límites, CTA y publicación.
2. **Dossier:** investigar, proponer fuentes y construir el ledger; el autor selecciona.
3. **Arquitectura:** presentar pregunta central, outline y variantes de hook; aprobar dirección.
4. **Draft de trabajo:** escribir para descubrir estructura, con `TODO` y `NEEDS AUTHOR` visibles.
5. **Iteración autoral:** recoger cortes, giros, objeciones, ejemplos y wording del autor como evidencia de voz.
6. **Reescritura dirigida:** corregir una dimensión dominante por pasada: tesis/estructura, evidencia, voz/ritmo o
   compresión/CTA. Evitar cambiar todo a la vez y perder la intención aprobada.
7. **Auditoría editorial:** revisar el artículo contra el gate de la sección 8 y devolver findings trazables.
8. **Lectura en voz alta:** ejecutar el test de la sección 9 y una última pasada de claims/links.
9. **Aprobación:** obtener aprobación humana explícita del texto, CTA, disclosure y artefacto final.
10. **Producción:** preparar, validar y dejar en el estado autorizado. Draft, preview o upload no significan
    permiso de publicar.

En cada reescritura, preservar la tesis, claims, límites y pasajes ya protegidos. Entregar un delta breve:
`qué cambió / por qué / qué decisión sigue abierta`. Si dos instrucciones del autor chocan, mostrar la tensión;
no resolverla silenciosamente con una voz promedio.

## 8. Auditoría editorial

Usar estados `PASS | NEEDS AUTHOR | BLOCK`. Un texto fluido puede estar bloqueado.

- **Autoría:** byline, speaker y primera persona son verdaderos y están autorizados.
- **Tesis:** el argumento sigue expresando la posición elegida por el autor.
- **Fuentes y claims:** cada afirmación verificable tiene soporte, límite y decisión humana.
- **Frontera:** experiencia personal, evidencia y doctrina institucional no se mezclan sin atribución.
- **Hook y estructura:** la tensión es concreta; cada sección hace avanzar la pregunta central.
- **Voz y ritmo:** las decisiones reales del autor sobreviven a la edición.
- **Casos y analogías:** estatus, permiso, precisión y función pedagógica están claros.
- **AI-copy:** pasar `../ANTIPATTERNS.md` y `../modules/09_AI_ASSISTED_COPY.md`.
- **CTA:** corresponde al trabajo del artículo y no secuestra el cierre.
- **Disclosure:** cumple el criterio editorial y cualquier regla externa vigente.
- **Producción:** links, metadata, jerarquía, preview y estado de publicación fueron verificados.

### Antipatrones específicos del authoring agentic

- inventar una experiencia para “humanizar” el hook;
- confundir prosa convincente con claim aprobado;
- producir H2, párrafos, tríadas y cierres demasiado simétricos;
- usar falsa intimidad, preguntas sin resolución o transiciones de plantilla;
- rellenar con especificidad plausible que no existe en las fuentes;
- pulir fuera de la pieza las objeciones, límites o giros incómodos del autor;
- imitar muletillas y motivos como atajo de identidad;
- esconder doctrina comercial dentro de una supuesta conclusión neutral;
- anexar un CTA de agencia porque “todo contenido debe convertir”;
- declarar “revisión humana” cuando el autor solo vio un título o una preview.

## 9. Test de lectura en voz alta

La simulación del agente ayuda, pero no reemplaza que el autor lea o escuche los pasajes decisivos.

1. Leer hook, transiciones, analogía principal, primera persona, cierre y CTA a velocidad conversacional.
2. Marcar tropiezos, respiraciones forzadas, énfasis ambiguos, repeticiones de cadencia y frases que el autor no
   diría aunque sean gramaticalmente correctas.
3. Reescribir primero para pronunciabilidad; después verificar que no se perdió precisión.
4. Volver a leer solo las líneas cambiadas y su párrafo vecino.
5. Pedir confirmación humana cuando el ajuste toca posición, humor, intimidad o énfasis.

**Pasa** cuando el autor puede decir el texto sin actuar una personalidad prestada, las pausas sostienen el
argumento y ninguna frase exige fingir experiencia o certeza.

## 10. CTA educativo, comercial o híbrido

Elegir por el trabajo del artículo y el nivel de preparación del lector, no por una cuota de conversión.

### CTA educativo

Usarlo cuando la pieza abre categoría, enseña un mecanismo, el lector aún necesita diagnosticar el problema o no
existe una oferta/destino probado. Puede invitar a aplicar una pregunta, usar un checklist, leer la siguiente
pieza, explorar una herramienta educativa o discutir una decisión con el equipo.

### CTA comercial

Usarlo solo cuando el artículo ya explicó problema y mecanismo, existe una capacidad real y vigente que resuelve
el siguiente paso, los claims comerciales tienen prueba, el destino fue verificado y el autor aprueba el handoff.
La presión debe corresponder a la intención: conversación, diagnóstico, demo o compra no son el mismo CTA.

### CTA híbrido

Preferir una acción educativa primaria y un handoff comercial secundario cuando el lector puede obtener valor sin
estar en venta. En voz híbrida, atribuir la capacidad: `En Efeonce...`; no convertir el cierre personal en un
anuncio invisible.

**Gate:** si el artículo pierde su valor al quitar el CTA comercial, todavía no está listo. Evitar `contáctanos`,
`conoce más` o `lleva tu negocio al siguiente nivel` sin objeto, mecanismo y destino concretos.

## 11. Disclosure de IA

Mantener siempre un registro interno de qué hizo el agente, qué verificó el humano y quién aprobó. El disclosure
público depende de materialidad y de reglas externas vigentes; reverificar ley, contrato, política editorial y
plataforma antes de publicar.

**Hacer disclosure público** cuando lo exija una regla aplicable o cuando la asistencia sea material para entender
cómo se produjo la pieza: draft o reescritura sustantiva, investigación/síntesis que modeló el argumento,
traducción creativa relevante, casos o medios sintéticos, o cualquier situación donde omitirla pueda inducir a
creer que todo provino de experiencia directa del firmante.

**Puede no requerir disclosure público específico** una ayuda mecánica menor como ortografía, formato o detección
de links, si ninguna regla aplicable dice lo contrario y no cambió la sustancia. Igual se registra internamente.

Disclosure base para adaptar, nunca inflar:

> Este artículo fue desarrollado por [autor] con apoyo de IA en [investigación, estructura y/o edición]. [Autor]
> definió la tesis, seleccionó las fuentes, verificó las afirmaciones y aprobó la versión final.

Ubicarlo en una nota editorial o metodológica visible y separada del CTA. Nombrar solo tareas realmente realizadas.
No decir `escrito por IA` si describe mal la autoridad real, ni ocultar asistencia material para sostener una ficción
de autoría solitaria.

## 12. Gate de salida

No publicar hasta responder `sí` a todo:

- ¿El autor formuló o aprobó expresamente la tesis?
- ¿Seleccionó las fuentes que sostienen la pieza?
- ¿Aprobó claims, límites, primera persona, casos y analogías?
- ¿La frontera personal/institucional/híbrida es visible?
- ¿El texto refleja decisiones observadas del autor, no una imitación estadística?
- ¿Hook, ritmo y lectura en voz alta pasan sin personalidad prestada?
- ¿Los motivos personales, si aparecen, tienen función y permiso?
- ¿La auditoría no conserva ningún `BLOCK` y los `NEEDS AUTHOR` fueron resueltos?
- ¿El CTA es proporcional y su destino está vigente?
- ¿El disclosure fue decidido contra materialidad y reglas aplicables?
- ¿El autor aprobó explícitamente la versión final y la acción de publicación?

Si falta cualquiera de las cinco primeras decisiones de autoridad, el artefacto puede quedar como draft asistido,
pero no como artículo firmado listo para publicar.
