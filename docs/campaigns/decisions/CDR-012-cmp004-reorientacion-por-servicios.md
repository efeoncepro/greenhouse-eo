# CDR-012 · CMP-004: un ad por servicio y dirección cine nativa

**Estado:** `Accepted` **para las decisiones del operador de §2**. **Fecha:** 2026-10-02. **Autor:** Claude (sesión nocturna). **Decisor:** Julio Reyes.
**Campaña:** `CMP-004_agencia-creativa-premium`. **Estado de campaña:** `borrador`. **Amplía:** [CDR-010](CDR-010-cmp004-agencia-creativa-premium.md), sin borrarlo: los conceptos aceptados ahí siguen vivos dentro de su servicio.

## 1. Contexto

Los pilotos R01–R04 de CMP-004 no generaban impacto para el operador («necesito algo más épico y cinematográfico»). Además, los cuatro conceptos cubrían sólo dos de las cuatro rutas de Creative Services (marca y campaña, producción a escala) y dejaban sin pieza a Content & Social Operations, Run & Gun y AI Creative Operations. Una primera ronda cine mostró otro problema: los plates no se pensaron para el ad, y el texto, el CTA y el logo caían sobre fondos irregulares.

## 2. Decisiones del operador

1. **Reorientar por servicios** («Necesito que reorientes basado en los servicios»): cada ad vende un servicio del [catálogo de Creative Services](../../services/creative-services/README.md), a un rol del grupo de compra y en una etapa. C01 vive en S01, C02 en S02, C03 en S04 y C04 en S07; se suman S03, S05, S06 y S08.
2. **Composición nativa para el ad**: el plate se genera con la geometría del bloque completo. Del 0 al 40 % del alto, una superficie oscura continua; del 42 al 80 %, la acción; del 80 al 100 %, un objeto real negro mate que sostiene el logo.
3. **Entrega en PNG.**
4. **Acento de la línea Brand** en la voz (anillo y esfera) y en el CTA, que va en contorno («Sí, hazlo»). Se descarta el teal de R01–R04.

## 3. Mapa vigente

| ID | Servicio | Voz | Ola |
|---|---|---|---|
| S01 | Creative Strategy & Brand Systems | ¿Y si tapamos el logo? · Te reconocen | 1 |
| S02 | Brand Systems, reposicionamiento | ¿Tu marca ya cuenta lo que viene? · Imagen propia | 2 |
| S03 | Campaign & Key Visual Systems | ¿En cuántos formatos funciona tu idea? · En todos | 2 |
| S04 | Audiovisual, Motion & Audio | ¿Qué cabe en seis segundos? · Cada detalle | 2 |
| S05 | Run & Gun Production | ¿Contenido para todo el mes? · En un día | 3 |
| S06 | Content Production System, desde la agencia creativa | ¿Contenido que se publica o que se mira? · Que se mira | 2 |
| S07 | Managed Creative Capacity | ¿Más piezas, mismo estándar? · Mismo criterio | 1 |
| S08 | AI Creative Operations | ¿Producción con IA? · Marca intacta | 1 |

Roles, bajadas, CTA y destino lógico viven en el BRIEF (§0b), no aquí. **Ajustes del operador del 2026-10-02 sobre los pilotos:** S06 vende contenido desde la agencia creativa (community management va por otro carril); S08 cambia de premisa a escalar producción con IA sin perder consistencia de marca; S02 y S03 cambian de escena para expresar mejor el texto.

## 4. Evidencia

- Ocho pilotos N2 4:5, certificados por `pnpm foto:cta:gate --reproducir` (código 0): texto 18–20:1, logo 17–20:1, anillo/esfera/borde 6,2–6,8:1.
- Comparativa de 40 composiciones (8 ads × 5 tratamientos de CTA): el contorno pasa en los 8; relleno y texto superan el área del titular con respuestas de una o dos palabras.
- Cambio de herramienta asociado: `graphicLine` en el compositor de CTA (commit `fde62f05d`; contrato del compositor, §«Acento por línea de servicio»).

## 5. Fuentes y artefactos

