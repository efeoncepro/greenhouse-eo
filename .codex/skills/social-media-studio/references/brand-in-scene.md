# Marca dentro de la escena: geometría, material y fotografía

Leer cuando el logo/producto debe pertenecer físicamente a un objeto, no sólo firmar la pieza.
**Activo exacto ≠ perspectiva correcta ≠ material convincente ≠ reconocimiento.** Son cuatro controles distintos.
Caso fuente: el operador rechazó el placement de la libreta del piloto Día de Muertos el 2026-09-12 porque
el logo se veía alargado y mal aplicado, aunque copy, hashes, contraste y safe zone pasaban.

## 1. Elegir una presencia que tenga sentido

- ¿Qué objeto usaría realmente la marca/persona en esta situación? ¿Por qué está allí?
- ¿El producto participa en la acción, aporta identidad o es un soporte añadido por conveniencia?
- ¿Qué tamaño tendría en relación con mano, mesa, envase o cuerpo? ¿Es secundario o protagonista?
- ¿Qué elementos no deben ser apropiados o alterados? Mantener las restricciones culturales del brief.
- ¿La marca se reconoce en el tamaño de consumo sin competir con la idea? Si no, cambiar el soporte o plano.

Una libreta con logo es un mockup de presencia de marca, no prueba de que exista un producto Efeonce vendible.
No añadir un objeto sólo para cumplir una casilla si interrumpe la escena. La firma editorial sigue siendo
una opción válida, pero debe llamarse firma y no integración física.

### Decisión obligatoria antes de producir

Completar estas frases en el brief y conservarlas junto al artefacto:

- «La audiencia reconocerá ___ y recibirá ___».
- «La marca participa como ___; queremos asociarla con ___».
- «Se atribuye a la marca mediante ___, visible en ___».
- «El objeto está allí porque ___; su aparición aporta ___» (sólo ruta física).

Si la cuarta frase sólo dice «para poner el logo», elegir firma editorial o replantear la escena. La marca
puede ser firma, punto de vista, participante, facilitadora, demostración o protagonista. El modo gráfico
no determina automáticamente ese papel. Un buen mockup prueba ejecución, no conexión estratégica.

| Recurso | Qué acredita | Qué no acredita |
|---|---|---|
| Logo oficial | Fuente autorizada de identidad | fidelidad del raster generado ni buen placement |
| Tipografía/paleta oficial | Coherencia con el sistema | reconocimiento sin nombre |
| Activo distintivo | Asociación con la marca sustentada en evidencia de audiencia | universalidad entre mercados/públicos |
| Objeto corporativo | Presencia plausible si el contexto la justifica | que sea un producto vendible o demostración del oficio |

La prueba de cambiar el logo detecta genericidad, pero no es veto automático: una serie coherente puede
construir asociación sobre temas compartidos. Registrar la intención y no prometer exclusividad conceptual.
No duplicar logos para compensar un placement fallido. Si dos modos son necesarios, explicar su función
(por ejemplo, producto protagonista más firma del anunciante) y revisar la jerarquía conjunta.

## 2. Fijar identidad y acabado como inputs separados

**Identidad:** SVG/PNG oficial de alta resolución, variante aprobada, proporción frontal, letras, espacios,
isotipo y detalles distintivos. El modelo recibe el archivo como referencia de identidad, no una descripción
del nombre. Un logo no se reconstruye con una fuente parecida.

**Soporte:** fotografía/product reference cuando exista; tipo de objeto, geometría, dimensiones conocidas,
curvatura, costuras, grano, plano de cámara, relación con otros objetos y región editable.

**Acabado elegido:**

| Acabado | Qué debe verse | Error frecuente |
|---|---|---|
| Tinta/serigrafía | color unido a la textura, casi sin espesor, luz del soporte | texto luminoso flotante o sombra artificial |
| Foil blanco/metálico | película fina, reflejo dependiente de luz y ángulo | plástico grueso/cromo espejo sin relación con la escena |
| Deboss/bajorrelieve | hundimiento sutil, sombra de borde y luz en labio opuesto | drop-shadow exterior que simula letras levantadas |
| Emboss/relieve | elevación material pequeña y contacto continuo | letras 3D de centímetros encima de una libreta |
| Bordado | hilo, dirección de puntada, volumen y tensión sobre tejido | decal plano o textura que destruye letras |
| Grabado | remoción/cambio del material, profundidad y tono coherentes | pintura blanca cuando se pidió grabado ciego |

