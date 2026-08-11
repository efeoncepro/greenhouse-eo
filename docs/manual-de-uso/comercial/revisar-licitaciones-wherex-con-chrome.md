# Revisar licitaciones Wherex con Playwright

> Manual operativo para evaluar oportunidades privadas en Wherex mediante la CLI Playwright y un perfil de Chrome aislado.

## Propósito

Este proceso permite revisar las licitaciones abiertas, leer sus fichas y bases, y determinar cuáles justifican una evaluación comercial de Efeonce. No crea ni presenta una oferta.

## Configuración de una sola vez

Desde la raíz del repositorio, ejecuta una vez:

```bash
pnpm wherex:radar:setup
```

El setup solicita correo y clave sin mostrarlos y los guarda exclusivamente en
`.auth/wherex-auth-credentials.json`, con permisos `0600`. El navegador conserva su sesión en
`.auth/wherex-auth-profile`; ambos directorios están ignorados por Git. No copies esos archivos, cookies,
tokens ni enlaces firmados a chat, documentos, commits o artefactos.

## Ejecutar el radar

```bash
pnpm wherex:radar
```

El runner abre Chrome visible con su perfil aislado. Puedes comprobar la configuración sin abrir Chrome con
`pnpm wherex:radar -- --check-only`, forzar una nueva sesión con `--force-login` o limitar la paginación con
`--max-pages 30`.

## Rutina de revisión

1. El runner entra a Wherex y navega por Sourcing → Licitaciones.
2. Revisa los estados **Nueva** y **Editando**, página por página. Una oportunidad ya abierta puede pasar a Editando aunque siga vigente; consultar sólo Nueva deja oportunidades fuera del radar.
3. De cada fila anota comprador, ID, título, estado, fecha y hora de cierre, categoría y una señal inicial del alcance.
4. Abre la ficha de toda oportunidad que parezca pertinente o ambigua. Lee descripción completa, alcance, entregables, requisitos, presupuesto o modalidad de pago, plazos, comentarios/preguntas y documentos exigidos.
5. Lee las bases, brief, RFP, TDR y anexos técnicos cuando puedan cambiar el dictamen. El runner extrae temporalmente PDF, DOCX, XLSX y PPTX, elimina el temporal y marca un archivo no interpretable como `unreadable`. El listado y el título son screening, no evidencia suficiente para decidir el fit.
6. Contrasta el alcance con los servicios canónicos de Efeonce. Distingue lo que Efeonce puede entregar directamente de lo que requeriría partner, certificaciones, cobertura local, hardware, personal presencial u otra capacidad externa.
7. Entrega una recomendación y evidencia; no selecciones participar/no me interesa, no envíes consultas ni propuestas y no firmes ni subas documentos.

## Cómo clasificar el fit

| Resultado | Cuándo usarlo | Siguiente acción |
| --- | --- | --- |
| Priorizar evaluación | El alcance central coincide directamente con servicios de Efeonce y no aparece un bloqueo conocido. | Revisar admisibilidad, capacidad y margen. |
| Condicionada | Hay encaje parcial o depende de partner, certificación, presencia geográfica, capacidad o un dato que falta. | Resolver la condición antes de destinar horas de propuesta. |
| No-bid | El núcleo de la compra no pertenece a la oferta de Efeonce o hay un bloqueo material. | Registrar la razón y no invertir en propuesta. |
| Sin evidencia suficiente | La ficha o los adjuntos imprescindibles no están disponibles. | Solicitar o localizar la documentación faltante. |

Un buen fit no equivale a un GO. Antes de participar deben pasar tres puertas: admisibilidad, capacidad real de entrega y margen proyectado sobre loaded cost.

## Cuando una licitación pasa a candidata

No archives ni crees CRM para cada fila revisada. Esta etapa comienza sólo cuando el operador selecciona una
licitación como candidata para evaluación comercial.

### 1. Abrir el expediente interno y archivar los originales

1. Crea o reutiliza el workspace del repositorio con `pnpm tender:new <slug>`. Guarda las bases normativas en
   `bases/` y la investigación interna en `research/`; ese workspace no reemplaza el archivo operativo de OneDrive.
2. Busca la carpeta del comprador en la biblioteca sincronizada `Alineación/4. Comercial/Licitaciones/` de OneDrive.
   Si no existe, créala sólo cuando haya al menos un adjunto original que guardar. Conserva el nombre del comprador
   para que el equipo pueda encontrar el expediente sin conocer el slug técnico.
