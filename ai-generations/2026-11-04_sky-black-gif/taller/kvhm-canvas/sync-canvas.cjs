// Copia al proyecto del canvas (como JPG 4:4:4 q90) los KV, popups/stories, banners y piezas de Chile.
const fs = require('fs');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, P = K + '/../canvas/project/';
const jpg = (src, dst) => sharp(src).flatten({ background: '#000' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(dst);
(async () => {
  for (const d of ['kv', 'formatos', 'banners', 'chile']) fs.mkdirSync(P + d, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(K + '/png').filter((x) => /^HM_.*\.png$/.test(x))) { await jpg(K + '/png/' + f, P + 'kv/' + f.replace('.png', '.jpg')); n++; }
  for (const f of fs.readdirSync(K + '/formatos').filter((x) => x.endsWith('.png'))) { await jpg(K + '/formatos/' + f, P + 'formatos/' + f.replace('.png', '.jpg')); n++; }
  // PMAX 1200x628 por KV y HPH: 1200 en JPG; los chicos a 2x en PNG, como ya estaban publicados.
  for (const f of fs.readdirSync(K + '/banners').filter((x) => /__pmax-1200x628\.png$/.test(x))) { await jpg(K + '/banners/' + f, P + 'banners/' + f.replace('.png', '.jpg')); n++; }
  for (const f of fs.readdirSync(K + '/hph/out-mercados')) {
    if (/__hph-1200x1200\.png$/.test(f)) await jpg(K + '/hph/out-mercados/' + f, P + 'banners/' + f.replace('.png', '.jpg'));
    else if (/_2x\.png$/.test(f) && !/1200x1200/.test(f)) fs.copyFileSync(K + '/hph/out-mercados/' + f, P + 'banners/' + f);
    else continue; n++;
  }
  for (const f of fs.readdirSync(K + '/hph/out')) {
    if (f === 'HPH_1200x1200_GENERICO.png') await jpg(K + '/hph/out/' + f, P + 'banners/HPH_1200x1200_GENERICO.jpg');
    else if (/@2x\.png$/.test(f) && !/1200x1200/.test(f)) fs.copyFileSync(K + '/hph/out/' + f, P + 'banners/' + f.replace('@2x', '_2x'));
    else continue; n++;
  }
  for (const f of fs.readdirSync(K + '/chile').filter((x) => !x.endsWith('_2x.png'))) { await jpg(K + '/chile/' + f, P + 'chile/' + f.replace('.png', '.jpg')); n++; }
  console.log('copiados', n);
})();
