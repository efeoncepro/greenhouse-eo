# Arquitectura económica interna — Brightcell Chile

> **Estado:** arquitectura económica y precios de propuesta preparados para validación final; no es documento
> client-facing, no sustituye la aprobación comercial y **no autoriza envío** antes de Finance.
> **Licitación:** LIC-95 · Wherex
> **Fecha:** 31 de julio de 2026

## Decisión comercial

Brightcell no debe recibir un precio único que mezcle construcción, mantenimiento, SEO/AEO, redes sociales,
licencias y evolución. La oferta debe mostrar qué compra una vez, qué puede contratar de forma recurrente y qué
se activa solo cuando exista una necesidad comercial validada.

La arquitectura recomendada es:

```text
implementación inicial
+ estabilización post-lanzamiento incluida
+ cuidado técnico opcional
+ SEO/AEO recurrente
+ Social Media recurrente
+ HubSpot: activación inicial + licencia separada
+ evoluciones y terceros fuera de alcance base
```

La unidad pública no debe ser “horas”, “posts”, “páginas” ni “artículos”. Es un alcance gobernado con capacidad,
cadencia, dependencias y límites explícitos.

## Decisión actualizada: landing única + operación mensual

La oferta de Brightcell se separa en una implementación única y una operación mensual. La landing no se trata
como una página commodity: nace con estrategia, copy, SEO de lanzamiento, medición, GA4, GTM, eventos,
formularios y conexión con HubSpot. La operación mensual agrega estrategia, RRSS, SEO/AEO, contenidos,
optimización de conversión y reporting según la capacidad contratada.

No se debe imponer un programa de 90 días ni una permanencia mínima si el cliente no lo solicita. La propuesta
debe ser comprensible como inversión inicial + mensualidad, con condiciones de término claras y sin esconder
licencias o terceros dentro del fee.

### Una implementación y tres paquetes mensuales

Todos los valores son netos, sin IVA, en CLP:

La landing tiene una implementación común de **$1.100.000 netos, pago único**. Los paquetes cambian la capacidad
mensual, no el precio de esa misma implementación:

| Paquete mensual | Operación mensual | Rol comercial |
|---|---:|---|
| **Growth Core** | $1.250.000 | Base sólida de conversión, contenido y medición |
| **Demand & Authority** | $1.650.000 | Opción recomendada; mayor profundidad y optimización |
| **Regional Growth** | $2.200.000 | Mayor capacidad editorial, SEO/AEO y escala regional |

La diferencia de precio debe corresponder a más capacidad y profundidad: piezas y adaptaciones por canal,
iniciativas SEO/AEO, contenidos web, video derivado de material disponible, automatizaciones y reporting. No
debe presentarse como una promesa de resultados garantizados.

### HubSpot CRM Free incluido

HubSpot CRM Free se obsequia como diferenciador dentro de los tres paquetes y no se cobra como activación
separada. El alcance incluido es:

- portal CRM Free y pipeline comercial inicial;
- propiedades básicas de contacto, empresa, servicio, industria y fuente;
- formularios conectados a la landing;
- vistas, notificaciones y dashboard básico;
- documentación y capacitación inicial.

HubSpot Starter, módulos pagados, límites ampliados, migraciones complejas e integraciones avanzadas no están
incluidos. Si se requieren, deben ser contratados y pagados directamente por Brightcell.

### Deck económico separado

La económica tiene un deck propio, separado del deck técnico. `deck-plan-economic.json` es la fuente de
composición y debe producir una salida versionada independiente. La narrativa económica debe explicar primero
la separación entre implementación única y operación mensual, luego comparar los tres paquetes y finalmente
aclarar HubSpot, exclusiones y condiciones. No se debe alterar el deck de SKY ni reutilizar su salida como
fuente.

## 1. Implementación inicial — cobro único

### Qué compra Brightcell

Una primera plataforma comercial local, preparada para convertir interés en contactos medibles y para evolucionar
sin rehacer la base.

### Alcance a cotizar

- descubrimiento y definición de la propuesta local;
- arquitectura de información y jerarquía de servicios/industrias;
- UX/UI responsive y sistema visual alineado con Brightcell regional;
- copy inicial sujeto a validación del cliente;
- implementación WordPress administrable, con Elementor solo si la auditoría lo confirma;
- configuración técnica de SEO de lanzamiento;
- configuración inicial de analítica, eventos y conversiones;
- correo o formulario de contacto;
- QA responsive, funcional, accesibilidad y rendimiento;
- documentación y transferencia;
- publicación y acompañamiento de lanzamiento;
- activación inicial de HubSpot CRM Free incluida como beneficio del paquete, con alcance básico definido en
  la sección de HubSpot.

### Frontera

La implementación no incluye operación mensual de contenidos, SEO/AEO, redes sociales, medios pagados,
producción audiovisual especial, e-commerce, catálogo transaccional, ERP/WMS/TMS ni CRM avanzado.

## 2. Estabilización post-lanzamiento — incluida y limitada

En vez de prometer mantenimiento indefinido, incluir un período acotado de estabilización posterior a la
publicación. Debe cubrir correcciones atribuibles a la implementación, verificación de eventos y ajustes menores
de lanzamiento.

No debe incluir nuevas páginas, nuevas funcionalidades, cambios de estrategia, rediseños ni producción mensual.
Todo lo que exceda la estabilización entra en cuidado técnico, evolución o change order.

## 3. Cuidado técnico — recurrente opcional

Este servicio es distinto de SEO/AEO y Social Media. Su propósito es mantener la plataforma operable y segura.

