# Sister Platform Bindings

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-11 por Codex (TASK-375)
> **Ultima actualizacion:** 2026-04-11 por Codex (TASK-375)
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

---

## Que es un sister-platform binding

Un sister-platform binding es el enlace formal entre un scope externo de una app hermana del ecosistema y un scope interno de Greenhouse.

En palabras simples: le dice a Greenhouse que un tenant, workspace, portal o instalacion externa corresponde a una organizacion, cliente, space o scope interno concreto dentro del portal.

Esto evita trabajar con suposiciones fragiles como:

- nombres visibles
- labels comerciales
- coincidencias manuales por costumbre

## Para que sirve

Sirve para que Greenhouse pueda resolver de forma segura preguntas como:

- este tenant de Kortex corresponde a que cliente o space en Greenhouse
- este portal externo sigue activo o fue suspendido
- este binding esta listo para ser consumido por una API o todavia esta en borrador

Tambien deja una base reusable para futuras apps hermanas como Verk.

## Donde vive hoy

La visibilidad funcional actual vive en:

- `/admin/integrations`

Hoy esa pantalla permite ver:

- cuantas plataformas hermanas tienen bindings registrados
- cuantos bindings estan activos
- que scopes Greenhouse estan enlazados
- el estado operativo de cada binding

## Que estados puede tener

### Draft

El binding existe, pero todavia no se usa como enlace confiable para consumers downstream.

Es el estado correcto cuando:

- se esta modelando el enlace
- falta validarlo
- todavia no debe resolver tenancy en runtime

### Active

El binding ya es valido y Greenhouse puede usarlo para resolver el scope correcto.

Solo los bindings activos participan en la resolucion canonica.

### Suspended

El binding existia y era valido, pero temporalmente no debe usarse.

Sirve para congelar una relacion sin borrarla.

### Deprecated

El binding queda como historico y deja de ser el enlace vigente.

Sirve cuando ya existe un reemplazo o el enlace dejo de ser canonico.

## Que tipos de scope Greenhouse soporta

La foundation actual soporta cuatro niveles:

1. `organization`
2. `client`
3. `space`
4. `internal`

Eso importa porque no todas las apps hermanas se conectan al mismo nivel.

Ejemplos:

- una relacion puede vivir al nivel de cliente completo
- otra puede ser especifica de un space
- otra puede ser interna, sin apuntar a un cliente concreto

## Que NO hace todavia esta foundation

Todavia no hace estas cosas:

- no expone una API externa endurecida para sister platforms
- no expone MCP read-only
- no implementa el bridge especifico de Kortex
- no es una UI completa de operacion avanzada; por ahora es una surface de governance y lectura

Esas piezas vienen despues en:

- `TASK-376`
- `TASK-377`

## Como se deberia usar operativamente

Regla simple:

- primero se crea o corrige el binding
- despues se activa
- solo entonces una integracion externa deberia apoyarse en ese enlace

Si hay duda sobre el scope correcto, no corresponde activar el binding "para probar". Debe quedar en `draft` hasta validar la relacion real.

## Quien deberia tocarlo

Hoy es una capability de governance administrativa. No es una herramienta pensada para usuarios finales ni para colaboradores de portal cliente.

La operacion correcta recae en perfiles admin que entienden:

- la semantica de tenancy de Greenhouse
- el scope real de la app hermana
- el impacto de activar o suspender un binding

## Como leer la tabla en Admin

Cada fila responde seis preguntas:

1. que plataforma es
2. que objeto externo representa
3. a que scope Greenhouse apunta
4. que rol de binding tiene
5. en que estado esta
6. cuando fue verificado o actualizado por ultima vez

La idea es que un operador pueda detectar rapido:

- si el enlace existe
- si esta activo o bloqueado
- si el scope correcto es organization, client, space o internal

## Relacion con Kortex

Kortex es la primera app hermana prevista para consumir esta foundation, pero el binding no esta hardcodeado a Kortex.

Eso significa que:

- Kortex entra como primer consumer real
- el modelo base no cambia cuando llegue Verk
- Greenhouse conserva un solo contrato canonico para todas las apps hermanas

## Siguiente paso natural

Despues de esta foundation, lo natural es:

1. endurecer la surface read-only
2. conectar el primer carril Greenhouse -> Kortex

La foundation ya deja listo el terreno para eso.
