# Efeonce MCP Gateway

> **Tipo de documento:** Documentación funcional
> **Estado:** operativo internal-only
> **Documentación técnica:** [ADR de plataforma MCP](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
> **Operación:** [runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)

## Qué es

Efeonce MCP Gateway es el punto de acceso federado para que un cliente MCP use capacidades de productos Efeonce
mediante una URL estable: `https://mcp.efeonce.org/mcp`. No vive en Greenhouse ni Globe: es un servicio
independiente que autentica al cliente y delega cada lectura al producto dueño.

La primera capacidad activa fue `globe.producer.fleet.list`. Permite consultar las rutas de modelos disponibles de
Globe para el workspace interno autorizado. El gateway no recrea catálogo, routing ni reglas de Globe.

Desde el 6 de agosto de 2026 hay una **segunda capacidad federada**: Search Visibility 360 de Greenhouse. Partió
con tres consultas de solo lectura y creció hasta federar **28 tools SEO** (al 2026-08-31). ⚠️ Federado e interno NO son el mismo conjunto por construcción —el gateway resuelve contra rutas HTTP del lane—: `get_seo_work_queue` existe adentro y está excluida con razón, y `get_seo_provider_spend` está federada sin contraparte interna. Desde el 28 de agosto de 2026 esas 27 están **efectivamente
desplegadas** en la revisión productiva del gateway (`efeonce-mcp-gateway-00039-gz4`, desde el 2026-09-06; antes `00028-pmx` del 2026-09-02, `00026-ctp` del 2026-09-01 y `00024-8b8`), que reemplazó a la del 27
de agosto (servía 21). Ya no queda ninguna tool esperando despliegue. Igual que con Globe, el gateway no recrea
lógica: transporta la pregunta y Greenhouse decide qué se puede ver. El inventario vigente y su estado de
despliegue viven en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-tool-inventory.md) §8; detalle
funcional en [Search Visibility 360 por MCP](../growth/search-visibility-360-por-mcp.md).

Desde el 2 de septiembre de 2026 hay una **tercera capacidad federada**, y no es de dominio: los **manuales de uso**
de la superficie Greenhouse (`TASK-1804`). El provider `greenhouse-skills` expone una sola tool,
`get_greenhouse_skill` (anotada `readOnlyHint: true`; sin `name` devuelve el catálogo, con `name` el manual como
texto), y delega cada llamada a la lane `GET /api/platform/ecosystem/mcp/skills[/{name}]` de Greenhouse. No embebe
contenido: si Greenhouse cambia un manual, el gateway lo sirve sin redeploy. Comparte interruptor e identidad con el
provider SEO (`GREENHOUSE_SEO_PROVIDER_ENABLED`, mismo consumer token) y no agregó permisos en Entra: basta el
permiso base de conexión (`efeonce.mcp.read`). Detalle funcional en
[Manuales MCP servidos por el protocolo](./manuales-mcp-servidos-por-el-protocolo.md).

Desde el 6 de septiembre de 2026 hay una **cuarta capacidad**: la **identidad delegada** de Efeonce ID
(`TASK-1837`). El administrador designado de una organización cliente puede, desde su cliente MCP,
listar a las personas invitadas de su organización (`identity.invitations.list`) e invitar a una nueva
(`identity.invitation.create`). Son las primeras tools **propias del gateway** en este dominio: no existen como
tool interna de Greenhouse; el gateway resuelve contra la ruta HTTP del lane. El gateway **no decide quién manda**:
envía la identidad verificada de la persona y Greenhouse vuelve a exigir que sea administrador designado, o
responde "prohibido". Invitar exige un permiso propio (`efeonce.mcp.identity.write`) que la persona consiente
aparte del permiso base. El **token de la invitación nunca vuelve al agente**: se entrega por correo. Comparte
interruptor, identidad y consumer con los providers SEO y de manuales, porque es la misma lane.

Con eso el servidor declara **39 tools** en total (28 SEO + `get_greenhouse_skill` + 2 de identidad delegada + las
nativas de gateway, Globe y Hiring). Es el techo del catálogo: lo que ve un cliente concreto depende de su emisor,
sus permisos y los interruptores de cada provider.

## Cómo se comporta

1. El cliente MCP obtiene un token para el resource canónico desde un emisor admitido: Entra legado o
   Efeonce ID. En el carril corporativo nativo, Microsoft autentica y Efeonce ID emite el token.
