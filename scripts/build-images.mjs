#!/usr/bin/env node
/**
 * MUSE · pipeline images
 *
 * Génère les images web optimisées (AVIF + WebP + JPEG de secours), renommées
 * en slugs SEO, à partir des originaux du dossier DATA :
 *   - photos   → assets/img/   (recadrages + plusieurs largeurs pour srcset)
 *   - cartes   → assets/carte/ (pages des PDF rastérisées, en niveaux de gris)
 *   - PDF      → assets/pdf/   (copiés et renommés)
 *
 * Usage :
 *   npm run images -- "/chemin/vers/00 DATA"
 *   npm run images -- "/chemin/vers/00 DATA" --only=carte   (photos | carte | pdfs)
 *
 * Prérequis : Node 18+, `npm install`, et poppler (pdftoppm) pour les cartes
 * (macOS : `brew install poppler`).
 */
import { readFile, writeFile, mkdir, readdir, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(await readFile(path.join(ROOT, 'scripts/images.config.json'), 'utf8'));
const OUT = {
  img: path.join(ROOT, 'assets/img'),
  carte: path.join(ROOT, 'assets/carte'),
  pdf: path.join(ROOT, 'assets/pdf'),
};

const args = process.argv.slice(2);
const dataDir = args.find((a) => !a.startsWith('--'));
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1];
if (!dataDir || !existsSync(dataDir)) {
  console.error('Indique le dossier DATA : npm run images -- "/chemin/vers/00 DATA"');
  process.exit(1);
}

const nfc = (s) => s.normalize('NFC');

/** Résout un chemin source ; `prefix` tolère les noms de fichiers mal encodés (accents macOS). */
async function resolveSrc(rel, prefix = false) {
  const full = path.join(dataDir, rel);
  if (!prefix && existsSync(full)) return full;
  const dir = path.dirname(full);
  const stem = nfc(path.basename(full));
  const hit = (await readdir(dir)).find((f) => nfc(f).startsWith(stem));
  if (!hit) throw new Error(`Source introuvable : ${rel}`);
  return path.join(dir, hit);
}

/** Zone de recadrage pour un ratio donné, ancrée selon `position`. */
function cropBox(w, h, aspect, position = 'centre') {
  if (!aspect) return null;
  const r = aspect[0] / aspect[1];
  if (Math.abs(w / h - r) < 0.005) return null;
  if (w / h > r) {
    const cw = Math.round(h * r);
    const left = position === 'left' ? 0 : position === 'right' ? w - cw : Math.round((w - cw) / 2);
    return { left, top: 0, width: cw, height: h };
  }
  const ch = Math.round(w / r);
  const top = position === 'top' ? 0 : position === 'bottom' ? h - ch : Math.round((h - ch) / 2);
  return { left: 0, top, width: w, height: ch };
}

const kb = (n) => `${Math.round(n / 1024)} Ko`;

/** Écrit les déclinaisons d'une image déjà recadrée (buffer) et renvoie l'entrée de manifeste. */
async function emit(buffer, outDir, base, widths, fallback, { gray = false } = {}) {
  const meta = await sharp(buffer).metadata();
  const ratio = meta.height / meta.width;
  let total = 0;
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    let pipe = sharp(buffer).resize({ width, withoutEnlargement: true });
    if (gray) pipe = pipe.grayscale();
    const avif = await pipe.clone().avif(CONFIG.formats.avif).toBuffer();
    const webp = await pipe.clone().webp(CONFIG.formats.webp).toBuffer();
    await writeFile(path.join(outDir, `${base}-${w}.avif`), avif);
    await writeFile(path.join(outDir, `${base}-${w}.webp`), webp);
    total += avif.length + webp.length;
    if (w === fallback) {
      const jpg = await pipe.clone().jpeg(CONFIG.formats.jpeg).toBuffer();
      await writeFile(path.join(outDir, `${base}-${w}.jpg`), jpg);
      total += jpg.length;
    }
  }
  console.log(`  ✓ ${base}  (${widths.join('/')}, ${kb(total)})`);
  return { widths, fallback, width: meta.width, height: meta.height, ratio: +ratio.toFixed(4) };
}

const manifest = {};

if (!only || only === 'photos') {
  console.log('Photos →', path.relative(ROOT, OUT.img));
  await mkdir(OUT.img, { recursive: true });
  for (const item of CONFIG.photos) {
    const file = await resolveSrc(item.src, item.prefix);
    const rotated = await sharp(file).rotate().toBuffer();
    const { width: W, height: H } = await sharp(rotated).metadata();
    const variants = item.variants || [{ aspect: item.aspect, position: item.position, widths: item.widths, fallback: item.fallback }];
    for (const v of variants) {
      const box = cropBox(W, H, v.aspect, v.position);
      const cropped = box ? await sharp(rotated).extract(box).toBuffer() : rotated;
      const base = v.suffix ? `${item.name}-${v.suffix}` : item.name;
      manifest[base] = { ...(await emit(cropped, OUT.img, base, v.widths, v.fallback)), alt: item.alt || '' };
    }
  }
}

if (!only || only === 'carte') {
  console.log('Cartes →', path.relative(ROOT, OUT.carte));
  await mkdir(OUT.carte, { recursive: true });
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
  } catch {
    console.error('pdftoppm introuvable : installe poppler (macOS : brew install poppler).');
    process.exit(1);
  }
  const tmp = await mkdtemp(path.join(tmpdir(), 'muse-carte-'));
  const { widths, fallback, dpi } = CONFIG.carte;
  for (const p of CONFIG.carte.pages) {
    const pdf = await resolveSrc(p.pdf, p.prefix);
    const outBase = path.join(tmp, p.name);
    execFileSync('pdftoppm', ['-r', String(dpi), '-f', String(p.page), '-l', String(p.page), '-png', '-singlefile', pdf, outBase], { stdio: 'ignore' });
    const buf = await readFile(`${outBase}.png`);
    manifest[p.name] = await emit(buf, OUT.carte, p.name, widths, fallback, { gray: true });
  }
  await rm(tmp, { recursive: true, force: true });
}

if (!only || only === 'pdfs') {
  console.log('PDF →', path.relative(ROOT, OUT.pdf));
  await mkdir(OUT.pdf, { recursive: true });
  for (const p of CONFIG.pdfs) {
    await copyFile(await resolveSrc(p.src, p.prefix), path.join(OUT.pdf, p.name));
    console.log(`  ✓ ${p.name}`);
  }
}

if (Object.keys(manifest).length) {
  const file = path.join(ROOT, 'scripts/images.manifest.json');
  const prev = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  await writeFile(file, JSON.stringify({ ...prev, ...manifest }, null, 2) + '\n');
  console.log('Manifeste →', path.relative(ROOT, file));
}
