# Cotizador V3 — promoción a la plataforma con registro y API propios

- Status: **Accepted** — aprobado por el operador (CEO) el 2026-10-12.
- Owner: CEO (precios, pisos, excepciones, orden del programa) · Commercial/Finance (catálogo y política) · Platform
  (contrato, API, datos).
- Work unit: `EPIC-053` y sus tareas.
- Evidencia: [auditoría del cotizador actual](../audits/commercial/2026-10-12-cotizador-actual-auditoria.md).
- Plan por fases: [GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md](GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md).
- Relación con decisiones previas:
  - **Enmienda** la [frontera de promoción](../documentation/finance/cotizador-v3-promocion-canonica.md): reemplaza
    «promover el motor debajo de los primitives vigentes» y «no crear otra API de cotizaciones». El resto de esa
    frontera (lo que debe preservarse) sigue vigente y esta decisión lo hace obligatorio.
  - **Enmienda** [GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md](GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md): las dos
    capacidades (simular; autorar y emitir) se conservan como principio, pero su implementación de destino es el
    registro de V3, no el motor V2. Las superficies V2 siguen sirviendo hasta su retiro.
  - **Cumple** la condición de los ADR locales de V3 (unidad propia, contraste, autorización y audiencias, snapshots y
    ciclo de vida, cutover y reversa): esta es esa unidad.
  - No cambia [el motor, sus contratos ni sus cifras](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).

## Contexto

V3 es hoy una CLI local sobre archivos: catálogo y política versionados en el repo, un puntero que nombra las versiones
vigentes y cotizaciones congeladas que se verifican recalculándolas. Con ella se cotiza y se arman licitaciones.

La auditoría del cotizador del portal (motor V2, `greenhouse_commercial.quotations*`) concluyó que no se usa para
cotizar, que el número que guarda no lo produce el motor sino una segunda etapa, que el control se salta por tres
puertas de escritura, que una versión no congela lo necesario para reproducir un precio y que no existe historial real
que migrar. De sus tablas sí cuelgan las copias de HubSpot y Nubox, contratos, ingresos y el vínculo con las propuestas
de licitación.

## Decisión

V3 pasa a ser el cotizador de la plataforma con **un registro y una API propios**, en el orden **API → CLI sobre la
API → MCP → interfaz**, y con una regla que manda sobre las demás: **la CLI sigue operativa en todo momento y después**.

1. **Un motor, dos transportes.** `src/lib/finance/pricing-v3/**` es el único lugar donde se calcula. La API y la CLI
   importan el mismo código. Ningún consumidor lleva fórmulas.
2. **Registro propio.** Agregado nuevo en `greenhouse_commercial`, con prefijo propio. No escribe en `quotations*`.
3. **El almacenamiento es un puerto** con dos adaptadores: archivos (el modo local de hoy) y PostgreSQL.
4. **Una versión es el artefacto congelado tal cual**: se guarda su texto canónico y su huella, verificada al escribir
   y al leer. Las columnas adicionales son índices de lectura. Sólo se registra una cotización calculada.
5. **Historial de sólo agregar**, con guardas en la base. Corregir es crear una versión que reemplaza a la anterior. El
   número público sale de una secuencia.
6. **El catálogo cambia de autoridad en dos pasos**: primero la base refleja el repo por huella (el repo manda);
   después los cambios se hacen por la API con las mismas huellas de confirmación y el repo recibe una copia. Aplicar
   nunca activa: mover el puntero es un acto aparte.
7. **Actos humanos.** Aprobar una excepción bajo el piso: sólo administración (`efeonce_admin`). Mover el puntero del
   catálogo: administración y finanzas (`efeonce_admin`, `finance_admin`). Emitir: una persona con la capacidad
   correspondiente. Un agente cotiza, registra y prepara el documento; nunca aprueba, activa ni emite, y una sesión de
   agente no cuenta como aprobación humana. Quien cotiza no fija pisos, costos, organización ni estado.
8. **Dos carriles de la API de plataforma**: aplicación para personas, ecosistema para agentes sin sesión interactiva.
   Los actos humanos van sólo por el de aplicación. La organización sale de la identidad.
9. **La CLI gana una capa de transporte.** Cada comando corre en local o contra la API con las mismas entradas,
   salidas, códigos de salida y errores tipados. El modo local no se retira. El modo por defecto cambia una sola vez,
   cuando la paridad entre ambos caminos esté medida y en verde. Si la API no responde, el comando falla con un error
   claro: no hay respaldo silencioso a local.
10. **Lo cotizado en local se puede registrar**: la API recalcula un artefacto local con las versiones que nombra y lo
    registra sólo si la huella coincide.
11. **El documento del cliente es la plantilla A4.** La API entrega sus datos, con número y versión al emitir. El PDF
    se sigue generando en local hasta que exista interfaz; el render en producción se construye con ella.
12. **La interfaz va al final** y su ubicación (portal o Rooms) no se decide aquí. La API expone lo necesario para
    cualquiera de las dos: identificador estable, versión inmutable con huella, una única proyección para el cliente,
    datos del documento, eventos de ciclo de vida y comandos con idempotencia. El cálculo no se muda de dominio.
