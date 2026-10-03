#!/usr/bin/env node
/**
 * MUSE · mise à jour de la note Google
 *
 * Interroge l'API Google Places (New) et réécrit dans index.html la note,
 * le nombre d'avis et le remplissage des étoiles (éléments [data-google]).
 * Lancé chaque jour par .github/workflows/google-rating.yml.
 *
 * Variables d'environnement :
 *   GOOGLE_PLACES_API_KEY  clé API (secret GitHub, jamais dans le repo)
 *
 * Le Place ID est trouvé une première fois par recherche texte, vérifié
 * (nom + adresse), puis mémorisé dans scripts/google-place.json.
 *
 * Test local sans clé : node scripts/update-google-rating.mjs --fake=4.7,180
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');
const PLACE_FILE = path.join(ROOT, 'scripts/google-place.json');
const API = 'https://places.googleapis.com/v1';
const SEARCH = {
  textQuery: 'MUSE brasserie bistronomique, 123 rue Alexandra David-Néel, 34000 Montpellier',
  languageCode: 'fr',
  regionCode: 'FR',
};

/** Largeur de remplissage des 5 étoiles (en %), calée sur le dessin de l'étoile dans son carré 24×24. */
export function fillPercent(rating) {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.floor(r);
  const frac = r - full;
  const STAR = 24, LEFT = 3.5, SHAPE = 17; // l'étoile occupe x = 3,5 → 20,5 dans son viewBox
  const px = full * STAR + (frac > 0 ? LEFT + frac * SHAPE : 0);
  return Math.round((px / (5 * STAR)) * 1000) / 10;
}

const frNumber = (n, digits) => n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Réécrit les valeurs dans le HTML. Renvoie le HTML modifié. */
export function applyRating(html, { rating, count }) {
  const r = frNumber(rating, 1);
  const c = frNumber(count, 0);
  return html
    .replace(/(<span[^>]*data-google="rating"[^>]*>)[^<]*(<\/span>)/g, `$1${r}$2`)
    .replace(/(<span[^>]*data-google="count"[^>]*>)[^<]*(<\/span>)/g, `$1${c}$2`)
    .replace(/(<span[^>]*?)style="--fill:[\d.]+%"([^>]*data-google="stars"[^>]*?)aria-label="[^"]*"/g,
      `$1style="--fill:${fillPercent(rating)}%"$2aria-label="Note Google : ${r} sur 5"`);
}

async function placesFetch(url, { key, fieldMask, body }) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`API Places ${res.status} : ${data?.error?.message || res.statusText}`);
  return data;
}

async function resolvePlaceId(key) {
  if (existsSync(PLACE_FILE)) {
    const { id } = JSON.parse(await readFile(PLACE_FILE, 'utf8'));
    if (id) return id;
  }
  const data = await placesFetch(`${API}/places:searchText`, {
    key,
    fieldMask: 'places.id,places.displayName,places.formattedAddress',
    body: SEARCH,
  });
  const hit = (data.places || []).find((p) =>
    /muse/i.test(p.displayName?.text || '') && /David-N[ée]el/i.test(p.formattedAddress || ''));
  if (!hit) {
    const seen = (data.places || []).map((p) => `${p.displayName?.text} · ${p.formattedAddress}`).join('\n  ');
    throw new Error(`MUSE introuvable de façon sûre. Résultats :\n  ${seen || '(aucun)'}`);
  }
  await writeFile(PLACE_FILE, JSON.stringify({ id: hit.id, name: hit.displayName.text, address: hit.formattedAddress }, null, 2) + '\n');
  console.log(`Place ID trouvé : ${hit.id} (${hit.displayName.text}, ${hit.formattedAddress})`);
  return hit.id;
}

async function main() {
  const fake = process.argv.find((a) => a.startsWith('--fake='));
  let rating, count;
  if (fake) {
    [rating, count] = fake.split('=')[1].split(',').map(Number);
  } else {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error('GOOGLE_PLACES_API_KEY manquante.');
    const id = await resolvePlaceId(key);
    const place = await placesFetch(`${API}/places/${id}`, { key, fieldMask: 'rating,userRatingCount' });
    rating = place.rating;
    count = place.userRatingCount;
  }
  if (!Number.isFinite(rating) || !Number.isFinite(count) || count < 1) {
    throw new Error(`Réponse inattendue (note : ${rating}, avis : ${count}), rien n'est modifié.`);
  }
  const before = await readFile(HTML, 'utf8');
  const after = applyRating(before, { rating, count });
  if (after === before) {
    console.log(`Inchangé : ${rating} / 5, ${count} avis.`);
    return;
  }
  await writeFile(HTML, after);
  console.log(`Mis à jour : ${rating} / 5, ${count} avis.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
