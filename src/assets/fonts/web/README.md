# Fuentes web versionadas — ISSUE-178

Los loaders `next/font/local` de `src/app/layout.tsx` y `src/views/login/login-fonts.ts` consumen
estos WOFF2. El build no descarga fuentes. Los TTF de PDF/composición permanecen independientes.

- Geist variable: eje `wght` original 100–900, rango expuesto 400–800; conserva 400/500/600/700/800.
- Poppins: 600/700/800 normales.
- Bricolage Grotesque: 500 normal, instancia Google Fonts (`opsz=14`, `wdth=100`), sólo login.
- Subset Latin: cobertura verificada de los caracteres ES/EN/PT-BR, acentos y euro; escrituras fuera
  de este subset usan el stack fallback. Una ampliación de idiomas requiere incorporar/revisar sus glifos.
- Total: 75.344 bytes. Mismos roles, variables CSS y `display: swap`; sin nueva familia semántica.

`manifest.json` conserva URL exacta de stylesheet y binario, fecha, versión interna, ejes, tamaño y
SHA-256. Los archivos se incorporaron de Google Fonts el 2026-10-04; las licencias SIL OFL 1.1
están junto a los binarios. No usar fuentes del sistema ni regenerar desde una respuesta HTTP en CI.
Los cinco WOFF2 son idénticos byte por byte (SHA-256) a los servidos por el último staging
correcto `dpl_68f2mdqkApHTyoqct2p9awNLYfJu`; sólo cambia el mecanismo de carga.
Los TTF históricos del repo mezclan versiones de Geist y no son la fuente de estos WOFF2 web.

Para actualizar: descargar deliberadamente las fuentes oficiales, inspeccionar metadata/cobertura,
actualizar binarios + manifest + licencias juntos y ejecutar:

```sh
node scripts/ci/web-fonts-gate.mjs
pnpm exec vitest run scripts/ci/web-fonts-gate.test.ts src/components/theme/typography-drift.test.ts
pnpm build:fast
pnpm fe:capture auth-login-v4 --env=local
```

Revisar escritorio/móvil y confirmar que el navegador usa las fuentes descargadas, sin fallback
accidental. El gate, invocado por `scripts/run-next-build.mjs` antes de Next, verifica los hashes y
bloquea imports/reexports/import dinámico/require de `next/font/google` y `@next/font/google` en
`src`. No bloquea texto de documentación ni mocks de tests. Un asset faltante o mutado falla antes
de compilar. El manifest no se actualiza automáticamente para ocultar drift.

ADR aplicable: `EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md` (adapter del producto).
La optimización local es el mecanismo nativo documentado por
[Next.js](https://nextjs.org/docs/app/getting-started/fonts#local-fonts).
