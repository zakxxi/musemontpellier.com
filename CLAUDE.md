# CLAUDE.md · musemontpellier.com

Contexte pour Claude Code. Les procédures détaillées (carte, photos, note Google) sont dans `README.md`.

## Le projet

Site one page de **MUSE**, brasserie bistronomique à Montpellier (rez-de-chaussée de la tour Higher Roch, quartier Nouveau Saint-Roch). Client : N.B.C SAS. Conception et développement : AKER (Adrien Revel).

- En ligne sur **https://musemontpellier.com**, via GitHub Pages : branche `main`, racine, fichier `CNAME`.
- Maquette de référence : canvas Design sur claude.ai (privé), https://claude.ai/artifact/Tf1Y5qFdeJwdugUjSQNpU6
- Langue du site et des échanges : **français**.

## Stack et principes

- **HTML/CSS/JS statiques, sans framework ni build.** `index.html` est maintenu à la main. Ne pas introduire de bundler, de framework CSS ou de dépendance côté client sans raison forte.
- Node ne sert qu'aux scripts d'outillage (`scripts/`), jamais au rendu du site.
- Mobile first, amélioration progressive : la classe `no-js` sur `<html>` est retirée en tête de page. Sans JS, les 4 panneaux de la carte s'affichent les uns sous les autres.
- **Zéro cookie, zéro traceur.** Polices auto-hébergées, pas d'analytics, pas d'iframe ni de widget tiers, et la note Google est récupérée côté serveur. C'est ce qui dispense de bandeau de consentement (CNIL). Toute mesure d'audience, carte Google Maps intégrée, vidéo YouTube, flux Instagram ou pixel publicitaire oblige à ajouter un bandeau conforme, ou à choisir un outil exempté (Matomo configuré selon la CNIL), **et** à mettre à jour `mentions-legales.html`.

## Arborescence utile

```
index.html                 page unique : contenu, SEO, JSON-LD
mentions-legales.html      noindex, hors sitemap
assets/css/style.css       une seule feuille, jetons dans :root
assets/js/main.js          menu mobile, onglets carte, curseurs, visionneuse <dialog>
assets/fonts/              Newsreader (roman + italique) et Hanken Grotesk, woff2 variables, sous-ensemble latin
assets/img/  assets/carte/ assets/pdf/   sorties du pipeline images (ne pas éditer à la main)
assets/brand/              logo SVG/PNG, icônes, og-image.jpg (1200×630)
scripts/build-images.mjs   pipeline images (sharp) + images.config.json + images.manifest.json
scripts/update-google-rating.mjs + .github/workflows/google-rating.yml   note Google quotidienne
```

## Design

- Noir et blanc sur fond blanc : `--ink #1d1d1b`, `--grey #5e5e5b`, `--stone #f3f3f1` (fond des sections Infos et Coworking), `--line`. Les photos restent en couleur.
- Typographies : Newsreader pour les titres et les accroches, Hanken Grotesk pour le texte et les labels (capitales espacées). Ce sont les équivalents libres de GT Sectra et TWK Everett, les polices de l'identité.
- Logo : symbole SVG `#logo-muse` défini une fois en haut de `index.html`, utilisé via `<svg viewBox="0 0 355.7 84.7"><use href="#logo-muse"/></svg>`. Le `viewBox` extérieur doit commencer à 0 0.
- Points de rupture : 720, 760, 900, 960 et 1100 px (menu complet à partir de 1100).
- Fil rouge des Muses : bandeau défilant des 9 muses et section noire « Gastéréa, dixième muse » avant la carte.
- En-tête fixe opaque de 64 px. Les sections arrivent pile dessous (`section[id] { scroll-margin-top: 0 }`), leur marge haute fait au moins 96 px.

## Contenu : règles

