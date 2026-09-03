# Berel — minería de cobertura capilar, 2026-09-02

> Estado: discovery ejecutado y mapa editorial propuesto; no es aprobación de artículos ni calendario.
> México (2484), español. Capturas UTC 2026-09-03 00:58–01:02; fecha local del operador 2026-09-02.
> Contrato: [estrategia de cobertura](../../operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md).
> Corpus: [49 páginas desarrolladas](BEREL_EDITORIAL_COVERAGE_2026-09-02.md), incluidas versiones futuras.
> No se hicieron búsquedas web manuales para minar: Labs y SERP se consultaron mediante las APIs de DataForSEO.

## Resultado que cambia la planificación

Fortalecer elección/planeación, protección/mantenimiento y preparación/aplicación no significa crear
un artículo por cada keyword. El mapa tiene **27 intenciones de trabajo**: unas requieren ampliar
piezas existentes y otras justifican research para una pieza nueva. Las candidatas nuevas siguen
condicionadas a verificar el inventario público completo, la diferenciación y el respaldo técnico.

Prioridad recomendada de trabajo:

1. **Elección:** ampliar lavabilidad/acabados (E01–E02), aprovechar el brief de rendimiento ya existente
   (E05) e investigar compatibilidad al repintar (E04). Evitar otra guía de familias ya cubierta (E03).
2. **Protección:** investigar diagnóstico de desprendimientos (P01) y conservación de sobrantes (P05).
   Reforzar limpieza/mantenimiento en contenidos existentes; no abrir otra guía genérica de humedad.
3. **Aplicación:** investigar selección de rodillo (A03), resane previo (A01), techo interior (A04)
   y retiro de papel tapiz (A02). Dilución (A06) sólo con revisión técnica por producto.
4. **Segunda ola:** limpieza de herramientas (P06), cambio oscuro→claro (A08), presupuesto (E06).
   Retoques (P09) y clima (A09) mantienen huecos de evidencia; no forzar su publicación.

Esto no asigna meses ni consume slots. Antes de proponer noviembre/diciembre, refrescar los pendientes,
respetar los ocho desarrollados que ya figuraban en esas ventanas y distinguir nuevo tema de ampliación.
No se acreditó estacionalidad mensual para afirmar que una consulta crece en noviembre o diciembre.

## Compra y evidencia verificadas

| Medida | Resultado |
|---|---:|
| Corridas Labs completadas | 14 / 14, todas succeeded |
| Semillas manuales | 42 (hipótesis, no todas devueltas) |
| Llamadas Labs efectivas | 84 |
| Keywords distintas por normalización del reader | 1517 |
| Suma de keywords únicas dentro de cada corrida | 1534 |
| Filas de procedencia persistidas | 1665 |
| Keywords con volumen NULL / volumen cero | 79 / 15 |
| SERPs orgánicas verificadas | 13, task status 20000 |
| Preguntas PAA observadas | 52, todas distintas |
| Costo Labs reportado | US$1.20972 |
| Costo SERP reportado | US$0.02600 |
| Total de esta exploración | **US$1.23572** |
| Techo anunciado / previsión acumulada | US$3 / US$2,334 |

Se usaron previewKeywordDiscovery → queueKeywordDiscovery → runner canónico, con claim atómico,
entitlements y registro de gasto. El worker y la invocación local del mismo runner procesaron corridas;
los intentos que encontraron una corrida tomada devolvieron busy sin repetir compras.
Las métricas se exportaron con el reader canónico y toda su paginación (200 filas por página).

Métodos: /v3/dataforseo_labs/google/keyword_suggestions/live y
/v3/dataforseo_labs/google/related_keywords/live; 50 resultados por llamada, related depth 2,
sin clickstream. No hubo llamadas de top-up: 84 = 42 semillas × 2 métodos.
Las 13 validaciones usaron /v3/serp/google/organic/live/advanced, desktop, depth 10,
sin expansión pagada de PAA ni carga asíncrona de AIO.
No se activaron tracking, grounded-query drafts, LLM research, competidores ni flags.

El costo corresponde a las respuestas/run de esta etapa, no a una diferencia global de cuenta ni
a la factura fiscal. Las etapas anteriores no están incluidas. Las métricas Labs son estimaciones
mensuales, no demanda GSC ni volumen de prompts de IA. Las fechas del proveedor viajan por fila;
minar hoy no vuelve actual una métrica histórica.

## Correcciones importantes frente a una lectura superficial

