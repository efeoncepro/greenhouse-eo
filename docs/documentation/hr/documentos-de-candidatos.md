> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.0
> **Creado:** 2026-07-10 por Claude (TASK-1362)
> **Ultima actualizacion:** 2026-08-15 por Claude (TASK-1714/1715)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

# Documentos de Candidatos — Captura, Escaneo y Retencion

Este documento explica que documentos guarda Greenhouse sobre una persona que postula a una vacante, quien puede verlos, que pasa con los archivos peligrosos y cuando se borran.

## Que documentos existen

Un candidato puede tener cuatro cosas distintas, y Greenhouse las trata distinto:

| Documento | Que es | Cuando se captura | Quien lo ve |
|---|---|---|---|
| CV | El curriculum en PDF | En la postulacion publica, o subido por el equipo | Quien opera Hiring |
| Portafolio (archivo) | Muestras de trabajo | Subido por el equipo | Quien opera Hiring |
| Portafolio / LinkedIn (enlace) | Una URL | En la postulacion publica | Quien opera Hiring |
| Documento de identidad | RUT, pasaporte, etc. | **Solo despues de una decision favorable** | Enmascarado para Hiring; completo solo con permiso especial y motivo registrado |

Los archivos no viven en una carpeta aparte: usan la misma plataforma de archivos privados que el resto de Greenhouse. El documento de identidad usa la misma tabla que el resto de las personas de la organizacion. No hay un almacen paralelo de documentos de candidatos.

## Por que el documento de identidad no se pide en la postulacion

Pedirle el RUT o el pasaporte a alguien que recien esta postulando es recolectar un dato sensible sin una razon que lo justifique. Solo cuando hay una decision favorable —la persona fue seleccionada o quedo como reemplazo— aparece la necesidad real de identificarla para contratarla.

Greenhouse no confia en que alguien recuerde esta regla: el sistema **rechaza** la captura del documento de identidad si el candidato todavia no tiene una decision favorable, y el formulario publico no tiene forma de llegar a ese camino.

## Que pasa con un archivo peligroso

Todo archivo que llega desde la web publica se revisa **antes** de quedar asociado a la postulacion.

La revision comprueba que el archivo sea realmente lo que dice ser. Alguien puede tomar un programa ejecutable, renombrarlo a `curriculum.pdf` y subirlo: el navegador lo declara como PDF, pero sus primeros bytes lo delatan. Tambien se revisa que un PDF no traiga contenido activo peligroso, como un archivo incrustado o una accion que lance un programa. Ademas, un segundo escaner (ClamAV) compara el contenido contra una base de firmas de malware conocido; entre las dos revisiones, el peor veredicto gana.

Si el archivo no pasa la revision:

- **no se adjunta** a la postulacion y nadie lo puede descargar desde el portal;
- **se conserva** para que alguien lo revise (es evidencia de lo que se intento subir);
- **la postulacion se acepta igual**, porque los datos de la persona pueden ser validos aunque el archivo no lo sea;
- **el equipo se entera** por una alerta en el panel de operaciones.

En la ficha del candidato, un documento bloqueado se muestra como tal. No desaparece en silencio: "no hay CV" y "el CV quedo bloqueado" son dos cosas distintas y el sistema las distingue.

Los CV que entraron antes de que existiera esta revision se marcan como "no escaneados". Se pueden seguir descargando, pero queda registrado que nadie verifico su contenido.

