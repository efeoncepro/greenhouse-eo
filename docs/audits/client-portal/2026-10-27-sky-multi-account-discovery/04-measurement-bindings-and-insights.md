# 04 · GA4, GSC y motor AEO por cuenta operativa

Fecha: 2026-10-27. Estado: diseño de discovery; ningún contrato nuevo, configuración ni código aplicados.
Este capítulo integra el [discovery de medición anterior](../../insights/2026-10-27-sky-blog-discovery/README.md)
con la separación de cuentas Diseño y Blog SEO/AEO. Los capítulos 01–03 gobiernan identidad, routing e historia;
este documento consume sus fronteras, no crea otro modelo de cuenta.

## 1. Requisitos fijos

1. SKY conserva una Organization; las relaciones operativas de Diseño y Blog SEO/AEO se distinguen mediante Spaces.
2. El informe del servicio Blog incluye **GA4 + GSC + corrida del motor AEO propio** desde la primera entrega.
3. Las mediciones de páginas pertenecen a `blog.skyairline.com`. El panel de preguntas AEO y sus denominadores
   conservan su significado; una mención general de SKY no se convierte en resultado del blog.
4. El informe de Diseño conserva su población e historia. No hereda el requisito de las tres fuentes del Blog.
5. No se duplican tokens, conexiones, perfiles o corridas sólo para representar otro departamento.
6. Una fuente que falta no se sustituye por otra. `allowPartial` y los módulos técnicos actuales no acreditan
   por sí solos el cumplimiento del requisito de tres fuentes.

La cuenta y el servicio son dimensiones de autoridad y selección de población; el hostname es un filtro de
medición. Ninguno de ellos concede permisos por aparecer en un payload o en el nombre de un informe.

## 2. Baseline observado

| Componente | Estado comprobado en el discovery previo | Consecuencia para dos cuentas |
| --- | --- | --- |
| Conexión GA4 | Una fila por Organization, propiedad `354430952`, general de SKY | Reutilizarla sólo a través de un binding de Blog y un reader con selector de host comprobado |
| Conexión GSC | Una fila por Organization, `https://blog.skyairline.com/` | La propiedad ya está acotada; falta identidad de asignación por Space/Servicio y cobertura suficiente |
| GSC PG | 11–25 octubre, 149.831 filas, 1.511 páginas observadas | Es cobertura operativa parcial, no mes entero ni historia de prestación SEO |
| GSC BQ | Cero fechas de SKY en `[2025-06-27,2026-10-27)` | Un reader nuevo sin captura autorizada no crea el histórico faltante |
| Perfil del motor | Perfil SKY del sitio principal, varios runs y ningún PromptSet propio | El perfil no se clona para crear la cuenta SEO; la elegibilidad se declara por run/métrica |
| Corrida CL de octubre | `EO-GRUN-00074`: 12 prompts × 5 proveedores, 60 observaciones succeeded | Candidata para un corte que incluya el 03-10; no representa una corrida de noviembre ni un panel editorial dedicado |
| Citas blog de esa corrida | 12 filas directas con host del blog, dentro de 634 citas del panel | Permite diseñar una proyección canónica URL, no afirmar 12 páginas únicas ni una cuota ya calculada |
| Corrida CL de septiembre | 6 prompts × 4 proveedores | Panel distinto: igualdad nominal de pack no permite un delta automático |
| Request de Insights | `organizationId`, módulos y proyectos; sin contexto operativo dedicado | Hay que transportar el contexto autorizado y persistir el binding de la edición |
| Auth/lecturas Insights | Predominantemente por Organization | Crear un Space no separa bibliotecas, detalle, exportaciones o edición entre departamentos |

Fuentes: receipts del directorio ignorado `.captures/insights-sky-scope-2026-10-27/` y los
[anexos de analítica](../../insights/2026-10-27-sky-blog-discovery/02-analytics-and-history.md),
[motor AEO](../../insights/2026-10-27-sky-blog-discovery/05-aeo-engine-required.md) y
[cuentas operativas](../../insights/2026-10-27-sky-blog-discovery/06-operating-accounts-under-one-organization.md).
No se han reejecutado Data API ni corridas para escribir este capítulo.

## 3. Cuatro objetos que no deben confundirse

