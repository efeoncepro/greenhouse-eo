# Operar la primera experiencia local de Rooms

Fecha: 2026-10-25. Owners: Platform/Product. [Dossier](../../architecture/rooms/README.md) · [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md).

## Arranque

Runtime en `/Users/jreye/Documents/efeonce-rooms`, rama `main`. La documentación sigue en Greenhouse. Node24.x y pnpm12.15.0; paquetes privados AXIS se instalan desde GitHub Packages con el acceso existente. No copiar `.npmrc`, tokens o credenciales al repo ni al navegador. Usar la [política privada AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

```sh
cd /Users/jreye/Documents/efeonce-rooms
pnpm install --frozen-lockfile
pnpm brand:sync
pnpm dev
```

`brand:sync` copia cuatro SVG oficiales exactos desde el paquete instalado a `public/brand` y genera checksums; esa carpeta es derivada e ignorada. Para comprobar el build de producción, detener el dev de este producto, ejecutar `pnpm verify` y después `pnpm start`. Ambos sirven sólo loopback3210. No detener otros productos.

La primera instalación resolvió379 paquetes con peers estrictos. En esta máquina el bootstrap gestionado de pnpm12 tenía un wrapper sin shebang; ejecutar el instalador oficial del paquete ya descargado reparó el enlace al binario nativo. No se debilitó el gate ni se cambió el package manager de Greenhouse.

## Recorrido

1. Abrir `http://127.0.0.1:3210/demo`. El aviso de demostración permanece visible.
2. «Explorar propuesta» enfoca los capítulos. «Abrir pieza» muestra el archivo íntegro; Escape vuelve al disparador.
3. «Contenido SEO/AEO» contiene el artículo. «Ver radiografía» abre origen, método, cobertura y límites de la evidencia de ejemplo. No hay resultados comerciales medidos.
4. «Operador» abre `/demo/workspace?persona=operator`: salas autorizadas, notas internas y capacidades efectivas.
5. «Administrador» añade la consulta de accesos. Los comandos de publicación/edición/gestión todavía no están implementados y no aparentan funcionar.
6. `/demo/workspace?persona=client` muestra acceso restringido sin datos internos. El selector usa exclusivamente personajes sintéticos; no crea una sesión real.

## API y CLI

```sh
pnpm rooms room --demo --persona client
pnpm rooms workspace --demo --persona operator
pnpm rooms permissions --demo --persona administrator
pnpm rooms operations --demo
```

La CLI usa HTTP contra loopback3210 por defecto. `--base-url` admite un host explícito sin usuario/contraseña/query/hash. `--demo` es obligatorio. Los GET `/api/demo/room`, `/api/demo/workspace`, `/api/demo/permissions` comparten readers y devuelven `private, no-store`; un cliente recibe403 en workspace. Persona desconocida devuelve400; POST no existe. `/api/demo/operations` anuncia únicamente los tres readers implementados, y declara MCP desconectado y mutaciones pendientes.

`/api/v1/rooms/:roomId` devuelve401 hasta integrar un principal validado. Headers, cookies o query de rol/organización no cambian esa respuesta. No usar los readers demo como fallback de autenticación.

## Verificar

- `pnpm verify`: ESLint sin warnings, tres casos negativos, tipos Next+TS7, tests de dominio y build optimizado.
- `ROOMS_EXTERNAL_SERVER=1 pnpm test:e2e`: tests sobre el servidor3210 ya iniciado.
- GVC desde Greenhouse: `AGENT_AUTH_BASE_URL=http://127.0.0.1:3210 pnpm fe:capture rooms-first-experience --env=local`; escenario anónimo, sólo contenido sintético.
- Evidencia y límites: [auditoría de entrega](../../audits/rooms/2026-10-25-first-local-delivery.md).

## Límites y continuidad

Primera entrega local para revisión. Efeonce ID/invitaciones, persistencia, upload, publicación durable, auditoría/outbox, MCP, CI/hosting y piloto con clientes pertenecen al alcance restante de EPIC-052. No activar la demo como una sala privada productiva. Rollback: revert de archivos propios, sin migración ni estado externo que revertir.
