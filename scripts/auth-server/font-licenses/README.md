# Fuentes del authorization server

Los binarios salen del brand pack AXIS local, sin modificación:

- `src/lib/artifact-composer/brand-packs/axis/fonts/geist-400.ttf` y `geist-600.ttf`:
  metadatos TrueType `name`: versión 1.800, Copyright 2024 The Geist Project Authors
  (`https://github.com/vercel/geist-font`), enlace de licencia `https://openfontlicense.org`.
- `src/lib/artifact-composer/brand-packs/axis/fonts/poppins-700.ttf`: versión 4.004,
  Copyright 2020 The Poppins Project Authors (`https://github.com/itfoundry/Poppins`),
  enlace de licencia `https://scripts.sil.org/OFL`.

Avisos completos recuperados de fuentes primarias el 2026-09-05:
[Geist](https://raw.githubusercontent.com/google/fonts/main/ofl/geist/OFL.txt) y
[Poppins](https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/OFL.txt).
Se conservan completos en los archivos adyacentes. La OFL 1.1 permite empaquetar y redistribuir
las fuentes junto con software conservando copyright y licencia; no se venden por separado.
El aviso Geist de Google Fonts usa la URL del proyecto con sufijo `.git`; el binario local conserva
su copyright embebido original. No se reemplaza por el aviso 2023 de otra distribución de Geist.

`buildAuthFontAssets(root)` lee únicamente archivos locales, preserva bytes y calcula SHA-256 de
cada fuente y aviso. `renderAuthFontAssetsModule(root)` genera el módulo standalone para Cloud Run;
no hace falta copiar el brand pack al runtime ni descargar fuentes durante una petición.

Integración implementada localmente: el handler sirve las tres rutas `/fonts/*.ttf` del mapa `AUTH_FONT_ASSETS` como bytes
base64 decodificados y los avisos `/fonts/licenses/*-OFL.txt` del mapa `AUTH_FONT_LICENSES` como texto.
El shell incluye enlaces accesibles a estos avisos. El
servidor usa una allowlist exacta, `nosniff`, tipos MIME del mapa y CSP `font-src 'self'`;
sin resolver rutas de disco proporcionadas por la petición. Un cambio de fuente debe regenerar
el módulo y conservar el aviso correspondiente. Los hashes quedan en el artefacto generado.

Esta evidencia respalda los archivos inspeccionados, no cualquier binario llamado Geist o Poppins.
