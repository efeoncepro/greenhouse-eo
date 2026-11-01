# Anexo 01 · Contrato de alcance por URL, compatibilidad y persistencia

Fecha de inspección: 2026-10-27. Responsable del discovery: subagente `url_scope_contract`.
Estado: propuesta técnica; no es un ADR aceptado ni una implementación. Se inspeccionaron archivos y se ejecutó
una prueba pura del contrato actual. No se escribió en base de datos ni se modificó configuración o runtime.

## 1. Resultado que debe garantizar el contrato

Una nueva edición del informe Blog/SEO de SKY debe medir exclusivamente `blog.skyairline.com`, conservando una
referencia exacta del alcance aplicado y de su versión. Deben entrar la raíz, categorías y artículos de ese host;
no deben entrar la web principal, reservas ni un host que sólo contenga la cadena del dominio permitido. El filtro
no puede depender del nombre del target, del título del informe o de que la propiedad de Google hoy sea estrecha.

Berel conserva su contrato de rutas y sus ediciones existentes. El trabajo nace en los dueños actuales de Growth SEO
y GA4; Insights consume el contrato. No exige extraer productos, crear repositorios, paquetes o nuevos deployables.

**Requisito ratificado por el operador después del primer discovery:** GA4, GSC y las corridas AEO del motor propio
son obligatorios desde el primer informe. El alcance URL de este anexo es **una parte** del binding de medición,
no el contrato completo del informe. GA4 y GSC necesitan acreditar el host exacto; AEO necesita acreditar una corrida
del motor con perfil/panel válido para la **métrica que se reporta** y su evidencia original. Una proyección canónica
de citas a URL del blog puede reutilizar una corrida de panel general si declara ese panel y conserva su denominador;
no exige por sí misma un panel o una corrida nueva dedicada al blog. Las visitas GA4 desde asistentes IA son una
métrica diferente y no sustituyen esa corrida. No se puede tomar un score AEO general de la marca y convertirlo en
score del blog mediante un filtro de host posterior. Un primer informe que omite cualquiera de las tres fuentes
no satisface el requisito, aunque todos sus datos restantes pertenezcan al host correcto.
El contrato específico de esa evidencia y su incorporación al binding se desarrolla en
[AEO del motor como fuente obligatoria](05-aeo-engine-required.md).

## 2. Registro de evidencia del código actual

Las referencias son `ruta:línea` del checkout inspeccionado; pueden moverse al implementar.

| ID | Evidencia | Hecho observado |
| --- | --- | --- |
| C01 | `src/lib/growth/seo/content-scope/contracts.ts:19` | Una regla sólo tiene `kind` y `path`. |
| C02 | `src/lib/growth/seo/content-scope/contracts.ts:25` | La configuración tiene organización, versión, etiqueta y reglas; no versión de formato ni hosts. |
| C03 | `src/lib/growth/seo/content-scope/contracts.ts:53` | El matcher elimina host/esquema, query, fragmento y barras finales. |
| C04 | `src/lib/growth/seo/content-scope/contracts.ts:94` | El parser valida campos conocidos, pero no rechaza claves desconocidas: reconstruye sólo `kind` y `path`. |
| C05 | `src/lib/growth/seo/content-scope/contracts.ts:129` | `/` no es regla válida; para medir todo se usa lista vacía. |
| C06 | `src/lib/growth/seo/content-scope/contracts.ts:140` | Sólo `rules.length > 0` activa el alcance. |
| C07 | `src/lib/growth/seo/content-scope/store.ts:45` | El store parsea `rules_json` y lanza si no entiende el dato; nunca convierte error a sitio completo. |
| C08 | `src/lib/growth/seo/content-scope/store.ts:63` | El reader actual selecciona siempre la mayor versión; no hay reader por versión concreta. |
| C09 | `src/lib/growth/seo/content-scope/store.ts:114` | Command con transacción y advisory lock por organización; compara clave semántica y sólo inserta una versión nueva si cambia. |
| C10 | `migrations/20261012145214417_task-2033-growth-seo-content-scope.sql:21` | `rules_json` exige JSON array. Cambiar su forma necesita migration. |
| C11 | `migrations/20261012145214417_task-2033-growth-seo-content-scope.sql:32` | Trigger bloquea UPDATE/DELETE; PK `(organization_id, version)`. |
| C12 | `src/lib/growth/seo/content-scope/sql.ts:28` | SQL parametrizado para rutas, columnas de mapa cerrado y límites de prefijo por segmento. |
| C13 | `src/lib/growth/seo/content-scope/sql.ts:64` | GSC clasifica páginas distintas del rango y usa `page IN (...)`; no ejecuta el matcher sobre cada medición. |
| C14 | `src/lib/growth/seo/overview/read-window-movers.ts:74` | Las páginas elegibles se resuelven sobre la unión temporal de actual y comparación, incluyendo páginas desaparecidas. |
| C15 | `src/lib/growth/seo/work-queue/reader.ts:279` | El alcance entra al SQL antes del `LIMIT`, preservando orden y paginación. |
| C16 | `src/lib/efeonce-insights/adapters/seo-adapter.ts:560` | Insights resuelve una vez el alcance vigente al recolectar, no al crear la edición. |
| C17 | `src/lib/efeonce-insights/adapters/seo-adapter.ts:587` | Se copia el mismo alcance en cada fuente SEO; la proyección actual sólo conserva versión/etiqueta/reglas. |
| C18 | `src/lib/efeonce-insights/contracts/evidence.ts:143` | `EvidenceContentScopeV1` no registra host, versión de formato ni fingerprint. |
| C19 | `src/lib/efeonce-insights/editorial/editorial-v2.ts:569` | El plan toma la primera fuente SEO con alcance; no comprueba por sí mismo que todas coincidan. |
| C20 | `src/lib/efeonce-insights/request-hash.ts:10` | El hash canónico ordena claves, pero conserva el orden de los arrays. |
| C21 | `src/lib/efeonce-insights/stores/snapshot-store.ts:107` | El hash del snapshot incluye hechos, fuentes y rechazos, por lo que el nuevo alcance alterará naturalmente el hash de nuevas ediciones. |
| C22 | `scripts/seo/set-content-scope.ts:68` | La CLI rechaza cero reglas salvo `--clear`; el preview también depende de reglas no vacías. |
| C23 | `src/lib/efeonce-insights/commands/create-edition.ts:63` | La idempotencia usa el request validado, no la configuración viva del alcance. |
| C24 | `src/lib/efeonce-insights/commands/generation.ts:68` | `collecting` lee datos después de crear la edición y puede ejecutarse/reintentarse más tarde. |

