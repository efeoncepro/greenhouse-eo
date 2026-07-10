# LATAM — Matriz de Portales de Compra Pública

> **Vigencia crítica:** LATAM está en plena reforma de compras públicas (Brasil Ley 14.133, Perú nueva Ley 32069, México reforma 2025, etc.). **Nunca** afirmes un umbral, ley vigente o URL sin verificar contra el portal oficial del país. Esta matriz orienta; la verificación por país es obligatoria antes de operar.

Chile ya está cubierto en detalle en `chile-publico-marco-legal.md` + `chile-publico-operativo.md`. Acá el resto de LATAM como **matriz de entrada**: por país, dónde buscar, quién manda, qué ley, cómo registrarse, qué mirar y qué tan madura es la API.

## Cómo usar esta matriz

Para un país nuevo, resuelve estas 6 preguntas antes de ofertar:
1. **Portal** — dónde se publican y presentan las oportunidades.
2. **Órgano rector** — quién regula (define reglas, registros, sanciones).
3. **Ley base + reforma reciente** — qué marco rige (y si acaba de cambiar).
4. **Registro de proveedor** — qué inscripción/habilitación necesitas para ofertar y contratar.
5. **Particularidades** — modalidades propias, umbrales, moneda/indexación, idioma, factura electrónica.
6. **API / datos abiertos** — ¿hay API oficial para radar automático, o solo web?

## Matriz por país

### Chile — ver companions dedicados
Portal `mercadopublico.cl` · DCCP/ChileCompra · Ley 19.886 + 21.634 · ChileProveedores · API v1 + Compra Ágil v2 Beta. **Mercado ancla de Efeonce.**

### Colombia
- **Portal:** SECOP II (transaccional) + Tienda Virtual del Estado Colombiano (TVEC, tipo Convenio Marco) + SECOP I (legacy/publicidad).
- **Órgano rector:** Colombia Compra Eficiente (CCE).
- **Ley base:** Ley 80/1993 + Ley 1150/2007 + decretos reglamentarios (marco de contratación estatal).
- **Registro:** RUP (Registro Único de Proveedores) en cámara de comercio + registro en SECOP II.
- **Particularidades:** modalidades (licitación pública, selección abreviada, concurso de méritos, mínima cuantía, contratación directa). Moneda COP.
- **API/datos:** fuerte cultura de datos abiertos — SECOP publica vía `datos.gov.co` (plataforma Socrata, API consultable). Bueno para radar automático.

### Perú
- **Portal:** SEACE (Sistema Electrónico de Contrataciones del Estado).
- **Órgano rector:** OSCE (Organismo Supervisor de las Contrataciones del Estado) + PERÚ COMPRAS (catálogos electrónicos / Acuerdos Marco).
- **Ley base:** en transición — Ley 30225 (antigua) → **nueva Ley General de Contrataciones Públicas (Ley 32069, 2025)** y su reglamento. Verifica cuál rige la convocatoria específica.
- **Registro:** RNP (Registro Nacional de Proveedores) vigente — obligatorio para contratar.
- **Particularidades:** procedimientos (licitación pública, concurso público, adjudicación simplificada, subasta inversa electrónica, comparación de precios, contratación directa). Moneda PEN. Umbrales en UIT.
- **API/datos:** SEACE tiene datos abiertos/consultas; madurez media. Verifica endpoints vigentes.

### Brasil
- **Portal:** PNCP (Portal Nacional de Contratações Públicas) — obligatorio de publicidad bajo la nueva ley — + Compras.gov.br (ComprasNet federal) + portales estatales/municipales.
- **Órgano rector:** federal (Ministério da Gestão/SEGES) + entes por nivel.
- **Ley base:** **Lei 14.133/2021 (Nova Lei de Licitações e Contratos)**, que reemplazó la 8.666/93. Modalidades: pregão, concorrência, concurso, leilão, diálogo competitivo.
- **Registro:** SICAF (Sistema de Cadastramento Unificado de Fornecedores) federal.
- **Particularidades:** **idioma portugués** (propuesta y documentos), factura/notas fiscales, complejidad tributaria alta, fuerte peso del pregão electrónico. Moneda BRL.
- **API/datos:** PNCP expone API pública de contrataciones — bueno para radar. Verifica contrato vigente.

