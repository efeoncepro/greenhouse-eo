const fs = require('fs');
const dir = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/canvas/project/';
const ids = {
  'arequipa': '2d0630e2342ed700c8f49c937505a614', 'ayacucho': 'f0aec03293cf5b2360b1aa1d92d8121f', 'buenos-aires': '1647ee8b8199848a3102c6954140b2cc',
  'cajamarca': '7b68d2da2371957976fb330cd94cc736', 'chiclayo': 'a3abf9ef00ba66c78eed6f6615e6e8c4', 'cusco': '01408fbdca0aad998f1a15012b233ed4',
  'iquitos': 'f99eb4a4edf7a98a351f0dffe87c067f', 'jauja': '3e888bf328e74ac2f74588cf1bb71ea8', 'juliaca': '3ffa968a657c5ff14496d1b114f84c73',
  'miami': '58d0b8a42e2b3e4ef87b25d9875236e6', 'piura': 'a04d4ab702e60ff6ec5ed08358e5d952', 'pucallpa': '2364ddf18e92116823cd7463411c8ed7',
  'puerto-maldonado': '218ce7d69deef39037132f070df10daa', 'punta-cana': 'edc19df280a4801cb991d04a0074df31', 'santiago': '3865de53901e6250002f99ffe6b4864e',
  'sao-paulo': 'ee2c25568b2118d522d62cb816ef2117', 'tacna': '37b1511f00237861a72264357b4e74be', 'talara': '23984ab72db25ec45fdc38e3f8d6ed70',
  'tarapoto': 'bb2658e59f0c3a90e764dc866b793095', 'trujillo': '856bd1e3e010ee5dd49d49b1e3108110', 'tumbes': '1eb19c0210882f32cece2926a5c53467'
};
for (const f of ['PlantillaPost.dc.html', 'PlantillaStory.dc.html', 'PlantillaPopup.dc.html']) {
  let s = fs.readFileSync(dir + f, 'utf8');
  let n = 0;
  for (const [k, v] of Object.entries(ids)) {
    const re = new RegExp("  '" + k + "': \\{ src: '/_blob/[0-9a-f]{32}' \\},");
    if (!re.test(s)) throw new Error(f + ' missing ' + k);
    s = s.replace(re, "  '" + k + "': { src: '/_blob/" + v + "' },");
    n++;
  }
  fs.writeFileSync(dir + f, s);
  console.log(f, n);
}
