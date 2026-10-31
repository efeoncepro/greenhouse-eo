# Adapter de prospección por cuenta — HubSpot

Cargar para cuentas objetivo, roles y mapas de compra. Es un contrato de operación para agentes, no un
wrapper instalado ni autorización de escritura. Método en [Prospección](../../efeonce-b2b-prospecting/SKILL.md);
carriles/identidad en [runbook](../../../../docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md).
Base técnica: [investigación y readback 2026-10-11](../../../../docs/audits/commercial/2026-10-11-hubspot-abm-buying-groups-api-cli.md).
Los datos de ese corte son evidencia histórica; refrescar diccionario, permisos y help antes de operar.

## Representación y diccionario

| Dato | Representación observada | Criterio de cambio |
| --- | --- | --- |
| Cuenta seleccionada | Company `hs_is_target_account`, boolean | Selección autorizada, no demanda/consentimiento |
| Fit ICP | Company `hs_ideal_customer_profile`, tiers | Fit fundamentado; no intensidad ni prioridad ABM |
| Rol general | Contact `hs_buying_role`, multiselect | Papel evidenciado, sin atribuirlo por cargo |
| Rol por iniciativa | Mapa local con ancla de decisión; asociación Contact–Deal cuando existe y se aprueba | No trasladar champion/autoridad entre iniciativas |
| Stakeholder sin email | Investigación; nota Company autorizada; placeholder nativo sólo con capacidad y acción verificadas | Nunca nueva alta Contact/Lead vacía |

El campo oculto `hs_target_account` coexistía como enum de tiers: no usarlo como indicador ni migrarlo
por heurística. Leer opciones internas, read-only, valores y asociaciones actuales; no fijar las nueve
opciones de roles observadas como catálogo universal. Company, Contact, Deal y grupo no son intercambiables.
Las cuentas pueden compartir persona, pero sus mapas conservan fuente, fecha, participación y autoridad
por iniciativa. No crear Deal sólo para alojar un mapa ni una propiedad/objeto nuevo como paso implícito.

Un label Contact–Deal puede expresar un papel local si el modelo se aprueba; no sincroniza automáticamente
el organigrama ni el atributo global. Antes de calificación, mantener mapa en dossier privado o nota
autorizada con ancla explícita. Elegir la ubicación existente; no abrir otra base de datos de prospectos.

## Contrato de cambios

Preparar sólo filas dentro del alcance, con [plantilla de changeset](../templates/account-based-changeset.md).
Cada fila incluye portal/objeto/ID, campo o asociación, estado anterior, cambio mínimo, evidencia, mandato,
capability/carril y readback esperado. Un flag existente correcto produce no-op; no tocar fechas/cohortes
de otros lotes. Dedupe y atribución del email siguen [segmentación](prospecting-segmentation.md).

Para multiselect, distinguir adición, sustitución y retirada. Preservar tokens actuales: usar append
documentado cuando el contrato efectivo lo admita, o unión explícita de valores leídos y autorizados.
Releer antes del write; si cambió el estado, reconciliar en vez de pisarlo. Una retirada exige razón y
mandato, no se deduce de añadir otro rol. Opciones/label IDs se resuelven en el portal y dirección reales.

Elegir Agent CLI `hubspot`, MCP o API por comando/endpoint; Developer CLI `hs` tiene otra finalidad/auth.
El help 0.15.1 mostró dry-run para `objects update`; `associations create`/`labels-list` exigían service key
y no OAuth de usuario, y create no mostraba dry-run. Comprobar versión/help actuales; no generalizar preview
ni cambiar credenciales como fallback implícito. Si una operación está bloqueada, entregar su payload
preparado y continuar sólo filas independientes autorizadas. Fijar la versión API comprobada por familia.

Después del write, leer ID/campos/asociaciones de vuelta por petición nueva; verificar Primary Company,
automatizaciones/Lead y membresía cuando aplican. Search puede indexar tarde: distinguir retraso de un
write fallido y preferir lectura por ID para confirmarlo. Ante respuesta ambigua, reconciliar antes de repetir;
no recrear. Informar por fila preparado/aprobado/escrito/verificado/parcial/bloqueado y condición pendiente.
Una reversión es otro changeset: no sobrescribir cambios posteriores para restaurar un snapshot viejo.

## Buying Groups: capability separada

En el corte, `buying_groups` (0-3196) y 38 propiedades eran legibles como metadata; listado y búsqueda de
registros devolvían 400 por tipo no soportado. No repetir mediante IDs alternativos ni endpoints internos.
No afirmar CRUD disponible porque `hs_name` no es read-only. No afirmar inexistencia absoluta de API:
contrato público del gráfico no encontrado y comandos ensayados rechazados son los hechos comprobados.

La UI documenta beta, seats/opt-in y placeholders. Antes de operar, comprobar eligibility, activación,
layout y permiso de la acción; no activarla por actualizar una skill. El porcentaje de completitud se basaba
en posiciones de plantilla ocupadas: no prueba personas únicas, cobertura funcional ni autoridad.

Salida: matriz de capability documentada vs verificada, changeset mínimo, mapa por iniciativa y readbacks.
El estado UI puede quedar pendiente aunque los campos estándar se hayan verificado; no anunciar paridad.

## Readback tras automatización y pedido de alta repetido

La asociación enviada en un create no basta: releer Primary después de la automatización. Si el dominio
laboral difiere del sitio corporativo, el portal puede crear una Company vacía y reemplazar la principal.
Reconciliar identidad y asociaciones; cuando la CLI no admite el carril con OAuth, usar UI autenticada
con el mismo mandato. En el caso observado: tarjeta de la Company correcta → More actions → Establecer
como principal → Reemplazar como principal → Actualizar; verificar etiqueta Primary y
`associatedcompanyid` por lectura independiente. No editar ese campo de lectura ni crear una service key.

El reemplazo no fusiona ni elimina la Company vacía; declarar si quedó secundaria. Separar también
atributos correctos de membresía efectiva: `members-list` con 403 o búsqueda con 400 es verificación
pendiente, no conjunto vacío ni pertenencia confirmada. Un lifecycle SQL asignado por el portal no es
calificación humana. Si el operador vuelve a pedir crear a alguien ya registrado, releer identidad,
email/Primary y devolver la ficha existente antes de cualquier nueva alta.

[Aplicación Mambrino](../../../../docs/commercial/prospecting-agent/runs/2026-10-31-mambrino-dayanna.md):
contacto, asociación y EMAIL SENT comprobados; secundaria vacía y membresía conservadas como límites.