2. El gateway valida issuer, audience, firma, expiración y scopes, y aplica policy por tool. Los tokens
   nativos requieren autoridad vigente del reader; los internos también contexto firmado y ledger `jti`.
3. Para Globe obtiene una identidad de workload y llama el reader canónico de Globe.
4. Globe deriva el workspace desde la identidad de servicio; el cliente no puede escoger otro workspace.
5. La respuesta entrega disponibilidad de rutas y un correlation ID para observabilidad.

El gateway rechaza requests anónimos. Un provider con problemas falla cerrado y devuelve un error sanitizado, sin
filtrar credenciales ni detalles internos.

## Cómo se presenta ante el cliente

Cuando un cliente MCP conecta, el servidor le entrega una tarjeta de identidad con cinco datos: el nombre
técnico (`efeonce-mcp`), un título legible (`Efeonce MCP`), el sitio de la marca, un ícono y la versión.
Esa tarjeta viaja en el saludo inicial de la conexión, y es lo que un cliente usa para mostrar el servidor
en su lista de conectores.

El ícono es **uno solo**: el isotipo Efeonce en blanco sobre una placa azul institucional opaca, de 512×512,
servido por el propio dominio del gateway (`/icon-512.png`) sin pedir credenciales. Tres decisiones detrás,
todas por la misma razón — la superficie donde nos dibujan no la controlamos:

- **Placa opaca en vez de fondo transparente.** Un ícono transparente sólo se ve bien sobre fondo claro; sobre
  una lista oscura el azul institucional se hunde. La placa garantiza contraste sobre cualquier fondo y hace
  que la marca se reconozca por color antes que por forma, que es lo único que sobrevive a 24 píxeles.
- **Sin esquinas redondeadas propias.** Muchos clientes recortan el ícono con su propia forma. Si el asset ya
  viniera redondeado, se vería un arco recortado contra otro arco. A sangre, el que redondea redondea y el
  que no recibe un cuadrado limpio.
- **Sin variante por tema.** La placa opaca no necesita una versión clara y otra oscura. Además, la
  especificación no define si "tema claro" describe el fondo *del ícono* o el *del cliente*, y como hoy ningún
  cliente los dibuja, una lectura invertida no se podría detectar contra nada. Un ícono que no depende del
  tema no puede leerse al revés.

**Advertencia honesta:** hoy **ningún cliente Claude dibuja estos íconos**. claude.ai los ignora en conectores
personalizados (hay un reporte abierto que además descartó las alternativas: favicon, ícono incrustado y
etiqueta HTML), y en Claude Code el pedido equivalente se cerró como "no planificado". La tarjeta se declara
porque es correcta y porque el día que un cliente la lea aparece sola, no porque se vea ahora.

> Detalle técnico: `efeonce-mcp/src/branding.ts` (fuente única de la tarjeta) ·
> [ADR de plataforma MCP](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) §Delta 2026-09-05.

## Cómo se versiona, y por qué eso importa

El protocolo MCP decidió que **el versionado pertenece al servidor, no a las tools**: se propusieron tres veces
mecanismos para versionar tools individuales y las tres se cerraron con ese argumento. La consecuencia práctica
es que la versión del servidor es el **único** lugar donde se puede declarar que la superficie cambió. No es un
dato decorativo: es la señal.

Esa versión se compone de dos mitades con dueños distintos:

| Mitad | Quién la decide | Qué responde |
| --- | --- | --- |
| El número (`1.1.0`) | Una persona, al clasificar el cambio | ¿Qué clase de cambio hubo? |
| El sufijo (`+5c28a7a`) | El despliegue, automáticamente | ¿Qué build está sirviendo ahora? |

**Qué cuenta como cambio depende de a quién le rompe.** Para un agente que ya aprendió la superficie, no es lo
mismo que para un programa con tipos:

- **Rompe:** renombrar o quitar una tool, quitar un campo de respuesta que el flujo usaba, cambiar el
  significado de un argumento sin cambiarle el nombre y —la contraintuitiva— **editar la descripción de una
  tool**. La descripción es lo que el agente lee para decidir qué llamar: cambiarla cambia su decisión y además
  invalida la caché de prompt del cliente. Casi nadie la trata como cambio rompiente.
- **No rompe:** agregar una tool, agregar un campo opcional, agregar un valor de enumeración que el agente no
  tiene que enumerar.