### Probe reproducible sin I/O

Se ejecutó el módulo puro de contratos con `pnpm exec tsx -e`, sin crear un archivo de implementación.
El agente principal reprodujo los casos y guardó su recibo independiente en
`.captures/insights-sky-scope-2026-10-27/discovery-probes.json`.

| Entrada / comprobación | Resultado actual |
| --- | --- |
| Exacta `/equipaje-de-cabina` contra `https://blog.skyairline.com/equipaje-de-cabina/` | `true` |
| Misma regla contra `https://www.skyairline.com/equipaje-de-cabina/` | `true` |
| Parsear `{kind:'exact', path:'/equipaje-de-cabina', host:'blog.skyairline.com'}` | `ok:true`; elimina `host` del resultado. |
| `isContentScopeActive({hosts:['blog.skyairline.com'],rules:[]})` | `false` |
| Parsear un objeto envelope con `contractVersion`, `hosts` y `rules` | Rechazo: «Las reglas deben ser una lista». |

**Consecuencia:** añadir un campo desconocido a la regla o una columna opcional a la tabla no proporciona
compatibilidad segura con runtimes anteriores. Pueden ignorar el host y producir cifras de un universo más amplio.

## 3. Concerns y límites de decisión

| Concern | Dueño propuesto | Prioridad | Evidencia para aceptar |
| --- | --- | --- | --- |
| Población correcta del informe | SEO/Insights + operador de la cuenta | Bloqueante | Todo hecho reportado se reconcilia con URLs del alcance; no hay fallback amplio. |
| Regresión de Berel y lectores sin alcance | Growth SEO | Bloqueante | Mismas reglas, resultados, no-op y hashes legacy donde corresponda. |
| Coexistencia portal/worker con versiones distintas | Platform/Release | Bloqueante | Matriz old/new contra datos legacy/v2; binario viejo rechaza v2. |
| Paridad JS/SQL y coste de consulta | Growth Data | Alta | Casos adversariales en PostgreSQL real; clasificación por URL distinta y plan de ejecución medido. |
| Reproducibilidad de una edición | Insights | Bloqueante | Referencia por versión exacta, digest consistente, snapshot sellado inmutable. |
| Presencia y validez de las tres fuentes requeridas | Insights + Growth/AEO | Bloqueante | GA4 y GSC aplican el host; corrida AEO propia válida para la métrica reportada, con perfil/panel y denominador declarados. Citas URL pueden proceder de panel general; metadata URL común no sustituye estos controles. |
| Operabilidad API/MCP sin ampliar autoridad | API Platform/MCP | Alta | Contrato canónico, lectura gobernada o exclusión temporal explícita, sin gateway SQL. |

El alcance de medición **no es una frontera de autorización**: pertenecer a una organización/servicio no se decide
por hostname. Los comandos conservan sus controles de tenant/capability. El filtro sólo limita la población de
datos que se usa para una medición autorizada.

## 4. Alternativas comparadas

