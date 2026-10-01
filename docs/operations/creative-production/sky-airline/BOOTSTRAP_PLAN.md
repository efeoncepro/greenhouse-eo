# SKY Airline — primer onboarding del harness multimarcas

> Estado vigente: [continuidad operativa](../WORKBENCH_CURRENT_STATE.md), corte 2026-10-01.
> El sistema activo vive en `creative-workbench/brands/sky-airline`: 126 referencias Figma revisadas,
> producción modular y Lab integrados. Paquetes 0.1 publicados; contratos0.2 sin publicar.
> Lo siguiente conserva el bootstrap/evidencia de 2026-09-29; sus rutas y pendientes no son instrucciones
> actuales ni autorizan sync total, IAM, lectura de llaves por el equipo o distribución de Metric.

Estado: foundation y tres paquetes candidatos verificados localmente; distribución y despliegue pendientes.
Fecha: 2026-09-29. Operador: Julio Reyes. Identidad canónica: `sky-airline`.

El harness pertenece al equipo Efeonce y sirve a múltiples marcas y personas. SKY es el primer
onboarding, no una plataforma independiente de producción. Alcance común y concurrencia:
[plan multimarcas](../CREATIVE_WORKBENCH_MULTIBRAND_PLAN.md).

## Evidencia

Figma: https://www.figma.com/design/ZhnJUPqzvYqy7nTcLLKLr1/Lineamientos-Brandlift-EFEONCE?node-id=0-1
La extracción `figma-observed-variables.json` conserva respuestas originales por nodo. Es observación,
no aprobación ni inventario exhaustivo; no tiene una revisión inmutable del archivo Figma.

Nodos iniciales: Tag `2001:1078`, Always On cuadrado `2026:2630` (1080×1080),
Always On 4:5 `2026:2649` (1080×1350), vertical `2026:2611` (1080×1920).
Precio `2001:326`, Destino `2001:624`, Condiciones `2001:375`, Logo SKY `2001:1129`.
La receta cuadrada fue inspeccionada mediante contexto de diseño y screenshot.

Brechas verificadas en código: `scripts/foto/build-prompt.mjs` importa `efeonceGraphicLine`;
`scripts/creative/layout-compiler/compiler.mjs` consume `axisAdvertising`;
`scripts/creative-workbench/template/gates/piezas.mjs` comprueba carpeta/cliente/destino, no identidad
de dependencias; `template/tools/doctor.mjs` comprueba Guttery de forma global.

## Decisión formalizada

Gobernanza e inventario en Greenhouse. Workbench consume releases, sin editar archivos sellados.
Sistema SKY preparado localmente en `/Users/jreye/Documents/sky-brand-system`; repo privado remoto previsto `efeoncepro/sky-brand-system`, con paquetes privados
`@efeoncepro/sky-tokens`, `sky-brand-assets` y `sky-creative-contracts` y una referencia web separada.
No reutilizar contratos visuales de Efeonce como defaults. Sólo compartir mecanismos técnicos auditados.
La página de referencia usa datos autorizados para exposición; Figma y recursos licenciados siguen privados.

## Contrato de aislamiento

- El contexto se deriva de `pieza.json` y ruta real de proyecto, se valida una vez y permanece inmutable.
- `brandId`, servicio, receta y versiones exactas de paquetes son obligatorios.
- Los recursos se resuelven por ID en un catálogo permitido, nunca por una ruta libre aportada por el agente.
- Identidad, digest y procedencia de cada dependencia quedan fijados en un lock de ejecución.
- Rechazar paths externos, symlinks que escapen, cambios de bytes, versiones ajenas y referencias de otras marcas.
- Skills y docs de marca se montan sólo para el cliente activo. No se cargan overlays Efeonce/Berel para SKY.
- La generación con IA y la composición pasan por el mismo preflight antes de invocar al proveedor.
- Los CLIs crudos no son una frontera suficiente: impedir su bypass en el carril operativo del equipo antes
  de declarar aislamiento garantizado. Un campo de marca escrito por el agente no acredita procedencia.
- Colores iguales entre marcas son posibles: comparar hex o buscar nombres en prompts no prueba aislamiento.
- Co-branding exige relación y recursos explícitamente autorizados; no se habilita por inferencia.
- Falta de recursos o contexto falla cerrado; no hay fallback de marca.

## Unidades de ejecución

1. Foundation/tooling compartida: ADR, catálogo extensible de marcas, contrato/lock, resolver, acceso por
   persona, corridas independientes, skills por cliente, wrappers IA, gates y pruebas negativas.
   Es dueña del harness multimarcas y debe preceder a cualquier corrida SKY.
2. Sistema SKY: paquetes candidatos con procedencia Figma, recursos oficiales y licencias, receta Always On
   cuadrada, luego 4:5 y 9:16 con composición propia. El contenido comercial y legal es input obligatorio;
   no reutilizar fechas/precios de los ejemplos como datos actuales.
3. Referencia web independiente: catálogo, anatomía de componentes, ejemplos y documentación generados
   desde la misma versión. Revisar píxeles desktop/mobile y controlar exposición de material cliente.
4. Integración operativa: release de paquetes, permisos de lectura, instalación limpia, sync desde ref
   commiteado, doctor por cliente, pieza completa, readback de CI/deploy y rollback por versión.

## Verificación exigible

Pruebas SKY↔Berel↔Efeonce sobre recurso, receta, skill, prompt, output y lock; recurso sustituido,
path traversal, symlink, cliente cambiado, contexto ausente y wrapper eludido. Un rechazo debe ocurrir
antes del gasto. El conteo de invocaciones al proveedor en negativos debe ser cero.
Reproducción renderizada de referencia Figma, overflow con destinos largos, cifras y condiciones largas,
fuentes efectivas, logos oficiales y contraste medido; QA visual de la pieza completa y miniatura.
Un gate de procedencia no prueba fidelidad visual; ambos son obligatorios.

## Gates abiertos

- Registrar tasks independientes de tooling y superficie web, con IDs verificados en el momento.
- Goal confirmado por Julio y task-hook ejecutado para TASK-1945 y TASK-1946.
- Definir snapshot/versionado de Figma y confirmar qué componentes son vigentes.
- Metric verificado localmente; establecer distribución remota de fuentes y admisión de fotografía.
- Verificar infraestructura y credenciales actuales sin inferir estado runtime desde documentos.
- Validar pipeline sin generación pagada antes del primer canary IA.

## Continuidad

No se modificaron archivos gestionados del workbench, paquetes AXIS ni trabajo ajeno.
Existe un proyecto fuente local SKY con tres paquetes candidatos, 108 tokens, logo oficial con hash
y contrato Always On. Build determinista y cuatro pruebas pasan. Foundation neutral: 14 pruebas Node
y suite CI pasan; no se integró aún a los wrappers IA. No hay repositorio remoto nuevo, publicación,
credenciales o deployments. El rollout conserva estos pendientes.
