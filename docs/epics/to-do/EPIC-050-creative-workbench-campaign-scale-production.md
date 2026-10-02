# EPIC-050 — Creative Workbench: producción creativa a escala para todos los clientes

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño — tasks hijas registradas 2026-10-02 y reencuadradas multicliente el mismo día; sin implementación`
- Rank: `TBD`
- Domain: `cross-domain` (creative production / delivery / tooling)
- Owner: `unassigned`
- Branch: `epic/EPIC-050-creative-workbench-campaign-scale-production` (documental en Greenhouse; la implementación vive en `efeoncepro/creative-workbench`)
- GitHub Issue: `none`

## Summary

Construye la capacidad del equipo creativo de Efeonce para atender la demanda de **todos sus clientes** a
escala y acelerar el delivery hacia el cliente. El Creative Workbench hoy compone bien una pieza por vez y
para una sola marca habilitada (SKY). Este programa lo convierte en una línea de producción multicliente:
cada cliente se incorpora con su adaptador de marca derivado de su fuente de diseño, sus campañas salen de
un brief que se expande en todas las piezas necesarias, la revisión humana se concentra en excepciones y
la entrega llega lista para el canal del cliente.

**SKY es el primer piloto, no el alcance.** Su volumen (muchas ofertas, seis mercados con monedas
distintas, 126 formatos nativos) sirve de prueba de esfuerzo; todo contrato nace neutral y SKY lo consume
como adaptador. Ningún criterio del epic se cumple con SKY solo: el segundo cliente es **Berel**.

## Why This Epic Exists

La revisión v6 → v7 de la prueba SKY de 24 adaptaciones (2026-10-01) mostró dónde se pierde la capacidad
del equipo. El render es rápido (≈6 s por pieza, determinista, sin proveedores), pero lo que lo rodea no escala
ni se reutiliza entre clientes:

- **Incorporar un cliente es artesanal.** Sólo `sky-airline` tiene componentes de composición
  (`brands/sky-airline/components/`); Berel y Efeonce siguen `gated`. Las reglas de cada formato se escriben a
  mano por pin: en SKY eso dejó 54 de 62 pies legales con una alineación distinta a la de su fuente hasta la v7.
  Así, cada cliente nuevo cuesta semanas de mantenimiento antes de producir la primera pieza.
- **Autoría:** cada job declara el copy campo por campo con IDs de nodo de la fuente (1.196 campos sólo en SKY).
- **Volumen:** `marca:lote` admite como máximo 126 jobs por lote y compone en secuencia.
- **Fotografía:** sólo tres formatos SKY admiten una foto nueva; no existe una biblioteca por cliente.
- **Revisión:** se revisa pieza por pieza y un cambio del motor no tiene un antes/después automático.
- **Delivery:** la entrega y el archivo se hicieron con scripts ad hoc; no hay paquete por canal ni medición
  del tiempo de entrega al cliente.

No cabe en una task: cruza incorporación de clientes, motor, autoría, fotografía, ejecución y entrega.

## Outcome

- Incorporar la marca de un cliente nuevo se hace derivando su adaptador desde su fuente de diseño, con
  excepciones explícitas, en días y no en semanas.
- Las campañas de cualquier cliente habilitado se producen desde un brief que se expande en
  variantes × mercados × formatos, con control previo de ajuste del copy.
- Un cambio del motor produce un informe automático de piezas cambiadas e idénticas por cliente, y la
  revisión humana se limita a excepciones.
- Cada cliente tiene su biblioteca de fotografía con derechos, encuadrada en todos sus formatos con foto.
- La salida llega empaquetada por canal y archivada en el espacio privado del cliente, con el tiempo de
  entrega medido.

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-native-harness.md`, `workbench-design-batches.md`,
  `workbench-kv-zones.md`, `workbench-composition-recipes.md`, `workbench-cloud-boundary.md`; contratos SKY
  (`workbench-sky-*`) como primer adaptador de referencia.

Invariantes del programa:

- **Núcleo neutral, adaptador por cliente.** Los comandos y contratos (`tools/`, schemas `workbench.*`) no
  conocen ninguna marca; lo específico vive en `brands/<marca>/` y `clients/<cliente>/`.
- Una marca por corrida, sin marca por defecto; nunca se mezclan recursos, reglas ni fotos entre clientes.
- Los jobs llevan contenido, nunca geometría; el motor no achica texto.
- Corridas y outputs inmutables; archivo en el prefijo privado de cada cliente.
- Ningún gasto de proveedor sin la autorización vigente de TASK-1947; ningún recurso licenciado sale del
  equipo sin su admisión (TASK-1946 para Metric de SKY; equivalente por cliente).

