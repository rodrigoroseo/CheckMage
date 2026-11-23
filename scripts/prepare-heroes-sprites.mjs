import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync, inflateSync } from 'node:zlib';

const input = new URL('../src/assets/Heroes3_Pieces.png', import.meta.url);
const output = new URL('../src/assets/Heroes3_Pieces_transparent.png', import.meta.url);
const cropsOutput = new URL('../src/assets/heroes-sprite-crops.json', import.meta.url);
const piecesOutput = new URL('../src/assets/pieces/', import.meta.url);
const png = await readFile(input);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!png.subarray(0, 8).equals(signature)) throw new Error('Input is not a PNG.');

let width, height, bitDepth, colorType;
const compressed = [];
for (let offset = 8; offset < png.length;) {
  const length = png.readUInt32BE(offset);
  const type = png.toString('ascii', offset + 4, offset + 8);
  const data = png.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  } else if (type === 'IDAT') compressed.push(data);
  offset += 12 + length;
  if (type === 'IEND') break;
}
if (bitDepth !== 8 || colorType !== 6) throw new Error('Expected an 8-bit RGBA PNG.');

const stride = width * 4;
const raw = inflateSync(Buffer.concat(compressed));
const rgba = Buffer.alloc(stride * height);
const paeth = (a, b, c) => {
  const p = a + b - c,
    pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const source = y * (stride + 1) + 1;
  const row = y * stride;
  for (let i = 0; i < stride; i++) {
    const left = i >= 4 ? rgba[row + i - 4] : 0;
    const up = y > 0 ? rgba[row + i - stride] : 0;
    const upperLeft = y > 0 && i >= 4 ? rgba[row + i - stride - 4] : 0;
    const predictor =
      filter === 1
        ? left
        : filter === 2
          ? up
          : filter === 3
            ? Math.floor((left + up) / 2)
            : filter === 4
              ? paeth(left, up, upperLeft)
              : 0;
    rgba[row + i] = (raw[source + i] + predictor) & 255;
  }
}

// Remove only the dark background connected to the outside border. Enclosed
// near-black sprite details stay untouched.
const clear = new Uint8Array(width * height);
const queue = new Uint32Array(width * height);
let head = 0,
  tail = 0;
const add = (x, y) => {
  const index = y * width + x;
  if (clear[index]) return;
  const p = index * 4,
    r = rgba[p],
    g = rgba[p + 1],
    b = rgba[p + 2];
  if (r <= 34 && g <= 27 && b <= 24 && r - g <= 13 && g - b <= 12) {
    clear[index] = 1;
    queue[tail++] = index;
  }
};
for (let x = 0; x < width; x++) {
  add(x, 0);
  add(x, height - 1);
}
for (let y = 0; y < height; y++) {
  add(0, y);
  add(width - 1, y);
}
while (head < tail) {
  const index = queue[head++],
    x = index % width,
    y = Math.floor(index / width);
  if (x > 0) add(x - 1, y);
  if (x + 1 < width) add(x + 1, y);
  if (y > 0) add(x, y - 1);
  if (y + 1 < height) add(x, y + 1);
}
for (let i = 0; i < clear.length; i++) if (clear[i]) rgba[i * 4 + 3] = 0;

// Assign connected silhouettes to their character slots. This prevents a
// rectangular column crop from retaining pixels from a neighboring character.
const columns = {
  b: [
    [35, 105],
    [105, 180],
    [180, 255],
    [255, 326],
    [326, 400],
    [400, 480],
  ],
  w: [
    [35, 104],
    [104, 170],
    [170, 245],
    [245, 335],
    [335, 403],
    [403, 480],
  ],
};
const rows = { b: [25, 176], w: [176, 320] };
const types = ['p', 'n', 'b', 'r', 'q', 'k'];
const componentIds = new Int32Array(width * height);
const componentQueue = new Uint32Array(width * height);
const components = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const firstIndex = y * width + x;
    if (rgba[firstIndex * 4 + 3] === 0 || componentIds[firstIndex]) continue;
    const id = components.length + 1;
    let head = 0,
      tail = 0;
    let minX = x,
      minY = y,
      maxX = x,
      maxY = y;
    componentIds[firstIndex] = id;
    componentQueue[tail++] = firstIndex;
    while (head < tail) {
      const index = componentQueue[head++],
        cx = index % width,
        cy = Math.floor(index / width);
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx,
            ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nextIndex = ny * width + nx;
          if (rgba[nextIndex * 4 + 3] === 0 || componentIds[nextIndex]) continue;
          componentIds[nextIndex] = id;
          componentQueue[tail++] = nextIndex;
        }
    }
    components.push({ id, area: tail, minX, minY, maxX, maxY });
  }
}

