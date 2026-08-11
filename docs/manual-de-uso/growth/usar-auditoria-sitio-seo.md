> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.2
> **Creado:** 2026-08-08 por Claude (TASK-1309)
> **Ultima actualizacion:** 2026-08-10 por Claude (TASK-1388 — Growth vive como seccion del dominio Comercial)
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
| Acceso al modulo SEO | Ves `Comercial > Growth > SEO` en la zona Operacion del menu. Si no, pidele a un administrador que habilite el modulo para tu usuario. |
| Que el Space tenga el modulo SEO asignado | El selector **Space** de la pantalla lista solo los Spaces habilitados. Si el tuyo no aparece, ver [Asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md). |
| Que el Space tenga un sitio configurado | Si no lo tiene, la pantalla te lo dice con esas palabras en vez de mostrarte una auditoria vacia. |
| Permiso para **correr** auditorias | Es un permiso aparte del de ver. Si no lo tienes, ves el diagnostico completo pero no el boton "Correr auditoria". Es a proposito: correr una auditoria le cuesta dinero a la empresa. |

## Paso a paso

1. Entra a **Comercial > Growth > SEO** (zona Operacion del menu lateral) y elige la pestaña **Auditoria**.
2. Arriba a la derecha, elige el **Space** del cliente. La pantalla recuerda tu eleccion al moverte
   entre las pestañas del modulo.
3. Mira primero **el "Ultimo crawl"**, en la cabecera. Todo lo que sigue vale lo que valga esa fecha.
4. Lee la **salud**: el número grande de 0 a 100, la línea que explica **qué mide ese puntaje**, y el
   **movimiento contra el crawl anterior** ("+2,4 desde el crawl del 3 de agosto"). Si es el primer
   crawl la pantalla te lo dice en vez de dejar el espacio en blanco.
5. Mira la **banda de gravedades** (Críticos · Atención · Menores): el ancho de cada tramo es su peso
   real dentro del total. Al lado, **Páginas revisadas**. Si ahí dice **"Tope del crawl"**, para: lo
   que sigue describe una muestra, no el sitio entero (ver "Que significa cada señal").
6. Baja a **Issues priorizados**. La lista **ya viene en el orden en que conviene atacarlos** — no la
   reordenes mentalmente por volumen: primero esta todo lo critico, y dentro de cada nivel primero lo
   que toca más páginas, mueve más la aguja en búsqueda y cuesta menos resolver.
7. Si quieres concentrarte en un nivel, **aprieta un tramo de la banda** y la lista se acota a esa
   gravedad. Las cifras de arriba **no cambian**: siguen contando todo el crawl. Para volver, aprieta
   **Ver todos**.
8. Para ver que paginas concretas tiene un problema, aprieta **Ver**. Se abre debajo de esa misma fila
   con la lista de URLs. Aprieta **Cerrar** (o el boton "atras" del navegador) para volver.
9. Si vas a llevarte ese grupo a una propuesta o a un correo, aprieta **Copiar** dentro del grupo
   abierto: copia **todas** las URLs, también las que la tabla no alcanza a mostrar en pantalla. Pega
   como texto en un documento y como columnas en una planilla.
10. Si el diagnostico esta viejo o quieres uno nuevo, aprieta **Correr auditoria**. El crawl corre en
    segundo plano; la pantalla pasa a decir "Auditoria en curso" y se actualiza cuando termina.

**Tip:** la dirección de la pantalla se puede compartir tal cual, con el grupo abierto y con el filtro
de gravedad puesto. Le llega a la otra persona exactamente como la estás viendo.

## Que significa cada señal

### La salud

| Lo que ves | Que significa |
|---|---|
| Numero verde (80–100) | Sitio tecnicamente sano. |
| Numero ambar (50–79) | Hay deuda tecnica que vale la pena mirar. |
| Numero rojo (0–49) | Problemas serios. |
| **"Pendiente"** | El crawl **no calculo** el puntaje. **No es un cero.** No lo reportes como "salud 0". |
| "+2,4 desde el crawl del 3 de agosto" | Cuánto se movió la salud desde el crawl anterior. Sólo se compara contra crawls **terminados**: si el anterior falló o quedó a medias, no hay comparación. |
| "Primer crawl: todavía no hay con qué comparar" | No es un error ni un cero: es la primera medición de este sitio. |