### Puede incluir

- actualizaciones controladas de WordPress, tema y plugins;
- backups y monitoreo básico;
- revisión de seguridad, formularios y eventos críticos;
- soporte técnico acotado y mesa de ayuda;
- pequeños ajustes de contenido o configuración dentro de un límite mensual;
- reporte de salud técnica.

### No debe incluir

- nuevas páginas o templates;
- rediseño;
- producción de contenidos;
- optimización SEO editorial;
- gestión de redes sociales;
- community management;
- integraciones nuevas;
- soporte 24/7.

Debe venderse como add-on opcional, con SLA, límite de capacidad, ventana de atención y condiciones de pausa.

## 4. SEO/AEO — recurrente opcional

SEO/AEO debe cotizarse como una operación mensual de visibilidad y claridad, no como una bolsa de artículos ni una
garantía de posiciones, citaciones o leads.

### Puede incluir

- revisión mensual de consultas, páginas y conversiones;
- priorización de oportunidades;
- optimización técnica y semántica;
- arquitectura de entidad y citabilidad;
- contenidos o actualizaciones dentro de una capacidad mensual gobernada;
- enlazado interno, schema y mejoras de información;
- medición de búsqueda y superficies de respuesta;
- reporte y backlog del siguiente ciclo.

### Condiciones recomendadas

- contrato mensual y término con aviso definido; no imponer un mínimo inicial de tres meses si la licitación
  no lo solicita;
- capacidad y límites definidos en el SOW;
- no usar cantidad de artículos como unidad principal de precio;
- separar traducción, producción audiovisual, medios, proveedores y páginas adicionales;
- revisar margen y cost-to-serve antes de publicar una cifra.

## 5. Social Media — recurrente opcional

Social Media debe presentarse como una operación editorial y de autoridad B2B, con LinkedIn como canal principal,
YouTube condicionado a material aprobado e Instagram como soporte visual.

### Puede incluir

- estrategia editorial y pilares de contenido;
- calendario mensual;
- copy y adaptación por canal;
- diseño de piezas estáticas y carruseles;
- edición de video corto a partir de material disponible;
- publicación y programación;
- escucha y community management con ventanas definidas;
- reporte mensual y recomendaciones.

### Debe quedar separado

- inversión en medios pagados;
- producción audiovisual especial;
- jornadas de grabación;
- vocerías, talentos y creators;
- derechos, música y bancos de imágenes;
- cobertura 24/7 o manejo de crisis;
- canales, idiomas y mercados adicionales.

El fee debe vender capacidad y governance, no un precio por post. La contratación debe ser mensual, con término
y aviso definidos en la propuesta, salvo que Brightcell solicite otra condición.

## 6. HubSpot — CRM Free incluido; licencias pagadas separadas

### Configuración incluida en la implementación/paquete

- configuración de portal y usuarios acordados;
- propiedades básicas de contacto, empresa, servicio, industria y fuente;
- pipeline inicial;
- formularios o conexión de captura aprobada;
- notificaciones y vistas básicas;
- dashboard inicial;
- documentación y transferencia.

### Licencia y operación — fuera del fee cuando corresponda

- HubSpot Suite Starter y cualquier componente adicional deben aparecer como línea separada;
- idealmente la cuenta debe ser propiedad de Brightcell y Efeonce operar como partner/administrador;
- la licencia, impuestos, límites de contactos, usuarios, renovación y cambios de plan no deben esconderse en el
  fee de implementación;
- la capa AEO debe describirse como servicio de monitoreo, recomendación y medición, no como una licencia que
  garantice citaciones.

## 7. Bundles recomendados para presentar

La económica puede mostrar una alternativa base y dos continuidades, sin convertirlas en tres proyectos
completamente distintos:

| Opción | Compra principal | Naturaleza |
|---|---|---|
| **Base comercial** | Implementación inicial + estabilización | cobro único |
| **Base + continuidad técnica** | Implementación + cuidado técnico | único + mensual opcional |
| **Growth comercial** | Implementación + HubSpot + SEO/AEO + Social Media | único + recurrente |

La opción recomendada debería ser **Growth comercial**, pero con cada componente desglosado. Así Brightcell puede
comparar y eventualmente retirar un módulo sin desarmar toda la propuesta.

## 8. Condiciones comerciales a definir

- moneda: CLP, valores netos e IVA por separado;
- validez de la oferta;
- pago de implementación por hitos, idealmente con anticipo de inicio;
- facturación mensual de recurrentes, con pago a 30 días según la licitación;
- mínimo de permanencia para SEO/AEO y Social Media;
- fecha de inicio y dependencias del cliente;
- tratamiento de licencias, hosting, dominio y terceros;
- límites de rondas de aprobación y change order;
- condiciones de pausa, término y trabajos ya comprometidos;
- reajuste o revisión para contratos de más de 12 meses.

## 9. Gate antes de fijar precios

No congelar cifras hasta validar:

- costo cargado por rol y dedicación real;
- capacidad y tiempos de implementación;
- costo de soporte, coordinación y retrabajo;
- licencia real de HubSpot y proveedor AEO aplicable;
- margen bruto objetivo y escenario downside;
- efecto del pago a 30 días sobre caja;
- disponibilidad de Brightcell para aprobar contenidos y entregar accesos;
- alcance cuantitativo de páginas, idiomas, canales y cadencias.

**Veredicto actual:** `hypothesis_only` — arquitectura recomendada, precios pendientes de costeo y aprobación.