No combinar todos los efectos. Ejemplo del piloto: foil blanco en una impresión poco profunda; la luz cálida
de la vela debe afectar sus bordes sin transformar el blanco en un cartel que emite luz.

## 3. Resolver geometría antes de material

Cuatro esquinas permiten definir un plano proyectivo, pero **no justifican estirar el logo hasta llenar
cualquier caja**. Mantener su relación de aspecto en el espacio del soporte antes de proyectar.
Una cubierta normalizada a un cuadrado, con anchos/altos del logo elegidos independientemente, puede deformar
la marca aunque los bordes sigan el libro. Es el error de implementación del piloto v5.

Si se conoce la geometría física, usarla para la escala local y luego proyectar. Si no se conoce, usar una
referencia de producto/maqueta y evaluar la foreshortening; no declarar exactitud métrica desde cuatro puntos
escogidos a ojo. Para curvatura/tela, un plano único no basta: usar superficie/UV o displacement acorde al material.

En Photoshop, Vanishing Point establece el plano de perspectiva; un mapa de desplazamiento ayuda a seguir
el relieve de la superficie. En 3D, decal/UV y canales de altura/normal/roughness describen otras propiedades.
Ninguna de estas técnicas garantiza por sí sola el resultado: fuente, cámara, resolución y acabado siguen importando.

## 4. Elegir una de tres rutas

### A. Producto fotografiado o render 3D con material controlado

Preferir cuando existe producto real/packshot/modelo, repetibilidad de varias vistas o identidad estricta.
Aplicar arte oficial en UV/decal y definir acabado; renderizar con cámara y luz coherentes. El logo puede
gobernar color, máscara de altura y roughness sin volverse una pieza de texto recreada.

### B. Composición fotográfica completa

Activo oficial → escala en el espacio del soporte → perspectiva → curvatura/desplazamiento si aplica →
interacción de material/luz → oclusiones → óptica/grano → inspección.
Una homografía + alpha sólo resuelve parte del trabajo. No entregar ese paso intermedio como un relieve.

### C. Integración generativa guiada por referencias

Cuando el operador pide materialización generativa o el modelo puede resolver mejor la interacción física:

1. Input 1: plate sin titular editorial, con el objeto visible. Input 2: logo oficial. Input 3 opcional:
   referencia autorizada del acabado, separada de identidad. Un placement guide sólo indica zona/escala;
   no usar un guide deformado como referencia geométrica correcta.
2. Prompt: región editable, identidad invariable, acabado físico concreto, escala plausible, luz existente,
   profundidad pequeña, márgenes, oclusiones y elementos protegidos. Pedir transferencia del arte, no rediseño.
3. Generar/editar sólo el objeto. Verificar tanto el crop cercano como la escena completa; no asumir que un
   prompt localizado mantuvo todo intacto. Conservar el original y el resultado como revisiones distintas.
4. Comparar letras, espaciado, isotipo y detalles contra el archivo oficial. Rectificar para comparar sólo
   cuando la geometría de la superficie lo permita; el score de similitud no reemplaza juicio de identidad.
5. Si hay drift, corregir con referencia/edición o volver a A/B. No afirmar «logo exacto» por haber adjuntado
   el SVG convertido. El modelo produce una representación del activo, no una garantía de igualdad vectorial.
6. **Después** componer el titular editorial de forma determinística. El master tipografiado no entra a un
   enhancer general. Cualquier uso posterior de IA con marca ya integrada exige revalidar su identidad.

No imponer «todos los logos van después del modelo» a esta ruta: confunde firma gráfica con objeto material.
Tampoco imponer «todo product placement exige IA»: las rutas A/B permiten control físico y de identidad.
La elección responde al encargo, al asset y al acabado.

## 5. Revisión con evidencia visual

Inspeccionar y guardar:

- **Identidad:** referencia oficial frente al detalle del resultado; no letras nuevas, isotipo alterado,
  círculos fusionados, espaciado inventado ni cambio arbitrario de ancho/alto.
- **Plano:** alineación con ejes/fugas de la cubierta; tamaño y foreshortening creíbles. El logo no cae fuera
  del soporte ni parece mirar a otra cámara.
- **Material:** acabado correcto; relieve bajo la superficie o sobre ella según se pidió; luz/sombra del
  borde en la dirección coherente, sin halo genérico.
- **Óptica:** enfoque, grano y resolución compatibles con el objeto y la escena; no marca hiper-nítida sobre
  fotografía desenfocada, ni material derretido al hacer zoom.