| Alternativa | Ventaja | Coste/riesgo | Veredicto de discovery |
| --- | --- | --- | --- |
| A. Configurar la propiedad GSC del blog y dejar el resto | GSC ya está así; no necesita código. | No cubre GA4, ranking, cola, ETV ni el sello del alcance. Cambio de propiedad futuro ampliaría el informe. | Insuficiente. |
| B. Usar `/blog` o enumerar slugs actuales | Reutiliza las reglas existentes. | `/blog` no corresponde al subdominio actual; slugs no distinguen host; artículos nuevos quedan fuera; límite de 50 reglas. | Descartar. |
| C. Añadir `host` a cada regla legacy | Poco cambio aparente. | El parser viejo lo descarta; con `prefix:'/'` además choca con el contrato actual. Permite silenciosamente cifras amplias. | Descartar para persistencia compatible. |
| D. Añadir `hosts_json` a la tabla, con `rules=[]` | Modelo relacional simple y cambio aditivo. | El reader viejo no selecciona la nueva columna y considera inactivo el alcance. Necesita una barrera adicional de compatibilidad real. | Viable sólo con fence adicional; no preferida. |
| E. Envelope discriminado v2 en `rules_json`, manteniendo arrays legacy | Un documento define host y rutas; parser viejo rechaza el objeto; conserva Berel sin reescritura. | Ampliar CHECK y actualizar los readers de configuración; nombre `rules_json` queda histórico. | **Recomendada para este corte**, sujeta a ADR. |
| F. Nueva tabla `url_scope_versions` y migrar consumers | Nombre limpio y permite ownership más amplio. | Dos fuentes/configuraciones durante transición; los readers viejos no ven la nueva tabla y caen a sin alcance. Requiere mecanismo explícito de denegación. | Demasiado coste para el corte; reconsiderar en una extracción formal. |
| G. Reglas OR de cláusulas `{hosts, pathRules}` | Expresa hosts con rutas diferentes, útil para migraciones históricas. | Más combinaciones y traducción SQL/GA4; no es necesario para host actual SKY ni carpetas Berel. | Futuro si aparece ese requisito; no introducir preventivamente. |

La recomendación E define la semántica mínima para SKY; no afirma que ya esté aceptada. Debe enmendar el contrato
del dominio SEO y §5.1 de la arquitectura Insights, registrando la decisión en `DECISIONS_INDEX.md` por el cauce ADR.

## 5. Contrato v2 propuesto

### 5.1 Separar tres identidades

1. **Versión del formato:** p. ej. `seo_url_scope_v2`; especifica cómo interpretar host y rutas.
2. **Versión de configuración:** entero append-only de cada organización; cambia por reglas, hosts o etiqueta.
3. **Fingerprint semántico:** digest de la forma canónica aplicada; detecta traducciones incompletas o pérdida de campos.

Nunca usar el número de versión de configuración para inferir el formato. Berel puede seguir en v1 configuración
y formato legacy; SKY puede comenzar en v1 configuración con formato URL v2.

### 5.2 Formas de almacenamiento

Legacy, sin reescribir filas existentes:

```json
[{"kind":"prefix","path":"/articulos"}]
```

Nueva forma con host:

```json
{
  "contractVersion": "seo_url_scope_v2",
  "hosts": ["blog.skyairline.com"],
  "rules": []
}
```

Para un alcance host+ruta, el mismo envelope agrega las reglas actuales. Una configuración nueva de carpetas sin
hosts puede seguir usando el array legacy. El parseador nuevo produce una unión discriminada browser-safe, con
una proyección normalizada para readers; no permite que los consumers decidan por separado cómo activar el filtro.

### 5.3 Tabla de verdad normativa propuesta

| Configuración | Activo | Pertenencia |
| --- | --- | --- |
| Sin fila previa | No, comportamiento legacy | El consumer legacy mide la propiedad conectada; un informe que exige blog lo rechaza en su gate. |
| Legacy `rules:[]` | No | Conserva el significado existente de sitio completo. |
| Legacy con reglas | Sí | Cualquiera de sus reglas por ruta; conserva semántica histórica sin host. |
| V2 `hosts:['blog.skyairline.com'], rules:[]` | Sí | Cualquier ruta válida de ese host, incluida la raíz. |
| V2 con hosts y reglas | Sí | Host exacto permitido **AND** al menos una regla de ruta. |
| V2 con hosts vacíos | Inválido para la primera versión propuesta | No se introduce un segundo encoding de alcance sólo por rutas. |
| V2 desconocido/malformado | Error tipado | Nunca sitio completo, ni array vacío de sustitución. |

`--clear` sigue creando una nueva versión vacía legacy cuando corresponde. Para un informe con alcance requerido,
eso **no autoriza** a medir todo: la referencia esperada del informe se valida fuera del fallback legado.