| Objeto | Dueño | Identidad/función propuesta | No implica |
| --- | --- | --- | --- |
| Contexto operativo autorizado | Identity/Spaces | Actor autorizado en Organization+Space y servicios pertinentes | Tener acceso a todos los Spaces de SKY |
| Conexión a proveedor | Growth GA4/GSC/AEO | Consentimiento, propiedad/perfil, estado y secreto bajo su store actual | Que cualquier stakeholder pueda consultar toda la propiedad |
| Asignación de medición | Growth, consumida por el servicio autorizado | Versión que une Space/Servicio con conexión, selector URL y método | Un segundo catálogo comercial ni una copia de credenciales |
| Binding de edición | Insights | Copia/ref inmutable del contexto, asignación, requisitos y evidencia efectivamente servida | Releer configuración latest al renderizar o ampliar autoridad por snapshot |

Las definiciones URL pueden seguir teniendo identidad dentro de la Organization, pero **su asignación al informe
se resuelve por cuenta/servicio**. Un scope blog-only como default de toda la organización contaminaría el significado
de otras relaciones futuras; la ausencia de binding en Blog tampoco puede devolver el sitio completo.

No se prescribe una tabla genérica shared. La asignación es una capacidad del dominio Growth con referencias a
objetos canónicos; su validación de Space/Servicio usa readers de los dueños. Insights consume el contrato y guarda
su snapshot; no incorpora SQL nuevo contra los schemas de otros productos.

## 4. Contrato propuesto y ownership

La forma siguiente es ilustrativa; los nombres no existen hoy ni sustituyen su formalización en ADR/schema:

```ts
type OperatingMeasurementBinding = {
  bindingVersion: 'proposed_v1'
  organizationId: string
  spaceId: string
  serviceId: string
  assignmentRef: { id: string; version: number; digest: string }
  contentScopeRef: { version: number; digest: string }
  requiredSourceKinds: ['ga4', 'gsc', 'aeo_run']
  ga4: {
    connectionOrganizationId: string
    propertyId: string
    populationMethod: string
  }
  gsc: {
    connectionOrganizationId: string
    siteUrl: string
    historyMethod: string
  }
  aeo: {
    profileId: string
    runId: string
    market: string
    instrumentDigest: string
    projectionMethod: string
    observationDigest: string
  }
}
```

Este receipt no transporta tokenSecretRef, bearer, refresh token, prompts/respuestas crudas, permisos internos
ni costos de proveedor. Los identificadores públicos que necesite el lector se minimizan en la proyección cliente.
El `operatingClientId` legacy, si la estrategia elegida lo necesita, se deriva del contexto validado; no decide
por sí mismo la Organization ni se confunde con el ID numérico de Company en HubSpot.

Reglas de integridad que debe cubrir el diseño:

- Para un nuevo encargo, Space y Servicio pertenecen a la misma Organization autorizada, el routing efectivo del
  servicio corresponde a ese Space y el actor tiene acceso al contexto. Una combinación cruzada falla aunque
  los IDs existan. Para una edición histórica, el owner operativo sellado no se sustituye por routing latest:
  se comprueba el permiso actual del actor sobre ese recurso histórico y el mapping de su corte.
- Una asignación puede reutilizar una conexión de la Organization sólo si su autorización y el contrato de
  la fuente cubren la lectura. La cuenta no recibe el secreto ni puede elegir otro propertyId arbitrario.
- Una selección de cuenta, servicio, host o run en la UI es una solicitud; el command resuelve y valida la
  referencia. No se acepta un receipt completo firmado sólo por el browser.
- La expectativa de que Blog requiere scope y tres fuentes persiste **fuera de la configuración que podría
  faltar**. Si la asignación vigente desaparece o se intenta clear, no vuelve el fallback global.
- Organization entitlement sigue siendo un techo. Membership, permiso efectivo por Space y capacidad de la
  acción lo intersectan; el binding no genera grants.
- Versiones retiradas permanecen para auditoría y ediciones previas. Una revisión de configuración no altera
  una edición sellada, y un error de mapping nunca se resuelve con `LIMIT 1`.

## 5. Aplicación por fuente

### 5.1 GA4

`src/lib/growth/analytics-ga4/reader.ts` construye actualmente filtros de landing por ruta; hay que extender su
contrato y transportar el selector del host. El detalle está en el anexo previo, sin duplicar aquí la fórmula.