- **Baño no es vacío:** Berel apareció #2 para “pintura para baño” con
  [Cómo Transformar tu Baño con Pintura](https://berel.com/tutoriales/como-transformar-tu-bano-con-pintura).
  Esta URL no estaba entre los 49 cuerpos. La SERP prueba presencia indexada, no se certificó aquí
  el cuerpo/versionado CMS. Se descarta crear un duplicado hasta inspeccionarla.
- **Lavable/acabados tiene mucha cobertura parcial:** E01 requiere comparación útil, no repetir atributos
  de Berelinte/Insignia. “Más brillo = más lavable” no se promueve a regla técnica universal.
- **Rodillo no equivale a “cómo usarlo”:** aplicación en W y borde húmedo ya están; selección de pelo,
  material y textura es el diferencial que merece investigar.
- **Resane sí aparece:** en los tutoriales es un paso. El candidato nuevo es la guía específica de
  reparación superficial, no una afirmación de cobertura cero.
- **Humedad, madera, metal y azotea ya tienen piezas:** conservar hogares e interconexión antes de sumar.
- **Ruido real del proveedor:** “limpiar brochas” mezcla maquillaje; “pintar con frío” derivó a pintura
  al frío/manualidades. Se ejecutaron dos lotes de refinamiento y se mantuvo ese límite visible.
- **core_keyword no es canon:** “tipos de rodillos” llegó asociado a “tipos de rodillas”; “quitar papel
  tapiz de las paredes” a “papel tapiz para paredes en quito”. Nunca fusionar intenciones sólo por ese campo.
- **Cero resultados no significa cero demanda:** guardar pintura sobrante, retoques y clima tuvieron
  poca o nula expansión útil. P05 tiene SERP/PAA y variantes de almacenamiento; P09/A09 requieren más evidencia.

## Matriz de intenciones y decisión editorial

Volúmenes entre paréntesis = estimación mensual para la keyword exacta en MX/es; **no se suman variantes**.
Prioridad y esfuerzo son juicio editorial relativo, no RICE calculado ni horas comprometidas.

| ID | Intención | Estado en corpus | Acción | Prioridad | Keywords de apoyo |
|---|---|---|---|---|---|
| E01 | Elegir por lavabilidad real | parcial | ampliar primero | alta | pintura lavable (2900); pintura lavable para interiores (1000) |
| E02 | Mate, satinado y semibrillante | cubierto | ampliar misma pieza | alta | pintura mate o satinada (110); pintura satinada vs mate (90) |
| E03 | Agua, solvente y familias de pintura | cubierto | ampliar misma pieza | alta | pintura base agua (720); pintura base solvente (110) |
| E04 | Compatibilidad al repintar un acabado previo | parcial | nuevo candidato | alta | pintura vinilica sobre esmalte (10); se puede aplicar pintura vinilica sobre esmalte (10) |
| E05 | Cantidad, rendimiento y cubeta | parcial y brief existente | usar brief ya asignado | alta | rendimiento de pintura por m2 (880); cuantos metros rinde una cubeta de pintura de 19 litros (210) |
| E06 | Presupuesto del proyecto | parcial | ampliar; nuevo sólo con diferencial | media | cuanto cuesta pintar una casa (170); precio por pintar un cuarto de 4x4 (70) |
| E07 | Elegir pintura exterior | cubierto | conectar artículos y fichas | media | pintura para exterior (5400); mejor pintura para exterior (480) |
| E08 | Baño y zonas húmedas | URL propia en SERP fuera del Hub | revisar URL propia; no crear duplicado | alta | pintura para baño (4400); pintura para baño antihongos (1000) |
| E09 | Yeso, tablaroca y soporte poroso | parcial | ampliar sellador y selección | media | pintura para yeso (590); como pintar tablaroca (90) |
| P01 | Pintura que se desprende, ampolla o cuartea | parcial | nuevo candidato | alta | porque se desprende la pintura de la pared (20); porque se cuartea la pintura de la pared (20) |
| P02 | Humedad, moho y salitre | cubierto | ampliar y coordinar intenciones | media | humedad en paredes (1900); salitre en paredes (2400) |
| P03 | Impermeabilización y mantenimiento de azotea | cubierto con ampliación de mantenimiento | ampliar pieza existente | media | impermeabilizante para techos (8100); mantenimiento a impermeabilizante (10) |
| P04 | Limpiar paredes pintadas | parcial | ampliar primero | media | como limpiar paredes pintadas (10); producto para limpiar paredes pintadas (10) |
| P05 | Conservar pintura sobrante | nuevo candidato en corpus revisado | nuevo candidato | media | como guardar pintura sin que se seque (10); se puede guardar pintura en un frasco de vidrio (10) |
| P06 | Limpieza y conservación de herramientas | nuevo candidato en corpus revisado | nuevo candidato | media | como limpiar brochas de pintura (50); como limpiar brochas de pintura de aceite (30) |
| P07 | Proteger madera exterior | cubierto | ampliar y enlazar | media | como proteger madera exterior (70); protector de madera para exterior (90) |
| P08 | Óxido y conservación de metal | cubierto | ampliar tutorial | media | pintura para metal oxidado (720); esmalte anticorrosivo para metal (390) |
| P09 | Retoques sin diferencias visibles | nuevo candidato provisional | research adicional antes de artículo | media | Sin keyword representativa validada en esta muestra |
| A01 | Resanar y lijar antes de pintar | parcial | nuevo candidato acotado | alta | resanar paredes (1600); material para resanar paredes (590) |
| A02 | Retirar papel tapiz y preparar el muro | nuevo candidato en corpus revisado | nuevo candidato | alta | cómo quitar papel tapiz de la pared (210); como quitar papel tapiz (140) |
| A03 | Elegir rodillo según superficie y pintura | parcial | nuevo candidato de selección | alta | tipos de rodillos para pintar (590); tipos de rodillos para pintar paredes (210) |
| A04 | Pintar techo o plafón interior | nuevo candidato en corpus revisado | nuevo candidato | alta | como pintar un techo (210); como pintar el techo con rodillo (140) |
| A05 | Evitar marcas de rodillo o brocha | parcial | ampliar guías existentes | media | como pintar con rodillo sin dejar marcas (30); como pintar con brocha sin dejar marcas (20) |
| A06 | Dilución según pintura y aplicación | parcial | nuevo candidato con gate técnico | alta | como diluir pintura acrilica para pared (50); como diluir pintura con agua (90) |
| A07 | Secado, recubrido, curado y manos | parcial con secciones fuertes | ampliar y conectar | alta | tiempo de secado de pintura (10); tiempo de secado de pintura vinilica (20) |
| A08 | Cambiar una pared oscura a clara | parcial | nuevo candidato condicionado al diferencial | media | como pintar de blanco una pared oscura (10); como pintar una pared oscura de blanco (10) |
| A09 | Clima y ventana de aplicación | parcial | ampliar errores/secado | media | Sin keyword representativa validada en esta muestra |

## Aporte diferencial, contenido propio y preguntas de research

Estas preguntas son **propuestas para investigar**, no prompts medidos ni PAA observadas. Las PAA se
presentan separadas en la sección siguiente y en el CSV de evidencia.

### E01 · Elegir por lavabilidad real

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: medio.
- Cobertura propia: [Que acabados elegir](https://app.notion.com/36839c2fefe7809bb369fd053eb797e0); [Más Color para tu Hogar con Berelinte](https://app.notion.com/3a639c2fefe78047987bd78080356ae3); [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Insignia de Berel: Nuestra Pintura Premium](https://app.notion.com/3a639c2fefe780058fffcc77d261ac36).
- Sección contrastada: Acabados: tres preguntas y FAQ; Berelinte/Insignia: ciclos; Cocina: limpieza.
- Diferencial y destino: Comparar brillo, formulación, resistencia al lavado y uso sin repetir las fichas.
- Gate antes del brief: Fichas vigentes y método de ensayo; no convertir ciclos de laboratorio en lavados domésticos.
- Pregunta propuesta: ¿Cómo elijo una pintura lavable sin confundir brillo con resistencia al lavado?

### E02 · Mate, satinado y semibrillante

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: bajo.
- Cobertura propia: [Que acabados elegir](https://app.notion.com/36839c2fefe7809bb369fd053eb797e0); [Más Color para tu Hogar con Berelinte](https://app.notion.com/3a639c2fefe78047987bd78080356ae3); [Color del Año Berel 2027 — Bien y de Buenas 1-3404D](https://app.notion.com/3a639c2fefe7807d847cc099a0b99966).
- Sección contrastada: Comparativa de acabados y mate/satinado en Berelinte.
- Diferencial y destino: Precisar satinado frente a semibrillante por ficha, no publicar otra comparativa equivalente.
- Gate antes del brief: No imponer escalas universales de brillo o lavabilidad.
- Pregunta propuesta: ¿Cuándo conviene mate o satinado y qué atributo debo verificar en la ficha?

### E03 · Agua, solvente y familias de pintura

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: bajo.
- Cobertura propia: [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013); [Cómo pintar herrería y proteger el metal del óxido](https://app.notion.com/3a639c2fefe7804cad1bde303b8ee2bb); [Pintura y barniz para madera: cómo elegir y aplicar sin errores](https://app.notion.com/3a639c2fefe7806ab0e6e1b4f2cddc6d).
- Sección contrastada: Vinílica/acrílica/esmalte: diferencia y superficie.
- Diferencial y destino: Conectar elección de base con sistema y preparación; ya existe la distinción Summa/Biometal.
- Gate antes del brief: No transferir diluyentes o usos entre líneas.
- Pregunta propuesta: ¿La base agua o solvente determina por sí sola dónde puedo usar una pintura?

### E04 · Compatibilidad al repintar un acabado previo

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: alto.
- Cobertura propia: [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013); [Pintura y barniz para madera: cómo elegir y aplicar sin errores](https://app.notion.com/3a639c2fefe7806ab0e6e1b4f2cddc6d); [Cómo pintar herrería y proteger el metal del óxido](https://app.notion.com/3a639c2fefe7804cad1bde303b8ee2bb); [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45).
- Sección contrastada: Familias; lijado de madera; sistema de herrería; adherencia.
- Diferencial y destino: Guía de decisión según pintura existente, estado y soporte; no otra guía genérica de tipos.
- Gate antes del brief: Validación de sistemas y prueba de adherencia por especialista; inventario público completo antes de nueva URL.
- Pregunta propuesta: ¿Qué revisar antes de aplicar pintura base agua sobre un acabado de esmalte existente?

### E05 · Cantidad, rendimiento y cubeta

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036); [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc); [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Cuarto Infantil: Colores que Crecen con Ellos](https://app.notion.com/3a639c2fefe7808f9720cd2332b69e44).
- Sección contrastada: Tablas de litros y rendimiento por proyecto.
- Diferencial y destino: Integrar el brief de rendimiento existente con ejemplos por absorción y capas; no consumir otro slot para la misma intención.
- Gate antes del brief: Verificar cálculo y si rendimiento está expresado a una o dos capas; calculadora funcional.
- Pregunta propuesta: ¿Cómo calculo pintura sin confundir área de piso, área de muro y rendimiento a dos capas?

### E06 · Presupuesto del proyecto

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: alto.
- Cobertura propia: [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036).
- Sección contrastada: Sala: presupuesto DIY, material y mano de obra.
- Diferencial y destino: Separar costo de material, preparación y trabajo sin prometer tarifas universales.
- Gate antes del brief: Precios fechados México y alcance explícito; no reciclar rangos sin fuente.
- Pregunta propuesta: ¿Qué conceptos debo incluir al presupuestar la pintura de una casa?

### E07 · Elegir pintura exterior

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: bajo.
- Cobertura propia: [Color y Resistencia para tus Exteriores](https://app.notion.com/3a639c2fefe78016bdc5c60e69f10baf); [Insignia de Berel: Nuestra Pintura Premium](https://app.notion.com/3a639c2fefe780058fffcc77d261ac36); [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013); [El Poder de los Colores Vibrantes en Exteriores](https://app.notion.com/382314a1974e4ce0ad5e7fabaed4d975).
- Sección contrastada: Exteriores; Insignia; matriz por superficie.
- Diferencial y destino: Cruzar fachada/exposición/sistema; no otra lista de productos o colores.
- Gate antes del brief: Ficha y condiciones específicas; la keyword comercial puede pertenecer a catálogo.
- Pregunta propuesta: ¿Qué cambia al elegir pintura para una fachada expuesta al sol y la lluvia?

### E08 · Baño y zonas húmedas

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: medio.
- Cobertura propia: [Que acabados elegir](https://app.notion.com/36839c2fefe7809bb369fd053eb797e0); [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Transforma tu Lavandería con Nuestros Tonos](https://app.notion.com/3a639c2fefe780a99ff5d47beb37e59f).
- Sección contrastada: Acabados; Cocina; Lavandería; tutorial público detectado.
- Diferencial y destino: Berel aparece #2 en la SERP con /tutoriales/como-transformar-tu-bano-con-pintura; comprobar cuerpo vivo antes de decidir ampliación.
- Gate antes del brief: SERP confirma URL indexada, no se certificó en este corte su cuerpo ni versión CMS.
- Pregunta propuesta: ¿Qué parte de la necesidad de pintura de baño ya resuelve el tutorial público de Berel?

### E09 · Yeso, tablaroca y soporte poroso

- Categoría: Elección de pinturas y planeación. Esfuerzo relativo: medio.
- Cobertura propia: [Para qué sirve el sellador antes de pintar: consejos de Don Bere](https://app.notion.com/54a806efaafe4cfbb4e7ecf317eadd99); [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013); [Transforma tu Lavandería con Nuestros Tonos](https://app.notion.com/3a639c2fefe780a99ff5d47beb37e59f).
- Sección contrastada: Sellador: tablaroca/ladrillo; matriz de superficies.
- Diferencial y destino: Añadir límites por tipo de soporte; evitar una URL para cada material sin necesidad diferenciada.
- Gate antes del brief: Compatibilidad declarada, estado de juntas y condiciones interiores/exteriores.
- Pregunta propuesta: ¿Qué preparación cambia entre un muro de yeso y tablaroca antes de pintar?

### P01 · Pintura que se desprende, ampolla o cuartea

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: alto.
- Cobertura propia: [3 efectos secundarios](https://app.notion.com/36839c2fefe78070bf74fdb27720ceaf); [5 consejos para evitar la humedad en paredes y techos](https://app.notion.com/82d027003d9c4bc3aa9f3bc09d14db65); [Para qué sirve el sellador antes de pintar: consejos de Don Bere](https://app.notion.com/54a806efaafe4cfbb4e7ecf317eadd99); [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Cómo pintar un piso de cemento: guía paso a paso](https://app.notion.com/3a639c2fefe780c9bee5d235bda5e0db).
- Sección contrastada: Daños por humedad; adherencia; capas encimadas; piso.
- Diferencial y destino: Diagnóstico por síntoma y origen, incluyendo fallas sin humedad. Enlazar humedad en lugar de repetirla.
- Gate antes del brief: Revisión técnica; no diagnosticar estructura ni vender sellador como cura universal.
- Pregunta propuesta: ¿Cómo distingo falta de adherencia, humedad y errores de aplicación cuando la pintura se levanta?

### P02 · Humedad, moho y salitre

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [3 efectos secundarios](https://app.notion.com/36839c2fefe78070bf74fdb27720ceaf); [5 consejos para evitar la humedad en paredes y techos](https://app.notion.com/82d027003d9c4bc3aa9f3bc09d14db65); [Moho, salitre y humedad: cómo repararlos después de las lluvias](https://app.notion.com/3b239c2fefe781da8e5ef6850a219c25); [Transforma tu Lavandería con Nuestros Tonos](https://app.notion.com/3a639c2fefe780a99ff5d47beb37e59f).
- Sección contrastada: Efectos, prevención, reparación después de lluvia y lavandería.
- Diferencial y destino: Delimitar prevención vs diagnóstico vs reparación; más páginas genéricas elevarían solapamiento.
- Gate antes del brief: No cubrir filtración activa; protocolo profesional cuando corresponda.
- Pregunta propuesta: ¿Qué página debe responder prevención y cuál reparación de humedad y salitre?

### P03 · Impermeabilización y mantenimiento de azotea

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Impermeabilizante para azotea: cómo elegir el correcto (guía Berel)](https://app.notion.com/3a639c2fefe78087a9f6fd5eae3a8e5e); [5 consejos para evitar la humedad en paredes y techos](https://app.notion.com/82d027003d9c4bc3aa9f3bc09d14db65).
- Sección contrastada: Guía de azotea: elección, consumo y errores.
- Diferencial y destino: Profundizar inspección, mantenimiento y criterio de reimpermeabilización sin duplicar guía Kover.
- Gate antes del brief: Sistema existente, compatibilidad, ficha y acceso seguro; no fijar plazos universales.
- Pregunta propuesta: ¿Qué revisar antes de dar mantenimiento a un impermeabilizante ya aplicado?

### P04 · Limpiar paredes pintadas

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Transforma tu Lavandería con Nuestros Tonos](https://app.notion.com/3a639c2fefe780a99ff5d47beb37e59f).
- Sección contrastada: Cocina: cómo limpiar sin borrar color; Lavandería: mantenimiento.
- Diferencial y destino: Separar limpieza cotidiana de repintado; una guía nueva sólo si cubre manchas y acabados con diferencial probado.
- Gate antes del brief: Curado, producto, método compatible y prueba discreta; no recomendar mezclas caseras.
- Pregunta propuesta: ¿Qué cambia al limpiar una mancha según el acabado y el curado de la pintura?

### P05 · Conservar pintura sobrante

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036).
- Sección contrastada: Sala sólo menciona sobrante para retoques.
- Diferencial y destino: Guía de cierre, identificación, conservación y señales de deterioro; Doal #4 en SERP.
- Gate antes del brief: Ficha de seguridad, envase adecuado y descarte local; no prometer vida útil fija.
- Pregunta propuesta: ¿Cómo conservar e identificar pintura sobrante y cuándo ya no conviene usarla?

### P06 · Limpieza y conservación de herramientas

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Cómo pintar herrería y proteger el metal del óxido](https://app.notion.com/3a639c2fefe7804cad1bde303b8ee2bb); [Cómo Elegir y Aplicar Barniz Summa para Maderas](https://app.notion.com/3a639c2fefe780d9892dd6ee92f72507).
- Sección contrastada: Herramientas y aplicación, sin guía dedicada de limpieza.
- Diferencial y destino: Brochas/rodillos según recubrimiento; excluir maquillaje y limpieza de autos.
- Gate antes del brief: Disolvente sólo según ficha, protección y gestión de residuos; no verter sobrantes al drenaje.
- Pregunta propuesta: ¿Cómo se limpian y conservan brochas y rodillos según la pintura utilizada?

### P07 · Proteger madera exterior

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Pintura y barniz para madera: cómo elegir y aplicar sin errores](https://app.notion.com/3a639c2fefe7806ab0e6e1b4f2cddc6d); [Cómo Elegir y Aplicar Barniz Summa para Maderas](https://app.notion.com/3a639c2fefe780d9892dd6ee92f72507); [Elegancia en madera: Cómo usar Mancha al Aceite](https://app.notion.com/3a639c2fefe7807eb976f719ef54b2e1).
- Sección contrastada: Elegir pintura/barniz; Barniz Summa; Mancha al Aceite.
- Diferencial y destino: Conectar protección, acabado y mantenimiento; no duplicar barnices.
- Gate antes del brief: No recomendar diésel ni trasladar usos interior/exterior.
- Pregunta propuesta: ¿Qué protección necesita una madera expuesta y cuándo se renueva el acabado?

### P08 · Óxido y conservación de metal

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar herrería y proteger el metal del óxido](https://app.notion.com/3a639c2fefe7804cad1bde303b8ee2bb); [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013).
- Sección contrastada: Óxido, primario y esmalte; matriz madera/metal.
- Diferencial y destino: Profundizar inspección y retoque compatible en la misma guía.
- Gate antes del brief: No extrapolar el tratamiento de óxido adherido o suelto entre primarios.
- Pregunta propuesta: ¿Qué determina si una herrería requiere retoque o renovación completa del sistema?

### P09 · Retoques sin diferencias visibles

- Categoría: Protección, reparación y mantenimiento. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036); [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc).
- Sección contrastada: Mención de sobrantes y continuidad de paños.
- Diferencial y destino: Diferenciar retoque localizado de repintar todo el paño; muestra lexical pequeña.
- Gate antes del brief: SERP específica pendiente; color/envejecimiento/acabado y método verificado.
- Pregunta propuesta: ¿Por qué se nota un retoque aunque se use el mismo color y cuándo conviene repintar el paño?

### A01 · Resanar y lijar antes de pintar

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc); [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036); [Cómo pintar un piso de cemento: guía paso a paso](https://app.notion.com/3a639c2fefe780c9bee5d235bda5e0db).
- Sección contrastada: Recámara/Cocina: resane y lijado como pasos; Piso: reparación de soporte.
- Diferencial y destino: Guía específica de agujeros y defectos superficiales, preparación y comprobación; Comex #1.
- Gate antes del brief: No tratar fisuras estructurales como resane cosmético; producto y soporte compatibles.
- Pregunta propuesta: ¿Cómo preparo un resane superficial para que no se note después de pintar?

### A02 · Retirar papel tapiz y preparar el muro

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: sin sección dedicada identificada en los 49 cuerpos.
- Sección contrastada: No se encontró sección dedicada entre los 49 cuerpos.
- Diferencial y destino: Retiro según soporte/adhesivo, limpieza, secado, reparación y paso a pintura; Behr #4.
- Gate antes del brief: Probar método por soporte, humedad controlada y riesgos en recubrimientos antiguos.
- Pregunta propuesta: ¿Cómo retirar papel tapiz sin dañar el soporte y dejarlo listo para pintar?

### A03 · Elegir rodillo según superficie y pintura

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Técnicas de Pintura y Decoración de Paredes para tu Sala con Berel](https://app.notion.com/3a639c2fefe7805aae90cd8ddc8baf45); [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc); [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036).
- Sección contrastada: Errores: herramienta por superficie; Sala efectos: pelo corto; Recámara: aplicación.
- Diferencial y destino: Tabla de selección por pelo/material/textura/recubrimiento; no otro tutorial de movimiento en W.
- Gate antes del brief: Confirmación técnica de herramienta por línea; revisar core_keyword erróneo de rodillos→rodillas.
- Pregunta propuesta: ¿Cómo elijo el rodillo correcto para muro liso, texturizado o techo?

### A04 · Pintar techo o plafón interior

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo el Color Afecta la Percepción del Espacio](https://app.notion.com/51cf0376eb7f4a87aebaa554501089f5); [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036); [Más Color para tu Hogar con Berelinte](https://app.notion.com/3a639c2fefe78047987bd78080356ae3).
- Sección contrastada: Percepción: color de techo; Sala: metros extra; Berelinte: usos.
- Diferencial y destino: Procedimiento específico, protección y continuidad; Behr #1. Techo interior no es azotea.
- Gate antes del brief: Acceso y postura seguros; estado del soporte y recubrimientos antiguos; no asumir que todo tirol se debe lijar.
- Pregunta propuesta: ¿Cómo preparar y pintar un plafón interior sin salpicaduras ni traslapes visibles?

### A05 · Evitar marcas de rodillo o brocha

- Categoría: Preparación y aplicación. Esfuerzo relativo: bajo.
- Cobertura propia: [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc); [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036); [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Cómo Elegir y Aplicar Barniz Summa para Maderas](https://app.notion.com/3a639c2fefe780d9892dd6ee92f72507).
- Sección contrastada: Recámara: W y borde húmedo; Sala: paños; Barniz: marcas.
- Diferencial y destino: Diagnóstico de carga, repaso y secado como FAQ/técnica; no repetir cómo pintar un cuarto.
- Gate antes del brief: Revisar técnica y herramienta por recubrimiento.
- Pregunta propuesta: ¿Qué causa las marcas y en qué momento se puede corregir el acabado?

### A06 · Dilución según pintura y aplicación

- Categoría: Preparación y aplicación. Esfuerzo relativo: alto.
- Cobertura propia: [Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/3a639c2fefe780929593e10838859013); [Cómo pintar herrería y proteger el metal del óxido](https://app.notion.com/3a639c2fefe7804cad1bde303b8ee2bb); [Cómo Elegir y Aplicar Barniz Summa para Maderas](https://app.notion.com/3a639c2fefe780d9892dd6ee92f72507); [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45).
- Sección contrastada: Familias, reductor Barniz Summa y aplicación por producto.
- Diferencial y destino: Enseñar a leer y calcular la dilución de la ficha sin porcentajes universales.
- Gate antes del brief: Validación de diluyente y porcentaje por producto/herramienta; excluir gasolina y mezclas no autorizadas.
- Pregunta propuesta: ¿Cómo interpreto la dilución indicada en una ficha y evito usar el diluyente equivocado?

### A07 · Secado, recubrido, curado y manos

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Cómo pintar tu cocina: colores y guía paso a paso](https://app.notion.com/3a639c2fefe78004bf2dd1a2864a29b6); [Cómo pintar tu recámara: colores y guía paso a paso](https://app.notion.com/3a639c2fefe780d5910ce864bc4f09dc); [Transforma tu Lavandería con Nuestros Tonos](https://app.notion.com/3a639c2fefe780a99ff5d47beb37e59f); [Cómo Elegir y Aplicar Barniz Summa para Maderas](https://app.notion.com/3a639c2fefe780d9892dd6ee92f72507).
- Sección contrastada: Errores: entre capas; Cocina/Recámara: secado; Lavandería: curado.
- Diferencial y destino: Unificar definiciones sin duplicar FAQs; no dar una tabla universal de tiempos.
- Gate antes del brief: Distinguir tacto/repintado/curado; fichas y condiciones ambientales.
- Pregunta propuesta: ¿Estar seca al tacto significa que una pintura ya se puede recubrir, lavar o usar?

### A08 · Cambiar una pared oscura a clara

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [Cómo el Color Afecta la Percepción del Espacio](https://app.notion.com/51cf0376eb7f4a87aebaa554501089f5); [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Cómo pintar tu sala y sala-comedor: colores y guía paso a paso](https://app.notion.com/3a639c2fefe7807fb8acdbccde983036).
- Sección contrastada: Percepción y Sala: tercera mano; Errores: cobertura de oscuro.
- Diferencial y destino: Decisión de preparación y poder cubriente con caso real, no regla automática de sellador.
- Gate antes del brief: Validar sistema, fondo, contraste y consumo real antes de prometer número de manos.
- Pregunta propuesta: ¿Qué cambia al repintar de oscuro a claro y cómo se comprueba cobertura suficiente?

### A09 · Clima y ventana de aplicación

- Categoría: Preparación y aplicación. Esfuerzo relativo: medio.
- Cobertura propia: [5 Errores al Pintar que Debes Evitar para un Acabado Perfecto](https://app.notion.com/3a639c2fefe780008173e9e1fc2cbb45); [Color del Año Berel 2027 — Bien y de Buenas 1-3404D](https://app.notion.com/3a639c2fefe7807d847cc099a0b99966); [5 consejos para evitar la humedad en paredes y techos](https://app.notion.com/82d027003d9c4bc3aa9f3bc09d14db65).
- Sección contrastada: Errores: clima; Color 2027: restricciones de ficha; Humedad.
- Diferencial y destino: Aplicación en frío, lluvia y alta humedad como condiciones, no supuesta estacionalidad nacional.
- Gate antes del brief: No asumir que todo México tiene la misma estación; series mensuales y ficha pendientes.
- Pregunta propuesta: ¿Qué condiciones de temperatura y humedad obligan a posponer la aplicación?

## Arquitectura de enlaces propuesta

No crear tres nuevos pillars automáticamente. Reutilizar los hogares existentes y evaluar el hub sólo
si el sitio lo necesita:

- **Elegir:** familias por superficie + acabados → compatibilidad de repintado, rendimiento/calculadora,
  fichas y tienda. Lavabilidad entra desde acabados, cocina y fichas pertinentes.
- **Preparar/aplicar:** tutoriales de sala, recámara y cocina → resane, rodillo, techo, retiro de tapiz;
  estos satélites regresan a un proyecto y a productos cuya compatibilidad esté verificada.
- **Conservar:** desprendimientos → diagnóstico de humedad cuando aplica, preparación y repintado;
  almacenamiento y limpieza de herramientas reciben enlaces desde el cierre de tutoriales.
- Mantener color/paletas como entrada de inspiración; añadir puentes útiles a elección y aplicación,
  sin convertir cada paleta en una nueva guía técnica.

Un tema nuevo necesita al menos una entrada editorial pertinente y una salida útil hacia un proyecto,
ficha o herramienta. No es una cuota de enlaces; cada anchor debe corresponder a la intención.

## SERP y preguntas observadas en Google

Posición = rank_group orgánico devuelto por esa captura, no ranking permanente ni dificultad.
La muestra depth 10 incluye features, por lo que no garantiza diez resultados orgánicos por consulta.
URLs de otros países que aparecen en MX son competidores de esa SERP, no competidores comerciales
registrados. Osel Centro Sur y Sherwin Centroamérica no se equiparan a sus dominios corporativos MX.

### cómo elegir pintura lavable

Task: `09030059-1987-0139-0000-2100a3e04f33` · captura: 2026-09-03 00:59:39 +00:00 · costo US$0.002.

- #1 [Por qué elegir pinturas lavables para tu casa](https://pincolor.com/blog/por-que-elegir-pinturas-lavables-para-tu-casa.html)
- #2 [Pintura lavable | ¿por qué no todas son iguales?](https://www.pinturaslepanto.com/noticias/pintura-lavable-por-que-no-todas-son-iguales)
- #3 [Cómo elegir la mejor pintura blanca para tu hogar](https://www.comex.com.mx/pintar/como-elegir-la-mejor-pintura-blanca)
- #4 [Tipos de pintura lavable para interiores](https://palcanarias.es/blog/la-mejor-pintura-lavable-para-interiores-guia-de-compra/)

PAA observadas:

- ¿Cuál es la mejor pintura lavable?
- ¿Qué significa calidad 3 en pintura?
- ¿Cómo saber si una pintura es lavable o no?
- ¿Cuáles son las pinturas lavables para pared?

### pintar sobre esmalte

Task: `09030059-1987-0139-0000-3e35fa08e31e` · captura: 2026-09-03 00:59:42 +00:00 · costo US$0.002.

- #1 [Cómo pintar sobre pintura de esmalte](https://es.wikihow.com/pintar-sobre-pintura-de-esmalte)
- #2 [¿Puedo pintar sobre enamel con acrílico y viceversa?](https://www.reddit.com/r/modelmakers/comments/29z5et/can_i_paint_over_enamel_with_acrylic_and_vice/?tl=es-419)
- #3 [Pintura con esmalte: usos más habituales - Blog - BAUHAUS](https://blog.bauhaus.es/pintura-con-esmalte/)
- #4 [How to paint over synthetic enamel with Évol water-based ...](https://www.youtube.com/watch?v=pxzv_FVwdEM)

PAA observadas:

- ¿Cómo pintar encima de pintura esmalte?
- ¿Qué pintura se puede poner encima de pintura de aceite?
- ¿Qué primer se puede usar para pintar sobre pintura de aceite?
- ¿Se puede pintar sobre esmalte sintético?

### cuanto cuesta pintar una casa

Task: `09030059-1987-0139-0000-2fbe9ba3f190` · captura: 2026-09-03 00:59:45 +00:00 · costo US$0.002.

- #1 [Hola cuánto cobran por pintar una casa en México ...](https://www.facebook.com/groups/311539033486184/posts/1277594376880640/)
- #2 [¿Cuánto cuesta pintar una casa?](https://juanitoelpintor.com/pintura/cuanto-cuesta-pintar-una-casa/)
- #3 [¿Cuánto cuesta pintar una casa? Precios en 2026 - Cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/pintar-casa)
- #4 [¿Cuánto cuesta pintar una casa entera? Se lo pregunté a ...](https://www.revistaad.es/articulos/cuanto-cuesta-pintar-una-casa-entera)

PAA observadas:

- ¿Cuánto se cobra por pintar una casa de 3 recámaras?
- ¿Cuánto cobran por pintar un cuarto de 4x4 en México?
- ¿Cómo calcular el precio de pintar una casa?
- ¿Cuánto se le paga a un pintor al día?

### porque se desprende la pintura de la pared

Task: `09030059-1987-0139-0000-ca4f39702111` · captura: 2026-09-03 00:59:49 +00:00 · costo US$0.002.

- #1 [¿Tu pintura se desprende de la pared? Te decimos qué hacer.](https://oselcentrosur.com/tu-pintura-se-desprende-de-la-pared-te-decimos-que-hacer/)
- #2 [Estoy pintando la casa(exterior) y la pintura se levanta así. ...](https://www.facebook.com/groups/1578611778951454/posts/4395219323957338/)
- #3 [Solución al Desprendimiento de Pintura por Humedad ...](https://www.sherwinca.com/blog/solucion-al-desprendimiento-de-pintura-por-humedad-externa-o-interna/)
- #4 [¿Por Qué Se Desprende la Pintura? Causas y Soluciones](https://sensacolor.com/blogs/blog-sensacolor/por-que-se-desprende-pintura-falta-adherencia-causas-soluciones)

PAA observadas:

- ¿Qué hacer cuando se despega la pintura de la pared?
- ¿Cómo hacer para que no se caiga la pintura de la pared?
- ¿Qué hacer cuando la pared se descascara?
- ¿Qué puedo hacer si la pintura de la pared se descascara?

### como guardar pintura sobrante

Task: `09030059-1987-0139-0000-fe69c2cb8e36` · captura: 2026-09-03 00:59:51 +00:00 · costo US$0.002.

- #1 [6 consejos para guardar la pintura sobrante y duración](https://www.benjaminmoore.com/es-us/interior-exterior-paints-stains/how-to-advice/painting-101/storing-leftover-paint)
- #2 [Cómo guardar la pintura sobrante](https://sherwin.com.ar/inspiracion/soluciones/como-guardar-la-pintura-sobrante/)
- #3 [Guardar pinturas sobrantes / sin usar - por favor, aconsejen](https://www.reddit.com/r/paint/comments/1hr3hvy/storing_leftover_unused_paints_please_advise/?tl=es-419)
- #4 [¿Cómo guardar la pintura que sobra?](https://pinturasdoal.com/blog/como-guardar-la-pintura-que-sobra/)

PAA observadas:

- ¿Cuánto tiempo se puede guardar la pintura una vez abierta?
- ¿Qué hacer con los restos de pintura?
- ¿Cómo conservar pintura acrílica sobrante?
- ¿Cuánto tiempo dura la pintura preparada?

### como limpiar brochas

Task: `09030059-1987-0139-0000-16ed3cfc76c0` · captura: 2026-09-03 00:59:57 +00:00 · costo US$0.002.

- #1 [Cómo limpiar tus brochas de maquillaje una a una](https://www.loreal-paris.es/como-limpiar-brochas-maquillaje)
- #2 [Cómo limpiar las brochas de maquillaje de manera efectiva](https://www.tiktok.com/@bartreverte/video/7514682831658913046)
- #3 [Lava tus BROCHAS DE MAQUILLAJE sin gastar](https://www.facebook.com/florenciaguillot.makeup/videos/c%C3%B3mo-lavar-tus-brochas/8357277054324341/)
- #4 [como lavar las brochas de maquillaje y esponjas](https://www.youtube.com/watch?v=6_KWAMUlUto)

PAA observadas:

- ¿Cómo puedo limpiar las brochas de maquillaje?
- ¿Qué es lo mejor para limpiar las brochas?
- ¿Cómo se limpian las brochas de pintura?
- ¿Qué líquido puedo usar para limpiar brochas?

### tipos de rodillos para pintar

Task: `09030059-1987-0139-0000-402870b04604` · captura: 2026-09-03 01:00:00 +00:00 · costo US$0.002.

- #1 [Tipos de rodillos para pintar y cómo elegir el más ...](https://servicolor.com/ideas/tipos-de-rodillos-para-pintar/)
- #2 [¿Cómo escoger los tipos de rodillos para pintar?](https://blog.homedepot.com.mx/hazlo-tu-mismo/pintura-paso-a-paso/como-escoger-los-tipos-de-rodillos-para-pintar)
- #3 [Diferentes tipos de RODILLOS para pintar](https://www.gruposayer.com/novedades/2024/08/20/tipos-de-rodillos-para-pintar/)
- #4 [Tipos de rodillos para pintar](https://pentrilo.com/consejos/tipos-de-rodillos-para-pintar/)

PAA observadas:

- ¿Qué tipo de rodillo para pintar es mejor?
- ¿Qué tipo de rodillo es mejor para pintar paredes?
- ¿Cómo saber qué rodillo usar?
- ¿Cuál es el rodillo ideal para pintar?

### tiempo de secado pintura

Task: `09030100-1987-0139-0000-3d62cae4557a` · captura: 2026-09-03 01:00:06 +00:00 · costo US$0.002.

- #1 [lo que debes saber sobre tiempos de secado y curado de ...](https://pinturassanguino.com/blog/cuanto-tarda-en-secar-la-pintura-secado-y-curado/)
- #2 [¿Cuánto tarda en secar la pintura en una habitación sin ...](https://www.comercialquintairos.es/blog/cuanto-tarda-en-secar-la-pintura-en-una-habitacion-sin-gran-ventilacion_eb2230)
- #3 [Cómo hacer que la pintura se seque más rápido](https://www.benjaminmoore.com/es-us/interior-exterior-paints-stains/how-to-advice/painting-101/make-paint-dry-faster)
- #4 [¡Tiempo de Secado de Pintura Automotriz!](https://www.pinturaautomotrizmax.com.mx/conoce-los-tiempos-de-secado-de-pintura-automotriz-segun-su-tipo/)

PAA observadas:

- ¿Cuánto tiempo hay que dejar secar la pintura para dar la segunda mano?
- ¿Cuánto tiempo esperar para dar la segunda capa de pintura?
- ¿Qué pasa si pinto y luego llueve?
- ¿Cuánto tiempo hay que ventilar después de pintar?

### quitar papel tapiz

Task: `09030100-1987-0139-0000-cabf4feb1659` · captura: 2026-09-03 01:00:12 +00:00 · costo US$0.002.

- #1 [CÓMO QUITAR PAPEL TAPIZ Y PREPARAR LAS PAREDES ...](https://www.youtube.com/watch?v=WDxMi9pfUz0)
- #2 [How to remove wallpaper easily](https://www.youtube.com/watch?v=2fN_VAkkP80)
- #3 [Cómo retirar el papel tapiz fácilmente: guía paso a paso](https://www.tiktok.com/@designpaper.20/video/7348193929231142150?lang=es)
- #4 [Consejos de Expertos sobre Cómo Quitar Papel Tapiz](https://www.behrpaint.com.mx/consumer/how-to/interior/how-to-remove-wallpaper)

PAA observadas:

- ¿Cómo se quita fácilmente el papel tapiz?
- ¿Qué producto puedo usar para quitar papel tapiz?
- ¿Cómo se puede quitar el pegamento del papel tapiz?
- ¿Cómo quitar papel pegado a la pared?

### como pintar un techo

Task: `09030100-1987-0139-0000-4bf0d84bfbf0` · captura: 2026-09-03 01:00:16 +00:00 · costo US$0.002.

- #1 [Consejos de Expertos sobre Cómo Pintar el Techo de su ...](https://www.behrpaint.com.mx/consumer/how-to/interior/how-to-paint-a-ceiling)
- #2 [Cómo pintar un techo en 4 pasos sencillos](https://www.benjaminmoore.com/es-us/interior-exterior-paints-stains/how-to-advice/painting-101/paint-ceiling)
- #3 [Consejos para pintar techos como un profesional](https://www.paratureforma.com/blog/elementos-comunes/pintar-techos/)
- #4 [Trucos para pintar techos](https://www.leroymerlin.es/ideas-y-consejos/consejos/trucos-para-pintar-techos.html)

PAA observadas:

- ¿Cuáles son los pasos para pintar un techo?
- ¿Qué tipo de pintura se utiliza para pintar el techo?
- ¿Qué es mejor, pintar el techo con brocha o rodillo?
- ¿Cómo pintar un techo sin que gotee?

### pintar pared oscura de blanco

Task: `09030100-1987-0139-0000-4046076b8e5a` · captura: 2026-09-03 01:00:19 +00:00 · costo US$0.002.

- #1 [Cómo pintar una pared oscura de un color más claro](https://www.elmueble.com/decoracion/brico-diy/como-pintar-pared-oscura-color-mas-claro_47217)
- #2 [Cómo pintar una pared oscura con un color claro](https://www.3m.com.es/3M/es_ES/home-improvement-eu/resources/inspiration-gallery/full-story/?storyid=6da93241-4d55-42c0-8f91-c9c6f55e759e)
- #3 [¿Cómo pintar una pared oscura de blanco?](https://www.isaval.es/como-pintar-pared-oscura-blanco/)
- #4 [Cómo pintar clara una pared oscura](https://www.tiktok.com/@luzblanchet/video/7055698587036011782)

PAA observadas:

- ¿Qué pintura puedo usar para cubrir un color oscuro?
- ¿Cómo puedo pintar sobre una pared oscura?
- ¿Cómo pintar sobre un color oscuro uno claro?
- ¿Cómo quitar el color oscuro de una pared?

### resanar paredes

Task: `09030100-1987-0139-0000-bb5a915e0dbd` · captura: 2026-09-03 01:00:24 +00:00 · costo US$0.002.

- #1 [Cómo resanar paredes antes de pintar - Comex](https://www.comex.com.mx/tips/preparacion-de-superficies/como-hacer-resanes-en-paredes-para-pintar)
- #2 [Cómo resanar los agujeros en tu pared](https://blog.homedepot.com.mx/hazlo-tu-mismo/como-resanar-los-agujeros-en-tu-pared)
- #3 [¿Cómo Resanar una Pared?: Consejos y Técnicas Efectivas](https://uniblock.com.mx/como-resanar-una-pared-consejos-y-tecnicas/)
- #4 [Resanar las paredes es un paso clave para que tu ...](https://www.facebook.com/comexcentroamerica/posts/resanar-las-paredes-es-un-paso-clave-para-que-tu-proyecto-luzca-impecable-rellen/1192126322947968/)

PAA observadas:

- ¿Qué es lo mejor para resanar paredes?
- ¿Cuánto se cobra por resanar una pared?
- ¿Cómo se hace la mezcla para resanar una pared?
- ¿Cómo se puede resanar una pared?

### pintura para baño

Task: `09030100-1987-0139-0000-eedb14d1cdfb` · captura: 2026-09-03 01:00:28 +00:00 · costo US$0.002.

- #1 [Comex tiene estupendas ideas para la decoración de baños](https://www.comex.com.mx/espacios/bano)
- #2 [Cómo Transformar tu Baño con Pintura](https://berel.com/tutoriales/como-transformar-tu-bano-con-pintura)
- #3 [Pintura Para Banos | MercadoLibre](https://listado.mercadolibre.com.mx/pintura-para-banos)
- #4 [14 colores de pintura para baño | Ideas e inspiración](https://www.benjaminmoore.com/es-us/project-ideas-inspiration/interiors/bathroom-ideas-inspiration)

PAA observadas:

- ¿Qué tipo de pintura se usa para el baño?
- ¿Qué tipo de pintura se usa en un baño?
- ¿Cuál es la mejor pintura para el baño?
- ¿Qué pintura es buena para la humedad del baño?

Las respuestas AIO pueden aparecer como features, pero no se midió visibilidad de Berel en LLMs ni
se hizo atribución de citas. PAA no demuestra frecuencia de preguntas en ChatGPT/Gemini. Ninguna
pregunta redactada por el agente recibió un volumen inventado.

## Calidad del universo y pendientes explícitos

El CSV conserva las 1517 keywords distintas, incluyendo ruido para auditarlo. No equivale a
1517 oportunidades aprobadas:

- keyword_representativa_revisada: 60.
- agrupacion_lexica_por_revisar: 1160.
- sin_asignacion_por_revisar: 38.
- marca_ajena_no_priorizar_como_articulo_generico: 178.
- fuera_del_alcance_de_este_corte: 75.
- no_convertir_en_instruccion_sin_validacion_tecnica: 6.

Las 60 keywords representativas fueron seleccionadas y contrastadas a nivel de intención. Las otras
agrupaciones léxicas son triage, no revisión editorial individual ni dictamen de cobertura. El mapeo
palabra→categoría se debe revisar antes de transformar una fila en brief. La evidencia conserva todas
las procedencias y los IDs; el reader Labs no expone los task IDs crudos del proveedor, a diferencia
de las SERPs, cuyos task IDs sí se incluyen.

Pendientes para cerrar un plan de producción, sin nuevas compras automáticas:

1. Completar sitemap/cuerpo público para descartar URLs fuera del Hub en todas las candidatas nuevas.
2. Refrescar los slots reales, aprobaciones, fechas y piezas ya comprometidas de noviembre/diciembre.
3. Verificar fichas por producto y corregir cualquier contradicción antes de reusar claims en briefs.
4. Evaluar curvas mensuales, geografía y condiciones locales si se pretende justificar estacionalidad.
5. Resolver la demanda de retoques, giseo y aplicación en frío con semillas desambiguadas; este corte
   no la resolvió. Para herramientas, verificar una SERP específica de “brochas de pintura”, porque la
   SERP comprada de “limpiar brochas” está dominada por maquillaje.
6. No asignar dificultad baja a keywords con barrera desconocida ni interpretar Ads competition como SEO.
7. No se exploraron exhaustivamente impermeabilización por sistema industrial, epóxicos, señalización,
   especialidades ni todas las variantes regionales. No están certificados como huecos editoriales de Berel.

## Trazabilidad de corridas

| Lote | Run | Estado | Keywords únicas del reader | Llamadas | Costo USD |
|---|---|---|---:|---:|---:|
| eleccion-acabados | `seokdr-95ede618-efde-4f8e-bf88-51e074049bd1` | succeeded | 217 | 6 | 0.10284 |
| eleccion-compatibilidad | `seokdr-af4d46c1-615b-4803-9eb1-afe6686c6f8f` | succeeded | 100 | 6 | 0.08532 |
| eleccion-planeacion | `seokdr-1f378e11-1fa6-4fed-90ba-71381c2702cf` | succeeded | 151 | 6 | 0.09192 |
| eleccion-superficies | `seokdr-4aeddbac-05d0-4b04-8780-96893a29180c` | succeeded | 230 | 6 | 0.10128 |
| proteccion-fallas | `seokdr-d828a766-dcee-4fc3-9e59-c918d90c6517` | succeeded | 9 | 6 | 0.07308 |
| proteccion-humedad | `seokdr-07f89b3a-8149-4e4a-9667-863f34ffc610` | succeeded | 227 | 6 | 0.10224 |
| proteccion-cuidado | `seokdr-f40707d4-a86a-4d8c-847a-328f5fb354a4` | succeeded | 63 | 6 | 0.07968 |
| proteccion-materiales | `seokdr-a439f77b-48f6-47cd-9f55-f74ebdbe9f41` | succeeded | 78 | 6 | 0.08244 |
| aplicacion-preparacion | `seokdr-188e4aad-5197-4269-935c-fde537b577c4` | succeeded | 149 | 6 | 0.09144 |
| aplicacion-herramientas | `seokdr-423d1094-72d7-4531-ae71-6e102fad8488` | succeeded | 172 | 6 | 0.09432 |
| aplicacion-proceso | `seokdr-dadcd6b0-829b-41af-8e40-6176f0599f4b` | succeeded | 78 | 6 | 0.08148 |
| aplicacion-renovacion | `seokdr-bf4a657e-3a20-4d1a-b28c-bded7fc94ac1` | succeeded | 35 | 6 | 0.07656 |
| refino-cuidado | `seokdr-ec157209-f7c1-481e-965b-12bb397d83d3` | succeeded | 19 | 6 | 0.07440 |
| refino-fallas-clima | `seokdr-6c65c93a-4c8e-4ed5-8fbf-485e668c8fa1` | succeeded | 6 | 6 | 0.07272 |

Exportables de la sesión (ruta de artefactos del operador; no contienen credenciales ni cuerpos
Notion con enlaces de imagen firmados):

- `berel-cobertura-capilar-keywords-2026-09-02.csv`: universo, métricas, procedencia y triage.
- `berel-cobertura-capilar-paa-2026-09-02.csv`: 52 PAA con query, task ID y captura.
- `berel-cobertura-capilar-evidencia-2026-09-02.json`: reader paginado, SERPs y mapa editorial.

Ruta: `/Users/jreye/.codex/visualizations/2026/09/02/01a0643c-1891-77c1-a6f9-3a0fc3b95292`.
Los run IDs permiten relectura desde el store canónico aun sin esos archivos locales.

## Documentación actualizada y alcance de la mutación

Estrategia Berel, inventario auditado, modelo de priorización, contrato del brief, manual de discovery,
documentación funcional SEO y skills espejo Berel/SEO-AEO/DataForSEO. El Playbook Notion recibió una
sección de planeación y fue releído para verificarla. El gate de espejos registra la nueva referencia
compartida de DataForSEO, sin duplicar su árbol canónico de dossiers.
No se modificaron artículos del Hub, estados, taxonomía CMS, calendario, tracking ni código de producto.
No se hizo commit, push, cambio de branch ni release.

Verificación del cierre: espejo de skills byte-identical y diff sin errores de whitespace; cierre
documental estricto del alcance propio sin warnings. El cierre global pasó con una advertencia de
lifecycle de tasks ajenas al alcance, sin tocar sus archivos. El Playbook conservó íntegro el cuerpo
previo y la sección nueva aparece una sola vez. Se rotó una entrada de Handoff y una de changelog
a sus archivos históricos por los límites del contexto, sin borrarlas.
