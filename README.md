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

## 🌐 Déploiement sur Cloudflare Pages

1. Faire `npm run build`
2. Aller sur Cloudflare Pages → Create application → Upload your static files
3. **Uploader le dossier `dist/`** (pas `index.html` tout seul)
4. C'est en ligne !

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