**"95 de salud" con "519 issues" NO es una contradicción.** Es la pregunta que hace todo el mundo la
primera vez, y la vas a recibir de un cliente. Las dos cifras son verdaderas y miden cosas distintas:

- **El puntaje lo calcula el proveedor** con su propia ponderación, sobre sus ~65 verificaciones, y
  pesa sobre todo lo que **rompe la indexación**.
- **El conteo de issues sale de nuestro catálogo curado** de 34 verificaciones.

Un sitio sin problemas críticos puede acumular cientos de issues menores y seguir puntuando alto. La
pantalla lo explica debajo del puntaje y el texto cambia según haya críticos o no. Si te lo preguntan,
responde eso — no "el sistema se equivocó".

### Páginas revisadas, y cuándo dice "Tope del crawl"

El crawl revisa **hasta 100 páginas**. Cuando el conteo llega justo a ese número, casi nunca significa
que el sitio tenga 100 páginas: significa que el crawl **chocó su límite**.

Cuando eso pasa, la pantalla lo marca como **"Tope del crawl"** y explica que la salud describe **esa
muestra** y no el sitio completo. En Grupo Berel el crawl devolvió exactamente 100. Si ese sitio
tuviera 3.000 páginas, estarías mirando el diagnóstico del 3% del sitio con el título "Salud del
sitio: 95".

**Qué hacer:** si ves "Tope del crawl", no reportes la salud como la del sitio. Di "la salud de las
primeras 100 páginas revisadas". Es la diferencia entre una muestra y un censo.

### Los checks de velocidad son de laboratorio

"Tiempo de carga alto", "Página muy pesada", "Recursos que bloquean el dibujado" y "Sin compresión de
contenido" se miden en un banco de pruebas. **Google no rankea con eso**: rankea con datos de visitas
reales, que llegan por Search Console.

Las cuatro fichas lo dicen en su descripción. **No prometas mejoras de posición a partir de estos
números** — arreglarlos es bueno para quien visita el sitio, pero la métrica que mueve el ranking es
otra y se mide en otra parte.

### La banda de gravedades y el filtro

El ancho de cada tramo **es** su peso dentro del total, para que el reparto se vea sin leer los
números. Al apretar un tramo, la lista se acota a esa gravedad.

- Un tramo con **0 issues no se puede apretar**: no tiene sentido filtrar hacia una lista vacía.
- **Filtrar acota lo que se lista, nunca lo que se cuenta.** Las cifras de arriba siguen siendo las del
  crawl completo — si también bajaran, filtrar parecería que el sitio mejoró.

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

### Por qué la lista queda en ese orden

Primero **la gravedad**, como corte absoluto: todo lo crítico va arriba, sin importar a cuántas
páginas toque. Recién dentro de cada nivel compiten tres cosas:

| Eje | Qué aporta |
|---|---|
| Cuántas páginas toca | Distingue un problema aislado de uno que atraviesa el sitio. |
| Cuánto mueve la aguja en búsqueda | Distingue higiene cosmética de una señal real. **Es lo que la gravedad no dice:** la gravedad mide qué tan roto está algo, esto mide cuánto importa arreglarlo. |
| Cuánto cuesta resolverlo | Evita recomendar primero lo más caro de arreglar. |

Sin el eje del medio, lo ancho ganaba sólo por ancho. En Grupo Berel el primer aviso menor era "Sin
favicon · 91 páginas" por encima de "Imágenes sin texto alternativo · 50 páginas" — y un favicon
afecta cómo se ve la marca en el resultado, mientras que un texto alternativo ausente afecta la
búsqueda de imágenes y la accesibilidad.

