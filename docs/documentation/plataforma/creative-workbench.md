# Creative Workbench — taller del equipo creativo

Tipo: documentación funcional. Creado: 2026-09-29. Actualizado: 2026-10-01.
Arquitectura: [ADR multimarcas](../../architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md).
Estado y evidencia: [continuidad vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).

## Qué es y cómo se reparte

`efeoncepro/creative-workbench` es el espacio del equipo Efeonce para producir con agentes y
mantener bibliotecas de varias marcas. SKY es el primer sistema admitido. Cada corrida tiene una
marca, versión, receta y recursos exactos; compartir el taller no mezcla SKY, Berel y Efeonce.

Greenhouse conserva gobernanza, decisiones y skills de enseñanza. Workbench posee el motor nativo,
componentes, CLI productiva, paquetes SKY y el Lab. Los archivos gestionados siguen sellados, con
ownership verificable. Los motores y CLIs locales de Greenhouse no se alteran para operar Workbench.

## Qué puede hacerse hoy

Los agentes pueden identificar una composición/receta, elegir sus adaptaciones, inspeccionar campos
y zonas, declarar imagen y todos los textos, componer corridas o lotes exclusivos y revisar PNG/SVG/QA.
Hay 126 adaptaciones nativas SKY y componentes autónomos con tokens, slots, dependencias y procedencia.
Se pueden descomponer, inspeccionar, extraer y recomponer dentro de su contrato admitido. Las nuevas
campañas mantienen QA propio: una escena técnicamente correcta no autentica tarifas, vigencias o derechos.

El [Lab premium integral](../creative/creative-workbench-lab.md) muestra composiciones, adaptaciones,
recetas e inspector, con subpáginas de tokens, tipografía y recursos. La opción 2 conserva variantes
propias/original proporcional/zonas, y v6 completa los menús abiertos de familias y colecciones.
Host Efeonce (Bricolage/Poppins y roles AXIS) y piezas SKY (Metric/recursos cliente) mantienen
admisiones separadas. Sirve para explorar y revisar; la producción escalable ocurre mediante la CLI
y los contratos. El corte publicado es [Vercel protegido](https://creative-workbench-sky.vercel.app/),
PR17/main `7e4c617`, con readback del snapshot SKY; CI genérico no acredita ese deployment.
`creative.efeonce.org` sigue previsto, sin disponibilidad acreditada por este cierre.

## Personas, aprobación y costos

Julio autorizó todo el equipo para todas las marcas admitidas. La identidad Git se verifica por persona,
incluidos autor y committer; la configuración del operador no se distribuye al equipo. Esto no sustituye
AUTH del broker. El consumer Efeonce ID está diferido en TASK-1952; no se construye otro login.

La producción con fotografías admitidas y copy explícito se probó sin llamadas IA. El flujo pagado,
cotizaciones y admisión completa del equipo siguen abiertos en TASK-1947; no concluir que IA está
habilitada por un merge. El presupuesto autorizado es USD 50 por integrante y USD 500 por organización
al mes, sumando todas las marcas. Julio puede aumentarlo por la política gobernada. Ningún agente
se autoasigna cupo ni credenciales de proveedores.

## Cómo circula una pieza

1. Definir brief, receta/adaptaciones, imagen admitida y contenido comercial/legal vigente.
2. Preparar y validar cada job/lote; ejecutar crea UUID y outputs propios, sin sobrescribir otros.
3. Revisar pieza completa, miniatura y QA; resolver errores en fuente/componente, nunca retocar PNG.
4. Registrar revisión y aprobación humana independiente; una prueba interna no es campaña aprobada.
5. Entregar/publicar sólo mediante su carril autorizado; producción local no autoriza publicación cliente.

## Qué sigue pendiente

Contratos 0.2 están preparados y no publicados; paquetes 0.1 sí publicados. Faltan distribución
licenciada de Metric, instalación/onboarding completo, segunda marca y cierre del flujo IA/Efeonce ID.
Consultar [matriz con owners y evidencia](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).
El [manual de operación](../../manual-de-uso/plataforma/operar-creative-workbench.md) enruta a comandos
actuales del repo; no ejecutar el bootstrap histórico sobre las rutas nativas.
