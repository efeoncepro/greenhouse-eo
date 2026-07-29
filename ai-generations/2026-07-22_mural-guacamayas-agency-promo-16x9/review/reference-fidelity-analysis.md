# Análisis de fidelidad — referencia 9:16 vs candidato 16:9

## Veredicto

El candidato 16:9 preserva objetos reconocibles, pero no preserva la obra. La referencia no es valiosa por
contener un ojo, un muro y una guacamaya: es valiosa porque convierte gradualmente una superficie pintada
en materia viva sin revelar dónde termina la pintura y dónde comienza el animal. El candidato reemplaza esa
ambigüedad por una narración literal y convencional.

Estado: `rejected_by_operator`. No escalar, publicar ni usar como source para otra derivación.

## Evidencia técnica

Ambos masters duran aproximadamente diez segundos y tienen 240 frames a 24 fps. El análisis `signalstats`
sobre todos los frames produjo:

| Métrica promedio | Referencia 9:16 | Candidato 16:9 | Lectura |
| --- | ---: | ---: | --- |
| Luma `YAVG` | 74.91 | 82.12 | El candidato es más luminoso y menos nocturno. |
| Saturación `SATAVG` | 14.27 | 9.18 | El candidato pierde aproximadamente 35.7% de intensidad cromática. |
| Diferencia temporal `YDIF` | 8.778 | 3.729 | El candidato tiene aproximadamente 57.5% menos cambio frame a frame. |

El request incluyó tres imágenes y un MP4 de tres segundos. Sin embargo, `usage.input_tokens_by_modality`
registra únicamente `text: 940` e `image: 3240`; no registra modalidad `video`. El endpoint aceptó el input,
pero la evidencia de consumo no demuestra que la referencia temporal haya condicionado la generación. Esto
coincide con la limitación vigente documentada para video-reference en Gemini Omni preview.

## Qué hace extraordinaria a la referencia

### 1. La revelación es ontológica, no descriptiva

Durante los primeros segundos no vemos “un pájaro listo para volar”. Vemos pintura con suficiente vida para
hacer dudar: el ojo refleja, parpadea y respira dentro de una cara construida con espátula. La pregunta visual
es `¿sigue siendo mural?`. Sólo después aparece el volumen corporal.

En el candidato, el ojo funciona como introducción y rápidamente se abre a una vista explicativa del mural.
La incertidumbre desaparece: el espectador ya entiende que hay una ilustración de ave y espera que salga un
pájaro. La sorpresa se convierte en cumplimiento de una instrucción.

### 2. La pintura nunca deja de ser el cuerpo

En la referencia, pluma, brochazo, gota, hilo de acrílico y ala pertenecen al mismo sistema material. Incluso
cuando aparece el ave completa, sigue conectada al muro mediante arcos y ríos de pintura. El vuelo arrastra
la superficie; la pared paga físicamente la transformación.

En el candidato, una guacamaya relativamente natural emerge delante de un agujero oscuro mientras la cara
pintada permanece detrás. Se leen dos entidades: mural y ave. Las salpicaduras decoran el evento, pero no
constituyen el cuerpo. Ésta es la pérdida central.

### 3. Escala monumental y proximidad

El 9:16 hace que el mural ocupe casi toda la altura. El ojo, el pico y el ala desbordan el encuadre; la cámara
parece atrapada contra la pared. Cuando el ave se libera, gana profundidad porque pasa de una superficie
claustrofóbica a un callejón vertical largo.

El candidato usa el ancho para mostrar contexto demasiado pronto. El muro gris y el suelo mojado ganan área,
mientras la criatura pierde escala. La composición ofrece aire para copy, pero ese aire reduce amenaza,
misterio y asombro. La prioridad de layout comercial contradijo la prioridad dramática.

### 4. Ritmo: tensión larga, liberación corta

La referencia dedica aproximadamente la primera mitad a ojo, rostro y respiración del muro. La liberación es
tardía y concentrada: ala, cuerpo, vuelo en profundidad y retorno. La espera carga de energía el gesto.

El candidato abre la escena antes, permanece en una vista media explicativa y reparte el tiempo de forma más
uniforme. Aunque tiene movimiento continuo, la curva emocional es plana. El valor alto de `YDIF` del original
confirma que la segunda mitad libera mucha más energía temporal.