- **BRIEF** — `Alineación/2. Campañas/CMP-004_agencia-creativa-premium/BRIEF.md` §0b (v1.1).
- **Assets** — `…/CMP-004_agencia-creativa-premium/ASSETS.md` §N2; pilotos en `5. Contenidos/15. Paid Media/02. Pilotos/CMP-004/4x5/N2-servicios-cine-nativo/`.
- **Receta** — `5. Contenidos/15. Paid Media/01. Recursos/CMP-004 - Produccion y editables/2026-10-02-servicios-cine-nativo/` (`LEEME.md`, `MANIFIESTO-N2.json`).
- **Decisiones y descartes** — `…/decisiones/REGISTRO.md`, sección 2026-10-02.
- **Plan de piezas** — `…/produccion/PLAN-DE-PIEZAS.csv` (S01–S08 × 4 ratios; C01–C04 `reemplazado-cdr012`).

## 6. Estado real y próximo paso

- [x] Mapa servicio → ad decidido y documentado.
- [x] Pilotos 4:5 N2 producidos y certificados por el gate.
- [x] Revisión creativa del operador: **aprobados los ocho** (2026-10-02) como ads Always On de Q4 (S02, S03, S06 y S08 en N3).
- [x] Personas del equipo en registro cine: aprobadas por el operador para estos ads de CMP-004 (no amplía el canon general del registro).
- [ ] Claim por validar: «En un día» (S05). S08 corregido por el operador el 2026-10-02: la premisa es escalar producción creativa con IA sin perder consistencia de marca (pieza N3); «memoria de marca» deja de usarse.
- [ ] Destino, formulario y atribución por ruta.
- [ ] Export final 1440×1800 y formatos 1:1, 9:16 y 16:9 nativos.
- [ ] Video, orgánico y documentos por servicio replanificados.
- [ ] Monto, pagador, geografía, T0 y permiso de medios.

No hay publicación, pauta ni envío. Aprobar la dirección no aprueba cada render ni autoriza medios.

## Delta 2026-10-02 · serie táctica Black Friday

El operador pidió tres ads más con la idea «¿Corriendo para el Black Friday? ¡Llegaron los refuerzos!»: uno con los Sparks, uno con el squad y sus agentes, y uno que muestre producción creativa a escala, rápida y consistente sin perder la marca. Es una serie de temporada que no reemplaza al Always On de Q4.

| ID | Refuerzo | Bajada |
|---|---|---|
| CMP004-BF1-KV-45-N1 | Nexa y los Sparks | Refuerzos creativos: agentes que se suman a tu equipo. |
| CMP004-BF2-KV-45-N2 | El squad y sus agentes | Refuerzos creativos: un squad y sus agentes para tu campaña. |
| CMP004-BF3-KV-45-N1 | Producción a escala | Refuerzos creativos: producción a escala, rápida y consistente. |

Copy común: «¿Corriendo para el Black Friday?» → «Ya llegamos» · CTA «Refuerza tu Black Friday». «Llegaron los refuerzos» no cabe como respuesta de la voz de la línea (1 a 3 palabras, cursor dentro de la zona), así que «refuerzos» va en la bajada. No se usa «garantizando» por los límites de promesa del brief (§11).

Evidencia: `foto:cta:gate --reproducir` con código 0 en las tres piezas; contraste de texto 8–19:1, logo 19:1; bordados revisados al 100 %. BF2 se regeneró porque el reflejo naranja del portón en el piso llegaba al pie y la firma medía 2,63:1; una tarima negra mate más alta lo resolvió. Pilotos en OneDrive `5. Contenidos/15. Paid Media/02. Pilotos/CMP-004/4x5/BF-black-friday/`; receta en `01. Recursos/CMP-004 - Produccion y editables/2026-10-02-black-friday/`; registro en `ASSETS.md` §Black Friday y BRIEF §0c.

- [x] Tres pilotos 4:5 producidos y certificados por el gate.
- [ ] Aprobación creativa del operador.
- [ ] Fechas de vuelo de temporada, destino y permiso de medios.
- [ ] Formatos 1:1, 9:16 y 16:9 nativos y export final 1440×1800.
