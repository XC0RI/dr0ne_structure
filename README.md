# DR0NE

Archiv-Website für Bilder eines Architektur-/Kunst-/Designbüros.
Deployed auf Cloudflare Pages. Backend via Pages Functions, R2, D1.

---

## Setup — Schritt für Schritt

### 1. Repository auf GitHub anlegen

Diesen Ordner als GitHub Repository pushen.

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/DEIN_USER/dr0ne.git
git push -u origin main
```

---

### 2. Cloudflare D1 Datenbank erstellen

Im Cloudflare Dashboard → Workers & Pages → D1 → Create database:
- Name: `dr0ne-d1`

Danach die `database_id` aus dem Dashboard kopieren und in `wrangler.toml` eintragen:

```toml
database_id = "DEINE_ID_HIER"
```

Schema initialisieren (einmalig):

```bash
npx wrangler d1 execute dr0ne-d1 --remote --file=schema.sql
```

---

### 3. Cloudflare R2 Bucket erstellen

Im Cloudflare Dashboard → R2 → Create bucket:
- Name: `dr0ne-r2`

---

### 4. Cloudflare Pages Projekt erstellen

Im Dashboard → Workers & Pages → Create → Pages → Connect to Git:
- Repository: dieses GitHub Repo auswählen
- Build command: (leer lassen)
- Build output directory: `.`

---

### 5. Bindings konfigurieren

Im Cloudflare Pages Projekt → Settings → Functions → Bindings:

**D1 Database binding:**
- Variable name: `DB`
- D1 database: `dr0ne-d1`

**R2 Bucket binding:**
- Variable name: `BUCKET`
- R2 bucket: `dr0ne-r2`

---

### 6. Secrets setzen

Im Cloudflare Pages Projekt → Settings → Environment variables → Add variable (als **Secret** markieren):

| Name             | Wert                                     |
|------------------|------------------------------------------|
| `ADMIN_PASSWORD` | Dein gewähltes Passwort                  |
| `JWT_SECRET`     | Zufälliger langer String (min. 32 Zeichen) |

JWT_SECRET generieren (Terminal):
```bash
openssl rand -hex 32
```

---

### 7. Fonts hinzufügen

Die folgenden Fonts müssen manuell in den `/fonts/` Ordner gelegt werden:

- `Geist-Medium.woff2` — von [vercel/geist-font](https://github.com/vercel/geist-font)
- `GeistMono-Medium.woff2` — von [vercel/geist-font](https://github.com/vercel/geist-font)

Dann committen:
```bash
git add fonts/
git commit -m "add fonts"
git push
```

---

### 8. Deploy

Jeder Push auf `main` löst automatisch einen Deploy aus.
Manuell deploybar via Cloudflare Dashboard → Deployments → Retry.

---

## Benutzung

### Archiv öffnen
Auf **DR0NE** klicken → Archivliste erscheint als Overlay.

### Archiv schliessen
Nochmals auf **DR0NE** klicken — oder auf ein Thumbnail in der linken Spalte (0).

### Filtern
Auf einen beliebigen Zellinhalt in der Tabelle klicken → Liste filtert sich.
Filter-Badge oben anklicken → Filter entfernen.

### Login (für Admins)
**Shift + Klick** auf DR0NE, während das Archiv geöffnet ist.

### Bild hochladen (nach Login)
Im Archiv oben auf `+ upload` klicken.

### Bild bearbeiten / löschen (nach Login)
In der Archivtabelle `edit` oder `del` pro Zeile.

---

## Dateistruktur

```
dr0ne/
├── fonts/                        ← Geist-Medium.woff2, GeistMono-Medium.woff2 (manuell hinzufügen)
├── src/
│   ├── auth.js                   ← Login, Token-Verwaltung
│   ├── collage.js                ← Collage-Logik, Scroll, Preloading
│   ├── archive.js                ← Archiv-Tabelle, Filter
│   └── upload-ui.js              ← Upload- und Edit-Modal
├── functions/
│   ├── _middleware.js            ← Auth-Schutz für Write-Endpoints
│   ├── img/[...path].js          ← Bilder aus R2 servieren
│   └── api/
│       ├── auth.js               ← POST /api/auth
│       ├── images.js             ← GET /api/images
│       ├── upload.js             ← POST /api/upload
│       ├── edit/[id].js          ← PUT /api/edit/:id
│       └── delete/[id].js        ← DELETE /api/delete/:id
├── index.html                    ← App-Shell
├── style.css                     ← Globale Styles
├── schema.sql                    ← D1 Schema (einmalig ausführen)
├── wrangler.toml                 ← Cloudflare Konfiguration
└── .gitignore
```
