/**
 * Generate PNG images from SVG for Farcaster Frames
 * 
 * This script converts SVG images to PNG format which is required
 * for Farcaster Frame compatibility.
 * 
 * Usage: node scripts/generate-images.js
 * 
 * Note: Requires 'sharp' package
 * Install: yarn add sharp --dev
 */

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================');
  console.log('🖼️  BaseFair Image Generator');
  console.log('========================================\n');

  // Check if sharp is available
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    console.log('⚠️  Sharp not installed. Installing...');
    console.log('   Run: yarn add sharp --dev\n');
    
    // Create placeholder PNGs using canvas-free method
    console.log('📝 Creating placeholder PNG files...\n');
    await createPlaceholderPNGs();
    return;
  }

  const imagesDir = path.join(__dirname, '../public/images');
  
  // SVG to PNG conversions
  const conversions = [
    { 
      input: 'base-logo.svg', 
      output: 'base-logo.png',
      width: 512,
      height: 512 
    },
    { 
      input: 'og-image.svg', 
      output: 'og-image.png',
      width: 1200,
      height: 630 
    },
    { 
      input: 'splash.svg', 
      output: 'splash.png',
      width: 1200,
      height: 630 
    },
  ];

  for (const conv of conversions) {
    const inputPath = path.join(imagesDir, conv.input);
    const outputPath = path.join(imagesDir, conv.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${conv.input} (not found)`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(conv.width, conv.height, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${conv.output} (${conv.width}x${conv.height})`);
    } catch (error) {
      console.error(`❌ Error converting ${conv.input}:`, error.message);
    }
  }

  // Generate favicon
  const faviconInputPath = path.join(imagesDir, 'base-logo.svg');
  const faviconOutputPath = path.join(__dirname, '../public/favicon.ico');
  
  if (fs.existsSync(faviconInputPath)) {
    try {
      // Create a 32x32 PNG for favicon
      const pngBuffer = await sharp(faviconInputPath)
        .resize(32, 32, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } })
        .png()
        .toBuffer();
      
      fs.writeFileSync(path.join(imagesDir, 'favicon.png'), pngBuffer);
      console.log('✅ Generated: favicon.png (32x32)');
    } catch (error) {
      console.error('❌ Error generating favicon:', error.message);
    }
  }

  console.log('\n========================================');
  console.log('🎉 Image Generation Complete!');
  console.log('========================================');
}

async function createPlaceholderPNGs() {
  const imagesDir = path.join(__dirname, '../public/images');
  
  // Simple 1x1 blue pixel PNG (Base blue color)
  // This is a valid minimal PNG file
  const minimalBluePNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0x00, 0x52, 0xFF, 0x0C,
    0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD,
    0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const files = ['base-logo.png', 'og-image.png', 'splash.png', 'favicon.png'];
  
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, minimalBluePNG);
      console.log(`✅ Created placeholder: ${file}`);
    }
  }

  console.log('\n⚠️  Note: These are placeholder images.');
  console.log('   For production, install sharp and re-run this script:');
  console.log('   yarn add sharp --dev && node scripts/generate-images.js\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

