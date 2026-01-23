/**
 * Simple icon generator for Riley's Daily Chronicle
 * Run with: node generate-icons.js
 *
 * This creates placeholder icons. For production, replace with proper art deco styled icons.
 * You can also use online tools like:
 * - https://www.favicon.io/
 * - https://realfavicongenerator.net/
 */

const fs = require('fs');

// Simple 1-bit PNG generator (creates a gold-colored square)
function createSimplePNG(size, filename) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  // Create a simple gold/tan colored square
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Gold color: #D4AF37
      // Create a simple pattern with border
      const border = 2;
      const isBorder = x < border || x >= width - border || y < border || y >= height - border;

      if (isBorder) {
        // Dark border: #8B7355
        rawData.push(139, 115, 85);
      } else {
        // Gold/tan background: #D4AF37
        rawData.push(212, 175, 55);
      }
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawBuffer);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

  fs.writeFileSync(filename, png);
  console.log(`Created ${filename} (${size}x${size})`);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

// Generate icons
const __dirname_icons = __dirname || '.';
createSimplePNG(16, `${__dirname_icons}/icon16.png`);
createSimplePNG(48, `${__dirname_icons}/icon48.png`);
createSimplePNG(128, `${__dirname_icons}/icon128.png`);

console.log('\nIcons generated! For better icons, consider using an image editor or online favicon generator.');