Para aceptar el informe se debe acordar y comprobar su población. **Sesiones con actividad en el blog** y
**sesiones cuya entrada fue el blog** son hechos diferentes; el host del evento más una ruta de landing no prueba
automáticamente el host de entrada. No reemplazar la métrica de adquisición comprometida por otra sin declararlo.

El reader debe conservar metadata de calidad y un control agregado independiente para los totales que publique.
Los desgloses por página o fuente no se suman como sustituto implícito de sesiones únicas. La clasificación
`engagedSessions` describe la sesión, no demuestra interacción exclusivamente local en el blog.

El permiso de consultar GA4 del Blog se determina antes de resolver la conexión organizacional. El portal de
Diseño no obtiene ese alcance sólo porque ambos Spaces compartan Organization o proveedor.

### 5.2 GSC

La propiedad actual ya corresponde al blog. El host sigue declarándose y sellándose como parte del método,
porque una propiedad podría cambiar o existir historia con otro origen. El reader dueño conserva fórmulas de
CTR/posición y sirve ventanas coherentes con filtro URL antes de agregado, ranking y límites.

La integración histórica pertenece a Growth: PG es ventana operativa y BQ es historia. Hace falta capturar el
período autorizado y consumirlo con precedencia/dedupe/cobertura; no rellenar meses en PG para eludir ese contrato.
Existencia de una fila no certifica cierre completo de día o exhaustividad de filas principales de Google.

La historia del blog antes del contrato sirve como baseline analítico. No se convierte en historia de ejecución
de Efeonce ni modifica los indicadores de Diseño. La propiedad antigua de `www` es otra identidad y no se incluye
silenciosamente en el alcance actual.

### 5.3 Motor AEO propio

Reutilizar el run existente exacto cuando su evidencia permita medir citas URL del blog en el panel declarado.
No exigir una corrida dedicada como prerequisito artificial; tampoco presentar el panel de reputación/compra
como si hubiese sido diseñado para el plan editorial. Un futuro panel dedicado y nuevas corridas conservan sus
commands, revisión y autorización de gasto propias.

El motor guarda URLs, pero algunos agregados colapsan el blog y la raíz a dominio registrable. Se propone una
proyección canónica URL en el dueño, manteniendo el matching general de marca legacy. Cambiar el website vivo del
perfil a blog no vuelve host-exactos los scores ni reescribe el matchingSnapshot del run.

La métrica principal debe distinguir filas de cita, URLs únicas y respuestas que citan el blog. El numerador usa
URLs del scope; el denominador corresponde al panel/cobertura declarados. No seleccionar sólo respuestas que ya
citaron el blog para fabricar una tasa. Un cero observado en una corrida válida sigue siendo una medición.

Fijar runId no basta para afirmar que la fuente es inmutable: scores/findings se pueden recomputar bajo el mismo
run y versión. Conservar método, instrumento realmente ejecutado, observaciones/proyección y digests; el snapshot
de Insights sella los hechos que efectivamente leyó. Si la comparación cambió prompts/proveedores, no emitir un
delta simple por tener el mismo string de promptPackVersion.

### 5.4 Referrals IA y otros datos

Los referrals de asistentes en GA4 son comportamiento del sitio. **No satisfacen `aeo_run`**. Actualmente pueden
producir facts `module:'aeo'` aunque no se haya leído un reporte del Grader, así que el gate por módulo es insuficiente.

Ranking/cola sólo incorporan URLs elegibles; ETV del dominio principal no es ETV del blog. El valor monetario
GSC×CPC tiene otro método/cobertura y no forma parte obligatoria por inferencia. Ninguna de estas capacidades
opcionales sustituye una de las tres fuentes requeridas.

## 6. Lifecycle e idempotencia con dos cuentas

Secuencia propuesta para nuevas ediciones acotadas:

1. Resolver actor y Space solicitado autorizado mediante el primitive canónico. Rechazar contexto ambiguo y una
   identidad de servicio de otra Organization; no ampliar al consolidado. Todavía no exigir el routing latest
   Servicio→Space: una idempotency key existente puede referirse a una edición histórica del Space original.
2. Validar la intención y el requirement del informe, incluido su Space/Servicio. El hash nuevo incluye ese
   contexto estable **antes** de considerar configuración mutable. El request v1 actual descarta campos extra;
   una nueva selección pública exige contrato versionado y paridad.
