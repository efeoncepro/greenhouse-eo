> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.0
> **Creado:** 2026-08-08 por Claude (TASK-1309)
> **Ultima actualizacion:** 2026-08-08 por Claude (TASK-1309)
> **Documentacion funcional:** [Modulo SEO — Search Visibility 360](../../documentation/growth/modulo-seo-search-visibility-360.md)

# Auditoria del sitio — leer la salud tecnica y priorizar

## Para que sirve

Para responder dos preguntas sobre el sitio de un cliente antes de proponerle trabajo:

1. **¿Que tan sano esta tecnicamente?**
2. **¿Que conviene arreglar primero?**

No sirve para arreglar los problemas (es un diagnostico, no un editor), ni para configurar como se
rastrea el sitio.

## Antes de empezar

| Necesitas | Como saber si lo tienes |
|---|---|
| Acceso al modulo SEO | Ves `Growth > SEO` en el menu. Si no, pidele a un administrador que habilite el modulo para tu usuario. |
| Que el Space tenga el modulo SEO asignado | El selector **Space** de la pantalla lista solo los Spaces habilitados. Si el tuyo no aparece, ver [Asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md). |
| Que el Space tenga un sitio configurado | Si no lo tiene, la pantalla te lo dice con esas palabras en vez de mostrarte una auditoria vacia. |
| Permiso para **correr** auditorias | Es un permiso aparte del de ver. Si no lo tienes, ves el diagnostico completo pero no el boton "Correr auditoria". Es a proposito: correr una auditoria le cuesta dinero a la empresa. |

## Paso a paso

1. Entra a **Growth > SEO** y elige la pestaña **Auditoria**.
2. Arriba a la derecha, elige el **Space** del cliente. La pantalla recuerda tu eleccion al moverte
   entre las pestañas del modulo.
3. Mira primero **el "Ultimo crawl"**, en la cabecera. Todo lo que sigue vale lo que valga esa fecha.
4. Lee la **salud**: el numero grande de 0 a 100 y, al lado, cuantos problemas hay de cada gravedad y
   cuantas paginas se revisaron.
5. Baja a **Issues priorizados**. La lista **ya viene en el orden en que conviene atacarlos** — no la
   reordenes mentalmente por volumen: primero esta todo lo critico, y dentro de cada nivel primero lo
   que toca mas paginas y cuesta menos resolver.
6. Para ver que paginas concretas tiene un problema, aprieta **Ver**. Se abre debajo de esa misma fila
   con la lista de URLs. Aprieta **Cerrar** (o el boton "atras" del navegador) para volver.
7. Si el diagnostico esta viejo o quieres uno nuevo, aprieta **Correr auditoria**. El crawl corre en
   segundo plano; la pantalla pasa a decir "Auditoria en curso" y se actualiza cuando termina.

**Tip:** la direccion de la pantalla con un grupo abierto se puede compartir tal cual. Le llega a la
otra persona con ese mismo grupo desplegado.

## Que significa cada señal

### La salud

| Lo que ves | Que significa |
|---|---|
| Numero verde (80–100) | Sitio tecnicamente sano. |
| Numero ambar (50–79) | Hay deuda tecnica que vale la pena mirar. |
| Numero rojo (0–49) | Problemas serios. |
| **"Pendiente"** | El crawl **no calculo** el puntaje. **No es un cero.** No lo reportes como "salud 0". |

### La gravedad de cada issue

Siempre viene con icono **y palabra**, nunca solo con color.

| Etiqueta | Que significa |
|---|---|
| **Critico** | Rompe la indexacion o la disponibilidad. Se ataca primero, sin importar cuantas paginas toque. |
| **Atencion** | Degrada el rendimiento en busqueda sin romperlo. |
| **Info** | Higiene. Suma, pero no es urgente. |

### El esfuerzo

