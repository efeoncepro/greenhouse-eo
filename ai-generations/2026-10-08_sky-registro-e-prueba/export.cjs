const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const base = __dirname;
(async () => {
  const files = ['01-austral-kayak', '02-cancun-ola'];
  const records = [];
  for (const name of files) {
    const input = path.join(base, name + '.png');
    const bytes = await fs.readFile(input);
    const meta = await sharp(bytes).metadata();
    if (meta.width !== 3840 || meta.height !== 2160) throw new Error('Unexpected native dimensions ' + name);
    let quality = 80;
    let preview;
    do {
      preview = await sharp(bytes).resize(1408, 768, {fit: 'cover', position: 'centre'}).webp({quality}).toBuffer();
      if (preview.length < 200000) break;
      quality -= 5;
    } while (quality >= 40);
    if (preview.length >= 200000) throw new Error('Preview exceeds weight ' + name);
    await fs.writeFile(path.join(base, name + '-1408x768.webp'), preview);
    records.push({ file: name + '.png', nativeWidth: meta.width, nativeHeight: meta.height,
      nativeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      preview: name + '-1408x768.webp', previewBytes: preview.length, previewQuality: quality,
      prompt: 'prompts/' + name + '.txt', log: name + '.log', attempts: 1 });
  }
  const manifest = { date: '2026-10-08', purpose: 'Two internal photographic style proofs requested by operator',
    register: 'E + D colour/light/depth', model: 'gpt-image-2.5-sunburst', quality: 'max',
    requestedSize: '3840x2160', generationMode: 'image edit, two reference inputs per scene',
    skill: 'https://app.notion.com/p/5e4b2473c7914933a3e65531bb72c885',
    provenance: 'refs/provenance.json', operatorApproval: 'pending', publication: 'not requested',
    files: records };
  await fs.writeFile(path.join(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(records, null, 2));
})();