- **Contexto:** mismo relato, objeto plausible, sin invadir gesto central ni rituales; sin duplicación de firma sin función declarada.
- **Consumo:** reconocimiento en el master y en 320–390 px. Un crop ampliado verifica detalle, no prominencia.

Registrar `technical_pass` por separado de `material_review` y `operator_review`. Una objeción del operador
por elongación/perspectiva invalida la aceptación visual aunque el archivo pase todos los checks automáticos.
No convertir «prompt enviado» en «relieve logrado»: mirar los píxeles y describir el resultado real.

## 6. Contrato de ejecución y condiciones de salida

Antes de llamar al modelo, registrar modo de marca, activo/variante, soporte y dimensiones conocidas,
acabado único o combinación físicamente explicada, posición/tamaño, luz, cámara, foco, región editable,
regiones protegidas, método elegido y defecto que debe resolver el pase. Una dimensión desconocida queda
como desconocida; no inventar escala física desde píxeles.

El prompt mínimo describe: «Editar [región] de [plate]. Transferir [referencia IDENTITY] al soporte [objeto]
mediante [acabado], conservando [rasgos]. Mantener [luz/perspectiva/escala]. Proteger [resto]. No añadir texto
editorial ni duplicar la marca». MATERIAL manda sólo en el acabado; IDENTITY manda en forma y proporciones.
Una referencia estética no puede reemplazar al archivo de identidad.

Revisar cada salida antes de otra llamada. Si el defecto es copy/crop/posición editorial, resolver en compositor.
Si es textura/luz física, corregir sólo ese pase. Si identidad y material no pueden mantenerse juntos, detener
esa ruta y pasar a composición controlada/3D; no encadenar variaciones que se alejen del original. Registrar
el motivo de cambio, no una puntuación de calidad inventada.

| Resultado observado | Acción |
|---|---|
| Logo alargado, letras o isotipo alterados | Rechazar identidad/geometría aunque lea el nombre; corregir o cambiar ruta |
| Marca parece sticker, emite luz o tiene sombra incoherente | Rechazar material; revisar acabado e iluminación |
| Integración correcta sólo al ampliar | Cambiar escala/plano/atribución y revisar formato final |
| Objeto invade gesto o significado cultural | Replantear ubicación/objeto o usar firma editorial |
| Modelo alteró zona protegida | Volver al plate base y corregir con control localizado |
| Operador rechaza el resultado | Estado rejected; conservar evidencia y producir revisión identificada |
| Sólo checks técnicos verdes | Estado técnico aprobado; revisión creativa/material/humana permanece explícita |

En carruseles, conservar identidad y acabado entre vistas. En video, revisar deformación temporal,
flicker, deslizamiento del logo sobre el soporte y oclusiones a lo largo de la toma, no sólo el primer frame.
En adaptaciones, revalidar escala de marca, foco y recorte; no heredar aceptación del master automáticamente.

## 7. Lectura del piloto

V5 de Día de Muertos permanece rechazada por el operador. V6 explora materialización con referencia oficial;
no equivale a aprobación humana ni a desempeño medido. La libreta cumple atribución, mientras la silla y el
copy sostienen la metáfora. Si la asociación con el oficio no resulta legible, revisarla a nivel de concepto o
serie; añadir logos u objetos no resuelve esa debilidad. No convertir bajorrelieve, libreta o luz de vela en
receta universal de seasonality.

## Fuentes consultadas — 2026-09-12

- [Adobe Photoshop: Vanishing Point](https://helpx.adobe.com/photoshop/using/vanishing-point.html): plano y
  edición en perspectiva.
- [Adobe: displacement maps](https://www.adobe.com/products/photoshop/displacement-map.html): integración de
  gráficos con contorno/textura; la distorsión y mezcla dependen de la imagen.
- [Adobe Substance Painter: fabric texture and embossing](https://www.adobe.com/learn/substance-3d-painter/web/add-fabric-texture-3d):
  materiales, gráficos como relieve y bordado.
- [Adobe Substance Sampler: Decal](https://experienceleague.adobe.com/en/docs/substance-3d-sampler/using/filters/generators/decal):
  colocación, transformación y mezcla del decal con material.
- Skill instalada Higgsfield `product-photoshoot`, referencias `lifestyle-scene` y `refinement-pass`:
  estudiadas como método de producto/contexto/luz y corrección del defecto observado. Su receta de modelo/MCP
  no se declara ejecutada por usar el motor nativo ni reemplaza el schema vigente del conector elegido.
