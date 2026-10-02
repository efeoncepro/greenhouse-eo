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
| S06 | Content & Social Operations | ¿Quién cuida tu conversación? · Personas | 2 |
| S07 | Managed Creative Capacity | ¿Más piezas, mismo estándar? · Mismo criterio | 1 |
| S08 | AI Creative Operations | ¿IA en tu producción? · Con memoria | 1 |

Roles, bajadas, CTA y destino lógico viven en el BRIEF (§0b), no aquí.

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
- [ ] Revisión creativa del operador de los ocho pilotos.
- [ ] Decisión sobre personas del equipo en registro cine (S01–S07; hoy en prueba). S08 (Nexa) está en el caso aprobado.
- [ ] Claims por validar: «En un día» (S05) y «memoria de marca» (S08).
- [ ] Destino, formulario y atribución por ruta.
- [ ] Export final 1440×1800 y formatos 1:1, 9:16 y 16:9 nativos.
- [ ] Video, orgánico y documentos por servicio replanificados.
- [ ] Monto, pagador, geografía, T0 y permiso de medios.

No hay publicación, pauta ni envío. Aprobar la dirección no aprueba cada render ni autoriza medios.