### 5. Cámara con punto de vista

La cámara original descubre: macro íntimo, retirada gradual, contacto con la pared, ave atravesando planos de
profundidad, cruce cercano y retorno al ojo. La cámara participa en la magia.

La cámara candidata observa desde una posición segura. El movimiento lateral y el cuadro ancho organizan la
información, pero no crean una experiencia corporal. La guacamaya se desplaza principalmente paralela al muro
en vez de conquistar el espacio entre pared, lente y fondo.

### 6. Color y luz

La referencia protege negros azulados, cobalto, esmeralda y oro sobre un callejón oscuro. El color parece
escapar de una ciudad gris, por lo que cada trazo funciona como luz narrativa.

El candidato eleva la luma y deja que concreto gris, posters y suelo ocupen más imagen. La reducción medida de
saturación no es sólo estética: debilita la idea de que el color es una fuerza que se libera.

### 7. El loop tiene memoria visual

La referencia vuelve a un ojo muy cercano que recuerda material, escala, orientación y tensión del inicio.
El cierre no sólo muestra otro ojo: recompone el estado inicial.

El candidato vuelve a un close-up reconocible, pero cambia modelado facial, distribución de pintura y escala.
Funciona como cierre temático, no como loop perceptual.

### 8. Sonido

La referencia presenta eventos espectrales diferenciados y crescendos alrededor de la activación, la salida
del ala y el vuelo. El candidato mantiene una cama más uniforme. Aunque loudness integrado y rango global son
similares (`-20.9/-21.3 LUFS`, `8.1/7.9 LU`), el original sincroniza mejor los acentos con cambios de estado.
La maravilla depende también de esa causalidad audiovisual.

## Por qué falló el approach

1. Se trató `reference_to_video` como si las tres imágenes constituyeran un storyboard ordenado garantizado;
   el modelo puede interpretarlas como referencias de sujeto/estilo sin respetar esa secuencia.
2. La referencia de video fue aceptada por transporte, pero el usage no acredita modalidad de video.
3. El prompt pidió simultáneamente fidelidad, expansión lateral, espacio para copy, cámara 35 mm y un arco
   nuevo. En conflicto, Omni optimizó el nuevo layout y sacrificó la dramaturgia original.
4. Se evaluaron frames hero por nitidez y anatomía, no pares consecutivos por transformación causal.
5. La primera QA confundió `motivos presentes` con `experiencia preservada`.

## Contrato obligatorio para una futura ruta

- El master 9:16 es verdad temporal; no basta con usar sus keyframes como inspiración.
- El cuadro inicial debe conservar ocupación monumental: el ojo llena el frame horizontal, aunque el entorno
  lateral aparezca mediante desplazamiento o expansión progresiva, no desde el primer segundo.
- No puede existir un ave independiente delante de un mural intacto. El mismo volumen pintado debe convertirse
  causalmente en ala y cuerpo; la pared pierde materia y mantiene tethering visible.
- La fase `mural ambiguo` debe ocupar aproximadamente la mitad inicial.
- El clímax debe aumentar saturación, profundidad y cambio temporal respecto del build, no aplanarlos.
- El ave debe atravesar el eje de profundidad y acercarse a lente; no limitarse a volar paralela al muro.
- El final debe empatar material, escala y orientación del primer ojo para que el loop sobreviva.
- Copy y logo se resuelven después. El negative space comercial no puede dirigir la generación hero.
- La aceptación se hace con revisión a 1× y 0.5×, timeline de al menos 4 fps, material continuity y audio-event
  sync; una contact sheet de 1 fps no es suficiente.

## Ruta recomendada, todavía no autorizada

No repetir el mismo request. Una futura prueba debe validar primero si el endpoint realmente consume video
como modalidad. Si no lo hace, la opción controlable no es “pedirle mejor” a Omni: es preservar el master
vertical como placa central y construir la extensión horizontal por shot mediante generative outpaint/VFX o
composición, manteniendo intactos tiempo y sujeto. Sólo la periferia debe generarse; la maravilla central no
se vuelve a interpretar.
