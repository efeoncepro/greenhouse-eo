# Operar prospección B2B con agentes

Canon: [skill](../../../.codex/skills/efeonce-b2b-prospecting/SKILL.md),
[decisión](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md) y
[funcionamiento](../../documentation/comercial/prospeccion-b2b.md).

## Antes de empezar

Definir cuenta/persona/señal o micro-ICP, mercado, servicio, historia y resultado pedido. Identificar las
acciones autorizadas y presupuesto si hay créditos. Una aprobación anterior cubre exactamente su alcance;
no hay que renovarla sólo porque cambie de fase el agente. Creación de skill/radar no aprueba lotes futuros.

## Recorrido

1. Invocar `$efeonce-b2b-prospecting` o pedir investigación/registro/recuperación de cuenta. Cargar sólo módulos
   pertinentes; resolver entidad y leer expediente/hilo vigente. Si el pedido nombra Sales, cargar su índice
   y workflow específico instalado antes de su fase; no hacer instalación/call sólo para validar la skill.
2. Verificar tamaño/encaje, señal y fecha con fuentes dueñas; distinguir hechos, hipótesis y demanda. No
   extrapolar headcount de grupo a filial, presupuesto por tamaño o tecnología/tier por un script visible.
3. Investigar objetivo **y una base inicial de 2–3 adicionales**, sus funciones y rutas. Amplíala si faltan
   roles críticos, validadores, aprobadores u otras unidades de la oportunidad/fase: el número no es techo.
   Separar personas únicas, funciones, participación/autoridad, correo, acceso e interacción. Guardar
   vínculos confirmados/hipotéticos; para cada brecha, riesgo, owner/ruta y siguiente validación. Un rol
   crítico sin email permanece en investigación. No exigir champion ni comité completo antes de conversar.
4. Evaluar atribución, empleo y calidad de correo por separado. Revelación/enriquecimiento pagado requiere
   alcance explícito; no reiterar resultado vacío ni completar direcciones por patrón. Dirección general,
   personal o incierta no permite alta individual. Si faltan datos, entregar estado parcial y menor chequeo útil.
5. Preparar un account brief y apertura/prueba según relación. Releer último mandato, validar claim/capacidad
   y graduar costo de preventa. Preparar preguntas de discovery sin convertir borrador en comunicación realizada.
6. Para registro pedido/autorizado, pasar a HubSpot con changeset revisable, dedupe y valores reales. Ejecutar
   sólo su alcance y leer IDs/campos/Primary/Lead automático/membresía después. Ante escritura ambigua, reconciliar
   antes de repetir. Si sólo se autorizó investigar, entregar propuesta y no escribir.
7. Entregar action pack a Commercial/seguimiento: estado observado, owner, próximo paso/fecha, fuentes y brechas.
   Mantener HSP e historial privados en radar existente; no cambiar scheduler ni crear otro.

## Cuando el pedido involucra ABM / ABS

Cargar [módulo account-based](../../../.codex/skills/efeonce-b2b-prospecting/references/abm-and-abs.md).
Seleccionar cuenta por fit y decidir inversión por problema, acceso, margen/capacidad; documentar intensidad
1:1/1:few/1:many y propósito sin cuotas universales ni sustituir el tier ICP. Mantener mapas por iniciativa,
tesis compartida, owners marketing/comercial y proof que ayude a las distintas funciones a resolver una
misma decisión. Business case/MAP se preparan según fase y evidencia bilateral, no como requisito de apertura.
Dimensionar costo total, caja incremental y continuidad; medir progreso comprador, resultados/margen y
cohortes con denominador. No adoptar uplift de proveedores como meta ni declarar efecto causal por atribución.
El piloto del informe es propuesta y requiere parámetros/capacidad aprobados antes de ejecutarse.

## Herramientas de operación account-based

- Cuentas objetivo/roles HubSpot: [adapter](../../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md)
  y changeset. Refrescar diccionario/capability; conservar valores y mapa por iniciativa. No asumir API/CLI del gráfico.
- Capacidad/preventa: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/capacity-and-economics.md)
  y plantilla por owner/período, seguimiento y costo total/caja, con unknowns y sin tarifas nuevas.
- Discovery/prueba: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/discovery-and-proof.md)
  por oferta/función; pregunta, baseline, prueba mínima/derechos y criterio comprador, sin claims infundados.
- Aprendizaje: [módulo](../../../.codex/skills/efeonce-b2b-prospecting/references/experiments-and-learning.md)
  y ficha por iniciativa; motivo declarado separado de hipótesis, datos a revalidar y restricciones del seguimiento existente.

## Problemas frecuentes

| Observación | Acción |
| --- | --- |
| Apollo devuelve persona sin email | Finalizar ese carril de email y continuar rutas; no alta vacía |
| Email valid con empleador distinto | Resolver atribución vigente; bloquear el canal ambiguo |
| Company API/Primary incorrecta | Leer entidad/automatización y preparar corrección autorizada, no fusión por heurística |
| Lead automático | Reutilizar/reconciliar, no duplicar por iniciar otra investigación |
| Publicación pide agencia | Verificar autor/entidad/fit; colegas no heredan demanda |
| Fecha vencida/HOLD | Recuperación o revisión condicionada; no afirmar convocatoria abierta ni acelerar por colegas |
| Reply/baja/OOO/bounce | Clasificar alcance y proponer parada/revisión; settings no se presumen sincronizados |
| Falta Sales/provider/harness | Descubrir capability real, usar contexto equivalente o declarar carril pendiente; no fingir ejecución |
| Opens sin respuesta | Diagnóstico limitado, no calidez; no repetir mensaje por un scanner |

## Verificar y mantener

Antes de completar: ¿entidad y fuente claras?, ¿objetivo + adicionales buscados?, ¿emails admitidos con evidencia?,
¿relación/demanda separadas?, ¿HOLD y procesos respetados?, ¿acción dentro de permiso?, ¿readback si hubo escritura?,
¿siguiente decisión/fase y brechas críticas con owner/ruta visibles?, ¿suficiencia sin contar emails como roles? Outlook de Julio usa su política de firma/CCO y verificación de Enviados.

Mantener método editando primero un bundle, sincronizar espejo y correr `pnpm skills:mirrors`, validación de
frontmatter/rutas y eval offline sobre los escenarios afectados. Registrar decisiones/evidencia en documentación
y correr cierre/contexto después de la última edición. No confundir evaluación de archivos con conversión live.
