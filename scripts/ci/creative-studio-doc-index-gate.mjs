#!/usr/bin/env node
/**
 * Gate del índice documental de Creative Studio (Globe).
 *
 * ## Por qué existe
 *
 * Los índices de `docs/documentation/` y `docs/manual-de-uso/` se sincronizan a mano, y a mano derivan.
 * Medido el 2026-08-05: **12 documentos de Globe existían sin estar indexados** —7 funcionales y 5 manuales—,
 * algunos desde julio. No es que alguien fuera descuidado: es que **nada lo miraba**. Un documento que existe
 * y no está en su índice es, en la práctica, un documento que nadie va a encontrar, y el Platform Documentation
 * Protocol pierde su sentido si el índice no describe lo que hay.
 *
 * Es la misma familia que el resto de los gates de esta plataforma: la disciplina humana no escala, el build sí.
 *
 * ## Qué verifica, y en las DOS direcciones
 *
 * 1. **Todo doc del directorio está en su índice.** Un archivo nuevo sin entrada rompe el build.
 * 2. **Toda entrada del índice apunta a un archivo que existe.** Un enlace a un doc borrado o renombrado
 *    también rompe — un índice que promete lo que no está es peor que uno incompleto, porque se lee como
 *    autoridad.
 *
 * ## Qué NO hace, dicho para que nadie le pida lo que no puede dar
 *
 * No juzga la **calidad** de la entrada: una descripción de tres palabras lo satisface. Verificar que el índice
 * describa bien es trabajo humano. Este gate garantiza que la entrada **exista**, que es exactamente lo que
 * faltó 12 veces.
 *
 * Uso: `node scripts/ci/creative-studio-doc-index-gate.mjs`
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/** Cada par es un directorio de docs y el índice que debe describirlo. */
const INDEXED_TREES = Object.freeze([
  { dir: 'docs/documentation/creative-studio', index: 'docs/documentation/README.md', label: 'doc funcional' },
  { dir: 'docs/manual-de-uso/creative-studio', index: 'docs/manual-de-uso/README.md', label: 'manual de uso' },
]);

/** `README.md` del propio directorio es índice, no contenido. */
const NOT_CONTENT = new Set(['README.md']);

async function auditTree({ dir, index, label }) {
  const entries = await readdir(path.join(ROOT, dir));
  const files = entries.filter(name => name.endsWith('.md') && !NOT_CONTENT.has(name)).sort();
  const indexSource = await readFile(path.join(ROOT, index), 'utf8');
  const folder = path.basename(dir);

  const missing = files.filter(name => !indexSource.includes(`${folder}/${name}`));

  // Dirección contraria: enlaces del índice hacia archivos que ya no existen.
  const present = new Set(files);

  const linked = [...indexSource.matchAll(new RegExp(`${folder}/([A-Za-z0-9._-]+\\.md)`, 'g'))]
    .map(match => match[1]);

  const dangling = [...new Set(linked)].filter(name => !present.has(name));

  return { dir, index, label, missing, dangling };
}

const results = await Promise.all(INDEXED_TREES.map(auditTree));
const failures = results.filter(r => r.missing.length > 0 || r.dangling.length > 0);

if (failures.length === 0) {
  const total = results.reduce((sum, r) => sum + r.missing.length + r.dangling.length, 0);

  console.log(`creative-studio-doc-index-gate: OK — cada doc de Creative Studio está en su índice y cada enlace resuelve (${total} hallazgos).`);
  process.exit(0);
}

for (const r of failures) {
  for (const name of r.missing) {
    console.error(`✗ ${r.label} sin indexar: ${r.dir}/${name} → agrégalo a ${r.index}`);
  }

  for (const name of r.dangling) {
    console.error(`✗ ${r.index} enlaza un archivo inexistente: ${path.basename(r.dir)}/${name}`);
  }
}

console.error('\nUn documento que existe y no está en su índice es un documento que nadie va a encontrar.');
process.exit(1);