### 5.4 Configuración canónica y observaciones de URL

Las siguientes son decisiones propuestas para este contrato, no comportamientos actuales:

- Hosts configurados: nombres DNS ASCII/punycode explícitos, minúsculas, sin esquema, ruta, query, fragmento,
  puerto, userinfo, wildcard ni whitespace. Deduplicar y ordenar por bytes. No agregar `www` ni subdominios por inferencia.
- Entrada de configuración no canónica: rechazar con mensaje que muestre la forma esperada. Evita correcciones
  silenciosas que cambien el alcance que el operador creyó declarar.
- URL observada con restricción de host: debe ser absoluta HTTP/HTTPS, con authority válida; esquema/host se comparan
  sin distinguir mayúsculas. No hacer requests de red ni resolver DNS para decidir pertenencia.
- Userinfo, puertos no estándar, backslash en authority, host Unicode sin normalización acordada, esquema ajeno y
  protocol-relative se consideran no elegibles; registrar su ausencia cuando afecte cobertura. Como decisión mínima,
  aceptar puertos predeterminados explícitos (`http:80`, `https:443`) tras normalización idéntica TS/SQL, y rechazar otros.
- Una URL relativa sólo puede usarse contra un scope por host cuando el reader entrega un host de procedencia
  inequívoco, validado y separado. No pasar un `assumeHost` libre desde cualquier caller.
- Rutas: preservar la comparación byte a byte actual, mayúsculas y codificación porcentual. No decodificar `%2F`,
  resolver `..`, fusionar barras interiores ni pasar la ruta por un serializador URL que la recodifique.
- Query/fragmento no alteran pertenencia; trailing slash mantiene la equivalencia actual. `/articulos-x` sigue fuera
  de un prefijo `/articulos`. En host-only la raíz pertenece aunque su path comparable sea vacío.
- Host con punto final: rechazar en la primera versión propuesta en vez de asumir equivalencia DNS sin paridad medida.

Esta gramática debe quedar fijada en una sola spec con fixtures compartidos JS/SQL. Usar `new URL` sólo para extraer
host no es una prueba de paridad: el lector SQL necesita replicar cada decisión y la ruta debe conservar su forma cruda.

### 5.5 Igualdad, idempotencia y límites

- La clave legacy de `contentScopeKey(label,rules)` conserva sus bytes para scopes sin host. Reordenar y duplicar
  reglas no crea nueva versión, como hoy. Cambiar etiqueta sí la crea.
- V2 usa una clave distinta con discriminante, hosts canónicos, reglas canónicas y etiqueta trim. Reordenar hosts no
  crea versión; cambiar el host manteniendo la misma etiqueta/ruta sí la crea.
- El fingerprint se obtiene del encoding canónico por un helper server-only del **dueño Growth SEO**; no importar
  `efeonce-insights/request-hash.ts` hacia Growth. Evita invertir la dependencia en una futura extracción.
- El límite actual de 50 reglas sigue aplicándose. Proponer un límite acotado de hosts (p. ej. 10) requiere declararlo
  como decisión de producto/operación; SKY sólo necesita uno. No presentar ese número como límite ya existente.
- `setSeoContentScope` conserva el advisory lock por organización. El no-op inicial debe comprobar inactividad real
  del scope entero; `rules.length===0` ya no puede descartar un primer alcance host-only.
- Un cambio de configuración no invalida una edición sellada. Reutilizar la misma idempotency key de una edición
  ya creada sigue devolviendo esa edición; cambiar el alcance esperado en el request debe ser un request distinto.

## 6. Migración y coexistencia: la compatibilidad debe fallar cerrada

### 6.1 Expand seguro del almacenamiento

La migration nueva **no edita** `20261012145214417...` ya aplicado y no reescribe filas históricas.

1. Inspeccionar el nombre efectivo del CHECK actual; no asumir el nombre generado a partir del archivo histórico.
2. Sustituir la restricción de forma `array` por una restricción con nombre explícito que permita arrays legacy o
   el envelope v2 válido. Validar discriminante, hosts array no vacío y reglas array; reglas/hosts detallados se
   validan también en el command. JSON object desconocido no es «cualquier objeto permitido».
3. Mantener PK, FK, append-only, owner y grants SELECT/INSERT existentes. No relajar UPDATE/DELETE.
4. El guard final de migration comprueba CHECK nuevo, trigger append-only y objetos introducidos; probar que array
   legacy y objeto válido pasan, y JSON escalar/envelope desconocido/malformado fallan, en una base aislada de pruebas.
5. No ejecutar Down destructivo ni borrar la tabla para revertir código. El Down de la ampliación debe negarse si
   existen filas v2 incompatibles con el CHECK anterior; esas filas son auditoría durable.

### 6.2 Matriz de consumidores

