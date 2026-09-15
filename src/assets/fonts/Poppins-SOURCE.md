# Poppins font assets

- **Familia:** Poppins
- **Origen:** instalación local verificada del operador; familia distribuida por Google Fonts.
- **Licencia:** SIL Open Font License 1.1
  (`scripts/auth-server/font-licenses/Poppins-OFL.txt`).
- **Uso en este repo:** composición determinista de piezas publicitarias; no cambia la frontera
  tipográfica de la UI de producto.

## Archivos incorporados para `supportingTagline`

| Archivo | Rol AXIS | SHA-256 |
| --- | --- | --- |
| `Poppins-Regular.ttf` | base · 400 regular | `707fdc5c8bab57a90061c6a8ed7b70d5ffb82fc810e994e79f90bace890c255a` |
| `Poppins-BoldItalic.ttf` | intervention · 700 italic | `9d4d9f3c2c289eaec403660ec215bdc45e62b49f978807714bfc31ca7916c8fe` |

Los agentes deben usar estos assets versionados mediante el contrato del Campaign Layout Compiler. No deben
resolver estas dos variantes desde una ruta del sistema operativo ni sintetizar cursiva o peso.
