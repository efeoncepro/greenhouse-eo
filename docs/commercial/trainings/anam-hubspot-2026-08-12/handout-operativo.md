# Hoja de trabajo · HubSpot® para ANAM

## 1. Mapa rápido del CRM

| Objeto | Pregunta que responde | No lo uses para |
|---|---|---|
| Contacto | ¿Con qué persona hablamos? | Representar toda la cuenta. |
| Lead | ¿Qué interés está en pre-calificación? | Usarlo como sustituto del Deal o de una cuenta. |
| Empresa | ¿Qué cuenta agrupa la relación? | Duplicar la cuenta por cada interacción. |
| Negocio / Deal | ¿Qué oportunidad, cotización o adjudicación trabajamos? | Registrar un Ticket o una incidencia de calidad. |
| Service | ¿Qué servicio contratado se entrega, mantiene o renueva? | Crear un registro por cada fila de billing. |
| Ticket | ¿Qué caso de soporte, calidad, billing o administración necesita seguimiento? | Ocultar al owner, SLA o fecha de respuesta. |

Flujo de continuidad:

```text
Contacto → Lead → Empresa → Negocio / Deal + line items → Service → Renovación
                                       ↘ Ticket / solicitud → Handoff con contexto
```

Regla ANAM: Lead, Deal, Service y Ticket tienen granos distintos. La asociación con Empresa conserva la cuenta; no se crea una cuenta nueva para resolver un dato faltante.

## 2. Fórmula de `Paso siguiente`

```text
verbo + objeto + responsable + fecha + resultado esperado
```

Ejemplo:

```text
Confirmar reunión de renovación · owner comercial · 12 ago · registrar alcance y decisión.
```

Evita: “dar seguimiento”, “ver después”, “contactar al cliente”. Son intenciones, no acciones verificables.

## 3. Pipelines de referencia

### Growth / nuevo negocio

```text
Lead / pre-calificación
  → Potencial 10%
  → Calificado 30%
  → Interesado 50%
  → Hot 85%
  → Cierre ganado 100%

Radar 0% pertenece a Lead y queda fuera de la creación ordinaria de Deal.
```

En Growth, `Paso siguiente` es obligatorio desde Calificado e Interesado; Hot requiere además `Monto original`; Cierre ganado requiere `Países de ejecución`, `Monto original` y `Variación vs. cotizado`. Las salidas negativas requieren motivo de cierre perdido.

### Fidelización / renovación

```text
Por revisar
  → Elegibilidad confirmada
  → Contacto iniciado
  → Propuesta en negociación
  → Renovado

Salidas: No renovado · No aplica / Desestimado
```

En Renovación, los cuatro estados abiertos requieren `Paso siguiente`; `Renovado` requiere `Países de ejecución` y las salidas negativas requieren motivo.

Pregunta antes de mover la etapa: “¿Qué evidencia nueva justifica el cambio y a qué pipeline pertenece?”.

## 4. Routing de una solicitud

| Si falta… | Ruta inicial | Contexto que debe viajar |
|---|---|---|
| Interés, alcance o propuesta | Comercial | Cuenta, negocio, etapa, próximo paso. |
| Uso, entrega o continuidad | Servicios | Cuenta, servicio, fecha, solicitud, respuesta pendiente. |
| Incidencia, reclamo o corrección | Calidad | Caso, evidencia, impacto, prioridad. |
| Acceso, condiciones o documento | Soporte / contrato | Cuenta, número de caso, contexto y SLA por confirmar. |

Regla: resuelve cuando tienes alcance y autoridad; deriva cuando falta autoridad, contexto o especialidad.

## 5. Cómo leer un dashboard

Antes de comentar un número, responde:

- ¿Qué periodo cubre?
- ¿Cuál es el universo: Growth, Renewal, abiertos, Goals o excepciones de calidad?
- ¿Cuál es la fuente: Contacto, Deal, Ticket, Service, Goal u otra?
- ¿Qué significa exactamente la etiqueta?
- ¿Quién trabaja la excepción o el siguiente paso?
- ¿El estado es operativo/documentado, piloto, validación live o no publicado?

Paneles de referencia para ANAM: Growth, Backlog Comercial, Fidelización/Renovación, Goals y Data Quality. No confundas conteos o montos de Deals con ingresos. No presentes GRR, NRR o health score sin definición, periodo, base, moneda y evidencia acordada.

## 6. IA con criterio

### Prompt seguro

```text
Resume el registro seleccionado de renovación.
Identifica el estado, el dato faltante y un próximo paso.
Redacta un borrador breve de seguimiento.
No envíes comunicaciones ni cambies campos.
```

### Revisión antes de confirmar

- Fuente y registro correctos.
- Lenguaje, destinatario, fecha, borrador y etapa revisados.
- Datos sensibles limitados a lo necesario.
- Permiso y autoridad confirmados.
- Acción enviada, ejecutada o descartada de forma explícita.

## 7. Ejercicio integrado

### Cuenta

- Contacto: ______________________________________________
- Lead / pre-calificación: _________________________________
- Empresa: ______________________________________________
- Negocio / Deal: ________________________________________
- Service: _______________________________________________
- Ticket / caso: __________________________________________
- Dato que falta: _________________________________________

### Oportunidad

- Pipeline: ☐ Growth / nuevo negocio  ☐ fidelización / renovación
- Etapa actual: __________________________________________
- Evidencia para la etapa: _________________________________
- Próximo paso: __________________________________________
- Responsable: ___________________________________________
- Fecha: _________________________________________________

### Dashboard

- Periodo: _______________________________________________
- Universo: ______________________________________________
- Fuente / objeto: ________________________________________
- Qué sí puedo afirmar: ___________________________________
- Qué requiere validación: _________________________________

### Breeze / IA

- Prompt seguro: __________________________________________
- Propuesta recibida: _____________________________________
- Borrador de seguimiento: _________________________________
- Decisión: ☐ confirmar  ☐ editar  ☐ descartar
- Motivo: ________________________________________________

### Handoff

- Intent/ruta: ☐ cotizar  ☐ seguimiento de servicio  ☐ requerimiento de calidad  ☐ soporte / contrato
- Resumen que viaja: ______________________________________
- Owner sugerido: _________________________________________
- Próxima revisión: _______________________________________

## 8. Estados y pendientes

| Estado | Significado | Próximo paso |
|---|---|---|
| Operativo / documentado | Uso y definición disponibles. | Aplicar según el proceso acordado. |
| Piloto | Flujo de prueba o configuración en curso. | Probar y registrar hallazgos. |
| Validación live | Falta comprobar portal, licencia, permisos o configuración. | Asignar owner y fecha de verificación. |
| No publicado | Está diseñado, pero no es una capacidad activa. | No presentarlo como disponible; registrar la dependencia. |

Pendiente que debo escalar: ________________________________________________
Owner: ______________________________  Fecha: ______________________________

> Material independiente de Efeonce. HubSpot® y sus logotipos son marcas de HubSpot, Inc. Este handout no está autorizado, patrocinado ni aprobado por HubSpot, Inc. El logo oficial del deck permanece en estado `proof-only` hasta validar autorización para distribución externa.