| Binario | Datos actuales legacy | Datos v2 por host | Consecuencia deseada |
| --- | --- | --- | --- |
| Viejo que conoce TASK-2033 | Lee como antes | `parseSeoContentScopeRules` rechaza objeto | No produce cifras de propiedad amplia. Puede degradar el módulo; lifecycle debe impedir omisión inapropiada. |
| Nuevo | Preserva semántica y no-op | Aplica host y rutas | Misma población en readers, snapshot y plan. |
| Anterior a TASK-2033 | No consulta el alcance | Tampoco consulta v2 | **No hay protección por envelope**: nunca rollback a ese binario con informes requeridos habilitados. |
| Código parcial que conoce envelope pero aún ignora host | Podría pasar regresión legacy | Peligroso | No se despliega; el reader debe rechazar versión no soportada integralmente. |

### 6.3 Secuencia operativa recomendada

1. Aplicar expand de schema con code v1 vigente; no publicar aún un scope host-only.
2. Desplegar lectores/commands nuevos a todos los runtimes generadores, incluido `ops-worker`; comprobar versiones y
   pruebas de compatibilidad. Los reportes v2 aún no se habilitan por dato en este punto.
3. Comprobar el pipeline completo con fixtures sintéticos: CLI, readers, evidencia, plan, render y error requerido.
4. Vista previa read-only de datos SKY usando el scope propuesto como input; medir inclusiones/exclusiones y cobertura.
5. Fijar el alcance por command canónico y crear el request con referencia exacta por la operación autorizada.
6. Primera edición interna y readback desde el runtime que realmente generará informes. Activar recurrencia aparte.

### 6.4 Rollback con datos v2 ya presentes

El rollback no consiste en `--clear`, porque eso ampliaría la población de futuros informes. Pausar el trabajo que
exige v2 y conservar configuración/snapshots; usar una revisión nueva compatible del código o restaurar una versión
anterior de la **configuración correcta por host** mediante el command nuevo. Un binario anterior no puede fabricar
un equivalente legacy fiel a «todas las rutas de un subdominio».

La validación de `requestVersion` en create no protege por sí sola recover de una edición ya persistida:
`runCollecting` usa el request del store y el código viejo puede ignorar campos nuevos. Es necesario fijar un piso de
runtime para generation/recover/issue y validar el contrato al entrar a esas fases. El mecanismo de fencing adicional
si se pretende rollback automático con múltiples versiones requiere decisión explícita; no está resuelto con un flag.
El gate de lifecycle por alcance obligatorio y no omitible se detalla en el anexo de separación del informe.

## 7. Proyección a readers y evidencia

### 7.1 Reglas de dependencia

El contrato y matcher puros permanecen en `growth/seo/content-scope`; store/SQL/fingerprint server-only al lado.
GA4 recibe un filtro estructural neutral a SEO, equivalente al patrón actual de `Ga4LandingMatchRule`; no importa el
store ni la tabla SEO. Insights pide el alcance al reader dueño y pasa la misma proyección a cada fuente.

El gateway MCP no lee `seo_content_scope_versions`, ni implementa el matcher. La futura separación Growth→Marketing
Studio e Insights→dominio propio cambia el transporte, no la semántica ni la identidad de la medición.

### 7.2 SQL y rendimiento

- Mantener el patrón `gscPagesInContentScopeSql`: clasificar el **URL completo** una vez por página distinta en el
  rango; las filas de medición se seleccionan por ese URL, nunca por path sin host.
- Mantener parámetros tipados para hosts, rutas exactas y prefijos, y el mapa cerrado de columnas. Añadir el tercer
  array desplaza los índices `$n`; revisar todas las consultas que componen fragmentos, particularmente movers.
- El host se extrae con la gramática acordada, se normaliza en minúsculas y se compara por igualdad, no `LIKE` ni
  `ends_with`. Un `%` o `_` en una ruta conserva su significado literal.
- En movers clasificar sobre el rango que cubre ambas ventanas. Con una página sólo presente antes, el filtro no
  puede eliminarla por construir el conjunto a partir únicamente del mes actual.
- En cola mantener el predicado antes de `ORDER BY`/`LIMIT` y cursor. No traer cinco filas generales y filtrarlas
  después: puede quedar sin recomendaciones aunque existan cinco filas correctas más abajo.
- Proponer EXPLAIN/mediciones de la misma consulta con y sin host; no crear un índice funcional, columna generada o
  cache nuevo antes de medir. Conservar como gate la prueba existente de menos de 4 s, con desglose del entorno.
  El objetivo histórico de ~0,4 s es evidencia del patrón previo, no promesa de la ampliación.

### 7.3 Sello y pruebas de aplicación

La evidencia nueva debe conservar discriminante de formato, versión de configuración, hosts, reglas, etiqueta y
fingerprint aplicados. La forma legacy sigue siendo legible sin campos sintéticos ni rehash de snapshots antiguos.
El plan y render consumen ese sello; no vuelven a leer el alcance vigente.

