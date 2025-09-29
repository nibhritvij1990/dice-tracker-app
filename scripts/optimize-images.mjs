#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = path.resolve('src/assets/images')

async function convert(file) {
  const ext = path.extname(file).toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return
  const base = file.slice(0, -ext.length)
  const input = path.join(SRC_DIR, file)
  const buf = fs.readFileSync(input)
  // WebP
  const webpOut = path.join(SRC_DIR, base + '.webp')
  if (!fs.existsSync(webpOut)) {
    await sharp(buf).webp({ quality: 80 }).toFile(webpOut)
  }
  // AVIF
  const avifOut = path.join(SRC_DIR, base + '.avif')
  if (!fs.existsSync(avifOut)) {
    await sharp(buf).avif({ quality: 45 }).toFile(avifOut)
  }
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) return
  const files = fs.readdirSync(SRC_DIR)
  for (const f of files) {
    try { await convert(f) } catch (e) { console.error('Failed', f, e.message) }
  }
  console.log('Image optimization complete')
}

main()

