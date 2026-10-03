# musemontpellier.com

Site one page de **MUSE**, brasserie bistronomique à Montpellier (rez-de-chaussée de Higher Roch, quartier Nouveau Saint-Roch).

HTML/CSS/JS statiques, sans framework ni étape de build. Hébergé sur GitHub Pages (`CNAME` → `musemontpellier.com`).

## Structure

```
index.html                  la page (contenu, SEO, données structurées)
mentions-legales.html       mentions légales (non indexée)
assets/css/style.css        styles, mobile first
assets/js/main.js           menu mobile, onglets de la carte, curseurs, visionneuse
assets/fonts/               Newsreader + Hanken Grotesk (woff2 auto-hébergés, sous-ensemble latin)
assets/img/                 photos optimisées (AVIF + WebP + JPEG de secours, plusieurs largeurs)
assets/carte/               pages des cartes en images (générées depuis les PDF)
assets/pdf/                 cartes PDF téléchargeables
assets/brand/               logo, icônes, image de partage (og-image.jpg)
scripts/build-images.mjs    pipeline images (sharp)
scripts/update-google-rating.mjs  note et nombre d'avis Google (API Places)
.github/workflows/          mise à jour quotidienne de la note Google
scripts/images.config.json  liste des images : source, nom SEO, recadrage, largeurs
sitemap.xml, robots.txt, site.webmanifest, favicon.*
```

## Mettre à jour la carte (à chaque changement de saison)

Prérequis, une seule fois : Node 18+, `npm install`, et poppler (`brew install poppler` sur macOS).

1. Remplacer les PDF dans le dossier DATA du projet (mêmes noms de fichiers).
2. Régénérer les images des cartes et les PDF renommés :
   ```bash
   npm run images -- "/chemin/vers/AK-2609 WEBSITE MUSE/00 DATA" --only=carte
   npm run images -- "/chemin/vers/AK-2609 WEBSITE MUSE/00 DATA" --only=pdfs
   ```
3. Dans `index.html`, mettre à jour la mention « Carte de saison · septembre – octobre 2026 ».
4. Si le nombre de pages change, ajuster `carte.pages` dans `scripts/images.config.json` et les blocs `<a class="page-btn">` dans `index.html`.
5. Commit et push : le site se met à jour tout seul.

## Ajouter ou changer une photo

1. Ajouter une entrée dans `scripts/images.config.json` (source, nom en slug SEO, ratio de recadrage, largeurs).
2. `npm run images -- "/chemin/vers/00 DATA" --only=photos`
3. Dans `index.html`, dupliquer un bloc `<picture>` existant et changer le nom et le texte alternatif.

Les dimensions de chaque image sont dans `scripts/images.manifest.json`.

## Note Google automatique

Chaque jour, l'Action « Note Google » (`.github/workflows/google-rating.yml`) interroge l'API Google Places (New), met à jour la note, le nombre d'avis et le remplissage des étoiles dans `index.html`, puis committe si quelque chose a changé.

- La clé API est un **secret du repo** : `GOOGLE_PLACES_API_KEY` (Settings › Secrets and variables › Actions). Elle n'apparaît jamais dans le code.
- Au premier lancement, le Place ID de MUSE est retrouvé par recherche, vérifié (nom + adresse), puis mémorisé dans `scripts/google-place.json`.
- Lancement manuel : onglet Actions › Note Google › Run workflow.
- Test local sans clé : `node scripts/update-google-rating.mjs --fake=4.7,180`.
- GitHub met en pause les tâches planifiées d'un repo public sans activité pendant 60 jours : si la note ne bouge plus pendant longtemps, relancer l'Action à la main.

## Cookies et RGPD

Le site ne dépose **aucun cookie** et n'utilise aucun traceur : polices auto-hébergées, pas de mesure d'audience, pas de widget ni de carte intégrés, note Google récupérée côté serveur. **Aucun bandeau de consentement n'est donc requis** (règles CNIL). Les mentions légales le précisent.

Si on ajoute un jour une mesure d'audience, une carte Google Maps intégrée, une vidéo YouTube, un flux Instagram ou un pixel publicitaire, il faudra soit un bandeau de consentement conforme CNIL (par exemple tarteaucitron.js), soit un outil de mesure exempté de consentement (Matomo configuré selon les recommandations CNIL).

## Référencement en place

- Balises title, description, canonical, Open Graph et Twitter Card, avec une image de partage en 1200 × 630.
- Données structurées JSON-LD `Restaurant` : adresse, téléphone, email, horaires, cuisine, réservation, menu, Instagram.
- `sitemap.xml` (avec les images principales) et `robots.txt`.
- HTML sémantique : un seul `h1`, titres hiérarchisés, textes alternatifs descriptifs, noms de fichiers explicites.
- Performance : AVIF/WebP en `srcset`, chargement différé, préchargement de l'image d'accueil et de la police principale, polices auto-hébergées (pas d'appel à Google Fonts, plus simple côté RGPD).
- Lighthouse mobile en local : performance 99, accessibilité 100, bonnes pratiques 100, SEO 100.

## À faire après la mise en ligne

- [ ] **Fiche Google Business Profile** : renseigner l'URL du site (elle indique « Ajouter un site Web »). C'est le levier n°1 pour le référencement local.
- [ ] Google Search Console : ajouter la propriété `musemontpellier.com` et soumettre `sitemap.xml`.
- [ ] Vérifier le partage du lien (Facebook Sharing Debugger, aperçu WhatsApp/LinkedIn).

## À compléter

- [ ] **Heure de fermeture** : le JSON-LD indique 7h → minuit, 7j/7 (d'après la fiche Google). À confirmer.
- [ ] Avis Google : seuls la note et le nombre d'avis sont affichés. Pour afficher le texte de quelques avis, étendre `scripts/update-google-rating.mjs` (champ `reviews` de l'API, avec l'attribution exigée par Google).

## Mise en ligne sur GitHub Pages

Settings → Pages → Deploy from a branch → `main` / root. Domaine personnalisé : `musemontpellier.com`, puis cocher « Enforce HTTPS ».
Côté DNS, faire pointer le domaine vers GitHub Pages en suivant la doc GitHub : « Managing a custom domain for your GitHub Pages site ».

## Crédits

Photos © [Brice Pelleschi](https://www.bricepelleschi.net/) / ADAGP · Scénographie & direction artistique : Christophe Goutes, Atelier Martine Andrée · Conception et développement : [AKER](https://aker.pro/).
