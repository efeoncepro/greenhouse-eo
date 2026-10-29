# Prospectar con Sales Navigator desde la sesión de Chrome

**Último corte:** [gerencias, agencias y contratación](../../commercial/prospects/servicios-financieros-chile-2026-10/GERENCIAS-AGENCIAS-Y-CONTRATACION-2026-10-29.md)
registra 54 cuentas/57 personas. Priorizar gestión específica de agencias/proveedores o presupuesto de área;
separar responsabilidad actual de trayectoria y liderazgo potencial de autoridad contractual confirmada.
La [política](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md) gobierna revisión A/B.
Las cifras de cortes anteriores que siguen conservan su fase histórica.

**Gate comprador vigente:** Julio excluyóCommunityManagers y ejecución pura como prospectos por afinidad de servicio. Priorizar liderazgo funcional con posibilidad de impulsar contratación; operadores/validadores quedan en investigación. Ver [política](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md) y [resultado corregido47cuentas/37personas](../../commercial/prospects/servicios-financieros-chile-2026-10/AMPLIACION-Y-CRITERIO-COMPRADOR-2026-10-29.md). Los cortes previos que siguen son históricos.

Ruta ejercitada el **29-10-2026**, con Julio Reyes autenticado en Chrome, perfil Julio.
Marco: [método aprobado](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md),
[funcionamiento](../../documentation/comercial/prospeccion-b2b.md) y
[skill](../../../.codex/skills/efeonce-b2b-prospecting/SKILL.md).

## Acceso y alcance

**Plan contratado: Sales Navigator Core. Saldo leído en Ajustes el 29-10-2026: 150 InMail disponibles.**
La declaración inicial de Julio fue 50; queda como antecedente, no saldo actual ni periodicidad confirmada.
Aplicar la [política de conexiones e InMail](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md):
primer grado → mensaje directo dentro del mandato; no conectado → solicitar conexión y esperar aceptación
antes del abordaje. InMail se reserva para alta relevancia o valor estratégico por tiempo/ventana, con
justificación por persona y comprobación del saldo/costo. No asumir reposición ni saldo permanente.

Usar la pestaña abierta de `linkedin.com/sales/` mediante `mcp__cua_repl`: permite lectura DOM,
locators Playwright y accesibilidad sobre la sesión existente. Cargar su documentación en cada runtime
nuevo y usar la entrada que corresponda a la pestaña conocida; inventariar si hace falta localizarla.
Los IDs y handles del ensayo no son reutilizables entre runtimes.
No se precisó un perfil aislado, copiar cookies, exportar storageState ni usar endpoints internos.
No se probó un runner Playwright MCP/CLI separado. En las ampliaciones se usaron también acciones nativas
y teclado cuando un checkbox o menú no respondía al locator; resolverlos desde estado/screenshot fresco.

El primer recorrido fue investigación interactiva y acotada. Mandatos posteriores del mismo día autorizaron
configurar servicios/Personas y guardar cuentas/personas en listas; sus readbacks se documentan abajo.
Guardar búsquedas/activar alertas, conectar, enviar mensajes/InMail, gastar créditos y escribir CRM siguen
siendo acciones distintas que requieren mandato aplicable. No se ejecutaron comunicaciones, consumo ni
escrituras CRM. Visitar un perfil puede quedar registrado por LinkedIn según su configuración vigente;
no se modificó esa configuración. Este adapter no implementa un runner desatendido ni persistencia de sesión.

## Recorrido verificado

1. Inicializar `cua_repl` con la única entrada que corresponda según su documentación. Usar `cua.getState()`
   cuando se necesite inventariar superficies, o resolver directamente la pestaña conocida de Sales Navigator.
   Confirmar actor por el menú de perfil; no inferirlo por tener acceso a LinkedIn.
2. En **Cuentas → Tus cuentas**, abrir una empresa ya guardada. Comprobar nombre, entidad,
   industria, sitio y contexto. Un clic puede abrir otra pestaña: si la original no cambia,
   consultar el inventario antes de repetirlo. No confundir filial y grupo.
