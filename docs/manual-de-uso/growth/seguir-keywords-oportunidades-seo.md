> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.0
> **Creado:** 2026-08-07 por Claude (TASK-1308)
> **Ultima actualizacion:** 2026-08-07 por Claude (TASK-1308)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7 y §10.4

# Oportunidades de Keywords — Leer el mapa y seguir keywords

## Para que sirve

Responder **que keyword persigo primero** para un cliente, y poner las elegidas bajo seguimiento diario
de posicion. La pantalla vive en `Growth > SEO > Keywords` (`/admin/growth/seo/keywords`).

## Antes de empezar

| Requisito | Como se verifica |
|---|---|
| El Space tiene el modulo SEO asignado | Aparece en el selector de Space. Si no aparece, ver [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md) |
| Search Console conectado y con dias capturados | Si falta, la pantalla lo dice y ofrece el boton de conexion |
| Permiso para ver | Capability `growth.seo.observation.read` |
| Permiso para **seguir** | Capability `growth.seo.target.configure`. Sin ella la columna "Seguir" **no se renderiza** — es a proposito |

## Paso a paso

1. Entra a `Growth > SEO` y abre la tab **Keywords**.
2. Elige el Space en el selector de arriba. El `?space=` de la URL es compartible, pero si el Space no
   tiene el modulo vigente el portal cae al primero elegible — no es un atajo para saltarse el permiso.
3. Elige la **ventana** (28 o 90 dias). Define sobre que periodo se pondero la posicion.
4. Lee el mapa: **izquierda = mas cerca de la primera plana**, **arriba = mas gente lo busca**,
   **burbuja mas grande = mas clics ganarias**.
5. Filtra por accion o por posicion si necesitas acotar. Los filtros son locales: no recargan la pagina.
6. En la tabla, revisa la keyword, su pagina actual y la ganancia estimada.
7. Pulsa **Seguir** en las que quieras medir a diario. El resultado se anuncia arriba.

## Que significan las señales

| Señal | Significado |
|---|---|
| **Empujar (fruta madura)** | Posicion 10 o mejor. Ya estas en primera plana; subir dentro de ella es lo mas barato |
| **Empujar (a un paso)** | Posicion 11 a 20. Segunda plana; el salto a primera es el de mayor retorno |
| **Consolidar** | Mas de una pagina tuya compite por esa busqueda. **No se optimiza: se consolida.** Es otro trabajo |
| `● Medido · Search Console` | Encendido: todo lo que ves salio de la medicion real del sitio |
| `◑ Estimado · mercado` | Apagado: el enriquecimiento externo aun no esta habilitado en este Space |
| "Sin dato de mercado" | El volumen o la dificultad no existen todavia. **No es 0** — nadie midio eso |
| "+N clics/mes est." | Clics adicionales si llegara a la posicion objetivo, segun la curva de CTR **del propio sitio** |
| "X de 200 keywords seguidas" | El cupo del set monitoreado. Cada keyword vigente se cobra en cada ciclo diario |
| **Siguiendo** | Ya esta en el set. Su posicion se mide todos los dias |

## Que NO hacer

- **No sigas keywords "por si acaso".** Cada una entra al ciclo diario de captura y se le paga al
  proveedor por consulta, todos los dias, hasta que alguien la deje de seguir. El costo no es del clic:
  es recurrente.
- **No trates una keyword canibalizada como una oportunidad mas.** Empujarla es empujar dos paginas tuyas
  a competir mas fuerte entre si. Primero se consolida.
- **No leas las columnas de volumen/dificultad como "0 busquedas".** Dicen "Sin dato de mercado" porque no
  hay dato, no porque el dato sea cero.
- **No pidas que el mapa use volumen de mercado en el eje.** Es una decision de metodo, no una limitacion:
  la demanda de Search Console es del propio cliente y es mejor insumo que un promedio de mercado.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| No aparece la columna "Seguir" | Te falta `growth.seo.target.configure` | Pidele a un admin la capability. No es un bug |
| "Todavia no hay oportunidades" | Ninguna keyword esta hoy entre 8 y 20 con demanda suficiente | Es un estado valido. Revisa mas adelante |
| "Falta conectar Search Console" | El Space no tiene la propiedad conectada | [conectar-search-console.md](conectar-search-console.md) |
| El boton "Seguir" esta deshabilitado en todas | El set llego a su tope | Deja de seguir alguna antes de agregar otra (por ahora, via soporte: el command de dejar de seguir es follow-up) |
| "No se pudo seguir: el set llego a su tope" | El techo se evaluo al momento del clic | Lo mismo. El rechazo es explicito a proposito |
| La keyword seguida no aparece en Rendimiento | La primera medicion aun no corrio | El cron de captura corre a las 05:00 CLT. Vuelve al dia siguiente |

## Operar el techo del set

El tope por sitio se controla con la variable `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` (default **200**).
Es un freno de gasto, no una preferencia: subirlo multiplica el costo diario del proveedor por cada
keyword agregada. Subirlo requiere revisar el budget del tier de la organizacion
(`resolveSeoEntitlement`) antes, no despues.

## Referencias tecnicas

- Command: `src/lib/growth/seo/track-keywords.ts` (techo, entitlement, idempotencia, outbox)
- Reader: `src/lib/growth/seo/keyword-opportunities-reader.ts` (striking-distance medido)
- Contrato programatico: `POST /api/admin/growth/seo/keywords/track` · lane ecosystem
  `POST /api/platform/ecosystem/growth/seo/keywords/track` · MCP tool `track_seo_keywords`
- Evento: `growth.seo.keyword_set.updated` ([catalogo](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md))