## Child Tasks

Orden contractual: `TASK-1955 → TASK-1953 → TASK-1954`; `TASK-1956` puede correr en paralelo con
`TASK-1953` una vez cerrado el Slice 1 de `TASK-1955`. Cada una entrega el núcleo neutral y el adaptador
SKY como primer consumidor.

- `TASK-1955` — Incorporación de clientes por derivación de la fuente y regresión visual: el adaptador de
  cada cliente se deriva de su fuente de diseño con overrides explícitos; suite de regresión por cliente en
  CI y clases de revisión por excepción. Es la red de seguridad y la que abarata sumar clientes.
- `TASK-1953` — Plan de campaña que se expande: brief neutral que se expande en variantes × mercados ×
  formatos, perfiles de mercado por cliente, importación de datos de oferta y control previo de ajuste.
- `TASK-1954` — Ejecución a escala y entrega: lotes por campaña sin tope, ejecución paralela, caché por
  contenido, paquetes por canal, archivo gobernado por cliente y medición del tiempo de entrega.
- `TASK-1956` — Biblioteca de fotografía por cliente: fotos con derechos, foco y zona segura del sujeto,
  encuadradas en todos los formatos con foto de cada cliente.

## Existing Related Work

- `TASK-1945` (in-progress) — foundation multimarca; dueña de habilitar Berel/Efeonce como marcas
  productivas. Este epic necesita un segundo cliente habilitado para cerrar.
- `TASK-1946` (in-progress) — paquetes y licencias (Metric de SKY).
- `TASK-1947` (in-progress) — entrada IA, broker y presupuesto.
- `TASK-1952` (to-do) — identidad Efeonce ID del Workbench.
- `TASK-1857` (to-do) — Creative Hub del portal cliente: superficie candidata para el delivery hacia el cliente.
- Corrección SKY v7: auditoría Workbench `docs/audits/sky-layout-correction-v7-2026-10-01.md`;
  estado en `docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md`.

## Exit Criteria

- [ ] El núcleo (derivación, plan, ejecución, entrega, fotos) no contiene ninguna referencia a una marca
      concreta; un test lo comprueba con un adaptador sintético.
- [ ] **Berel** (segundo cliente, decisión del operador 2026-10-02) se incorpora por derivación de su fuente
      de diseño y produce una campaña completa (banners e insumo social, es-MX/MXN) por el mismo flujo, con
      entrega como handoff a la agencia que publica (requiere TASK-1945).
- [ ] Un despliegue de prueba con al menos 3 variantes × 3 mercados × todos los formatos de una familia se
      produce desde un brief, con control previo, ejecución y paquete por canal, sin editar jobs.
- [ ] Un cambio del motor genera en CI el informe de piezas cambiadas/idénticas por cliente y bloquea el
      merge si cambia una pieza no declarada.
- [ ] Throughput por persona, porcentaje de piezas aprobadas por clase, días "fuente de diseño nueva →
      adaptador productivo" y tiempo de entrega al cliente quedan medidos sobre un despliegue real.

## Non-goals

- Generación IA de imágenes o video (gobernada por TASK-1947 y su presupuesto).
- Motion/video de las piezas: candidato a epic posterior.
- Superficie de revisión nueva en el Lab: follow-up que consume los datos de TASK-1955/1954.
- Entrega dentro del portal cliente (Creative Hub, TASK-1857): follow-up que consume los paquetes de TASK-1954.
- Publicación o pauta en plataformas de medios; la entrega termina en el paquete por canal.
- Habilitar cada marca como productiva (TASK-1945); este epic aporta la herramienta para hacerlo barato.

## Delta 2026-10-02 — Berel como segundo cliente

Decisión del operador: el segundo cliente del programa es **Berel** (Pinturas Berel, México). Lo que
cambia respecto de SKY, según `creative-workbench/clients/berel/README.md` y la skill `berel-content-production`:

- **Estado de partida:** Berel está `gated` en `clients/brands.json` y sólo tiene README; no hay pack,
  fuente de diseño sellada ni componentes. Habilitarlo (pack, fuente, licencias de fuentes) es de TASK-1945;
  este epic aporta la derivación para que su adaptador no se escriba a mano.
- **Piezas:** banners, insumo social (texto + imagen) y contenido editorial; Berel entrega sus propios
  masters de campaña. El volumen viene de variantes de producto/color y de formatos, en un solo mercado
  (México, es-MX, MXN).
- **Entrega:** Efeonce **no publica** para Berel. El paquete por canal de TASK-1954 debe poder salir como
  handoff a la agencia que opera sus redes, con revisión visual en Frame.io y estados en Notion.
