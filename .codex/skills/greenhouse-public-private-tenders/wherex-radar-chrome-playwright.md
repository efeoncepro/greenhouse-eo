# Radar de licitaciones Wherex con Playwright

Usa este companion cuando el operador pida revisar oportunidades en Wherex o decidir su fit con los servicios de Efeonce.

## Ejecución canónica

El runner local es el mecanismo reutilizable:

```bash
pnpm wherex:radar:setup
pnpm wherex:radar
```

El setup solicita correo y clave en una terminal interactiva sin mostrarlos. Los guarda sólo en
`.auth/wherex-auth-credentials.json` con permisos `0600`; Chrome usa el perfil aislado
`.auth/wherex-auth-profile`. Ambos permanecen ignorados por Git. Nunca copies esos archivos, cookies,
tokens, enlaces firmados ni secretos a logs, documentos, commits o chat.

Opciones seguras:

```bash
pnpm wherex:radar -- --check-only
pnpm wherex:radar -- --force-login
pnpm wherex:radar -- --max-pages 30
```

El reporte, incluidas fichas y textos de adjuntos, queda bajo `.auth/wherex-radar-reports/` con permisos
`0600`. No es un artefacto para versionar ni entregar a un cliente.

## Qué hace el runner

1. Inicia Wherex en Chrome visible, con el perfil aislado.
2. Navega por Sourcing → Licitaciones y revisa **Nueva** y **Editando**. Una oportunidad abierta previamente puede estar en Editando; mirar sólo Nueva produce falsos negativos.
3. Recorre las páginas disponibles y abre cada ficha detectada.
4. Registra el texto de ficha y extrae temporalmente los adjuntos técnicos disponibles (PDF, DOCX, XLSX o PPTX). Los temporales se eliminan al terminar. Un adjunto que no se pueda interpretar queda marcado como `unreadable`; no se infiere su contenido.
5. Produce un reporte local evidence-first. El agente usa esa evidencia para la clasificación comercial.

## Límite de acciones

El runner es de lectura. No pulsa acciones como participar, descartar, enviar mensajes, cargar archivos,
presentar oferta o firmar. Esas acciones requieren una instrucción explícita y, para envío o firma,
confirmación humana final.

## Criterio de salida

No afirmes que una licitación no tiene fit sólo por el título o la vista de listado. Lee ficha y adjuntos
pertinentes, y cita qué campo o documento sostiene la conclusión. Clasifica como `priorizar evaluación`,
`condicionada`, `no-bid` o `sin evidencia suficiente`. Un fit alto aún no es GO: valida admisibilidad,
capacidad de entrega y margen sobre loaded cost.

## De candidata a expediente y pipeline CRM

Cuando el operador identifique una o más candidatas, el radar no termina con el dictamen. Ejecuta esta
continuidad sólo para las oportunidades que el operador haya seleccionado; no crees masivamente empresas,
deals ni carpetas por todos los resultados del radar.

### 1. Expediente interno y adjuntos originales

1. Crea o reutiliza el workspace interno con `pnpm tender:new <slug>` bajo
   `docs/commercial/tenders/<slug>/`. Las bases normativas viven en `bases/`; investigación, diagnósticos
   y notas internas en `research/`. No confundas este workspace versionado con el archivo operativo de OneDrive.
2. Localiza la biblioteca local sincronizada de OneDrive del operador. La convención actual para licitaciones es
   `Alineación/4. Comercial/Licitaciones/<Comprador>/`. Primero busca una carpeta equivalente por nombre; crea
   sólo la carpeta del comprador que falte y sólo si existe al menos un adjunto que archivar.
3. Descarga o copia el archivo original a esa carpeta conservando el nombre de origen. Revisa que exista, tenga
   tamaño mayor a cero y sea legible antes de declararlo archivado. Registra en el expediente el nombre del archivo,
   tipo, fecha y el origen Wherex, pero nunca una URL firmada, cookie, token ni ruta temporal del navegador.
4. Extrae y lee el contenido de PDF, DOCX, XLSX o PPTX cuando el documento pueda afectar fit, admisibilidad,
   alcance, presupuesto, plazo, requisitos o riesgos. Un documento sin texto extraíble exige revisión visual o se
   clasifica como `unreadable`; no se rellena con supuestos.

Si la UI autorizada abre un adjunto en un visor que impide guardarlo de manera soportada, no intentes obtener la
URL firmada, inspeccionar el perfil de Chrome ni usar una ruta indirecta para saltar ese control. Declara el
bloqueo y pide un archivo local o una acción humana de guardado; cuando el archivo local exista, puedes archivarlo
y analizarlo. El runner `wherex:radar` sólo usa temporales y no sustituye la conservación deliberada del original.

### 2. HubSpot: empresa, deal y asociación

Usa el MCP de HubSpot para el CRM; no deduzcas que un deal existe por una carpeta, por una ficha Wherex o por un
nombre parecido.

1. Llama primero a `hubspot_get_user_details` y confirma acceso de lectura y escritura para `COMPANY` y `DEAL`.
2. Busca empresas y deals por comprador, título y código de licitación; después consulta las asociaciones del deal
con la empresa. Distingue un deal histórico/cerrado de la oportunidad vigente y no dupliques una asociación válida.
3. Consulta las propiedades y opciones reales antes de proponer un alta: HubSpot, no la memoria ni un documento,
   gobierna pipelines, etapas y valores permitidos.
4. Antes de todo write, muestra la tabla exacta de cambios y obtén confirmación explícita del operador. Para una
   empresa inexistente, crea primero la empresa con los datos mínimos verificados y vuelve a leer su ID. Luego
   muestra y confirma por separado el deal y su asociación a esa empresa concreta. Esta segunda confirmación es
   obligatoria: una asociación no se aprueba contra un nombre ambiguo.
5. Crea sólo las propiedades necesarias y usa el owner/pipeline/stage vigentes. Para una licitación privada nueva,
   la clasificación comercial debe quedar trazable, sin inventar propiedades que no existan.
6. Relee el deal y busca la empresa asociada por ID. Reporta creado/verificado o el error real; no afirmes que el
   vínculo existe sólo porque el create respondió sin error.

El MCP exige confirmación aun si el operador había autorizado en general crear los registros. Nunca actualices un
deal o empresa existente para "hacerlo coincidir" sin mostrar el cambio puntual y recibir esa aprobación.

### 3. Entrega al operador

La entrega debe separar: (a) candidatas priorizadas/condicionadas/no-bid con evidencia, (b) archivos originales
archivados y los que no existían o quedaron bloqueados, y (c) estado CRM de cada candidata (empresa, deal,
asociación y verificación). La lectura de un brief se resume con alcance, problema, requisitos, metas, calendario,
riesgos y siguiente gate; no reproduzcas el documento completo ni información confidencial innecesaria.

Para el manual dirigido al operador, consulta `docs/manual-de-uso/comercial/revisar-licitaciones-wherex-con-chrome.md`.
