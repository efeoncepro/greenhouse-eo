/** Approved editorial changes; applied after source and brand adapters. No layout mutations. */
const copy = require('./hubspot-editorial-copy.json');
module.exports = function applyEditorialCopy(module, compiled, repeaters) {
  const patch = copy[module];
  if (!patch) return;
  Object.assign(compiled.defaults, patch.defaults);
  for (const field of compiled.fields) {
    if (Object.hasOwn(patch.defaults, field.key)) field.label = `${field.label.split(' · ')[0]} · ${patch.defaults[field.key].slice(0,70)}`;
  }
  for (const [key, variants] of Object.entries(patch.repeaters || {})) {
    const repeater = repeaters.find(row => row.key === key);
    if (!repeater) throw new Error(`Missing repeater: ${module}.${key}`);
    for (const [layout, values] of Object.entries(variants)) {
      const row = repeater.defaults.find(row => row._layout === layout);
      if (!row) throw new Error(`Missing layout: ${module}.${key}.${layout}`);
      Object.assign(row, values);
    }
    for(const field of repeater.fields) if(field.label.includes('consultor de la práctica')) field.label='Descripción de la respuesta';
  }
};