13. **El cotizador actual se contiene ahora y se retira al final.** Se cierran sus puertas de escritura (queda de sólo
    lectura; las copias de HubSpot y Nubox siguen entrando). Su retiro definitivo es la última fase, con su propia
    decisión y su plan de reversa.

## Ubicación

El motor se queda en `src/lib/finance/pricing-v3/**`. El agregado con estado (almacén, comandos, lectores,
autorización, eventos) vive bajo `src/lib/commercial/`, sin imports de interfaz ni de tema, listo para extraerse. No se
crean aplicaciones, paquetes ni servicios nuevos. Cada tarea declara su contrato de ubicación modular.

## Alternativas descartadas

- **Poner V3 debajo del cotizador actual:** hereda una tabla que mezcla copias de HubSpot, documentos de Nubox y
  cotizaciones propias, versiones que no congelan y puertas de escritura sin control.
- **Reescribir la CLI como cliente puro de la API:** deja sin herramienta ante cualquier caída y elimina la
  verificación cruzada entre los dos caminos.
- **Catálogo sólo en archivos, leído por la API:** la API no puede leer archivos del repo en tiempo de ejecución, y git
  no da control de concurrencia para dos personas que cambian un catálogo.
- **Empezar por la interfaz:** su ubicación no está decidida y el constructor actual muestra el costo de poner reglas
  de negocio en la pantalla.
- **Migrar las cotizaciones del cotizador actual:** no hay ninguna real.

## Cuatro pilares

- **Seguridad:** autorización derivada de la identidad; actos humanos separados y registrados con motivo; costos fuera
  de toda salida al cliente por un único filtro; sin datos de nómina; una organización ajena responde como inexistente.
- **Robustez:** versiones inmutables verificadas por huella; idempotencia y huella del pedido en cada escritura;
  guardas en la base además de las del código; registro de motores cerrado y versión de contrato declarada.
- **Resiliencia:** el modo local es la contingencia permanente; cada fase puede detenerse sin dejar a medias lo que ya
  se usa; una bandera por fase; eventos en la misma transacción que el cambio de estado.
- **Escalabilidad:** motor puro y sin estado; catálogo versionado por huella; lecturas como funciones de una versión
  guardada; ninguna tarea en segundo plano recalcula cotizaciones.

## Reglas duras

- **NUNCA** calcular fuera del motor: ni en la API, ni en la CLI, ni en una herramienta, ni en una pantalla.
- **NUNCA** recalcular, actualizar o cambiar de versión una cotización guardada en segundo plano. Se reproduce con las
  versiones que nombra, jamás con «la vigente».
- **NUNCA** registrar como cotización un cálculo bloqueado, los avisos de la corrida ni una lectura derivada.
- **NUNCA** borrar ni editar una versión, una transición o una fila de auditoría.
- **NUNCA** aceptar de quien llama el piso, el costo, la organización o el estado.
- **NUNCA** un respaldo silencioso de la CLI al modo local cuando se pidió el modo plataforma.
- **NUNCA** retirar, degradar o condicionar el modo local de la CLI.
- **NUNCA** que un agente apruebe una excepción, mueva el puntero del catálogo o emita.
- **NUNCA** fecha de inicio ni duración de contrato en el cotizador; **NUNCA** la nómina como base de costo.
- **NUNCA** una segunda proyección para el cliente: sale del único filtro existente (`clientSafePeriodItems`).
- **NUNCA** escribir en `greenhouse_commercial.quotations*` desde el registro de V3, ni leer sus tablas para calcular.
- **SIEMPRE** que una entrega toque el motor o su entorno, todos los artefactos congelados del repo se recalculan
  idénticos y la suite `pnpm pricing:v3:test` queda en verde.
- **SIEMPRE** escritura con clave de idempotencia, huella del pedido, auditoría y evento, en una transacción.
- **SIEMPRE** migraciones que sólo agregan antes de un despliegue: hay una sola instancia para desarrollo, staging y
  producción, y aplicar en local ya es un cambio en producción.
- **SIEMPRE** bandera nueva registrada en el libro de banderas y encendida en cada entorno donde se lee.
- **SIEMPRE** capacidad nueva con su permiso otorgado a un rol real en el mismo cambio.

## Lo que no se decide aquí

- Portal o Rooms como hogar de la interfaz.
- Nombres definitivos de rutas, tablas y herramientas: los fija cada tarea, con una sola familia de nombres.
- El render del PDF en producción (exige convertir la plantilla A4 en un catálogo del compositor de artefactos).
- El retiro del cotizador actual: vínculo de las propuestas de licitación, herramientas de Nexa y MCP sobre V2, salida a
  HubSpot.
- Firmas, cobro, facturación y cierre de negocio.
- Las decisiones de negocio abiertas del catálogo (prorrateo del fee de plataforma, costo de puesta en marcha de un
  servicio gestionado).
