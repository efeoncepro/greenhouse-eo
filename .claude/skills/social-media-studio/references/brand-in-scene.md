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

**Isotipo de Efeonce como objeto:** existe una biblioteca 3D aprobada de la nave en navy y blanco (ángulos con
transparente y escenas; OneDrive `5. Contenidos/13- Branding/Nave Efeonce 3D/`). Usarla como el objeto, compuesta
(ruta B) o como referencia para regenerar el plate (ruta C), antes de generar otra nave. Navy sobre fondos claros,
blanco sobre oscuros o navy. Para integrarla con personas o mascotas, regenerar el plate en vez de recortar
alrededor de los sujetos. Método: [isotipo propio en 3D](../../greenhouse-ai-image-generator/references/mascot-3d-pose-library.md#isotipo-propio-en-3d-con-dos-colores-caso-nave-de-efeonce).
**Logo completo de Efeonce en la escena:** usar el [kit de referencia 3D](../../greenhouse-ai-image-generator/references/logo-3d-reference-kit.md) (escala, cámara y luz por manifiesto). La regla vigente **no es el tamaño**: el render exacto entra como **referencia de FORMA** y el prompt lleva la **INTENCIÓN** —material, montaje, escena, cámara, atmósfera—. El modelo resuelve material, luz, sombra montada y atmósfera mejor que cualquier composición nuestra.

- **Pasada directa (por defecto)** — logo grande en cuadro, **cambio de material** (acero, aluminio, vidrio, neón, madera, latón) o escena de atmósfera fuerte. La referencia fija letras, nave, órbita con sus cortes, tres ventanas, proporciones y perspectiva; el prompt describe material, montaje y escena. Nunca pedirle texto al modelo.
- **Halo enmascarado (única excepción)** — sólo con el material exacto del kit y el logo chico o de detalle fino, donde la pasada directa deforma la órbita: plato sin el objeto, render pegado y máscara que protege el logo **y** el resto de la escena, dejando editable sólo un halo para sombra de contacto, reflejo y fundido.

**Nunca pegar el render como camino por defecto:** conserva el material y la luz del kit y no pertenece a la escena («se ve muy falso», operador 2026-09-17). **Referencia por luminancia:** render blanco para materiales claros (acero, aluminio, vidrio, blanco), navy para materiales oscuros o el color de marca. **Material según el fondo:** sobre piedra clara o madera, metal o navy con volumen; sobre fondos oscuros o nocturnos, blanco o metal claro.

Caso aprobado: recepción de oficina premium 9:16 con **larga exposición** —así se llama el efecto de personas en estela con la arquitectura nítida (long exposure, motion trails)—, escala mediana, referencia blanca frontal luz derecha, instrucción «mismas letras, nave, órbita con sus cortes, tres ventanas, proporciones y perspectiva; cambia sólo el material: acero inoxidable cepillado de 1,2 m y 4 cm de fondo, pines ocultos sobre travertino». Una pasada, USD 0,14. Antes, pegar + halo sobre ese muro fue rechazado, y el navy sobre travertino claro no tenía jerarquía.

QA letra por letra en ambas vías («e», «f», nave, órbita con sus cortes, tres ventanas), color sin deriva y perspectiva coherente. Componer de forma determinística es el último recurso: se lee pegado, sin sombra ni profundidad integradas. La firma de la pieza sigue siendo el SVG oficial compuesto con AXIS.

**Vestir a una persona con ropa de marca:** mismo contrato, con el [kit de referencia de prenda](../../greenhouse-ai-image-generator/references/garment-reference-kit.md) (OneDrive `13- Branding/Hoodie Efeonce/v01/` y `Polo Efeonce/v01/`). Elegir la vista que corresponde al **ángulo de la toma** —de espaldas, la vista de espalda— y pasarla junto con las referencias de rostro y cuerpo; nunca describir la prenda en el prompt ni pedirle al modelo el texto de la estampa, que se compone aparte.

**Si en la escena aparece credencial o merch** (lanyard, yoyo, portacarnet, carnet, tazón, libreta de marca), usar las vistas del mismo kit y las **artes canónicas** compuestas —nunca pedirle el arte impreso al modelo—: [merch con arte impreso](../../greenhouse-ai-image-generator/references/garment-reference-kit.md#merch-con-arte-impreso-y-piezas-mecánicas).

**La prenda la elige el contexto de la escena, no la costumbre:** frente a cliente el polo piqué navy, formal camisa + softshell o blazer navy, evento la polera, producción y terreno el hoodie o la gorra. No vestir siempre con hoodie. La cápsula completa y sus reglas duras están en [`efeonce-brand-studio`](../../efeonce-brand-studio/SKILL.md) → «Vestuario de marca».

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

- **Usar los kits en imagen o video:** [guía de uso de los kits de marca](../../../../docs/operations/social/EFEONCE_BRAND_KITS_USAGE_GUIDE_V1.md).

## Primer plano desenfocado como lecho de la marca (regla, 2026-09-17; reescrita el mismo día)

Presencia de marca dentro de la fotografía sin un logo pegado encima: el logo se apoya en un plano de la escena
que sale fuera de foco. Pedido del operador: «es como cuando tomas una foto profesional pero delante tienes un
objeto que sale desenfocado… justo en el desenfoque se pone el logo». Caso fuente:
`ai-generations/2026-09-17_claude-o-codex/` (pieza vigente `out/claude-o-codex-4x5-v04.png` sobre
`plates/plate-v04.png`, **sin objeto añadido**).

> La primera versión de esta regla mandaba añadir un objeto delante de la cámara. Esa premisa quedó **falsada** en
> el mismo caso: el desenfoque de primer plano ya estaba en la foto. Se medía después; ahora se mide **antes**.

### Paso 1 — medir el plate limpio antes de añadir nada

Sobre el plate sin marca ni objetos añadidos, medir el **gradiente máximo** de luminancia en cada plano: el rostro
(plano de foco), la zona donde iría la marca y el fondo. Medición del caso fuente (135 mm, f/2,8):

| Plano | Gradiente máximo |
|---|---|
| Rostro (plano de foco) | 314 |
| Mesa junto a las manos | 39 |
| **Mesa en el borde inferior** | **5** |
| Fondo desenfocado | 5 |

El borde cercano de la mesa ya estaba **tan fuera de foco como el fondo**. El logo se compuso ahí, en negativo,
con **11,36:1** de contraste, sin tocar el plate.

**Decisión:**

- La zona de la marca mide cerca del fondo y lejos del rostro → **no se añade objeto**. Se compone el logo sobre esa
  superficie (la mesa, el mostrador, el borde del escritorio).
- La zona mide cerca del rostro (está en foco) → recién entonces se evalúa añadir un objeto, con las reglas de forma
  de abajo. Antes de eso, probar si otro encuadre o apertura desenfoca la superficie que ya existe.

### La contradicción que hay que tener presente

Un primer plano de verdad **incidental** no cae justo donde firma un logo. Forzarlo a caer ahí es precisamente lo
que lo delata: el ojo lee que el objeto existe para sostener la marca. Por eso la salida no es buscar un objeto
mejor, sino reconocer que el primer plano desenfocado casi siempre es **la superficie que ya está en la foto**.

### Cinco intentos rechazados: el patrón del error

| Intento | Por qué se cayó |
|---|---|
| Panel de acrílico al costado | Choca con la cara y con el gesto |
| Franja de acrílico de borde a borde | «Una franja forzada para desenfocar» |
| Tapa de portátil asomando sobre la mesa | «Se ve como un cuadrado allí»: forma geométrica y borde recto |
| Hojas sólo en la esquina inferior izquierda | «Si el objeto está a la izquierda no cumple el objetivo» |
| Follaje cruzando todo el borde inferior | «Parece una selva forzada» |

Los cinco eran **redundantes**: la mesa ya entregaba el desenfoque, y por eso todos se veían puestos. Tres
buscaban una superficie donde imprimir el logo; uno era honesto pero no estaba donde iba la marca; el quinto
cumplía todas las reglas de forma y aun así se leyó forzado. Cumplir la forma no rescata un objeto que sobra.

### Sólo si la medición exige añadir un objeto

- **Un objeto que tenga razón de estar en la sala** (follaje, una taza, el respaldo de una silla) y la cámara
  puesta detrás; nunca un soporte cuya única función sea la marca.
- **Cruza el borde entero donde va la marca**, no una esquina.
- **Silueta modulada:** puntas sueltas y separadas en los costados, con huecos desiguales y ninguna paralela; masa
  baja, ancha y calma en el centro, que es el lecho del logo. Declararlo en el prompt: «never a straight edge,
  never a rectangle, never a band».
- **Casi una silueta:** más oscuro que lo que tiene detrás, con a lo sumo un brillo tenue donde lo alcanza una luz
  práctica de la escena.
- **Que no suba** a tapar la cara ni el gesto que cuenta la foto.
- Un objeto añadido con pasada enmascarada exige recomponer sobre el plate original: la máscara no preserva
  píxeles (ver [editar una zona de una imagen](../../../../docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md)).

### Cómo se eligen los valores — nada a ojo

| Parámetro | Cómo se fija |
|---|---|
| Nitidez del logo | Ninguna. El desenfoque es del lecho; la marca se lee. Un logo borroso no firma nada |
| Posición | En el eje de la pieza, sobre el lecho medido como desenfocado |
| Color | Por la **luminancia medida** del lecho: oscuro → negativo; claro → navy |
| Tamaño | Holgado dentro del lecho, sin tocar zonas con gradiente alto |

### QA, dos números

1. **Contraste** del logo contra el píxel más claro de su lecho **≥ 4,5:1**. Vigente: **11,36:1** sobre la mesa
   (el follaje descartado daba 12,58:1: el contraste no fue lo que lo tumbó).
2. **Blandura del lecho:** gradiente máximo **dentro del lecho**, del orden del fondo y muy por debajo del rostro.
   Vigente: **5** contra **314**. **Trampa de medición:** si la caja toca el borde de una mesa, una mano u otro
   plano en foco, el número se dispara y miente — una caja que tocaba la mesa dio **278** y hacía parecer el
   primer plano tan nítido como la cara. Medir sólo dentro del lecho.

**Límites.** Una sola aparición por pieza. Nunca sobre la cara ni cruzando la mirada.