Conviene que cada reader pueda devolver un recibo de alcance aplicado —identidad y semántica de filtro— que el
adapter verifique antes de sellar. Hoy el adapter estampa su configuración sobre fuentes devueltas; añadir hosts al
sello sin pasarlos efectivamente a GA4 permitiría una evidencia que declare una restricción no ejecutada. Si se evita
ampliar DTOs, el mínimo es un contrato de función estricto y pruebas que inspeccionen cada llamada y su resultado;
la decisión debe quedar explícita, sin presentar un sello del adapter como control independiente del provider.

`contentScopeOf` debe rechazar fuentes aplicables con versiones/fingerprints divergentes o sin sello cuando el
informe lo exige. La ausencia legítima de una fuente se expresa como rechazo, no inventando su receipt. Un hecho
de referencia externo debe declarar su población y no heredar un sello de recorte falso por una copia indiscriminada.

La igualdad de metadatos URL entre fuentes no prueba que la corrida AEO haya observado el blog. El gate debe verificar
la identidad original de perfil/panel/run, la población que mide y la ventana/fecha de observación pertinentes,
además de las restricciones GA4/GSC. No aplicar `isUrlInContentScope` a un score agregado y sellarlo como si hubiera
sido calculado para ese subconjunto. Si falta la corrida válida, registrar la causa y bloquear la entrega que exige
las tres fuentes; ni `allowPartial` ni un dato de referrals IA pueden completar esa evidencia.
Cuando el dueño AEO proyecte citas por URL del blog, debe conservar el denominador de la cohorte evaluada, incluidas
las respuestas sin cita del blog. Seleccionar sólo respuestas con citas exitosas fabricaría otro indicador.
La evidencia del anexo 05 encontró en la corrida del 3 de octubre 12 citas a URL del blog entre 634 citas y 60
observaciones de un panel general. Esa corrida puede alimentar una proyección canónica de citas del blog con su
denominador explícito; no autoriza a presentar los scores globales de la corrida como KPIs exclusivos del blog.
Por tanto, «perfil/panel válido» se evalúa según la métrica y la población declaradas, no como requisito universal
de crear un panel dedicado. Los recuentos de citas y de observaciones son unidades diferentes y no intercambiables.
El detalle del run y sus métricas está en el [anexo 05](05-aeo-engine-required.md).

## 8. Plan por archivo y función

| Archivo / seam | Cambio previsto | Prueba principal |
| --- | --- | --- |
| `growth/seo/content-scope/contracts.ts` | Unión de formatos, parser total, normalizador host, activación completa, matcher URL, canonical key. Conservar funciones legacy o wrappers para compatibilidad. | Matriz pura, invariantes de clave, host-only activo y claves desconocidas rechazadas en v2. |
| `growth/seo/content-scope/store.ts` | Decode array/envelope; command sin no-op falso; INSERT nuevo encoding; `readSeoContentScopeVersion(org,version)` y errores diferenciados. | Transacción, concurrencia, idempotencia, tenant/version inexistente, compatibilidad old/new. |
| Nuevo helper server-only del mismo dominio | Fingerprint de la clave canónica, sin dependencia de Insights. | Mismas entradas normalizadas producen mismo digest; cambiar host lo cambia. |
| Nueva migration | Expand CHECK estricto, guards, Down que no destruye historia. | Fresh/upgrade schema, legacy rows intactas, invalid input SQL, rollback con v2 rechazado. |
| `content-scope/sql.ts` | Predicado completo host+ruta; misma gramática que TS; actualizar parámetros. | Paridad en PG real con casos adversariales y URL NULL. |
| `overview/read-overview-kpis.ts` | Consumir filtro completo sin perder patrón páginas-distintas. | Sumas independientes, CTR y posición ponderada del alcance. |
| `overview/read-window-movers.ts` | Filtro completo sobre ambas ventanas e índices de parámetros correctos. | Páginas desaparecidas, aporte de queries y consistencia con totales. |
| `work-queue/reader.ts` | Host antes de límite/cursor; URL desconocida fuera. | Más de cinco oportunidades generales delante de las correctas; páginas sucesivas sin duplicar/saltar. |
| `scripts/seo/set-content-scope.ts` | `--host` repetible, preview host-only, mostrar fingerprint/formato, estado ausente vs versión vacía. | Dry-run no escribe; apply usa command; mismos criterios que SQL; CLI anterior rechaza envelope. |
| `efeonce-insights/contracts/evidence.ts` | Unión legacy/v2 y metadata aplicada. | Lectura de snapshots antiguos y fuentes nuevas completas. |
| `efeonce-insights/adapters/seo-adapter.ts` | Scope completo, matcher URL del ranking, GA4 host-aware, ETV excluido host-only, sello coherente. | Call assertions para actual/comparación; nada del dominio principal. |
| `editorial/editorial-v2.ts` / validación | Coherencia de fuentes, alcance desde snapshot, detalle host fuera de campos con restricciones incompatibles. | Fuentes mixtas rechazadas; cambiar configuración no altera plan sellado. |
| Docs arquitectura/skill/ledger/runbook | Decisión, formato, operación, evidencia de runtimes y límites. | Mirrors y gates documentales sobre archivos propios. |

