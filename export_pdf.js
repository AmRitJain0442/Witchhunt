// Kutumb deck → PDF exporter
// Run: node export_pdf.js
// Requires: npx (auto-installs puppeteer)

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
} catch {
  console.log('Installing puppeteer...');
  execSync('npm install puppeteer --save-dev', { stdio: 'inherit' });
}

const puppeteer = require('puppeteer');

const SLIDE_COUNT = 19;
const HTML_FILE = path.resolve(__dirname, 'Kutumb_Deck.html');
const OUT_FILE = path.resolve(__dirname, 'Kutumb_Deck_Export.pdf');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--disable-web-security'],
  });

  const page = await browser.newPage();

  // 16:9 viewport at 1920x1080
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 2000));

  const screenshots = [];

  for (let i = 0; i < SLIDE_COUNT; i++) {
    console.log(`Capturing slide ${i + 1} / ${SLIDE_COUNT}...`);

    // Activate slide i
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, j) => {
        s.classList.remove('active', 'exit');
        if (j === idx) s.classList.add('active');
      });
      // Hide UI chrome
      const nav = document.getElementById('nav');
      const prev = document.getElementById('prev');
      const next = document.getElementById('next');
      const cursor = document.getElementById('cursor');
      if (nav) nav.style.display = 'none';
      if (prev) prev.style.display = 'none';
      if (next) next.style.display = 'none';
      if (cursor) cursor.style.display = 'none';
    }, i);

    // Allow any transition to settle
    await new Promise(r => setTimeout(r, 300));

    const imgBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    screenshots.push(imgBuffer);
  }

  await browser.close();
  console.log('All slides captured. Building PDF...');

  // Use a second puppeteer page to assemble images into a PDF
  const browser2 = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page2 = await browser2.newPage();

  // Build an HTML doc with all slides as full-page images
  const b64images = screenshots.map(buf => buf.toString('base64'));

  const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0A0A0F; }
  .page {
    width: 1920px;
    height: 1080px;
    page-break-after: always;
    overflow: hidden;
    display: block;
  }
  .page:last-child { page-break-after: avoid; }
  .page img { width: 1920px; height: 1080px; display: block; }
  @page { size: 1920px 1080px; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
  }
</style>
</head>
<body>
${b64images.map((b64, i) => `<div class="page"><img src="data:image/png;base64,${b64}" alt="Slide ${i+1}"/></div>`).join('\n')}
</body>
</html>`;

  await page2.setContent(printHtml, { waitUntil: 'networkidle0' });
  await page2.setViewport({ width: 1920, height: 1080 });

  await page2.pdf({
    path: OUT_FILE,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser2.close();

  const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓ PDF saved: ${OUT_FILE} (${sizeMB} MB)`);
  console.log(`  ${SLIDE_COUNT} slides · 1920×1080 · 2× scale`);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
