# Efeonce Globe Creative Producer

Creative Producer es la consola prompt-first de Globe para crear y continuar activos de imagen, video y audio.
El diseño aprobado es el producto completo: composer multimodal, referencias privadas, estimación pre-spend,
biblioteca editorial, viewer/refinamiento, organización, revisión y sharing. Las capacidades no se eliminan cuando
un backend está apagado; la UI muestra su estado real y el dueño que debe habilitarlo.

## Qué puede hacer

- Componer por modalidad con prompt, presets, referencias, ruta/modelo público y shape válido.
- Estimar créditos antes de reservar o gastar; el operador fija un hard cap explícito.
- Ejecutar runs durables y ver sus estados/attempts reales, sin porcentajes derivados de timers del browser.
- Recuperar image/video/audio por grants efímeros y validar integridad content-addressed.
- Explorar feed, lineage, series, collections, selección y operaciones batch.
- Recreate, variation, upscale e inpaint mediante commands gobernados con parentage y rights heredados.
- Revisar, comentar, aprobar/pedir cambios y compartir una proyección read-only revocable.

## Cómo se protege

El browser llama un BFF same-origin. El BFF deriva persona, workspace y surface, y llama la API IAM-private con
workload identity; nunca entrega una service credential al browser. Providers, secretos, almacenamiento, ledger,
tenancy, rights y review permanecen server-side.

Cada output generado se ingiere por stream, se registra content-addressed y entra en cuarentena. Un worker separado
ejecuta malware, C2PA y rights en orden. C2PA sólo se muestra como verificado ante un resultado explícito `Trusted`;
la presencia de un manifest no basta. Las políticas de derechos son exactas por ruta/proveedor/modelo/versión y los
derivados heredan restricciones de sus padres.

## Estado vigente

El código y la UI están completos y verificados localmente. El runtime interno desplegado todavía usa un SHA
anterior y mantiene apagados el bridge humano, Jobs y provider real. Por eso el estado correcto es
`code complete, rollout pendiente`: no operativo ni disponible para clientes hasta completar el runbook y los
canarios reales.

Arquitectura: [Creative Producer V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md).
Manual: [usar Creative Producer](../../manual-de-uso/creative-studio/usar-creative-producer-globe.md).