3. En la cuenta, abrir **Ver a los N empleados en la página de resultados de búsqueda**.
   Confirmar el chip **Empresa actual**. El número N cambia; resolverlo desde la UI fresca.
4. **Ampliar filtro de Función → Añadir funciones → Marketing → Incluir**.
   Confirmar el chip seleccionado y contraer el filtro.
5. **Ampliar filtro de Ubicación → Chile → Incluir**. Confirmar chip y resultados.
   Los nombres accesibles pueden incluir conteos variables: nunca fijar un conteo histórico.
6. Leer una muestra útil: nombre, cargo actual, entidad, ubicación, grado de conexión,
   contactos en común, antigüedad, actividad y URL observada. Cargo/función no prueban autoridad,
   intención de compra ni correo. Buscar objetivo y contactos adicionales según el método B2B.
7. Abrir el nombre de una persona. Puede aparecer un **panel de detalles en la misma búsqueda**;
   esperar su encabezado de perfil y **Cargo actual**, sin asumir navegación de URL.
   Distinguir titular genérico y puesto actual. Leer actividad y relación para contextualizar acceso.
8. Cerrar el panel con su **Descartar**, usando scope inequívoco si existe otro botón homónimo.
   Probar **Página 2** sólo cuando la UI la ofrezca; comprobar indicador y personas cargadas.
9. Entregar shortlist con fuente/fecha, hechos, hipótesis, relación, brechas y siguiente validación.
   Guardarla en una lista de Sales Navigator no requiere email. Sin correo corporativo individual
   verificado, mantenerla fuera de nuevas altas normales de Contact/Lead CRM.
   Antes de acercamiento real, conciliar expediente, contactos previos, HOLD y negativas.

Después de cada interacción, leer estado fresco (`getAXState` o `domSnapshot`). Si la instantánea aún
muestra esqueletos de carga, comprobar el encabezado esperado antes de interpretar resultados.
Las filas se cargan al entrar en vista: un checkbox con nombre o un esqueleto no prueba cargo ni perfil
completo. Para más cobertura, desplazar/paginar de forma acotada y leer las filas efectivamente cargadas.

## Patrón Playwright observado

Fragmento para `cua_repl`, después de inicializar el tool y obtener la pestaña según su documentación.
`tab` representa el handle de la pestaña autenticada; no es un script CLI autónomo.

```js
await tab.playwright.getByRole('button', {
  name: 'Ampliar filtro de Función', exact: true
}).click();
nodeRepl.write(await tab.playwright.domSnapshot());
// Con el combobox confirmado por la instantánea:
await tab.playwright.getByRole('combobox', {
  name: 'Añadir funciones', exact: true
}).fill('');
await tab.playwright.getByRole('combobox', {
  name: 'Añadir funciones', exact: true
}).pressSequentially('Marketing');
nodeRepl.write(await tab.playwright.domSnapshot());
// Con el botón confirmado por la instantánea:
await tab.playwright.getByRole('button', {
  name: 'Incluir «Marketing» en el filtro Función', exact: true
}).click();
nodeRepl.write(await tab.playwright.domSnapshot());
```

Preferir roles/nombres observados a IDs Ember o coordenadas. Para UI inaccesible, usar screenshot y
acciones nativas documentadas y comprobar el resultado de cada interacción. Si la sesión caduca o aparece
un control de acceso, respetarlo y resolver la sesión con el operador; no usar rutas equivalentes para eludirlo.

## Evidencia del ensayo 29-10-2026