Para que esa decisión humana ocurra de verdad y no quede en buena intención, hay un control automático: el
repositorio guarda una **foto de la superficie** (qué tools existen y con qué descripciones) junto a la versión
que la declaró. Si la superficie se mueve y la versión no, el control falla y nombra exactamente qué entró, qué
salió, o si sólo se editó una descripción. La foto **se exige y nunca se crea sola**: una línea base que se
repara a sí misma pasa para siempre y no detecta nada.

### El control midió durante un tiempo sólo la mitad

Vale documentarlo porque es la clase de falla que se ve fácil en retrospectiva y es invisible mientras ocurre.

El control comparaba el inventario de tools **federado desde Greenhouse**. Pero el gateway también define tools
propias, que no pasan por ese inventario. Resultado: esas tools podían aparecer sin mover nada. El 2026-09-06,
durante el trabajo de invitación delegada, se midió el efecto real: **la superficie pasó de 37 a 39 tools con el
inventario federado idéntico, la suite de pruebas en verde y la versión congelada**. La mitad que no se medía
era el 5% de las tools y el 100% de las que crecían ese día.

Un control que mide una parte y se lee como si midiera el todo es peor que no tenerlo, porque su verde se cita
como prueba. Se cerró midiendo la superficie del **servidor ya construido** —lo único que cuenta lo que de
verdad se registra, venga de la federación o del propio gateway—, incluyendo las descripciones en la
comparación y forzando todos los providers a "encendido" durante la medición, para que el mismo código no dé
resultados distintos según qué variables tenga la máquina que corre el control.

**Cómo saber qué está sirviendo:** el sufijo de la versión y el identificador de build de la revisión activa
deben coincidir con el último commit publicado. Si difieren, hay trabajo mergeado sin desplegar — y el verde de
la integración continua no es prueba de despliegue.

> Detalle técnico: [invariantes de superficie MCP](../../architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md) §9 ·
> [manual de operación](../../manual-de-uso/plataforma/operar-efeonce-mcp-gateway.md) ·
> `efeonce-mcp/src/surface.ts` y `surface-baseline.json`.

## Qué está disponible y qué no

Disponible hoy:

- `globe.capabilities.list` para discovery.
- `globe.producer.fleet.list` para disponibilidad de rutas de Globe.
- las tools SEO de Search Visibility 360 de Greenhouse: las lecturas (`get_seo_*`) bajo el permiso base de
  conexión — no configuran mediciones, no disparan capturas ni gastan presupuesto de proveedor — y las siete
  escrituras gobernadas bajo un permiso de escritura propio (`efeonce.mcp.seo.write`) que NO está cableado al
  cliente público: hoy responden fail-closed. Estar desplegadas no las vuelve usables por cualquiera: una
  escritura desplegada y fail-closed sigue sin poder ejecutarse hasta que el permiso se cablee. Cada tool queda
  acotada por el módulo SEO asignado a la organización. Además hay cuatro lecturas competitivas
  (`get_seo_provider_spend`, `get_seo_keyword_gap`, `get_seo_serp_top_results`, `get_seo_competitor_candidates`)
  que sólo responden a conexiones internas de Efeonce: una conexión de cliente recibe un "no existe", nunca una
  pista de que el dato está ahí. Inventario exacto en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-tool-inventory.md) §8.
- `get_greenhouse_skill` para leer los manuales de uso de esa superficie (hoy seis, todos internos). Una conexión
  que no sea interna recibe un catálogo vacío y un "no existe" por nombre, nunca un "prohibido".
- `identity.invitations.list` e `identity.invitation.create` para que el administrador designado de una
  organización cliente administre a las personas de su propia organización con Efeonce ID. Sólo responden a una
  persona externa autenticada con Efeonce ID: una conexión Entra interna no las alcanza. Con el interruptor de la
  invitación delegada apagado en Greenhouse responden "no habilitado", nunca una pista de que existe. Todavía no
  hay una primera organización cliente real habilitada —es una decisión comercial, no técnica—, así que hoy sólo
  están probadas en staging y por los rechazos verificados contra producción.

No disponible:

- crear ejecuciones, usar créditos, subir/leer assets, revisar, aprobar, entregar o publicar creatividad;
- costos de proveedor, márgenes, house, provider slug o selección de workspace;
- acceso self-service de clientes o multitenant.

`Bajo`, `Estándar` y `Premium` son orientación pública de consumo; no son costos de proveedor.

## Alcance de acceso

El servicio conserva Entra legado y tiene un piloto corporativo nativo verificado (TASK-1836/1831). La autorización de Globe usa un principal con
una capability de lectura y un binding de workspace exacto. Esto evita que una conexión MCP sea un bypass de
los permisos de Globe.