Las modificaciones de GA4, requestVersion/binding, schedule y selección de módulos se coordinan con sus anexos.
Esta tabla no autoriza empezar código ni asigna números nuevos de TASK.

## 9. Matriz de aceptación y pruebas adversariales

Scope por defecto de los casos H: host `blog.skyairline.com`, sin reglas de ruta.

| Caso | Entrada/estímulo | Resultado esperado propuesto |
| --- | --- | --- |
| H01 | `https://blog.skyairline.com/` | Dentro. |
| H02 | `https://blog.skyairline.com/equipaje-de-cabina/` | Dentro. |
| H03 | `http://blog.skyairline.com/categoria/peru/?utm_source=x#seccion` | Dentro; esquema no altera pertenencia al host. |
| H04 | `https://www.skyairline.com/equipaje-de-cabina/` | Fuera, aunque el path sea idéntico. |
| H05 | `https://skyairline.com/` y reserva en otro host | Fuera. |
| H06 | `https://blog.skyairline.com.ejemplo.net/x` | Fuera. |
| H07 | `https://otroblog.skyairline.com/x` | Fuera. |
| H08 | `https://BLOG.SKYAIRLINE.COM/x` | Dentro tras normalización observada de host. |
| H09 | `https://blog.skyairline.com@evil.example/x` | Fuera por userinfo/authority. |
| H10 | `https://evil.example/?next=https://blog.skyairline.com/x` | Fuera. |
| H11 | URL relativa `/equipaje-de-cabina` sin host probado | Fuera; no inferir. |
| H12 | Host configurado con `/`, puerto, wildcard, whitespace o esquema | Error de configuración. |
| H13 | URL con puerto no estándar, protocol-relative o scheme ajeno | Fuera conforme a gramática propuesta. |
| H14 | Host-only con path vacío, query o fragmento | Dentro si la URL absoluta/authority es válida. |
| H15 | Host con punto final, Unicode ambiguo o backslash | Fuera y cobertura explícita si aparece. |
| R01 | Mismo host + prefijo `/articulos`, página `/articulos-x` | Fuera. |
| R02 | Mismo host + exacta `/guia`, página `/guia/` | Dentro. |
| R03 | Mismo host + exacta `/guia`, página `/guia/hija` | Fuera. |
| R04 | Path con `%`, `_`, `%2F` o mayúsculas | Comparación literal de la regla correspondiente, sin LIKE ni decodificación. |
| R05 | Host correcto, regla sólo `/peru`, página de otro path | Fuera por AND. |
| K01 | Hosts/reglas reordenados o duplicados | Misma identidad, no nueva versión. |
| K02 | Mismos label/rules, host distinto | Identidad diferente y nueva versión. |
| K03 | Primer scope host-only con rules vacías | Inserta v1 de configuración; no no-op v0. |
| K04 | Dos escrituras simultáneas | Versiones consecutivas/no duplicadas o no-op según contenido, con lock canónico. |
| B01 | Reader viejo contra envelope | Error; nunca alcance inactivo/sitio completo. |
| B02 | Parser viejo con `host` agregado a regla | Probe demuestra que lo elimina: no usar esa representación. |
| B03 | Nueva configuración Berel idéntica | No-op; no reescritura histórica ni cambio de resultados. |
| E01 | Actual v1 y comparación v2 accidentales | Gate rechaza incoherencia; no imprime delta. |
| E02 | Fuente GA4 sin receipt y otras con host | No sellar como si todas aplicaran el host. |
| E03 | Cambia latest tras crear request diferido | Generación usa referencia fijada, no latest, según contrato de lifecycle. |
| E04 | Recovery collecting después de cambiar latest | Usa versión fijada; no cambia de población por reintento. |
| E05 | Unclear/unknown schema versión o DB no disponible | Error de contrato explícito; allowPartial no convierte el informe requerido a otro universo. |
| E06 | GA4/GSC recortados al blog; no existe corrida AEO propia válida para la métrica reportada | Informe requerido bloqueado; no sustituir la corrida por visitas desde asistentes IA. Un panel general sí puede servir a una proyección canónica de citas URL con su denominador declarado. |
| E07 | Score AEO general de SKY más metadata `host=blog.skyairline.com` añadida por el adapter | Rechazar como evidencia AEO del blog: el sello no modifica la población observada por el run. |
| E08 | Las tres fuentes declaran el mismo host, pero la métrica AEO no corresponde a la población de su perfil/panel o la corrida está fuera de la ventana pertinente | Rechazar la fuente y bloquear el informe completo; verificar correspondencia de métrica/población y vigencia además del digest URL. No rechazar un panel general sólo por ser general cuando se proyectan citas URL correctamente. |
| P01 | Clasificación TS vs SQL | Misma pertenencia para todos los fixtures y muestra real completa de URLs. |
| P02 | Cola con URLs correctas después de límite general | Devuelve top del alcance, no top general filtrado posteriormente. |
| P03 | Comparación con página desaparecida | Conserva su contribución en comparación y en caída por URL/query. |
| P04 | Snapshot legacy sellado leído tras despliegue | Mismo hash/plan/salidas existentes; sin reinterpretación por config nueva. |

