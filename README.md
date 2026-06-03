# La Barakat — Application Vétérinaire

## 🚀 Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev
# → Ouvre http://localhost:5173

# 3. Builder pour production
npm run build
# → Crée le dossier dist/

# 4. Prévisualiser le build
npm run preview
```

## 🌐 Déploiement Cloudflare

### Option A — Pages (recommandé pour ce projet)

1. **Workers & Pages** → **Create** → **Pages** → Connecter le repo Git
2. **Build command** : `npm run build`
3. **Build output directory** : `dist`
4. **Deploy command** : laisser **vide** (ne pas mettre `npx wrangler deploy`)
5. Push sur `main` → déploiement automatique

### Option B — Worker Git (config actuelle du dashboard)

Le fichier `wrangler.toml` à la racine publie le dossier `dist/` après le build.

1. **Build command** : `npm run build`
2. **Deploy command** : `npx wrangler deploy`
3. **Version command** : laisser **vide** (supprimer `npx wrangler versions upload`)
4. Push sur `main`

### Upload manuel

1. `npm run build`
2. Uploader tout le dossier **`dist/`** (pas seulement `index.html`)

Après déploiement, vérifier dans l’onglet Network un nouveau `index-*.js` (pas un ancien hash en cache).

## Navigation par URL

Chaque écran a une adresse dédiée (ex. `/patients`, `/medicaments`). Un **F5** reste sur la même page.

- Connexion : `/`
- Inscription : `/register`
- Mot de passe oublié : `/forgot`

Le fichier `public/_redirects` assure le bon fonctionnement sur Cloudflare Pages (routes SPA).

## 📁 Structure du projet

```
src/
├── main.jsx              # Point d'entrée
├── App.jsx               # Composant principal
├── Root.jsx              # Auth (Login/Register/Forgot)
├── index.css             # Styles globaux + Tailwind
├── lib/
│   ├── supabase.js       # Client Supabase
│   ├── db.js             # Cache + offline queue
│   ├── roles.js          # Système de rôles
│   └── data.js           # Données initiales
├── components/
│   └── ui/               # Btn, Badge, Field, etc.
└── pages/
    ├── Dashboard.jsx
    ├── clinique/         # Patients, Consultations...
    ├── agenda/           # Agenda, Taches...
    ├── pharmacie/        # Medicaments, Commandes...
    ├── commercial/       # Ventes, Clients, Caisse...
    ├── finance/          # Rapports, Depenses...
    ├── admin/            # Parametres, Comptes...
    └── outils/           # IA, Notifications, Carte...
```

## ⚡ Avantages vs. fichier HTML unique

- **Build optimisé** : ~150 KB au lieu de 565 KB
- **Pas de Babel en runtime** : -250ms de chargement
- **Code splitting** : chaque page chargée à la demande
- **Hot reload** en développement
- **TypeScript ready** si tu veux évoluer
