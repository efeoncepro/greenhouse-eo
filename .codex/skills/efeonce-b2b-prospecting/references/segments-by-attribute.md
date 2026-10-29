# Segmentos por atributo común

Un segmento responde «¿qué tienen en común estos registros?» con un atributo del propio registro o de su
empresa. Si la respuesta es «los que alguien eligió», es una lista manual, aunque el CRM la muestre como
activa: no crece sola y no se cruza con los demás segmentos.

Procedimiento, sintaxis e IDs del portal: [segmentación HubSpot](../../hubspot-as-a-service/references/prospecting-segmentation.md).

## Listas nativas de Sales Navigator frente a segmentos CRM

El criterio de atributos gobierna segmentos CRM activos; no prohíbe una shortlist manual nativa que el
operador pidió. Sales Navigator organiza cuentas por mercado/sector y personas por frente funcional del
servicio, con procedencia/corte en dossier. No trasladar listas de IDs como definición de un segmento activo.
Una cohorte «Finanzas CL» puede incluir profesionales regionales: no certifica país de la persona, autoridad
presupuestaria ni demanda. Afinidad funcional no es calificación ni permiso de outreach.

Para crear/guardar, leer [listas nativas y readback](sales-navigator-operations.md): selección en bloque
persistente, nombres seleccionados antes del write, membresía personalizada separada de «Guardado» y lectura
nominal después de recargar. Contar únicos/membresías/contadores UI por separado; diferencias quedan abiertas.
No renombrar o fusionar listas preexistentes sin mandato. Guardar personas en Sales Navigator no crea Contact/
Lead en HubSpot ni necesita el correo exigido para esas altas CRM.

## Reglas

- **La industria es de la empresa.** Se clasifica una vez en Company y los contactos la heredan por su empresa
  principal. No se copia a cada persona ni se mantiene una industria paralela en el contacto: lo que se llena a
  mano por persona queda vacío en la mayoría y el segmento sale incompleto sin dar error.
- **En cada alta, la empresa queda con industria y país.** Son los dos atributos de los que dependen los
  segmentos sectoriales y los de mercado. Una empresa sin industria deja fuera a todos sus contactos, por
  completa que esté la ficha de cada uno. Usar el valor exacto del catálogo, con evidencia.
- **Un subsegmento usa la misma llave que su segmento padre.** Bancos es un valor de industria dentro de
  Finanzas; si se define con otra llave (una lista de empresas, un texto en el cargo), deja de estar contenido
  en el padre. Tras definirlo, comprobar que todos sus miembros están también en el padre.
- **No escribir IDs de registros en un filtro** para delimitar un universo aprobado. Si el universo es más
  estrecho que el atributo, falta un atributo: proponerlo y no simularlo con una lista.
- **El enriquecimiento automático se equivoca.** Antes de confiar en un segmento sectorial, revisar el valor de
  industria de las cuentas en investigación. Corregir sólo lo evidente y dentro del alcance autorizado; el
  resto se reporta.
- **No alterar un dato verdadero para que un registro calce.** Si una cuenta queda fuera por su clasificación
  real, se reporta con el campo que decide el caso; reclasificarla es decisión del operador.

## Antes de cambiar un filtro

1. Guardar la definición vigente y los miembros actuales.
2. Simular la regla nueva: quién entra, quién sale y por qué. Quien sale suele señalar una empresa mal
   clasificada; corregir la empresa, no forzar el filtro.
3. Aplicar, leer de vuelta la definición y enumerar los miembros reales después del recálculo.
4. Comparar con lo simulado: cero faltantes y cero sobrantes, y cada subsegmento contenido en su padre.

Un segmento global abarca todo el CRM, no sólo lo investigado: al pasar de un campo llenado a mano a un
atributo de empresa, entran también los contactos históricos de esas empresas. Reportar por separado cuántos
miembros son de la prospección vigente. Pertenecer a un segmento no autoriza envío ni inscripción.

## Caso fuente — 2026-10-12

El segmento de bancos listaba 14 empresas por ID y el de finanzas leía una industria escrita a mano en cada
contacto: sólo 9 de los 28 contactos de bancos aparecían en finanzas, y seis bancos no tenían industria en su
empresa. Con industria y país completos en las empresas y los segmentos de contactos leyendo la empresa
principal, los contactos de bancos quedaron contenidos en finanzas sin editar a ninguna persona. Una cuenta
aprobada como banco salió del segmento porque su empresa es un grupo asegurador: se reportó en vez de
reclasificarla.

## Alta focalizada y respuesta al operador — 22/10/2026

Al informar «qué propiedades le pusiste para los segmentos», distinguir valores persistidos de membresía
calculada. Releer fecha de investigación en Contact/Company, tipo individual, fit respaldado, cargo y
Primary/industria/país de Company; después comprobar cada segmento pertinente y nombrar los que ya
incluyen al contacto. Una lectura filtrada por ID prueba ese registro, no el total del segmento.
Fit CRM no equivale a una solicitud de HubSpot; país de la empresa y mercado de la iniciativa pueden diferir.
[Caso Kibernum: seis membresías efectivas y Company reutilizada](../../../../docs/commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).