- Les textes viennent du client (`Textes.rtf`, dossier DATA). **Ne pas les réécrire et ne pas corriger leurs coquilles** sans demande explicite. Seules corrections faites et validées : une répétition et un « ou l on ».
- **Ne rien inventer** : horaires, capacités, noms de plats, prix. Une info manquante se demande.
- Typographie française : apostrophe courbe ’, guillemets « » avec espaces, insécables dans les numéros de téléphone.
- La carte est affichée **en images** (choix du client), générées depuis les PDF, avec les PDF téléchargeables à côté. Mettre à jour la mention « Carte de saison · septembre – octobre 2026 » quand la carte change.
- Crédits : photos © Brice Pelleschi / ADAGP (https://www.bricepelleschi.net/), scénographie Christophe Goutes, Atelier Martine Andrée, site par AKER (https://aker.pro/).

## Images

- Les originaux ne sont **pas** dans le repo. Ils sont dans le Dropbox d'Adrien : `/Users/zak/Dropbox/_AKER/AK-2609 WEBSITE MUSE/00 DATA`.
- `npm run images -- "<dossier DATA>" [--only=photos|carte|pdfs]`. Prérequis : `npm install`, et poppler pour les cartes (`brew install poppler`).
- Sorties : AVIF + WebP à plusieurs largeurs, plus un JPEG de secours à une seule largeur (`fallback`). Les noms de fichiers sont des slugs SEO `muse-montpellier-…`.
- Les dimensions servent pour `width`/`height` et `srcset` : voir `scripts/images.manifest.json`.
- Pour ajouter une image dans la page, copier un bloc `<picture>` existant : sources AVIF puis WebP avec `srcset` et `sizes`, `<img>` JPEG avec `width`, `height`, `alt` descriptif, `loading="lazy"` et `decoding="async"`. Le visuel de l'accueil, lui, a `fetchpriority="high"` et deux préchargements dans le `<head>`.
- Le PDF « Carte boissons A4 plié » a un nom de fichier mal encodé (accent macOS) : il est résolu par préfixe dans la config (`"prefix": true`).

## Note Google

- Le script lit le secret `GOOGLE_PLACES_API_KEY`, qui ne doit **jamais** apparaître dans le code. Il appelle l'API Places (New) et réécrit les éléments `[data-google="rating" | "count" | "stars"]` de `index.html`. Les étoiles sont remplies via `--fill` (pourcentage calculé par `fillPercent`).
- Le Place ID est mémorisé dans `scripts/google-place.json` après le premier lancement de l'Action.
- Pas d'`aggregateRating` dans le JSON-LD : Google n'accepte pas ces avis « auto-déclarés » pour un `LocalBusiness`.
- Test sans clé : `node scripts/update-google-rating.mjs --fake=4.7,180`. Remettre les vraies valeurs après le test.

## SEO

- Garder : un seul `h1` (le logo, avec texte masqué pour les lecteurs d'écran), la canonical, Open Graph, le JSON-LD `Restaurant` (avec `sameAs` Instagram et Facebook), `sitemap.xml` (mettre à jour `lastmod`) et `robots.txt`.
- Lighthouse mobile en local au moment de la livraison : perf 99, a11y 100, bonnes pratiques 100, SEO 100. Ne pas régresser : `alt` partout, cibles tactiles ≥ 44 px, contraste, attributs ARIA des onglets et du `<dialog>`.

## Vérifier avant de livrer

- Aperçu local : `npm run serve`, ou `python3 -m http.server 8080`.
- Contrôler à 360, 390, 768, 1024 et 1440 px : pas de défilement horizontal, pas d'erreur console. Tester les onglets, les curseurs (flèches grisées en butée, masquées sans défilement), la visionneuse (clavier, Échap) et le menu mobile.

## Git

- Travailler sur une branche et ouvrir une pull request vers `main`. La fusion déclenche la publication sur GitHub Pages.
- Messages de commit en français, courts et descriptifs.

## Reste à faire

- Confirmer l'heure de fermeture : le JSON-LD indique 7h → minuit, 7j/7, d'après la fiche Google.
- Lancer une première fois l'Action « Note Google » à la main, pour créer `scripts/google-place.json`.
- Après la mise en ligne : renseigner l'URL du site sur la fiche Google Business Profile, puis Search Console avec le sitemap.
- En option : afficher quelques avis Google (champ `reviews` de l'API, avec l'attribution exigée par Google).
