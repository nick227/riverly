import { deflateSync } from 'zlib'

// Generated demo files so galleries and documents work with the real storage driver
// (local disk or S3). No binary fixtures are committed.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

type RGB = [number, number, number]

/** A simple "roof" picture: sky, shingle rows and a ridge line, tinted per photo. */
export function roofPhoto(seed: number, width = 480, height = 320): Buffer {
  const shingle: RGB[] = [
    [92, 86, 80],
    [120, 70, 55],
    [70, 78, 90],
    [105, 100, 92],
  ]
  const base = shingle[seed % shingle.length]!
  const sky: RGB = [186 + (seed % 3) * 10, 208, 226]
  const ridge = Math.floor(height * (0.28 + (seed % 4) * 0.04))
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const roofLine = ridge + Math.abs(x - width / 2) * 0.35
      let c: RGB
      if (y < roofLine) c = sky
      else {
        const course = Math.floor((y - roofLine) / 14)
        const tab = Math.floor((x + (course % 2) * 16) / 32)
        const shade = ((course * 7 + tab * 13 + seed) % 5) * 6 - 12
        const edge = (y - roofLine) % 14 < 2 ? -28 : 0
        c = [base[0] + shade + edge, base[1] + shade + edge, base[2] + shade + edge]
      }
      const i = row + 1 + x * 3
      raw[i] = Math.max(0, Math.min(255, c[0]))
      raw[i + 1] = Math.max(0, Math.min(255, c[1]))
      raw[i + 2] = Math.max(0, Math.min(255, c[2]))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/** Minimal single-page PDF with a few lines of text. */
export function simplePdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`).replace(/[^\x20-\x7e]/g, '-')
  const text = [`BT /F1 18 Tf 56 760 Td (${esc(title)}) Tj ET`, ...lines.map((l, i) => `BT /F1 11 Tf 56 ${724 - i * 18} Td (${esc(l)}) Tj ET`)].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'binary')
}