- **Pregunta abierta bloqueante:** ¿existe una fuente de diseño de Berel (plantillas Figma de banners y
  social) que se pueda sellar como se hizo con el FIG de SKY? Si no existe, el primer paso es crearla con la
  diseñadora; sin fuente no hay derivación.

## Delta 2026-10-02 — inventario real de Berel

Revisión de `OneDrive/Berel - Efeonce - Squad Berel/Workspace Oficial/04_Entregables` (sólo metadatos y una
muestra de 7 piezas del artículo N41). El operador confirma que las plantillas existen en Figma; en OneDrive
no hay `.fig`.

- **Volumen:** 314 archivos de junio a octubre de 2026 (≈60 piezas/mes): 183 webp, 94 png, 29 mp4.
- **Unidad de producción = artículo mensual.** Cada artículo genera imágenes de blog para
  `berel.com/inspiracion` (1408×768 webp: portada, infografía, paleta, comparativa, producto, didáctico,
  pasos, cierre) e insumo social (post 1080×1350, story 1080×1920, Pinterest 1000×1500 y reel mp4).
  Desde agosto la nomenclatura es estable: `N##_BN_<rol>_n` y `N##_SM_<formato>`.
- **Sistema visual modular:** interior fotográfico + componentes reutilizables — marcador de color
  (círculo, línea guía, nombre y código, p. ej. «Comal 4-2103T»), bloque de título con regla vertical,
  píldora `berel.com/inspiracion`, logo Berel, tarjetas de paleta (BASE CLARA / TRANSICIÓN / ACENTO) y
  tarjetas de recorrido con ícono.
- **Diferencia clave con SKY:** los marcadores de color se anclan a puntos de la foto (el muro pintado), no a
  posiciones fijas del formato; la misma escena se recorta en post, story y Pinterest y los marcadores se
  reubican con el recorte. Eso exige anclas por foto en la biblioteca (TASK-1956).
- **Dato de oferta = catálogo de color Berel** (nombre, código, familia), no tarifas (TASK-1953).
- **Recursos para el pack:** `01_Brand Assets` (brandbook, logos SVG/AI, tipografías, paleta),
  `05_Guias` (guía de estilos y de componentes web 2024-02) y `02_Recursos` (983 archivos: íconos, producto,
  paletas, personaje Don Bere).
- **Pendiente para derivar el adaptador:** el enlace a los archivos Figma de las plantillas de blog y social.

## Delta 2026-10-02 — Berel no tiene Figma: fuente en Illustrator/Photoshop

Corrección del operador: Berel **no tiene plantillas en Figma**. Su fuente de diseño vive en Illustrator y
Photoshop, en `OneDrive/.../Workspace Oficial`: `02_Recursos/Guia de infografías y Formatos.ai`,
`Reticulas CHIP.ai` (retículas de los marcadores de color), `CHIP.psd`, `01_Brand Assets/04_PaletaColor/
Berel_Paleta-Color.ai` y logos SVG en `01_Brand Assets/02_Logotipo/SVG/`.

Consecuencias para el programa:

- **El núcleo no puede asumir Figma.** TASK-1955 admite dos tipos de fuente por adaptador: *derivada* (FIG
  sellado, caso SKY) y *declarada* (receta nativa del Workbench definida como datos a partir de la guía de
  formatos y las retículas, caso Berel), validada contra piezas entregadas de referencia y aprobada por la
  diseñadora. Leer las mesas de trabajo de los `.ai` (tamaños, retículas) es un insumo, no un requisito.
- **Licencia tipográfica:** la institucional es **Gotham Rounded** (comercial) y la complementaria Arial
  Rounded. El operador confirmó el 2026-10-02 que **Efeonce tiene licencia de Gotham Rounded**. Al admitirla
  en el pack de Berel hay que adjuntar la evidencia de licencia (documento y alcance de usuarios) y, como con
  Metric, no publicarla en buckets compartidos ni paquetes que salgan del equipo (TASK-1945).
- **Referencia visual sellada:** las piezas de `04_Entregables` (agosto en adelante, nomenclatura estable)
  sirven como base de regresión del adaptador declarado: la composición nativa debe reproducir su estructura.

## Delta 2026-10-02 — equipo de diseño Berel

- Hoy diseñan las piezas de Berel **Daniela, Andrés y Melkin**. Son quienes deben aprobar la receta
  declarada del adaptador Berel (TASK-1955) y la revisión de su regresión contra los entregables de referencia.
- Pendiente con ellos: confirmar si `Guia de infografías y Formatos.ai` y `Reticulas CHIP.ai` son la
  referencia vigente o si hay versiones posteriores.