### México
- **Portal:** CompraNet (histórico) — **en reforma 2025**: se está migrando a una nueva plataforma/marco. Verifica el portal vigente al operar.
- **Órgano rector:** SHCP / Secretaría de la Función Pública (histórico); la reforma redefine gobernanza.
- **Ley base:** Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público (LAASSP) + Ley de Obras Públicas — **con reforma 2025**. Confirma qué régimen aplica.
- **Registro:** RUPC (Registro Único de Proveedores y Contratistas).
- **Particularidades:** licitación pública, invitación a cuando menos 3, adjudicación directa. Moneda MXN. CFDI (factura electrónica).
- **API/datos:** CompraNet publicaba datos abiertos; con la reforma, madurez/endpoints en flujo. Tratar como incierto hasta verificar.

### Argentina
- **Portal:** COMPR.AR (bienes y servicios) + CONTRAT.AR (obra pública) + Argentina Compra.
- **Órgano rector:** ONC (Oficina Nacional de Contrataciones).
- **Ley base:** Decreto 1023/2001 + Decreto 1030/2016 (reglamento) a nivel nacional; regímenes provinciales propios.
- **Registro:** SIPRO (Sistema de Información de Proveedores).
- **Particularidades:** licitación pública/privada, contratación directa, subasta. Moneda ARS con **alta inflación** — cuidado extremo con indexación y plazos de pago. Niveles nacional/provincial/municipal muy distintos.
- **API/datos:** COMPR.AR tiene consultas; madurez media.

### Panamá
- **Portal:** PanamaCompra.
- **Órgano rector:** DGCP (Dirección General de Contrataciones Públicas).
- **Ley base:** Ley de Contrataciones Públicas (Texto Único). Moneda USD/PAB.
- **Registro:** Registro de Proponentes.

### Costa Rica
- **Portal:** SICOP (Sistema Integrado de Compras Públicas) — plataforma unificada obligatoria.
- **Órgano rector:** rectoría de Hacienda + Contraloría.
- **Ley base:** Ley General de Contratación Pública (Ley 9986) + reglamento. Moneda CRC.
- **Registro:** proveedor registrado en SICOP.

### Ecuador
- **Portal:** SOCE / portal Compras Públicas (`compraspublicas.gob.ec`).
- **Órgano rector:** SERCOP (Servicio Nacional de Contratación Pública).
- **Ley base:** LOSNCP (Ley Orgánica del Sistema Nacional de Contratación Pública). Moneda USD.
- **Registro:** RUP (Registro Único de Proveedores).

### Uruguay
- **Portal:** Compras Estatales (`comprasestatales.gub.uy`).
- **Órgano rector:** ARCE (Agencia Reguladora de Compras Estatales, ex ACCE).
- **Ley base:** TOCAF + normativa de compras. Moneda UYU.
- **Registro:** RUPE (Registro Único de Proveedores del Estado).

## Patrones transversales LATAM (lo que se repite)

- **Registro de proveedor obligatorio** para contratar en casi todos (RUP/RNP/RUPC/SIPRO/SICAF/RUPE). Inscríbete antes, no en el cierre.
- **Publicidad total** del expediente + canal de consultas análogo al foro chileno.
- **Modalidades análogas**: pública / abreviada-simplificada / directa / subasta inversa / catálogos-acuerdos marco.
- **Garantías** equivalentes (seriedad/mantenimiento de oferta + cumplimiento).
- **Idioma y moneda locales** — en Brasil, portugués; en países con alta inflación (AR), indexación y plazos de pago son riesgo de primer orden.
- **Factura electrónica local** (CFDI MX, NF-e BR, etc.) — requisito de cobro.
- **Madurez de API variable**: Colombia (Socrata) y Brasil (PNCP) son los más "data-friendly" para radar automático; otros son web-first.

## Regla de expansión

Cuando Efeonce entre a un país nuevo en serio, **eleva ese país de "matriz" a companion dedicado** (como Chile), con su marco legal, operativa, garantías y API. Esta matriz es el punto de entrada, no la profundidad final.

## Hand-off

- Cualquier cifra/ley/URL → **verificar en el portal oficial** antes de afirmarla.
- Estrategia de entrada a un mercado nuevo → `commercial-expert`.
- Datos/API para radar → `data-sources-apis.md` (patrón replicable del caso Chile).