3. Resolver una idempotency key ya aceptada antes de consultar latest. Verificar también que la edición existente
   pertenece al contexto autorizado: no devolver el informe de Diseño desde SEO por reutilizar una key.
4. Si no existe, validar el routing efectivo Servicio→Space para admitir un nuevo encargo, resolver asignación y
   versiones de fuentes, y fijar el binding al aceptar la edición. El hash de intención no debe variar porque
   latest cambió entre retries. Si ya existía, se autoriza el recurso histórico sellado con permisos actuales;
   mover el servicio hoy no obliga a reatribuir o rechazar el retry válido de esa edición.
5. Recolectar por readers dueños usando el binding, actual y comparación; comprobar receipts y procedencia por
   cada medición. Referencias property-wide no se hacen pasar por medidas del blog.
6. Exigir estado utilizable de las tres fuentes, congelar evidencia/plan y validar presentación. Ausencia de una
   fuente mantiene el entregable pendiente; `allowPartial` no omite el requisito.
7. Renderizar/mostrar sólo a actores autorizados para la cuenta. Emisión humana y distribución tienen sus
   permisos propios. Re-render y recover de fases selladas no releen latest.

### Key y compatibilidad

La unicidad actual es `(organization_id,idempotency_key)`. Se puede conservar si el nuevo hash distingue el
contexto operativo y los conflictos no revelan IDs de ediciones ajenas. Cambiarla a una key por Space es otra
decisión con migrations/consumidores: no se presupone necesaria para esta entrega.

Los requests/ediciones legacy conservan su interpretación y hash. No se recalculan snapshots históricos para
añadirles un Space ni se asume que un informe antiguo de toda SKY estaba scoped por Diseño sin registrar su método.
Para el nuevo informe de Blog, un caller viejo sin contexto o que ignore los requirements no es compatible.

### Revise, recover y schedules

- Un report operativo conserva su pertenencia al Space/Servicio. Una revisión no lo muda a otra cuenta sólo
  porque el actor pueda ver ambas; un cambio de población requiere un flujo/versionado explícitos.
- `recover` reutiliza el binding de la edición. Si el productor ya no puede servir ese corte, falla con causa;
  no toma otro run o propiedad como reemplazo.
- Una recurrencia conserva target de cuenta/servicio y requisito de fuentes. Revalida autoridad en cada tick;
  revocación o mapping inválido pausa, no degrada a Organization global.
- La asignación de medición elegida para una nueva ocurrencia se fija una vez; el retry de esa ocurrencia usa
  la edición existente. No vuelve a elegir latest entre intentos.
- El tick actual crea sin reportId y puede abrir otro report; continuidad de biblioteca por servicio requiere
  un binding persistente de schedule→report, no sólo reutilizar el título.

## 7. Acceso, biblioteca y distribución

El aislamiento no termina en `create`. Debe comprobarse en catálogo, listado, búsqueda, detalle de edición,
evidencia, plan, output, descarga, revise/recover, compartir, entrega y recurrencias. Los adapters App/Ecosystem
actuales pierden parte del `spaceId` ya disponible en el contexto API; propagar/intersectar ese contexto es más
coherente que inventar otro issuer o un token paralelo.

Los endpoints directos de GA4/GSC/AEO también deben respetar la cuenta autorizada o permanecer cerrados para el
stakeholder scoped mientras no soporten esa proyección. Arreglar Insights no legitima que otra ruta entregue el
último reporte AEO global a cualquier persona de SKY.

### Bearer versus identidad

Un link bearer de Insights concede una edición a quien posea el token; no prueba departamento. La separación
por identidad se verifica en el portal autenticado. Si se permite compartir externamente una edición por bearer,
debe ser una modalidad explícita autorizada para esa cuenta y clasificación de contenido, con TTL/revocación
vigentes. No prometer aislamiento entre personas mediante un link deliberadamente transferible.

No se rompen ni se revocan por este discovery enlaces existentes. La revisión de grants anteriores, si se exige,
es una operación autorizada y auditable. Los recipients se resuelven por informe/cuenta y se congelan en el intento;
no heredan automáticamente todos los contactos de SKY ni constituyen permiso de portal por recibir un correo.