const cropPadding = {
  'b-p': 3,
  'w-p': 0,
  'b-n': 1,
  'w-n': 3,
  'b-b': 2,
  'w-b': 2,
  'b-r': 2,
  'w-r': 5,
  'b-q': 2,
  'w-q': 4,
  'b-k': 2,
  'w-k': 2,
};
const crops = {};
const selectedComponents = {};
for (const side of ['b', 'w']) {
  crops[side] = {};
  selectedComponents[side] = {};
  for (let column = 0; column < types.length; column++) {
    const [left, right] = columns[side][column],
      [top, bottom] = rows[side];
    const candidates = components
      .filter((component) => {
        const centerX = (component.minX + component.maxX) / 2;
        const centerY = (component.minY + component.maxY) / 2;
        return (
          component.area > 200 &&
          centerX >= left &&
          centerX < right &&
          centerY >= top &&
          centerY < bottom
        );
      })
      .sort((a, b) => b.area - a.area);
    const component = candidates[0];
    if (!component) throw new Error(`No character silhouette found for ${side}:${types[column]}.`);
    const padding = cropPadding[`${side}-${types[column]}`];
    const x = Math.max(0, component.minX - padding),
      y = Math.max(0, component.minY - padding);
    const rightEdge = Math.min(width, component.maxX + padding + 1);
    const bottomEdge = Math.min(height, component.maxY + padding + 1);
    crops[side][types[column]] = [x, y, rightEdge - x, bottomEdge - y];
    selectedComponents[side][types[column]] = component.id;
  }
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type),
    body = Buffer.concat([name, data]),
    result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), body.length + 4);
  return result;
};
await mkdir(piecesOutput, { recursive: true });
for (const side of ['b', 'w']) {
  for (const type of types) {
    const [x, y, cropWidth, cropHeight] = crops[side][type];
    const componentId = selectedComponents[side][type];
    const pixels = Buffer.alloc(cropWidth * cropHeight * 4);
    for (let row = 0; row < cropHeight; row++) {
      for (let column = 0; column < cropWidth; column++) {
        const sourceIndex = ((y + row) * width + x + column) * 4;
        const targetIndex = (row * cropWidth + column) * 4;
        if (componentIds[(y + row) * width + x + column] === componentId) {
          rgba.copy(pixels, targetIndex, sourceIndex, sourceIndex + 4);
        }
      }
    }
    const rowStride = cropWidth * 4;
    const filteredPixels = Buffer.alloc((rowStride + 1) * cropHeight);
    for (let row = 0; row < cropHeight; row++) {
      pixels.copy(
        filteredPixels,
        row * (rowStride + 1) + 1,
        row * rowStride,
        (row + 1) * rowStride,
      );
    }
    const spriteHeader = Buffer.alloc(13);
    spriteHeader.writeUInt32BE(cropWidth, 0);
    spriteHeader.writeUInt32BE(cropHeight, 4);
    spriteHeader[8] = 8;
    spriteHeader[9] = 6;
    const sprite = Buffer.concat([
      signature,
      chunk('IHDR', spriteHeader),
      chunk('IDAT', deflateSync(filteredPixels)),
      chunk('IEND', Buffer.alloc(0)),
    ]);
    await writeFile(new URL(`${side}-${type}.png`, piecesOutput), sprite);
  }
}
await writeFile(cropsOutput, `${JSON.stringify(crops, null, 2)}\n`);
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(height, 4);
header[8] = 8;
header[9] = 6;
const filtered = Buffer.alloc((stride + 1) * height);
for (let y = 0; y < height; y++)
  rgba.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
const result = Buffer.concat([
  signature,
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(filtered)),
  chunk('IEND', Buffer.alloc(0)),
]);
await writeFile(output, result);
console.log(
  `Created ${width}×${height} transparent sprite sheet and 12 isolated, tightly cropped PNG pieces.`,
);
