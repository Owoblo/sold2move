#!/usr/bin/env node

// Mechanical production crop: retain the official SATURN STAR artwork and
// make the MOVERS descriptor pixels transparent. No letterforms are redrawn.
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const assetDir = path.join(__dirname, 'assets', 'brand-svg');
const inputPath = path.join(assetDir, 'SaturnStarMovers_Wordmark_DeepNavy.png');
const outputPath = path.join(assetDir, 'SaturnStarMovers_Wordmark_DeepNavy_NoDescriptor.png');
const png = PNG.sync.read(fs.readFileSync(inputPath));

// Official asset geometry: main wordmark ends above row 210; descriptor begins
// below it. Preserve the canvas/padding so existing placement stays unchanged.
for (let y = 210; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    png.data[((y * png.width + x) * 4) + 3] = 0;
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(png));
console.log(outputPath);