No es suficiente ampliar los tests legacy con un mock `hosts` que no viaja a SQL. La aceptación requiere:
tests puros, paridad contra PostgreSQL real, readers reconciliados con suma independiente, old/new compatibility,
contratos de adapters y primera ejecución del pipeline. Los tests live existentes de alcance son read-only según
sus fuentes, pero no se ejecutaron como parte de este subencargo. Pruebas de migración/concurrencia nuevas deben
usar fixtures/entorno de prueba autorizado y jamás mutar la configuración de Berel o SKY para «probar».

## 10. API, CLI, MCP y exclusiones razonadas

Full API Parity exige primitive única y ruta programática gobernada; no obliga a ampliar de inmediato los permisos
de escritura del gateway. Estado actual verificado: CLI sobre command; TASK-2033 conserva pendiente Slice 6 de lectura
`get_seo_content_scope`; escrituras App/Ecosystem/MCP se documentaron como follow-up.

| Superficie | Contrato propuesto para este corte | Límite |
| --- | --- | --- |
| CLI operador | Leer latest/by-version, preview y set de host por el command canónico. | Misma validación; reason/actor obligatorios en apply. Nunca SQL ad hoc para fijarlo. |
| API App | Reusar reader/request binding para que el primer consumidor formal no tenga lógica propia. | Nueva escritura requiere capability auditada y decisión de alcance; no exponer por inferencia. |
| API Ecosystem | Reader gobernado de scope vigente y por ref, con aislamiento de organización. | No query params con organizationId libre que amplíen tenant; resolver autorización primero. |
| MCP lectura | Cerrar Slice 6 sobre el reader, manifest, gateway federation/paridad y canary. | Puede ser unidad dependiente si la primera entrega usa CLI/API; documentar exclusión temporal y criterio de cierre. |
| MCP escritura | Diferida explícitamente a capacidad propia. | No ampliar scopes compartidos; gateway conserva adapter neutral y nunca acceso a DB. |
| UI de configuración | No necesaria para primer informe. | Puede consumir el mismo command después; no diseñar editor que se vuelva el dueño de la regla. |
| Worker | Misma proyección/ref fijada que App. | No fallback ni resolución alternativa de hosts por entorno. |

El endpoint/tool exactos y su capability deben verificarse al autorizar la implementación. No inventar nombres ya
desplegados ni dar Slice 6 por terminado porque exista el reader local.

## 11. Decisiones y unknowns que quedan abiertas

1. Ratificar el envelope v2 frente a columna nueva con fence equivalente. El riesgo de silent-ignore está probado.
2. Aprobar la gramática mínima de hostname/authority, incluyendo puertos estándar, trailing dot e IDN. Ninguno debe
   decidirse por diferencias accidentales entre parser JS y SQL.
3. Fijar límites de hosts y política de claves desconocidas para v2. El parser legacy se conserva para historia,
   pero el parser nuevo no debe tragar un campo que en apariencia limita el scope y luego eliminarlo.
4. Ratificar fingerprint, lectura por versión y relación con el binding requerido del request. El instante de
   resolución actual es collecting; cambiarlo es un contrato de lifecycle, no un detalle del matcher.
5. Escoger piso de runtime y mecanismo de retorno tras persistir v2. Envelope protege lectores TASK-2033 viejos,
   pero no código que nunca consulta alcance ni recuperaciones que ignoren nuevas garantías del request.
6. Definir si los receipts de lectores serán parte de DTOs o si se acepta un mínimo basado en contratos/tests de
   llamada. El sello por sí solo no prueba que Google/SQL hayan aplicado el filtro declarado.
7. Verificar el estado vivo por runtime antes del rollout; referencias históricas de «sin release» no son prueba actual.

La implementación queda preparada para descomponerse en contrato/persistencia, lectores/provider, lifecycle,
operación y verificación. Este discovery no mueve tasks a complete ni autoriza cambios de datos o despliegue.
