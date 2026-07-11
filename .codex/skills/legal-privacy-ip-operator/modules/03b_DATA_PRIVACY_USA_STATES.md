# 03b · Privacidad de Datos — EEUU estado por estado

> **⚠️ No es asesoría legal y ENVEJECE RÁPIDO.** Las leyes estatales integrales de privacidad **se aprueban y entran en vigencia constantemente** (varios estados nuevos por año). Esta matriz es un **punto de partida a la fecha de escritura (2026)** — **verifica SIEMPRE** el estado actual (leyes nuevas, fechas de vigencia, enmiendas) antes de opinar. No cites una fecha de vigencia sin confirmarla.

## Cómo se lee el mapa estatal

Ante la ausencia de ley federal omnibus (la **APRA expiró sin votación** en el 118° Congreso), los estados llenan el vacío. **Verificado (as-of 2026-07):** ~**20 leyes integrales en vigor** y ~**24 promulgadas** (el conteo varía por fuente y por fechas de entrada en vigencia; en 2025 **no** se aprobaron leyes integrales nuevas — el foco fue enforcement y enmiendas; en 2026 entran/entraron Indiana, Kentucky y Rhode Island). Casi todas están modeladas sobre dos plantillas:

- **Modelo California (CCPA/CPRA)** — el más estricto y sui generis (opt-out de sale/share, CPPA como agencia, private right of action acotado por brechas). Ver `03`.
- **Modelo Virginia (VCDPA)** — la plantilla que la mayoría de los estados siguió (controller/processor al estilo GDPR-lite, derechos de acceso/eliminación/corrección/portabilidad/opt-out, **sin** private right of action, enforcement por el Attorney General, DPAs y assessments para tratamientos de riesgo).

**Regla operativa:** para un cliente/campaña, identifica **en qué estados residen los consumidores**, aplica el estándar del estado más estricto que toques (California suele marcar el piso alto), y trata el resto por el patrón común (abajo). No memorices 20 leyes — **domina los dos modelos + el patrón común** y verifica el estado puntual.

## Estados con ley integral (matriz orientativa — verificar vigencia)

| Estado | Ley (sigla) | Modelo | Nota |
|---|---|---|---|
| California | CCPA/CPRA | California | Agencia propia (CPPA); opt-out sale/share; private right of action por brechas (`03`) |
| Virginia | VCDPA | Virginia | La plantilla base del resto |
| Colorado | CPA | Virginia | Reglas de la AG; reconoce señales opt-out universales |
| Connecticut | CTDPA | Virginia | |
| Utah | UCPA | Virginia (más laxa) | Menos derechos/obligaciones |
| Texas | TDPSA | Virginia | Sin umbral de tamaño clásico; aplica ampliamente |
| Oregon, Montana, Delaware, Iowa, Nebraska, New Hampshire, New Jersey, Indiana, Tennessee, Minnesota, Maryland, Kentucky, Rhode Island… | varias siglas | Virginia (variantes) | Fechas de vigencia escalonadas; **verificar** |

> Esta lista **no es exhaustiva ni está congelada**: hay estados en trámite y fechas que cambian. Trátala como orientación y **reverifica**. Además existen leyes **sectoriales estatales** (p. ej. biométricos **BIPA de Illinois** — muy litigado, con private right of action; leyes de salud como *My Health My Data* de Washington) que aplican aunque el estado no tenga ley integral.

## Patrón común (el "GDPR-lite" que comparten casi todos)

Domina esto y cubres la mayoría:

- **Roles:** **controller** (decide fines/medios) y **processor** (trata por encargo, bajo contrato). Efeonce como agencia suele ser **processor** de datos de clientes.
- **Derechos del consumidor:** acceso, eliminación, corrección, **portabilidad**, y **opt-out** de (a) venta de datos, (b) publicidad dirigida/targeted advertising, (c) profiling con efectos significativos.
- **Datos sensibles:** requieren **opt-in** (consentimiento) en el modelo Virginia (a diferencia de California, que usa opt-out de "limitar uso").
- **Universal opt-out signals:** varios estados obligan a honrar **GPC** (Global Privacy Control) como opt-out válido.
- **Data Protection Assessments (DPA/DPIA):** evaluaciones para tratamientos de alto riesgo (targeted advertising, venta, sensibles, profiling).
- **Contratos controller-processor:** cláusulas obligatorias (como el DPA de GDPR) — ver `04`, `05`.
- **Enforcement:** casi siempre por el **Attorney General** estatal (con "cure period" que se está eliminando en varios); **sin private right of action** salvo California (brechas) e Illinois (BIPA).

## Biométricos — riesgo especial (BIPA Illinois)

- **BIPA (Illinois)** regula datos biométricos (huella, rostro, voz) con **consentimiento escrito previo** y **private right of action** → demandas colectivas muy caras. Si una campaña usa reconocimiento facial, filtros biométricos, voz o huella, es zona roja. Otros estados (Texas, Washington) tienen leyes biométricas sin el mismo litigio.

## Aterrizaje para Efeonce (agencia entrando a EEUU)

1. **Determina residencia de los consumidores** por cliente/campaña → set de estados aplicables.
2. **Aplica el estándar más alto que toques** (California marca el piso; añade opt-out de targeted advertising del modelo Virginia).
3. **Honra GPC** universalmente (barato y cubre varios estados) (`09`).
4. **Opt-in para datos sensibles** (modelo Virginia) y **cuidado con biométricos** (BIPA).
5. **Cláusulas controller-processor** en todo contrato con cliente US (`05`).
6. **DPIA** para publicidad dirigida / profiling / datos sensibles.

## Checklist

- [ ] Mapa de estados por residencia de consumidores.
- [ ] Estándar aplicado = el más estricto que toco (California + opt-out targeted ad).
- [ ] GPC honrado (`09`).
- [ ] Opt-in de datos sensibles; biométricos evaluados (BIPA).
- [ ] Cláusulas controller/processor en contratos (`05`).
- [ ] DPIA donde aplique.
- [ ] **Vigencia verificada** (leyes/fechas nuevas) — no citar fecha sin confirmar.

## Hand-off

- California a fondo + federal/sectorial → `03`.
- Transferencias / GDPR / DPA → `04`; cláusulas processor → `05`.
- Cookies/GPC/opt-out runtime → `09` + `greenhouse-gtm-ga4-operator`.
- **Validación legal** → abogado de EEUU (privacy), estado aplicable.
