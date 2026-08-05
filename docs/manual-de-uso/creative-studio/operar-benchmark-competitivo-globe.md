# Operar el benchmark competitivo de Globe

> **Tipo:** manual de uso / runbook de revalidación
> **Versión:** 1.0
> **Fecha:** 2026-08-05
> **Documento funcional:** [benchmark competitivo de Efeonce Globe](../../documentation/creative-studio/efeonce-globe-competitive-benchmark.md)
> **Documento detallado:** [benchmark comparativo Globe frente a Higgsfield y Magnific](../../audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md)

## Para qué sirve

Este runbook explica cómo usar el benchmark para decidir si una mejora de Globe cierra un gap real. No es un
runbook para generar assets en los competidores ni autoriza gasto, uploads, descargas o acciones sobre una cuenta
autenticada.

## Antes de usarlo

- Comprueba la fecha de corte y el commit de Globe registrados en el benchmark.
- Lee el Handoff activo y la task antes de asumir que una acción sigue pendiente.
- Trata las capturas como evidencia de una sesión fechada, no como contrato del proveedor.
- No compares créditos nominales entre productos.
- No conviertas un claim comercial en evidencia de calidad, volumen, derechos o legalidad.

## Cómo revalidar una brecha

1. Identifica la operación: crear imagen, crear video, crear audio, revisar, reutilizar, organizar o compartir.
2. Revisa la evidencia del competidor en el source log y confirma si se observó en card, composer, viewer o
   biblioteca.
3. Verifica la ruta equivalente en Globe: capability, routeId, creativeContract, input requirements, estimate,
   asset state y rights.
4. Comprueba la superficie React activa. Un command o reader existente no prueba que el botón lo dispare.
5. Clasifica el resultado:
   - cerrado: acción visible, contrato real, estado de éxito/error y evidencia browser;
   - parcial: contrato o UI existe, pero el loop no termina;
   - pendiente: falta contrato, capability, consumer o evidencia;
   - no comparable: la operación del competidor no tiene equivalente válido en Globe.
6. Registra la fecha, commit, ruta, captura y criterio de aceptación antes de abrir o actualizar una task.

## Revalidación de home con Playwright

Para actualizar únicamente la evidencia de home:

1. Conecta el controlador al Chrome existente y enumera las pestañas abiertas. No uses `about:blank` de un
   contexto aislado, no crees un perfil nuevo y no transfieras cookies o credenciales.
2. Toma control de las pestañas ya abiertas de Higgsfield y Magnific mediante su título/URL exactos. Registra la
   pestaña original y la URL final; la señal de autenticación debe ser visible en la UI, no inferida.
3. Navega esas mismas pestañas a `https://higgsfield.ai/` y `https://www.magnific.com/`. En Magnific verifica si
   la navegación redirige a `/app`; captura el workspace autenticado, no sólo la landing pública.
4. Guarda snapshots accesibles, capturas desktop y, cuando cambie el layout, 390 px en una carpeta fechada bajo
   `docs/audits/competitive-ui/evidence/`.
5. Separa en el benchmark la home autenticada —navegación, jerarquía, rails, proyectos, modalidades, assets,
   responsive y CTAs— de la landing pública y de la evidencia del editor, composer, viewer y audio.

## Criterios de decisión

Adopta un patrón cuando reduce fricción sin debilitar governance. Adáptalo cuando el patrón dependa de una
semántica real de Globe. Descártalo cuando requiera exponer provider slugs, ocultar coste, duplicar commands o
mostrar un control sin efecto.

Para una implementación que toque contrato compartido, proyección, rights o lineage, detén la ejecución y
aplica el ADR gate de Greenhouse antes de marcar el gap como cerrado.

## Qué evidencia debe quedar

- captura desktop y, cuando cambie layout, 390 px;
- recorrido de teclado y reduced motion cuando la superficie sea UI;
- routeId/model identity público y capability, sin secretos ni slugs internos;
- estimate/prepare/execute sólo en un entorno y con presupuesto autorizado;
- estado antes y después de Reference/Recreate/Favorite/Download;
- evidencia de que no se creó un job cuando la operación debía ser zero-spend;
- resultado de docs:closure-check y validaciones proporcionales de la task.

## Cierre

El benchmark se considera vigente hasta que cambie materialmente el código de Globe, la superficie autenticada
de los competidores o el alcance del producto. En ese caso, crea un refresh fechado; no edites el hallazgo
histórico para borrar su contexto.
