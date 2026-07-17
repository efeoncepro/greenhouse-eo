# ANAM — Cotización y captura de datos

Fuente live: `Doc C - Cotizacion y Captura de Datos - Canonico.md`, privada, creada `2026-06-24 12:37`, última sincronización `2026-07-16 03:31 GMT-4`.

## Reglas de conversación

- Aguas y Sólidos son matrices distintas dentro de Muestreo y/o Análisis de Laboratorio, aunque comparten preguntas.
- Formular una a tres preguntas relacionadas por mensaje como referencia; usar más sólo si están estrechamente conectadas, el usuario pide el listado o dividirlo vuelve la conversación innecesariamente lenta.
- Avanzar por bloques. No mezclar datos técnicos, logística y contacto antes de clasificar el servicio.
- Varias matrices no autorizan pedir todos los bloques a la vez: comenzar con objetivo, parámetros conocidos y norma/instrumento.
- Pedir sólo lo aplicable y reutilizar información ya presente en CRM.

## Datos según servicio

### Aguas y sólidos

| Pregunta | Obligatorio |
|---|---|
| Matriz | Sí |
| Parámetros a cotizar | Sí |
| Si no los conoce, objetivo del estudio | Condicional |
| Objetivo: interno o para autoridad | Sí |
| Toma de muestras: ANAM o cliente | Sí |
| Si ANAM: puntual o compuesta | Sí |
| Número de muestras por conjunto de parámetros | No |
| Norma de comparación | Sí |
| Requiere ETFA/SMA e instrumento RCA/PVA/PPDA/otro | No |
| Características, imagen/video y acceso al punto | No |
| Requiere visita | Sí |
| Dirección del punto | Sí |
| Comuna y región | No |
| Fecha estimada | No |
| Frecuencia | No |

Para RILES asociados a DS 90 o DS 609 sin parámetros definidos, preguntar primero origen/proceso e instrumento o requerimiento de la autoridad. No presentar el catálogo como panel normativo.

### Diagnóstico y control de olores

- Olfatometría dinámica: cantidad y tipo de fuentes odorantes; si requiere visita para identificarlas.
- Panel sensorial: cantidad de receptores sensibles conocida.

### Metrología y telemetría

- Marca y modelo del equipo.
- Banco o terreno, ubicación, objetivo y norma aplicable.

### Instrumentación, telemetría y DATANAM

- Destino: SMA, DGA, DATANAM o plataforma del cliente.
- Equipos/estaciones y variables.
- Conectividad o protocolo disponible.
- Necesidad principal: integración, visualización o control de procesos.

Sólo prometer capacidades documentadas de DATANAM: resultados/reportes, descarga de informes, Excel/PDF/CSV, tendencias y dashboards personalizados. No prometer alertas.

## Flujo de calificación

1. Detectar intención: información o cotización.
2. Clasificar servicio: Aguas, Sólidos, Olores, Metrología, Instrumentación/Telemetría/DATANAM o complementario.
3. Bloque 1 — qué medir: matriz, parámetros u objetivo y norma.
4. Bloque 2 — cómo y dónde: toma, tipo, cantidad, dirección/comuna/región, visita, frecuencia y fecha estimada.
5. Bloque 3 — preguntas específicas del servicio.
6. Bloque 4 — autorización SMA/ETFA e instrumento.
7. Bloque 5 — empresa y contacto.
8. Confirmar: resumir, indicar seguimiento comercial y derivar dudas o faltantes sin forzar.

Si el cliente desconoce una respuesta, ofrecer visita técnica o seguimiento de un ejecutivo.

## Empresa solicitante y titular del informe

Pueden ser la misma o diferentes. Para cada conjunto aplicable:

| Campo | Obligatorio |
|---|---|
| RUT empresa | Sí |
| Razón social | Sí |
| Dirección comercial | Sí |
| Comuna | Sí |
| Nombre contacto | Sí |
| Teléfono móvil | Sí |
| E-mail | Sí |
| Giro | No |

## Logística de muestras

- ANAM o cliente pueden realizar la toma; el cliente debe seguir el instructivo.
- Envase, volumen, preservante y temperatura dependen del parámetro.
- Cadena de custodia, transporte, tiempo máximo, laboratorio y horario deben confirmarse para el servicio.
- No entregar valores “habituales” como sustituto del instructivo oficial.

## Captura en HubSpot

Datos prioritarios para cotización o seguimiento: nombre, apellido, RUT empresa, razón social, correo y teléfono. Reutilizar CRM y marcar como pendiente lo faltante. No condicionar una consulta informativa simple a estos datos.

| Dato | Objeto | Propiedad de referencia |
|---|---|---|
| Nombre | Contacto | `firstname` |
| Apellido | Contacto | `lastname` |
| Correo | Contacto | `email` |
| Teléfono | Contacto | `phone` o `mobilephone` |
| Razón social | Contacto / Empresa | `company` / `name` |
| RUT empresa | Contacto / Empresa | `rut_empresa` personalizada |
| Giro / industria | Empresa | `industry` |
| Dirección | Empresa | `address` |
| Comuna / Región | Empresa | `city` / `state` |

Los datos técnicos de cotización viven en propiedades del Negocio o en su resumen gobernado, según el modelo vigente. Los nombres sugeridos en esta fuente no autorizan crear propiedades sin inventario y aprobación.

## Resumen de cierre

```text
RESUMEN DE COTIZACIÓN — ANAM
[Servicio]
[Matriz]
[Parámetros / objetivo]
[Norma]
[Toma]: ANAM | Cliente
[Tipo]: Puntual | Compuesta
[N° muestras]
[ETFA/SMA]: Sí | No — Instrumento
[Dirección]
[Comuna / Región]
[Visita]: Sí | No
[Frecuencia]
[Fecha estimada]
[Específicos olores]
[Específicos metrología]

DATOS EMPRESA
[Contacto]
[RUT]
[Razón social]
[Dirección]
[Comuna]
[Teléfono]
[E-mail]
[Giro]
[Titular del informe si difiere]
[Estado]: Listo para ejecutivo | Faltan datos | Requiere visita
[Notas]
```

Incluir sólo datos disponibles y marcar como `Pendiente` los obligatorios faltantes.