Lo de bajo valor **se hunde pero se sigue listando**. Nada se esconde: un issue de higiene sigue
siendo un issue.

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
  importar mas que un aviso en noventa. Y dentro de un mismo nivel, lo que toca más páginas no es
  automáticamente lo que más conviene arreglar — por eso el orden mira también el valor de búsqueda.
- **No reportes la salud como la del sitio completo cuando dice "Tope del crawl".** Es la salud de la
  muestra que alcanzó a revisar. Decirlo cuesta una frase; no decirlo es afirmar algo que no medimos.
- **No prometas mejoras de posición a partir de los checks de velocidad.** Son medición de
  laboratorio; el ranking se mueve con datos de campo que están en Search Console, no acá.
- **No expliques "95 de salud con 519 issues" como un error del sistema.** Son dos mediciones con
  alcances distintos, y la pantalla lo dice debajo del puntaje. Léelo antes de responder.
- **No declares un sitio "listo para la IA" con esta pantalla.** La auditoría todavía **no revisa** si
  el `robots.txt` bloquea a los rastreadores de IA, si falta el marcado de datos estructurados, si hay
  conflicto entre `noindex` y el bloqueo de robots, ni la salud del mapa del sitio. Un sitio que le
  cierra la puerta a los rastreadores de IA puede puntuar 95 acá y estar fuera de las respuestas de
  ChatGPT o Perplexity. Lo cierra TASK-1670; hasta entonces, esa verificación se hace aparte.

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
| No puedo apretar un tramo de la banda | Ese nivel tiene 0 issues | No es una falla: filtrar hacia ahí daría una lista vacía |
| Filtré por gravedad y los números de arriba no bajaron | Es a propósito | El filtro acota **la lista**, no el conteo. Si bajaran, filtrar parecería que el sitio mejoró |
| "Copiar" no hizo nada | El navegador bloqueó el portapapeles (permiso o conexión no segura) | La pantalla te lo dice; selecciona el texto a mano |
| No veo el movimiento contra el crawl anterior | Es el primer crawl del sitio, o el anterior falló o quedó a medias | La pantalla lo declara. Sólo se compara contra crawls terminados |
| "Páginas revisadas" dice justo 100 y marca "Tope del crawl" | El crawl chocó su límite de 100 páginas | Normal en sitios grandes. Reporta la salud como la de la muestra, no la del sitio |

## Referencias tecnicas

- Arquitectura: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §6 (crawl asincrono y
  degradacion honesta), §7 (`readSiteAuditReport`, `queueSiteAudit`), §9 (entitlements y cupos) y
  **§10.6** (los contratos de esta pantalla, incluidas las tres aclaraciones de honestidad y la
  cobertura que todavía falta).
- Codigo: `src/views/greenhouse/admin/growth/seo/audit/`,
  `src/app/(dashboard)/admin/growth/seo/audit/page.tsx`,
  `src/app/api/admin/growth/seo/audit/run/route.ts`.
- El orden de la lista (gravedad ▸ páginas × valor ÷ esfuerzo) vive con su test en
  `src/views/greenhouse/admin/growth/seo/audit/group-audit-issues.ts`.
- Catalogo de checks y su gravedad: `src/lib/growth/seo/site-audit/findings-map.ts`. Sus nombres en
  español, el esfuerzo estimado y el valor de búsqueda: `GH_GROWTH_SEO_AUDIT_ISSUES` en
  `src/lib/copy/growth.ts`. El techo de páginas del crawl: `SITE_AUDIT_MAX_CRAWL_PAGES` en
  `src/lib/growth/seo/site-audit/queue-audit.ts`.
- Lo que la auditoría todavía no revisa (rastreadores de IA, datos estructurados, sitemap):
  `docs/tasks/to-do/TASK-1670-growth-site-probes-kernel-seo-audit.md`.
- Pantallas hermanas: [cockpit Overview](usar-cockpit-seo-overview.md) ·
  [Rendimiento](usar-pantalla-rendimiento-seo.md) ·
  [Oportunidades de keywords](seguir-keywords-oportunidades-seo.md).