**Rapido / Medio / Alto** es una **estimacion nuestra**, no un dato del crawl. Sirve para ordenar, no
para cotizar. Si se lo pasas a un cliente, dilo con esas palabras.

### Los estados del crawl

| Lo que ves | Que paso | Que hacer |
|---|---|---|
| Sin auditoria reciente | Nunca se corrio un crawl para este sitio | Correr auditoria |
| Auditoria en curso | El crawl esta corriendo ahora | Esperar; puede tardar minutos |
| Sin issues detectados | El crawl termino y **no encontro problemas** | Nada. Es buena noticia, no un error |
| El crawl termino parcialmente | Se reviso solo una parte del sitio | Lo que ves es real pero incompleto. No lo presentes como el sitio entero |
| La auditoria fallo | El crawl no se pudo completar | Reintentar |
| No pudimos cargar la auditoria | Fallo la lectura, no el crawl | Reintentar; si persiste, es un problema de plataforma |

## Que no hacer

- **No reportes "Pendiente" como salud 0.** Son cosas distintas y llevan a conclusiones opuestas.
- **No presentes un crawl parcial como el diagnostico del sitio completo.** El aviso esta ahi por algo.
- **No leas "Sin issues detectados" como un fallo.** Significa que el crawl reviso y no encontro nada
  de lo que buscamos.
- **No aprietes "Correr auditoria" repetidamente.** Cada crawl le cuesta dinero a la empresa. Si ya hay
  uno corriendo o ya se corrio hoy para ese sitio, el sistema te lo va a decir en vez de gastar dos
  veces — pero el habito correcto es mirar la fecha del ultimo crawl primero.
- **No uses el numero de paginas afectadas como unico criterio.** Un critico en una sola pagina puede
  importar mas que un aviso en noventa.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---|---|---|
| No veo la pestaña Auditoria | El modulo SEO esta apagado en ese ambiente | Es una condicion de plataforma; consulta con quien administre el modulo |
| El selector de Space esta vacio | Ningun Space que puedas ver tiene el modulo SEO | [Asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md) |
| Dice "Este Space no tiene un sitio configurado" | Existe el Space y el modulo, pero falta crear el sitio a auditar | Pidele a quien administre el modulo que configure el target |
| No veo el boton "Correr auditoria" | No tienes el permiso de correr (distinto del de ver) | Pidelo a un administrador |
| "Ya hay una auditoria corriendo" | Hay un crawl en vuelo para ese sitio | Esperar a que termine |
| "Ya corrimos una auditoria hoy" | Freno anti gasto duplicado | Esperar al dia siguiente, o usar el diagnostico existente |
| "Este Space agoto su cupo / presupuesto del mes" | Se acabo el cupo del tier comercial | Es una decision comercial; hablalo con quien administre el entitlement |
| Un issue aparece como "Check sin catalogar" | El proveedor sumo una verificacion nueva que todavia no tiene ficha en español | El problema es real y cuenta igual. Reportalo para que se le escriba la ficha |

## Referencias tecnicas

- Arquitectura: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §6 (crawl asincrono y
  degradacion honesta), §7 (`readSiteAuditReport`, `queueSiteAudit`), §9 (entitlements y cupos).
- Codigo: `src/views/greenhouse/admin/growth/seo/audit/`,
  `src/app/(dashboard)/admin/growth/seo/audit/page.tsx`,
  `src/app/api/admin/growth/seo/audit/run/route.ts`.
- Catalogo de checks y su gravedad: `src/lib/growth/seo/site-audit/findings-map.ts`.
  Sus nombres en español y el esfuerzo estimado: `GH_GROWTH_SEO_AUDIT_ISSUES` en `src/lib/copy/growth.ts`.
- Pantallas hermanas: [cockpit Overview](usar-cockpit-seo-overview.md) ·
  [Rendimiento](usar-pantalla-rendimiento-seo.md) ·
  [Oportunidades de keywords](seguir-keywords-oportunidades-seo.md).