- Cuenta: [Bata Chile](https://www.linkedin.com/sales/company/701341), ya guardada antes del ensayo.
- La ficha mostraba 784 empleados; la búsqueda sin filtros adicionales, 789 resultados.
  Son lecturas distintas de LinkedIn y no se presentaron como una plantilla laboral certificada.
- **Empresa actual = Bata Chile; Función = Marketing; Ubicación = Chile: 28 resultados**, dos páginas.
  Segunda página verificada con indicador `Página 2 de 2` y tres resultados cargados.
- Muestra leída: Jose Patricio Caceres Leal (Subgerente de E-commerce, 2º), Gabriela Madariaga Espinoza
  (Brand Manager Bata, 1º), Ignacio Andres Silva Cuevas (Senior Brand Marketing Manager, 2º),
  Antonella Diomedi (Brand Manager, 1º) y Gisella Pizani (Jefe Visual Merchandising, 2º).
- Perfil abierto: [Ignacio Andres Silva Cuevas](https://www.linkedin.com/sales/lead/ACwAABwXtzgBY5FeeotTlVh3a51AEmzufhbtRQc,NAME_SEARCH,SCUk).
  Cargo actual desde julio de 2025, 44 contactos en común y publicación de hace tres semanas.
  La publicación agradece a Inbrax como partner de campañas: evidencia contextual de proveedor existente,
  no compra abierta ni negativa hacia Efeonce. No se verificó su correo ni autoridad de contratación.
- Captura local ignorada por Git: `.captures/sales-navigator-2026-10-29/marketing-chile-profile.jpg`.
  No se conservaron cookies, tokens ni payloads de red.

En el primer ensayo no se probaron envíos, integración CRM, exportación masiva, búsqueda de cuentas nuevas,
filtros de cargo o responsabilidad, guardado de listas ni ejecución desatendida. No se promete persistencia de sesión.
El próximo uso debe comprobar acceso y UI actuales; esta evidencia no certifica resultados futuros.

## Shortlists con filtros laterales — aplicación BCI 29-10-2026

Por corrección de Julio, partir de los filtros laterales; keywords sólo complementan. En cuentas nuevas,
usar industria, sede y tamaño para definir universo; en una cuenta elegida como Bci, confirmar la entidad
y pasar a personas. [Guía oficial](https://www.linkedin.com/help/sales-navigator/answer/a10728097) y
[definiciones actuales](https://www.linkedin.com/help/sales-navigator/answer/a1468001).

- Base de personas: Empresa actual exacta + ubicación de la persona + función pertinente.
- Pasada de liderazgo: añadir Nivel de responsabilidad. No confundir clasificación con autoridad de compra.
- Pasada de cobertura/acceso: retirar seniority y usar Contacto de 1er grado, o ampliar a segundo grado.
  Validar el cargo/alcance en cada perfil y deduplicar entre pasadas; no sumar conteos solapados.
- Si el objetivo es nominal y no aparece por función, usar **Ver todos los filtros → Nombre/Apellidos**
  manteniendo la empresa exacta. Su función puede estar clasificada de otra manera.
- Cambios de empleo, actividad y afinidad ayudan a priorizar después del encaje; no prueban compra.

[BCI](../../commercial/prospects/contactos-conocidos-banca-retail-2026-10/BCI-SALES-NAVIGATOR-2026-10-29.md):
Marketing/Chile/Director o Gerente con experiencia produjo 7 resultados; Marketing/Chile/1er grado produjo
16. Renzo se revalidó con el filtro Nombre. Perfiles y funciones reales deciden la shortlist; Market Making
fue un falso positivo aunque apareciera en Marketing. No se guardaron leads ni búsquedas nuevas.

**Cargo actual:** en esta sesión el selector no ofreció sugerencias y el intento Boolean no generó chip
ni query; no quedó aplicado. No repetir variantes ni inferir que no existen esos cargos. La
[guía Boolean](https://www.linkedin.com/help/sales-navigator/answer/a168061?lang=en) documenta Title,
pero su soporte escrito no prueba el comportamiento de cada interfaz. La
[FAQ de Personas](https://www.linkedin.com/help/sales-navigator/answer/a1422192) limita títulos de Personas
a estandarizados; no extrapolar esa restricción a Search sin evidencia. Continuar con filtros verificados
y declarar la cobertura. No prescribir un script de Cargo actual como validado hasta probar su chip y resultados.

## Búsqueda de cuentas — servicios financieros en Chile 29/10/2026

Ejercitado en **Cuentas → búsqueda → Ver todos los filtros**, Core/Julio. Se abrieron los 14 filtros
operables y se observó el control CRM bloqueado. Inventario de las **15 familias de filtros visibles**:

| Familia / filtro | Opciones observadas y uso |
| --- | --- |
| Características / Ingresos anuales | Moneda, mínimo/máximo en millones, botón Añadir. USD por defecto; CLP no estaba entre las monedas ofrecidas. Límites 0/0,5/1/2,5/5/10/20/50/100/500/1000; máximo 1000+. No se aplicó rango. |
| Empleados en la empresa | Ocho bandas: 1–10, 11–50, 51–200, 201–500, 501–1.000, 1.001–5.000, 5.001–10.000, 10.001 o más. Selección múltiple; aplicadas las seis desde 51. |
| Aumento de empleados en la empresa | Mínimo/máximo porcentual y Añadir; no se aplicó. La definición oficial usa últimos 12 meses. |
| Ubicación de la sede central | Región o código postal; buscador con Incluir/Excluir. Se aplicó Chile; filtra sede, no toda presencia local. |
| Industria | Buscador con Incluir/Excluir. Servicios financieros incluye sus subindustrias; aplicado el padre sin keywords. |
| Número de seguidores | Más de 5.001; 1.001–5.000; 101–1.000; 51–100; 1–50. Audiencia LinkedIn, no presupuesto. |
| Empleados en el departamento | Selector de departamento (Marketing, Arte y diseño, TI, Producto, Ventas, etc.), mínimo/máximo y Añadir. Aplicado Marketing con campo mínimo 3; chip visible «Marketing: > 3». No inferir igualdad interna. |
| Aumento de empleados en el departamento | Departamento + mínimo/máximo porcentual y Añadir; últimos 12 meses según definición oficial. No aplicado. |
| Fortune | Fortune 50, 51–100, 101–250, 251–500. Todos mostraban 0 en el universo Chile/financieros; no aplicado. |
| Spotlights / Oportunidades de empleo | Contratando en LinkedIn. Vacantes, sin función específica en este selector; no equivale a compra de agencia. |
| Actividad reciente | Cambios en la directiva en últimos 3 meses; recaudación de fondos en últimos 12 meses. Ventanas leídas de esta UI; no aplicadas. |
| Contacto | Contactos de 1er grado. Aplicado; cuentas con algún conectado, no necesariamente comprador/Marketing. |
| Proceso / Empresas en el CRM | Deshabilitado, «Para activar el filtro, actualiza el contrato». Core no ofrece CRM Sync; no confundir con un fallo de autenticación HubSpot. |
| Cuentas guardadas | Todas mis cuentas guardadas. Acota investigación a lo ya guardado; no guarda cuentas nuevas por sí mismo. |
| Listas de cuentas | Buscar listas, Incluir/Excluir: todas las listas o lista específica existente. Permite separar cartera actual y descubrimiento; en esta pasada se inspeccionó el selector. La creación/membresía se ejercitó después, como operación distinta. |

Keywords es un control separado; no se usó en este caso. Fijar filtros modifica qué se ve primero,
no sustituye «Ver todos los filtros»; no se cambiaron preferencias. Compartir, guardar búsqueda/alerta,
seleccionar/guardar cuentas y Ver empleados actuales son acciones distintas de un filtro: su presencia
no acredita ejecución ni autoriza guardados o comunicaciones.

**Receta verificada:** sede Chile + industria Servicios financieros → 3 mil+; añadir rangos 51+ → 295;
añadir Contacto primer grado → 31; añadir Marketing con mínimo 3 (etiqueta >3) → 28. Dos páginas leídas.
El umbral de Marketing es exploratorio. Los rangos 51+ aproximan el piso corporativo de 50 personas para
evaluar nuevos clientes de servicios; la banda 11–50 requiere confirmar al menos 50. Headcount LinkedIn no
certifica plantilla ni presupuesto. [Canon ICP](../../context/13_icp-buyer-personas-jtbd.md#tamaño-de-la-cuenta-en-la-calificación-comercial).
**295 es la base firmográfica; 31 y 28 son pasadas de acceso**, no un ranking de los mejores compradores.
Conservar la búsqueda sin relación como base: una conexión en la empresa no garantiza acceso al interlocutor
de mayor valor. Julio lo señaló como hipótesis propia; no es una distribución comprobada de toda su red.
[Cuentas, depuración y cobertura](../../commercial/prospects/servicios-financieros-chile-2026-10/SALES-NAVIGATOR-2026-10-29.md).

**Interacción importante:** en esta sesión `fill('Chile')` dejó texto visible sin renovar sugerencias.
Después de leer ese estado, vaciar y usar `pressSequentially('Chile')` sí produjo opciones pertinentes.
En el spinbutton, llenar 3 no habilitó Añadir; ArrowUp y ArrowDown produjeron el valor 3 validado, luego
Añadir generó el chip y la query. Verificar siempre el chip/query y el resultado, no sólo texto en el input.
Esto no demuestra que el problema anterior de Cargo actual tenga la misma causa: sigue sin revalidar.
Añadir en el filtro de departamento lo contrae automáticamente; leer el estado antes de intentar cerrarlo.

La búsqueda amplia se limita a [1.000 cuentas / 40 páginas visibles](https://www.linkedin.com/help/sales-navigator/answer/a106030).
Para cobertura, dividir por tamaño/subsector; no sumar conjuntos solapados. Para multinacionales con presencia
chilena, una sede extranjera requiere otra pasada y validación de la entidad local. La ampliación fintech
sí se ejercitó: sede Chile + 51+ + Desarrollo de software + keyword `fintech` devolvió Haulmer, Transtecnia e
Ionix. Se priorizaron las dos primeras; Ionix necesita una tesis propia de infraestructura/identidad. No es
un censo fintech: la taxonomía LinkedIn y el filtro de sede no certifican actividad regulada ni toda presencia local.
Fuentes: [definiciones](https://www.linkedin.com/help/sales-navigator/answer/a1461507),
[taxonomía oficial](https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2),
[Contacto en cuentas](https://www.linkedin.com/help/sales-navigator/answer/a1507484) y
[planes](https://www.linkedin.com/help/sales-navigator/answer/a104003/sales-navigator-account-types-overview?lang=en).
Las recetas técnicas se contrastaron en la UI; inspeccionar un control no equivale a aplicar todas sus opciones.

## Configurar servicios y Personas — operación autorizada 29/10/2026

[Portafolio y modelo ICP](../../commercial/sales-navigator/PORTAFOLIO-E-ICP-2026-10-29.md) y
[readback estructurado](../../commercial/sales-navigator/PORTAFOLIO-CONFIGURADO-2026-10-29.json): doce servicios,
cinco Personas persistidos por mandato explícito de Julio. Este permiso de configuración no autoriza envíos.

- Ajustes → Perfil: verificar plan y saldo. Productos y servicios → Añadir → Añadir nuevo: nombre +
  landing exacta → Analizar página → revisar descripción/categoría → Guardar. El análisis produjo textos
  automáticos en inglés; se sustituyeron por copys en español sustentados en sitio y canon. En Editar,
  la URL se mostraba como texto de sólo lectura; no se ejercitó cambiar una URL existente.
- Perfil ideal → Ver: máximo cinco. Se adaptaron los dos genéricos y se crearon tres por papel comprador.
  Cada Persona admite función, seniority, cargos normalizados y ubicación; el ICP firmográfico se aplica
  en la capa de cuentas/búsqueda. Las cinco guardadas quedan sin país/industria/primer grado fijos.
- Cargo actual **sí devolvió sugerencias en Personas** usando entrada secuencial: SEO, Content, Brand,
  Creative y Product/Web. Seleccionar un cargo vacía el buscador; volver a consultar para el siguiente.
  Ese éxito no revalida automáticamente el selector de Search que falló en el ensayo anterior.
- `fill` por sí solo llegó a dejar el texto visible con contador/estado anterior. Se validó llenar el prefijo
  y teclear el último carácter para disparar el evento; leer contador/valor antes de Guardar. Para catálogos,
  esperar las sugerencias de la consulta actual, no seleccionar la lista anterior aún durante carga.
- Verificar chips antes de guardar y releer después. Para quitar criterios se usó eliminación individual
  de chips; una acción de Borrar no bastó como prueba de que el criterio ya no estuviera persistido.
  Guardar puede cerrar/reconstruir el diálogo: esperar estado final antes de la siguiente acción.
- Recargar y abrir Editar en cada servicio para comparar nombre, URL, descripción y categoría. Abrir Ver
  y esperar un perfil concreto antes de contar Personas: una lista aún cargando no es una lista vacía.

Pruebas del corte inicial de cuatro servicios en BICE VIDA: SEO/AEO 2 resultados, Marca 4, Dirección 11 tras ampliar niveles gerenciales y
retirar títulos demasiado restrictivos. No sumar como personas únicas. La clasificación puede excluir
responsables conocidos o incluir otra unidad: usar una pasada complementaria sin seniority/títulos y
revisar cargo real. [Personas oficiales](https://www.linkedin.com/help/sales-navigator/answer/a1422192).

Ampliación del mismo día: Web, HubSpot/RevOps, Contenidos, Redes, Influencers/UGC, Medios, Performance e
Inbound/Loop añadidos y releídos. Personas consolidadas para cubrir marketing, search/social, creatividad/influencia,
web/producto y CRM/cliente. P5 con Empresa actual: BCI15, BICE VIDA0; revisar cargos y usar respaldo sin Persona
cuando la normalización omita responsables. Las doce fichas guardadas no establecen el máximo de servicios.

La revisión cubre el portafolio público completo documentado, no sólo SEO/AEO/creatividad: Web, HubSpot/RevOps,
contenidos, redes, influencers/UGC, medios, performance e Inbound/Loop. El modelo separa ICP, JTBD, buying group,
señales y antifit por frente. Capacidades sin landing propia verificada quedan en el modelo interno; no inventar
URLs ni presentar Salesforce con la landing HubSpot. Factory On-Demand es forma de compromiso; Run & Gun y
programática son carriles de sus prácticas. Capacidades propuestas o plataformas hibernadas no se vuelven
oferta operable por escribir una ficha. Las doce fichas personales aceptadas tampoco acreditan todas las
funciones de IA de otros planes ni productos compartidos por administrador.

## Guardar cuentas en listas — mandato 29/10

[Cartera y evidencia](../../commercial/prospects/servicios-financieros-chile-2026-10/CARTERA-Y-LISTAS-2026-10-29.md):
tres listas creadas por sector (banca; seguros/inversiones; fintech/pagos): 31 cuentas únicas con membresía
nominal verificada. Los contadores sumaron 32 (10/10/12); Haulmer es la asociación adicional contradictoria.
Guardar a una cuenta abre selector de listas; Crear lista permite nombre75 y descripción350, y Crear y guardar
incluye la cuenta en la lista y en todas las guardadas. En bloque, verificar nombres y estado de selección
antes de elegir lista. La selección puede persistir después de guardar; no asumir que se vacía.

Los checkboxes dieron acciones sin cambio de estado y se observó navegación de fila al usar etiquetas.
Teclado Space fue útil para seleccionar, pero cada lote necesita comparar los nombres seleccionados con los
previstos antes de escribir. El readback detectó cruces entre listas y se corrigieron sin dejar de guardar
las cuentas: menú de fila → Eliminar de la lista → opción sólo esta lista. Enter permitió operar menús que
cerraban antes de un click. No elegir quitar cuenta y contactos asociados para corregir una simple membresía.

Ver listas de cuentas muestra nombres, contadores y URLs. Abrir cada lista, releer filas por identidad y
comparar el conjunto, no sólo el contador. Haulmer mostró guardado/una lista y contador agregado, pero
no fila ni resultado nominal dentro de la lista; queda incertidumbre explícita, sin atribuirla a indexación.

## Listas de personas por servicio — ampliación autorizada

[Taxonomía y miembros](../../commercial/prospects/servicios-financieros-chile-2026-10/LISTAS-PERSONAS-POR-SERVICIO-2026-10-29.md):
cinco listas pobladas, 23 identidades únicas y 23 membresías verificadas; empresas por sector y personas por
frente de servicio. Nombre75/descripción350. El prefijo `Efeonce | Finanzas CL | <frente>` identifica la cohorte
de empresas, no exige que cada persona esté en Chile ni fuerza fecha de caducidad a listas de trabajo.
Posibles clientes → Crear lista de posibles clientes permite preparar la lista vacía; luego, en cada perfil,
verificar identidad y Cargo actual → Guardar → lista exacta. Si ya está guardado, abrir Añadir a una lista
personalizada. La confirmación nativa nombra persona y lista; Guardado por sí solo no prueba membresía.

Un perfil puede exponer dos botones Guardar equivalentes (cabecera y otro control); desambiguar el control
inspeccionado. Enter resultó fiable. Esperar que carguen las listas antes de elegir; no cambiar de perfil
hasta leer la confirmación. Recargar inventario, abrir cada lista y comparar nombres/cantidad con el manifest.
No usar un lote seleccionado de otra búsqueda ni inferir membresía por el contador de todas las personas guardadas.

Las cinco listas cubren Search/SEO-AEO/contenidos/social; marca/creatividad/influencia; growth/medios/inbound;
web/producto/experiencia; y CRM/RevOps/lifecycle. La última lectura comparó todos los nombres de las cinco
listas después de recargar. El manifiesto conserva identidades exactas, cargos, empresas, fuente y conteos;
las listas anteriores se preservaron. Guardar y clasificar no acredita demanda, autoridad ni contacto realizado.

## Separar objetos y cerrar el readback

| Objeto | Propósito y verificación |
| --- | --- |
| Búsqueda de cuentas | Industria, sede, tamaño y señales definen universo; leer chips/query y muestra real. |
| Lista de cuentas | Clasifica empresas por sector/cohorte; abrir y comparar todas las identidades previstas. |
| Persona / perfil ideal | Reutiliza criterios de roles; aplicar dentro de la cuenta y validar cargos actuales. No es todo el ICP. |
| Producto/servicio personal | Describe oferta y landing para personalización; releer los campos persistidos. No modifica el sitio público. |
| Lista de posibles clientes | Organiza personas por frente de servicio; verificar perfil, confirmación persona/lista y membresía tras recarga. |
| CRM o comunicación | Tiene identidad, admisión y mandato propios; no se deriva de ninguno de los objetos anteriores. |

El loop es observar → actuar una vez → esperar estado concreto → leer resultado → conciliar → continuar.
No interpretar esqueletos como cero resultados ni una instantánea de un modal que se está cerrando como estado
persistido. Para entrada larga, llenar el prefijo y teclear el último carácter evitó timeouts de tecleo completo;
para catálogos cortos, vaciar y escribir secuencialmente. Confirmar contador, sugerencias actuales, chip y valor
guardado. Si una escritura queda ambigua, comprobar identidad/membresía antes de reintentar; un contador o
notificación agregada nunca sustituye el readback nominal. Las recetas son evidencia fechada, no garantías
de estabilidad de la UI ni autorización de automatización masiva.
