# Auditoría visual — HubSpot AEO product storytelling

## Fuentes verificadas

- Página: `https://www.hubspot.com/products/aeo`.
- Ilustración `Brand visibility score`: SVG oficial `700 × 525`.
- Ilustración `Citation analysis`: SVG oficial `700 × 525`.
- Hero: PNG oficial `2974 × 1420` y Lottie `1487 × 710`.
- CSS de la landing y Lottie `Brand Vis - 01-1.json` inspeccionados el 2026-07-17.
- Dos capturas compartidas por el operador: `1375 × 1028` y `1320 × 991`, ambas cercanas a `4:3`.

## Qué construye el lenguaje visual

### 1. Una escena de producto, no un gráfico aislado

Cada ilustración combina dos superficies analíticas. La posterior explica contexto y evolución; la frontal
resume o descompone el hallazgo. La profundidad procede del solapamiento, el contraste tonal y la sombra, no de
una perspectiva tridimensional.

### 2. Geometría medida

En `Brand visibility score`, sobre un lienzo `700 × 525`:

- tarjeta posterior: `458 × 366`, posición `(40,40)`, radio `16`;
- tarjeta frontal: `348 × 310`, posición `(312,175)`, radio `16`;
- la frontal ocupa aproximadamente 76% del ancho de la posterior;
- la frontal comienza al 59% del ancho de la posterior y al 48% de su alto;
- el solapamiento conserva título, leyenda y parte de la trayectoria posterior;
- el área restante del SVG es transparente y deja actuar al fondo de sección.

En `Citation analysis`, la tarjeta frontal crece a `395.9 × 385.2` y se ubica en `(264,99.9)`. La fórmula no
es un componente rígido: el solapamiento se ajusta al tipo de gráfico y al contenido que debe permanecer visible.

### 3. Color como jerarquía

- fondo de página: `#290519`;
- acento principal de campaña: `#FF4800`;
- tarjeta posterior: negro al `40%`, que deja respirar el fondo vino;
- tarjeta frontal: lavanda `#D6C2D9`;
- tinta frontal: vino `#46062B`;
- serie cálida: `#FF7D4C`; serie rosada `#FF9FCC`; serie violeta `#BC8FC3`;
- escala violeta: `#CAAACF`, `#BC8FC3`, `#AB73B4`, `#84408E`, `#581D61`.

El fondo no es negro. La tarjeta posterior tampoco usa un negro absoluto opaco: la transparencia la integra con
la sección.

### 4. Tipografía y datos

El texto no es textura decorativa. Títulos, leyendas, ejes, fechas y valores son vectores legibles. La pieza
parece producto porque sostiene una lectura real, aunque sea ilustrativa. La jerarquía usa un título fuerte,
leyenda compacta, ejes discretos y una cifra dominante sólo en la tarjeta frontal.

### 5. Sombra y superficie

- sombra posterior: `dy 2.224`, blur `4.17`, opacidad `0.15`;
- sombra frontal: desplazamiento aproximado `(1,15)`, blur `11`, opacidad `0.12`;
- sin glow, reflejo, vidrio, grano visible ni volumen isométrico;
- radios moderados y consistentes.

### 6. Motion

El Lottie corre a `30 fps` y usa una entrada breve:

- tarjeta frontal: opacidad `0 → 100` entre frames `0–11`; desplazamiento vertical de `35.6 px` hasta frame `20`;
- tarjeta posterior: opacidad `0 → 100` entre frames `4–15`; desplazamiento vertical de `35.6 px` hasta frame `24`;
- series y puntos se dibujan con staggers entre frames `10–29`;
- la aguja rota `0 → 105°` entre frames `22–42`;
- el gesto significativo termina cerca de `1.4 s`; no depende de un loop permanente.

### 7. Responsive

- el SVG conserva `aspect-ratio: 700/525` y `width:100%`;
- debajo de `600 px`, imagen y texto se apilan;
- desde `600 px`, la sección usa grilla; en desktop la variante `large-media` entrega mayor peso a la imagen;
- no existe una ilustración móvil alternativa: la composición interna fue diseñada para escalar completa.

## Traducción local al caso ANAM

Se adoptan los principios y se aplica un skin contextual al artículo; no se crea una identidad general:

- fondo vino, lavanda y naranja para reconocer que esta pieza trata de HubSpot;
- tarjeta posterior con evolución de cobertura y umbral de publicación;
- tarjeta frontal con clasificación honesta del indicador;
- Poppins para títulos, Geist para cuerpo y numerales;
- azul Efeonce como estructura y verde Efeonce como validación;
- naranja HubSpot como serie contextual;
- firma oficial Efeonce discreta y separada de la evidencia;
- composición `4:3` contenida dentro del centro de un lienzo `16:9`, para sobrevivir al recorte `1:1` del blog.

### Frontera reusable

- **Reusable y agnóstico:** contexto posterior + interpretación frontal, solapamiento funcional, gráficos
  legibles, profundidad por color/posición/sombra, crop seguro y producción determinística.
- **Local a este artículo HubSpot:** vino, lavanda, coral, naranja y cualquier eco cromático de la landing AEO.
- **Marca Efeonce:** firma oficial, tipografía y criterio editorial; no absorbe la paleta HubSpot como default.

En una pieza sobre otro CRM, industria o cliente se conserva la gramática sólo si sirve al argumento y se crea un
skin nuevo desde el brief. “Escena de producto” no significa “usar colores HubSpot”.

## Qué no se debe repetir

- dashboard completo con navegador, sidebar y muchas cards;
- render de vidrio, rack o acrílico;
- gráfico plano sin contexto de producto;
- microcopy inventado o ilegible;
- usar IA para dibujar ejes, números o marca;
- copiar títulos, datos o proporciones exactas sin traducirlos al caso y a Efeonce.
- convertir la paleta contextual HubSpot en regla general para Efeonce, RevOps o dashboards.
