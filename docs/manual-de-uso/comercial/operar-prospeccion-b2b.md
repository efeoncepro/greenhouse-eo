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
3. Investigar objetivo **y 2–3 adicionales**, sus funciones y rutas. Guardar relación con quién y vínculos
   confirmados/hipotéticos. Si falta email del objetivo, continuar por adyacentes; mostrar cobertura faltante.
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
¿siguiente decisión y brechas visibles? Outlook de Julio usa su política de firma/CCO y verificación de Enviados.

Mantener método editando primero un bundle, sincronizar espejo y correr `pnpm skills:mirrors`, validación de
frontmatter/rutas y eval offline sobre los escenarios afectados. Registrar decisiones/evidencia en documentación
y correr cierre/contexto después de la última edición. No confundir evaluación de archivos con conversión live.
