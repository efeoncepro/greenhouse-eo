# Visuales para email

Lee esta referencia cuando un template necesite hero, ilustración u otro raster generado. La dirección de arte y
QA pertenecen a `greenhouse-ai-image-generator`; esta referencia añade las restricciones específicas del canal
email.

## Verdad de modelo

- La skill heredada fijaba **Imagen 4**, no GPT Image 1.5.
- Para trabajo OpenAI nuevo usa `gpt-image-2` o su snapshot exacto. GPT Image 1.5 está deprecated y se retira el
  2026-12-01; no es fallback de transparencia.
- Conserva Imagen 4 cuando el objetivo sea igualar deliberadamente una familia existente generada con Imagen.
  No regeneres heroes aprobados solo para cambiar la etiqueta del modelo.
- La identidad del modelo debe venir del helper/CLI. No la infieras por apariencia.

## Elección y generación

Usa GPT Image 2 para un hero nuevo cuando importen prompt-following, composición, edición con referencia o un
asset alfa reutilizable. Usa el CLI canónico, nunca un script de proveedor paralelo:

```bash
pnpm ai:image \
  --model gpt-image-2 \
  --size 1536x1024 \
  --quality medium \
  --background opaque \
  --prompt "<dirección de arte sin texto ni logos>" \
  --out .captures/email-hero-source.png
```

Para un objeto reutilizable sin fondo cambia a `--background transparent`. Esa capacidad de GPT Image 2 está en
preview y requiere PNG. El helper conserva el modelo exacto y rechaza JPEG transparente antes de llamar a OpenAI.

## Transparencia y master de email

El source alfa y el master entregado son artefactos distintos:

1. Valida el PNG decodificado: canal alfa y al menos un píxel no opaco.
2. Revisa bordes sobre fondos claro y oscuro; rechaza halos, residuos y detalles interiores borrados.
3. Para email, compón por defecto el asset sobre el fondo blanco final y exporta un PNG opaco a la proporción del
   slot. Los clientes pueden cambiar fondos en dark mode; enviar alfa directo puede volver ilegible el objeto.
4. Conserva el source transparente con provenance cuando vaya a reutilizarse. No hornees un checkerboard.
5. Solo entrega transparencia directa si el diseño la necesita y el preview pasó en los clientes objetivo.

GPT Image 2 produce raster. Copy, cifras, logo, CTA y legal se agregan determinísticamente fuera del modelo.

## Dirección visual

- El hero apoya una sola idea y sigue siendo legible a 560 px; evita escenas densas.
- Usa la paleta y primitives vigentes de `src/emails/constants.ts`; no copies hex desde una skill histórica.
- Pide explícitamente `no text, no letters, no logo, no watermark`.
- No generes marcas oficiales de memoria. Compón el asset real después si corresponde.
- La familia clay 3D sobre blanco sigue siendo válida para igualar los heroes de Leave existentes, pero no es una
  regla universal para cada dominio o campaña.
- El visual es decorativo salvo que exista un alt localizado que comunique la misma información sin depender de
  la imagen.

## Optimización y storage

- Exporta al ancho declarado por el template —habitualmente 560 px— y conserva dimensiones explícitas.
- Optimiza el peso sin destruir bordes o gradientes; 200 KB es un objetivo operativo, no permiso para degradar el
  asset silenciosamente.
- Los templates usan URL pública absoluta resuelta desde `GREENHOUSE_PUBLIC_MEDIA_BUCKET`; no dependas de una URL
  Vercel protegida ni de una ruta relativa.
- Generar localmente no autoriza subir a staging o producción. Un upload requiere autorización explícita,
  bucket exacto verificado y el runbook/skill de secretos correspondiente.
- No subas automáticamente a ambos entornos. Registra qué objeto y entorno se aprobaron y verifica la URL final.

## Evidencia mínima

Registra: prompt final, modelo exacto, provider, tamaño/calidad/fondo solicitados, formato, path del source,
resultado de QA alfa cuando aplique, master optimizado, URL/bucket solo si hubo upload autorizado y preview del
template en desktop/móvil. Provider support o un archivo local no demuestran rollout.
