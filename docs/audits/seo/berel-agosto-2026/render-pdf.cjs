const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Keep the raw export separate: finishing can always restart without stamping twice.
const rawPath = path.join(__dirname, 'BEREL_INFORME_AGOSTO_2026_A4.raw.pdf');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('requestfailed', request => failures.push(`Resource failed: ${new URL(request.url()).protocol}`));
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
    await page.goto(pathToFileURL(path.join(__dirname, 'REPORTE_BEREL_AGOSTO_2026.html')).href);
    const resources = await page.evaluate(async () => {
      await document.fonts.ready;
      const images = await Promise.all(Array.from(document.images, async (image, index) => {
        try { await image.decode(); } catch { return `Image ${index + 1} did not decode`; }
        return image.naturalWidth > 0 && image.naturalHeight > 0 ? null : `Image ${index + 1} is empty`;
      }));
      const fonts = Array.from(document.fonts).map(font => ({ family: font.family, weight: font.weight, status: font.status }));
      return { images: images.filter(Boolean), fonts };
    });
    failures.push(...resources.images);
    for (const family of ['Geist', 'Poppins']) {
      if (!resources.fonts.some(font => font.family.replace(/["']/g, '') === family && font.status === 'loaded')) {
        failures.push(`Brand font not loaded: ${family}`);
      }
    }
    failures.push(...resources.fonts.filter(font => font.status === 'error').map(font => `Font failed: ${font.family} ${font.weight}`));
    if (failures.length) throw new Error(failures.join('\n'));
    const temporary = rawPath + '.tmp';
    await page.pdf({ path: temporary, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    fs.renameSync(temporary, rawPath);
    console.log(`Raw A4 PDF generated with Chromium ${browser.version()}. Run finish-pdf.py to update the deliverable.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exit(1); });