El gateway maneja seis permisos: el permiso base de conexión, el permiso de lectura de Globe, el permiso de
escritura interna para el fondeo de créditos, el permiso de escritura SEO (`efeonce.mcp.seo.write`), el permiso de
lectura de Hiring y el permiso de escritura de identidad (`efeonce.mcp.identity.write`, para invitar personas a la
propia organización) — cada permiso condicionado sólo se publica cuando su interruptor está encendido (detalle en
el ADR de plataforma MCP).

Los entitlements por organización/persona ya existen y el gateway multi-issuer está construido. Antes
de entregar acceso general a clientes, falta certificar su matriz real y demostrar una
identidad que reciba sólo el permiso base cuando no tiene Globe. Al cliente Entra interno actual se le entregan
hoy los dos primeros permisos —el base y el de lectura de Globe— incluso si pide sólo el base; por eso no
representa aún una prueba válida de segmentación comercial. El permiso de escritura tiene su propia autorización
aparte y no forma parte de lo comprobado en ese comportamiento.

### Por qué un permiso puede existir sin que Entra lo emita

Los seis permisos no salen todos del mismo emisor, y eso es deliberado. Entra es el carril **interno** —personas
del tenant corporativo—; Efeonce ID es el carril del **cliente externo**. Un permiso vive donde vive la clase de
actor que puede ejercerlo.

El caso concreto es el permiso de escritura de identidad (`efeonce.mcp.identity.write`): el gateway lo anuncia
entre los permisos que acepta, pero **no existe en la aplicación de recurso de Entra**. Verificado el 2026-09-06
contra el directorio real: esa aplicación define cinco permisos y ése no está entre ellos. No es un descuadre.
Lo emite Efeonce ID, porque su sujeto es una persona externa del cliente administrando a las personas de su
propia organización — algo que ninguna credencial del tenant corporativo debería poder hacer en nombre de un
cliente. El nombre del permiso es el mismo string en ambos lados a propósito, para que el gateway verifique uno
solo; pero sólo uno de los dos emisores puede acuñarlo.

**Qué NO hacer con esa asimetría.** Quien compare la lista de permisos anunciados contra Entra va a ver un hueco
y va a querer cerrarlo creando el permiso allí. Ese camino termina en una de dos: un permiso que ninguna
credencial interna debería portar, o —peor— cablearlo al cliente público compartido, que es la puerta que todo
el modelo evita. Ese cliente sigue teniendo exactamente **tres permisos, los tres de lectura**, y ninguno de
escritura; se verificó el mismo día. La forma correcta de cerrar el hueco es no cerrarlo.

> Detalle técnico: [ADR de plataforma MCP](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
> §Delta 2026-09-06 y §"El scope de escritura NO se cablea al cliente público compartido".

## Relación con otros MCP

Este gateway no reemplaza el MCP local/remoto de Greenhouse (que no es read-only: registra 7 escrituras). Ese MCP sirve al portal Greenhouse y sus
contratos ecosystem; Efeonce MCP Gateway sirve como borde federado para productos hermanos y capacidades futuras.

Los manuales son el mismo primitive en los dos bordes: el MCP de Greenhouse los sirve como tool y como recurso
`skill://efeonce/{name}/SKILL.md`, el gateway sólo como tool, y ambos leen la misma lane. Un guard del gateway
(`EXPECTED_GREENHOUSE_PLATFORM_TOOLS`) vigila que las tools de plataforma federadas —las que no son SEO— sigan
declaradas con razón, porque el guard de paridad SEO está anclado a ese dominio y no las veía.


## Autoridad nativa y límites del piloto

Compartir `auth.efeonce.org` no convierte clientes en empleados. El binding conserva población
`external | internal`; las tools evalúan población, scopes, capabilities y organización. Los internos requieren
un contexto ligado a cliente/organización y grants personales con vencimiento. `gv` pertenece al binding
seleccionado; refresh no amplía contexto ni rejuvenece autenticación. La revocación de familia se revalida
mediante `jti` antes del dispatch, sin esperar la expiración ni llamar a introspección.

El canary interno probó lectura propia, denegación de organización ajena, refresh y revocación. No certifica
clientes externos, todas las tools ni la matriz multicontexto. La sesión directa desde `/login` tampoco
conecta por sí sola una app. [Mapa de evidencia y pendientes](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md)
y [contrato interno](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).