3. Copia cada PDF, DOCX, XLSX o PPTX original con su nombre de origen. Comprueba que el archivo exista, tenga tamaño
   mayor a cero y se pueda abrir antes de informar que quedó archivado.
4. En el expediente versionado anota nombre, tipo y procedencia Wherex de cada base; nunca copies URL firmadas,
   cookies, tokens ni rutas temporales del navegador.

El radar automático lee adjuntos en un directorio temporal y los elimina al terminar. Para conservar un original,
debe existir una copia local legítima antes de moverla al archivo de OneDrive. Si el visor del navegador bloquea el
guardado mediante la automatización disponible, no intentes extraer enlaces firmados, inspeccionar el perfil del
navegador ni eludir el control. Solicita el archivo local o el guardado humano y continúa cuando exista una copia
verificable. Si una candidata no tiene adjuntos, informa ese hecho y no crees una carpeta vacía sólo por simetría.

### 2. Crear o verificar el pipeline en HubSpot

La carpeta de OneDrive y el workspace no prueban que exista un deal. HubSpot se revisa por MCP y conserva el
registro comercial canónico.

1. Obtén primero la identidad y los permisos con `hubspot_get_user_details`; requiere lectura y escritura de Company
   y Deal.
2. Busca independientemente empresa, deals y código de licitación. Revisa además las empresas asociadas a cada deal:
   un deal histórico cerrado o uno sin asociación no cubre automáticamente la licitación vigente.
3. Consulta las propiedades disponibles de HubSpot antes de preparar la creación. Pipeline, etapa, owner y opciones
   permitidas se toman del portal, no de una tabla copiada en este manual.
4. Si falta la empresa, muestra al operador una tabla con las propiedades exactas y pide aprobación explícita. Crea la
   empresa, relee su ID y verifica sus valores.
5. Luego muestra una segunda tabla con el deal exacto y la asociación a esa empresa por ID. Pide una segunda
   aprobación antes de crear; la primera no autoriza por sí sola una asociación contra un ID aún desconocido.
6. Relee el deal y consulta su empresa asociada. Informa el ID y la verificación final. No modifiques registros
   existentes ni inventes properties para que parezcan equivalentes sin confirmación específica.

HubSpot exige esta confirmación por cada escritura, incluso cuando el objetivo general era crear los registros.
Polpaico ilustra la rama de reutilización: si el deal vigente y su empresa ya existen y están asociados, se reportan
como verificados y no se duplican.

### 3. Leer y devolver los adjuntos

Para cada archivo normativo o brief leído, entrega una síntesis operable: objeto/alcance, situación actual,
requisitos, metas o criterios de evaluación, calendario y pago cuando exista, riesgos/bloqueos y siguiente gate.
No declares fit por el título ni transcribas íntegramente material confidencial. Si el archivo no es interpretable,
decláralo y pide revisión visual; no reemplaces su contenido con una conjetura.

## Formato de entrega

Entrega una tabla como esta y conserva la evidencia mínima que sustenta cada dictamen:

| Comprador / ID | Estado y cierre | Alcance leído | Dictamen | Evidencia, riesgos y siguiente acción |
| --- | --- | --- | --- | --- |
| Organización / código | Nueva o Editando · fecha y hora | Resumen de la ficha y adjuntos leídos | Priorizar, condicionada, no-bid o evidencia insuficiente | Campo/documento que lo prueba; condición o gate pendiente |

El reporte queda protegido en `.auth/wherex-radar-reports/` con permisos `0600`. No copies credenciales,
enlaces firmados de descarga ni información confidencial innecesaria a documentos versionados o al chat.

## Límites de seguridad y control humano

El runner opera en modo lectura. Puede leer la ficha y los adjuntos autorizados para fundar la recomendación, pero el operador conserva el control de toda acción con efecto comercial o contractual. Presentar una oferta, aceptar términos, responder mensajes, cargar archivos o firmar requiere una instrucción explícita y confirmación humana final.

Al terminar, el perfil aislado conserva sólo su propia sesión; los archivos temporales de adjuntos se eliminan.

## Referencias

- [Construir una licitación paso a paso](construir-una-licitacion.md)
- [Skill de licitaciones: ciclo y go/no-go](../../../.codex/skills/greenhouse-public-private-tenders/SKILL.md)