> Detalle tecnico: el escaneo vive en `src/lib/storage/asset-scan/`. El escaner estructural corre siempre y no necesita infraestructura. El escaner de firmas de malware (ClamAV, flag `ASSET_MALWARE_SCAN_ENABLED`) esta **operativo en staging y produccion desde 2026-08-12**. Ver `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y la documentacion funcional de plataforma: [Escaneo de archivos subidos](../plataforma/escaneo-de-archivos-subidos.md).

## Quien puede ver los documentos

Solo quien opera Hiring. Antes bastaba con pertenecer al area de Recursos Humanos, lo que le daba acceso a los CV de todos los candidatos a personas que no participan del proceso de seleccion —por ejemplo, quien lleva la nomina—. Eso se corrigio: ahora se exige el permiso real de Hiring.

Los usuarios de portal cliente **nunca** ven documentos de candidatos, bajo ninguna configuracion.

El documento de identidad se muestra siempre enmascarado (`xx.xxx.678-K`). Ver el valor completo exige un permiso especifico, escribir un motivo, y queda registrado quien lo vio y cuando.

## Cuando se borran los documentos

**Politica declarada: 12 meses.**

La Ley 21.719 no fija un plazo exacto. Lo que exige es que los datos no se conserven mas alla de la finalidad que justifico pedirlos. Cerrado el proceso de seleccion, guardar el CV de alguien que no fue contratado ya no tiene finalidad.

El reloj arranca:

- cuando la postulacion se cierra como **rechazada** o **retirada** — se cuentan 12 meses desde esa fecha;
- cuando la persona **retira su consentimiento** — vence de inmediato, sin ventana. Revoco el permiso para tratar sus datos.

Los candidatos que **si** fueron contratados quedan fuera de esta cuenta: pasan a ser parte del equipo y les aplica la retencion laboral, que es mucho mas larga.

### Lo que el sistema hace hoy, y lo que todavia no

Hoy Greenhouse **detecta y avisa**: hay una alerta en el panel de operaciones que muestra cuantos candidatos no contratados tienen documentos que ya deberian haberse borrado. Si alguien retiro su consentimiento, la alerta escala a error.

Greenhouse **todavia no borra solo**. Borrar los documentos de una persona real es irreversible, y esa accion necesita un responsable humano que la ejecute y un registro de que se hizo. Esta declarado como pendiente, con dueño **People Ops**, y la condicion para cerrarlo es que exista el comando de borrado auditado.

Mientras tanto, la alerta es la que sostiene el cumplimiento: si nadie la atiende, la deuda se acumula a la vista.

> Detalle tecnico: la deteccion vive en `src/lib/hiring/documents/retention.ts` y la alerta es la señal `hiring.candidate_document.retention_overdue`, visible en `/admin/operations`. El modulo no ejecuta ninguna mutacion; hay un test que lo verifica.

## Que no hacer

- No pedir el documento de identidad en el formulario publico de postulacion.
- No dar acceso amplio de Recursos Humanos para que alguien pueda ver un CV: el permiso correcto es el de Hiring.
- No descargar un archivo en cuarentena "para ver que era" desde un computador de trabajo.
- No ignorar la alerta de retencion vencida. Es una obligacion legal, no una metrica.
- No copiar documentos de candidatos fuera de Greenhouse.

## Problemas comunes

**"Subi un CV y no aparece en la ficha."**
Probablemente quedo en cuarentena. Revisa la alerta en `/admin/operations`. La causa mas frecuente es un archivo que no es realmente un PDF (por ejemplo, un documento de Word renombrado).

**"Un candidato dice que postulo, pero no veo su CV."**
La postulacion se acepta aunque el archivo sea rechazado. Revisa el estado del documento en su ficha: si dice bloqueado, pidele que reenvie el CV exportado como PDF real.

**"No puedo capturar el documento de identidad."**
El candidato todavia no tiene una decision favorable. Primero se decide, despues se captura la identidad.

**"Necesito ver el RUT completo."**
Requiere el permiso de revelado y un motivo escrito. Queda auditado. Si tu rol no lo tiene, pidelo — no busques el dato por otra via.


## Delta 2026-08-15 — Ver el CV desde el portal (TASK-1715) y revelar identidad (TASK-1714)

Hasta esta fecha, la pestana **Documentos** de la ficha del candidato mostraba tres filas fijas y un
boton "Revelar" que no hacia nada real: el motivo que escribias se descartaba y la anotacion de
auditoria que el aviso prometia nunca se guardaba. Ademas no habia forma de leer el CV desde el
portal. Eso cambio.

### Lo que ves ahora

La pestana muestra **dos grupos**, y la diferencia entre ellos es intencional:

| Grupo | Que contiene | Como se accede |
|---|---|---|
| **Archivos y enlaces** | CV, portafolio (archivo o enlace), LinkedIn | Se abren directo con **Ver** o **Descargar**. Sin pedir motivo |
| **Identidad** | RUT / pasaporte | Enmascarado. Ver el numero completo exige permiso y motivo, y queda auditado |

**Por que el CV no pide motivo:** entrar a la ficha del candidato ya exige el permiso de Hiring. Un
candado sobre el CV no protegeria nada — y un candado que no protege nada te ensena a ignorar los que
si protegen. El candado queda donde importa: la identidad.

### Ver el CV

**Ver** abre el documento **dentro del portal**, en una ventana sobre la ficha. No te saca a otra
pestana, asi que no pierdes el contexto de la persona que estas evaluando. Dentro de esa ventana
siempre tienes **Descargar** y **Abrir en pestana nueva**.

Si tu navegador no sabe mostrar PDF dentro de una pagina —tipicamente en el celular— la ventana te lo
dice y te ofrece esas dos salidas, en vez de dejarte un recuadro en blanco.

### Los cuatro estados de un archivo

Antes todos decian "Enmascarado" y no se distinguian. Ahora cada situacion tiene su mensaje:

| Lo que ves | Que significa | Que hacer |
|---|---|---|
| Nombre, peso y fecha, con **Ver** y **Descargar** | El archivo esta disponible | Leerlo |
| Chip **Cuarentena** sin acciones | El escaner de seguridad lo bloqueo | Pedirle al candidato que lo reenvie. **No es culpa del candidato ni tuya** |
| Chip **Procesando** sin acciones | Todavia se esta escaneando | Volver en unos minutos |
| Chip **Sin escanear** con acciones | Se subio antes de que existiera el escaneo | Se puede abrir igual |
| "El candidato no adjunto CV" | No hay archivo | Pedirselo si lo necesitas |

Y si el sistema no logra cargar la lista, te dice que fallo y te ofrece reintentar. **Nunca te va a
mostrar "sin documentos" cuando en realidad no pudo consultarlos** — eso te haria descartar a alguien
por un problema tecnico.

### Revelar el documento de identidad

Ver el numero completo del RUT o pasaporte de un candidato exige el permiso
`hiring.candidate.reveal_identity`, que hoy tienen Admin, HR Manager y Operaciones. Si no lo tienes,
el boton **no aparece** y el texto te dice a quien pedirselo — no vas a encontrarte con un boton que
siempre falla.

Al revelar:

1. Se te pide un **motivo** de al menos 5 caracteres. Es obligatorio de verdad.
2. Queda registrado tu nombre, la hora y ese motivo en un historial que no se puede borrar.
3. El numero aparece solo en tu pantalla, con opciones de **Copiar** y **Ocultar**.
4. Si recargas la pagina, vuelve a estar enmascarado. Revelarlo de nuevo escribe otra anotacion — eso
   es correcto: el historial refleja accesos reales, no ventanas que quedaron abiertas.

**El grupo Identidad suele estar vacio**, y eso es normal: el documento de identidad solo se pide
despues de una decision favorable. Antes de eso, la pantalla te explica por que no hay nada.

> Detalle tecnico: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) §Delta 2026-08-15 · commands en `src/lib/hiring/documents/` · UI en `src/views/greenhouse/hiring/CandidateDocumentsPanel.tsx`
