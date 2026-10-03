// Generates the PWA icons (no image dependencies): an open-book glyph on a paper tile.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}

function png(size) {
  const bg = [0x2f, 0x4a, 0x7a]
  const page = [0xf7, 0xf4, 0xee]
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      // two pages with a spine gap and ruled lines
      const inPage = v > 0.3 && v < 0.72 && ((u > 0.2 && u < 0.485) || (u > 0.515 && u < 0.8))
      const line = inPage && [0.4, 0.5, 0.6].some((l) => Math.abs(v - l) < 0.012) && !(u > 0.46 && u < 0.54)
      const edge = Math.abs(u - (u < 0.5 ? 0.2 : 0.8)) < 0.03
      const c = inPage && !line && !(line && edge) ? page : bg
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2f4a7a"/><g fill="#f7f4ee"><rect x="20" y="30" width="28.5" height="42" rx="2"/><rect x="51.5" y="30" width="28.5" height="42" rx="2"/></g><g stroke="#2f4a7a" stroke-width="2.4"><path d="M25 40h19M25 50h19M25 60h19M56 40h19M56 50h19M56 60h19"/></g></svg>\n`,
)
console.log('icons written')
