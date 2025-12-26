#!/usr/bin/env node
/**
 * PWA Icon Generator
 * 
 * Run: node scripts/generate-icons.js
 * 
 * This script generates PNG icons from the SVG source for PWA.
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Sharp not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const outputDir = path.join(__dirname, '../public/icons');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Also create apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  // Create favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('  Created: favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('  Created: favicon-16x16.png');

  // Generate OG image (1200x630 for social media previews)
  const ogSvgPath = path.join(__dirname, '../public/og-image.svg');
  if (fs.existsSync(ogSvgPath)) {
    const ogSvgBuffer = fs.readFileSync(ogSvgPath);
    await sharp(ogSvgBuffer)
      .resize(1200, 630)
      .png()
      .toFile(path.join(__dirname, '../public/og-image.png'));
    console.log('  Created: og-image.png (1200x630)');
  }

  console.log('\nDone! All PWA icons generated.');
}

generateIcons().catch(console.error);






