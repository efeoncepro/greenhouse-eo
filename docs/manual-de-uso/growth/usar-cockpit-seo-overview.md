> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.0
> **Creado:** 2026-08-06 por Claude (TASK-1306)
> **Documentacion funcional:** [modulo-seo-search-visibility-360.md](../../documentation/growth/modulo-seo-search-visibility-360.md)

# Usar el cockpit SEO (Search Visibility)

## Para que sirve

Revisar en una mirada la salud de busqueda organica de un Space: cuanto trafico trae,
como se mueve su posicion, que tan sano esta el sitio y donde hay oportunidad de cruce
con el AEO Grader. Es la pantalla desde la que decides **que atender hoy**.

## Antes de empezar

Necesitas las tres puertas abiertas:

1. **Rol con la vista habilitada** — hoy `efeonce_admin` o `ai_tooling_admin`.
2. **Permiso** `growth.seo.observation.read`.
3. **El Space con el modulo SEO contratado** (`module_assignment` de `seo_v1` vigente).
   Si falta, el Space no aparece en el selector. Como asignarlo:
   [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md).

Ademas, para que haya numeros el Space debe tener **Search Console conectado**
([conectar-search-console.md](conectar-search-console.md)) y la captura diaria corriendo.

## Paso a paso

1. Entra por **Growth → SEO** en el menu lateral.
2. Elige el Space en el selector de arriba a la derecha. La eleccion queda en la URL
   (`?space=...`), asi que **puedes compartir el enlace** y quien lo abra vera el mismo
   Space (si tiene acceso).
3. Mira el **chip de frescura**: te dice hasta que dia llegan los datos medidos. Si dice
   "sin fecha de corte disponible", todavia no se materializo ningun dia.
4. Lee los **4 KPIs**. Ojo con **Posicion promedio**: funciona al reves, menos es mejor.
   Una flecha hacia abajo en verde significa que mejoraste.
5. Revisa la **evolucion**. Si prefieres los numeros exactos, usa **Ver tabla de datos**.
6. En el panel derecho, mira **Salud del sitio** (puntaje de la ultima auditoria),
   **Movimientos de la semana** y el cruce **Rankean pero la IA no las cita**.

## Que significan las señales

| Lo que ves | Que significa | Que hacer |
|---|---|---|
| `Medido · GSC` | Dato real de tu sitio segun Google | Confiable para comprometer con el cliente |
| `Estimado · DataForSEO` | Estimacion de mercado | Usar como referencia, no como promesa |
| Flecha abajo **verde** en posicion | Mejoraste (de 8 a 3, por ejemplo) | Nada: es buena noticia |
| `Pendiente: ...` | Ese dato no se pudo leer, y dice por que | Revisar la causa indicada; el resto del panel sigue valido |
| `Sin movimientos relevantes` | Ninguna keyword se movio 5 posiciones o mas | Nada: es un resultado legitimo, no una falla |
| Sin flechas de variacion | No hay un periodo anterior con datos para comparar | Esperar a acumular historico |
| Pestañas en gris | Esa seccion todavia no existe | Estan en construccion (TASK-1307/1308/1309) |

## Que no hacer

- **No leas un `0` donde dice "Pendiente".** Son cosas distintas: cero es una medicion,
  Pendiente es la ausencia de una.
- **No promedies SEO con AEO.** Rankear primero y no ser citado por la IA es una señal
  valida, no una contradiccion a resolver en un numero.
- **No esperes que "Actualizar" traiga datos nuevos del proveedor.** Esta pantalla relee
  lo que ya se guardo; no dispara crawls ni gasta presupuesto.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---|---|---|
| La ruta da 404 | El modulo SEO esta apagado por flag en ese entorno | Revisar `GROWTH_SEO_ENABLED` en el ledger de flags |
| "No tienes acceso al modulo SEO" | Sin permiso o sin ningun Space con el modulo | Pedir el grant o asignar el modulo al Space |
| "Conecta Search Console" | El Space no tiene el OAuth hecho | Seguir el manual de conexion de Search Console |
| "Aun no hay datos historicos" | Conexion viva, pero la captura no escribio todavia | Esperar la corrida diaria o revisar el scheduler |
| El panel derecho dice "Pendiente" | Ese reader fallo o no tiene datos | Es degradacion honesta; revisar la razon que muestra |

## Referencias tecnicas

- Arquitectura: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- Flujo cross-surface: `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`
- Wireframe: `docs/ui/wireframes/TASK-1306-growth-seo-overview-cockpit-ui.md`
- Ruta: `src/app/(dashboard)/admin/growth/seo/page.tsx`
- Lectores: `src/lib/growth/seo/overview/**`
