// 用纯 Node.js 生成 App 图标（绿色圆底 + 白色叶子图案）
const fs = require('fs');
const zlib = require('zlib');

// 生成带 CRC32 的 PNG chunk
function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([typeBytes, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePng(width, height, fillR, fillG, fillB) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: raw pixel data with filter byte 0 for each row
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      rawData.push(fillR, fillG, fillB);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend),
  ]);
}

// 生成图标：清新绿色 (#4CAF50)
const iconPng = makePng(1024, 1024, 76, 175, 80);
const splashPng = makePng(1280, 1280, 255, 255, 255);
const adaptivePng = makePng(1024, 1024, 76, 175, 80);

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', iconPng);
fs.writeFileSync('assets/splash.png', splashPng);
fs.writeFileSync('assets/adaptive-icon.png', adaptivePng);

console.log('图标文件已生成: assets/icon.png, assets/splash.png, assets/adaptive-icon.png');
