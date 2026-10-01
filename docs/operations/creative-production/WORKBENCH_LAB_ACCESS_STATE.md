# Workbench Lab — acceso publicado vigente

Verificado: 2026-10-01 14:05 UTC. Alcance: proyecto SKY `creative-workbench-sky`, Production,
team `efeonce-7670142f`, ID `prj_7D9AODtfOOEf1su21wqyQASOdzOc`.

## Acceso actual

[Creative Workbench SKY](https://creative-workbench-sky.vercel.app/#adaptaciones) abre sin login.
El operador pidió explícitamente retirar la protección para compartirlo con su equipo. Se actualizó
únicamente `ssoProtection: null` mediante PATCH `/v9/projects/{idOrName}`; una segunda lectura
confirmó el cambio. Password Protection y Trusted IPs no estaban configurados. El sitio es accesible
a cualquiera que tenga el enlace; no se implementa una autorización exclusiva para integrantes.

## Deployment observado

El alias ya apuntaba a `dpl_BSyxXyo65X5h2xb4dSAV56h7j5HT` READY/production antes de este cambio,
URL `creative-workbench-g9azpky2j-efeonce-7670142f.vercel.app`. Metadata del proveedor:
source/main `e17c07d8a49879acbf721b7ae52572bd6702ea45`, brand `sky-airline`, build
`35e7e653e2c64a77f566f813a95d3dbcecb270eaa96cd3e3f89e50e5c112c8df`.
Main remoto se cotejó con ese SHA. Se conservó el deployment existente: no hubo build,
redeploy, cambio de alias ni rollback en esta operación. No transferir automáticamente
los 29 cotejos/tests del deployment v6 anterior a esta publicación más reciente.

## Verificación sin credenciales

Raíz, `/tokens/`, `/tipografia/`, `/recursos/`, `/lab-guide/` y `/manifest.json` responden HTTP 200,
sin redirección, cookies, Authorization ni bypass. El navegador muestra el Lab en el alias y
se dejó abierto en Adaptaciones. JSON de proyecto/deployment, seis SHA/HTTP y captura están en
`/Users/jreye/Documents/creative/creative-workbench-canon/operations/2026-10-01-workbench-public-access/`.
Sólo metadata permitida: ningún token/bypass se conserva ni publica.

Los readbacks anteriores de protección `all`/HTTP 302 son historia de la publicación original.
Este cambio de acceso no aprueba ofertas/campañas ni activa IA, Efeonce ID, paquetes o licencias.
El repositorio GitHub y el broker conservan sus propios permisos. Dominio institucional:
`creative.efeonce.org` sigue pendiente de su readback independiente.

## Mantenimiento y reversión

Verificar proyecto, alias y configuración efectivos antes de otra operación. Si el operador solicita
volver al estado previo, restaurar `ssoProtection: {deploymentType: "all"}` en este mismo proyecto
y comprobar de nuevo el acceso anónimo. Ningún readback fechado autoriza otra ampliación de acceso.
Referencia de API: [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