Congelar recipients al crear un intent no basta. Antes del dispatch irreversible y de cualquier retry que envíe, revalidar
autoridad vigente para cuenta/edición y la modalidad permitida del destinatario. Si la policy exige identidad,
una membership revocada bloquea el envío pendiente; una excepción externa debe estar autorizada expresamente,
no inferida del email corporativo. Conservar el ledger accepted/ambiguous y no reenviar a ciegas: lo ya aceptado
por el transporte no puede describirse como cancelado o retirado retroactivamente por una revocación posterior.
La reconciliación read-only del ledger sigue permitida al actor operativo/auditor autorizado aunque el recipient
o requester haya perdido acceso: revocar bloquea nuevos envíos, no la obtención de evidencia de un intento previo.

## 8. Caché, renderer y presentación

- Las claves de caché de una respuesta operativa incluyen scope/version y la dimensión de permiso que altere
  la respuesta. No reutilizar la caché consolidada `org+facet` para otra población.
- El worker transporta contexto/binding como dato durable y revalida sus prerequisites; el renderer usa el plan
  sellado, no resuelve otra Organization o source configuration.
- A4, deck y web nombran cuenta, servicio, período, host y panel AEO cuando corresponde. Los nombres salen de
  datos sellados y vocabulario común, no de condiciones por nombre de cliente.
- El gate apto para cliente debe admitir hosts públicos validados del scope sin permitir identificadores internos
  o dominios parecidos. El parser actual rechaza el host del blog si se imprime en una scopeLine.
- QA web interna de modelo/renderer no acredita un enlace público: éste exige la audiencia/estado y autorización
  de sharing vigentes. `web` no es un output durable de render.

## 9. Casos de aceptación específicos

| Caso | Respuesta exigida |
| --- | --- |
| Persona SEO pide edición de Diseño con organizationId correcto | No obtiene la edición, sus hechos ni sus IDs privados |
| Persona Diseño pide conexión/último AEO global por otra ruta | Se evalúa el scope real; no obtiene un permiso implícito sobre SEO |
| Actor con ambos Spaces cambia de contexto | Datos/caché/método corresponden al activo autorizado; no mezcla capítulos |
| Mismo request/key usados en otra cuenta | No devuelve el report de la primera; conflicto/denegación sin detalles ajenos |
| Latest cambia después de aceptar | Retry/recover conservan binding y hechos del corte aceptado |
| Falta GSC, pero hay GA4 Organic Search | No cumple el informe de tres fuentes |
| Falta GA4, pero hay GSC y Grader | No cumple el informe de tres fuentes |
| Falta run Grader, pero hay referrals IA | No cumple `aeo_run` |
| GA4 flag OFF o credencial inválida | Missing source explícita; no se omite silenciosamente el capítulo requerido |
| Scope/assignment requerido no existe o queda vacío | No mide toda la propiedad por fallback |
| Run general contiene citas de blog y raíz | Proyección blog y denominador del panel; no score global reetiquetado |
| Run válido con cero citas blog | Cero observado con cobertura; no ausencia inventada |
| Corridas cambian prompts/proveedores | No delta comparable sin método que lo sostenga |
| Se solicita período sin un run AEO dentro del criterio acordado | Fuente temporal no elegible; no proyecta run futuro o antiguo a días faltantes |
| Se re-renderiza edición previa tras cambiar perfil | Snapshot/plan/cifras previos no cambian |
| Falta dato de comparación de una métrica | No sustituye por cero; declara ausencia/incomparabilidad y cumple la policy de comparación acordada |
| Schedule pierde la autoridad de su cuenta | Pausa con causa, sin pasar a contexto organizacional global |
| Se intenta imprimir una tabla interna junto al hostname público | Gate acepta sólo el host validado y conserva el rechazo de la tabla |

## 10. Decisiones y unidades necesarias

Antes de código hay que formalizar: contrato de contexto operativo del capítulo 01; dueño/versionado de la
asignación de medición; momento de congelación y hash; requisito por fuente; proyección canónica de citas URL;
precedencia histórica GSC; y modalidad de distribución compatible con el aislamiento requerido.

Puede construirse el filtro y una preview interna sin provisionar una cuenta de cliente nueva. La apertura de
dos experiencias aisladas necesita las unidades de identidad, routing, cachés y datos del programa integral.
Las nuevas capabilities/bindings se implementan en el runtime dueño actual, extraction-ready; no se crean
repositorios, pools, servicios, emisores ni SDKs sólo para este caso.

No se inicia una corrida AEO, backfill, OAuth, cambio de conexión, edición o envío por escribir este contrato.
