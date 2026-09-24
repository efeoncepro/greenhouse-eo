# Cómo funciona la producción de video de principio a fin

**Estado:** método de trabajo documentado, 2026-09-24. Se opera con archivos, skills y herramientas existentes;
no es una función desplegada de Studio o Globe. Contrato dueño:
[método operativo](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md).

## Qué entrega y quién decide

El flujo transforma un brief y sus recursos en una película revisable, acompañada por sus fuentes, costos,
revisiones y decisiones. El operador fija intención, alcance, presupuesto y aceptación. El agente dirige y
ejecuta dentro de ese alcance; otros colaboradores pueden preparar recursos o revisar partes con ownership
explícito. El trabajo previo —por ejemplo, las piezas y cámaras preparadas con Claude en SKY— se conserva
como entrada con procedencia, sin reinventarlo ni atribuírselo a una etapa posterior.

## Qué se decide antes de generar

- Qué historia debe comprenderse y cuál es el momento principal de marca.
- Qué elementos se generan y cuáles se componen con recursos exactos.
- Qué piezas, estados, vistas y referencias ya están aprobados.
- Cuántas funciones de cámara necesita el relato y qué planos/ángulos las expresan.
- Qué puede reinterpretarse, qué continuidad debe sostenerse y cómo se comprobará.
- Qué costo está autorizado y qué exposición no puede garantizar el proveedor.

Una referencia fija puede definir identidad y material; una referencia temporal puede definir movimiento.
Ninguna reemplaza automáticamente al guion. Una generación completa puede incluir varias tomas y una
edición de pocos segundos puede cambiar sus extremos: ambas requieren revisión.

## Qué conserva cada versión

El paquete contiene brief, manifiesto de activos, guion, cobertura de cámaras, payload, IDs de solicitudes,
fuentes recibidas, selección de rangos, montaje, capas, audio separado y revisión del export. Los originales
y lo aprobado permanecen recuperables; las variantes explican qué cambió y por qué.

`Procesando`, `recibido`, `revisado`, `aceptado`, `integrado` y `entregado` describen pasos diferentes.
Aprobación visual, escucha, autorización de gasto, licencia y publicación se registran por separado.
Una pista puede gustar y contener un silencio defectuoso; un plano puede ser aprovechable aunque el video
completo se rechace. Esa selección por componentes evita perder avances.

## Límites y calidad

El flujo prioriza comprensión, continuidad, identidad, lectura y relación entre música y acción. No identifica
calidad con más efectos o más píxeles. Restaurar a 4K desde 1080p debe declararse; la nitidez perdida por crop
no se garantiza recuperable. Un detector de voz o una medición de loudness no sustituye escuchar la mezcla.
Las tarifas y capacidades se verifican antes de operar, en el conector o endpoint que realmente se usará.

## Operación y evidencia

- [Manual de uso](../../manual-de-uso/creative-production/video-production.md).
- [Retrospectiva SKY](../../operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md): caso fuente, aciertos, tropiezos y límites.
- [Companion de lecciones](../../../.codex/skills/motion-design-studio/companions/video-lessons-and-failure-modes.md): mecanismos de mejora y pruebas para evitar reincidencia.
