# Política cromática de campaña para el compositor publicitario

- Status: Accepted — dirección autorizada por el operador el 2026-09-25 («Hagámoslo así»); implementación local verificada (evidencia en la auditoría CMP-004).
- Owner: Advertising / Design Studio; AXIS conserva los valores de color.
- Scope: CLI `foto:componer:cta`, su esquema, evidencia y gate. Sin cambios al motor tipográfico ni al espaciado.
- Reversibility: opt-in por pieza; planes sin política conservan las reglas anteriores.

## Contexto

La lista global naranja/lima/naranja oscuro confunde acento cromático con identificación de la acción. La auditoría [CMP-004](../audits/social/2026-09-25-cmp004-typography-grouping-review.md) mostró piezas legibles pero cromáticamente desconectadas. Un CTA neutro puede ser pertinente; no es un nuevo default.

## Decisión

Una campaña declara una política JSON versionada, con dirección, paleta de tokens AXIS y tratamientos concretos. Cada tratamiento define estrategia (`scene-related`, `intentional-contrast`, `neutral`), prominencia, variante, tinta y superficie cuando existe. La pieza referencia archivo y SHA-256, campaña y tratamiento, y explica su relación con la composición.

El compositor valida antes de producir: identidad de campaña, versión, integridad, pertenencia a paleta y coincidencia exacta de los colores/variante declarados. No hay elección implícita ni fallback cromático. `auto` y el explorador genérico `--variantes` se conservan para planes anteriores; con política se declaran alternativas como piezas con tratamientos autorizados. Esto evita que el explorador reasigne colores sin intención.

El QA conserva la decisión resuelta (incluidos valores reales de tokens) sin rutas dependientes de la máquina. El gate relee la política, verifica el hash y compara esa evidencia. La reproducción resuelve las referencias desde el plan original. La política sustituye exclusivamente la lista fija `acento-cta`: siguen activas las mediciones de contraste, geometría, firma y sujeto. No constituye aprobación creativa; armonía y jerarquía requieren revisión visual.

## Alternativas consideradas

- Añadir blanco a la lista global: no representa campaña ni intención; sólo agrega otro default.
- Extraer automáticamente un color dominante de la foto: puede seleccionar un elemento incidental y no resuelve identidad o jerarquía.
- Copiar una política completa en cada pieza: deriva entre piezas y dificulta versionar la serie.
- Rehacer todo el compositor: innecesario; se amplía su preflight y evidencia sin cambiar pintura ni tipografía.

## Contrato y consecuencias

`cta.colorPolicy.version = 1` activa la ruta nueva. Archivo central + hash fijan exactamente qué política se consumió; cambios requieren actualizar el plan y recomponer. El campo es optativo y estricto. Las rutas son locales, relativas al JSON del plan o absolutas; no se descargan políticas remotas. Los tokens y valores provienen del paquete AXIS instalado, incluido en las huellas existentes.

Los tratamientos pertenecen a la paleta autorizada declarada por dirección, sin fingir aprobación del operador para cada propuesta visual. No se añaden nuevos colores de marca al consumidor. Una revisión de valores portables corresponde a AXIS.

## Verificación y revisión

Probar legacy sin política, referencias inválidas/alteradas, campaña equivocada, tratamientos fuera de paleta, discrepancias de variantes/colores y ausencia/manipulación de evidencia. Reproducir CMP-004 y comparar muestras legacy contra HEAD. Probar lectura por variante y fondos pertinentes; una política válida nunca exime de contraste insuficiente.

Reabrir si hace falta resolver alternativas automáticamente, separar tintas de borde y relleno en variantes que usen ambos, admitir otras identidades de marca o distribuir políticas mediante un registry remoto. Estas capacidades no se infieren de V1.
