# Simone & Jovita Maps • Google Maps Address Registration

A production-ready address registration and verification suite powered by **React, Vite, Google Maps JavaScript API, Places Autocomplete, Google Address Validation API, Cloud Firestore, Cloudflare Workers & Cloudflare D1**.

---

## 🌟 Key Capabilities

1. **Luxury Splash Screen**: High-aesthetic onboarding featuring gold, blue, and white themes with animated iconography.
2. **Interactive Maps Engine**:
   - Google Places Autocomplete search.
   - Draggable custom gold pinpoint marker on satellite/hybrid imagery for sub-meter entrance refinement.
3. **Google Address Validation API**:
   - Deliverability checks, USPS CASS standardization, sub-premise granularity classification, and component-level audits.
4. **Photo Upload Pipeline**:
   - Upload up to 4 high-resolution building exterior, entrance, and street-number photos required for cadastral and municipal reviews.
5. **Dual Persistence Architecture**:
   - **Cloud Firestore**: Real-time cloud documents with authentication security rules.
   - **Local / Edge Database**: Dual storage in SQLite and Cloudflare D1.
6. **Certified Dossier Export & Sharing**:
   - Instant dynamic **QR Code generation** pointing to Google Maps.
   - Formal **PDF Certificate / Dossier** generator formatted with gold borders and verification metrics.
   - One-touch multi-platform sharing (**WhatsApp, Telegram, Facebook, Email**).
7. **Admin Portal**:
   - Filter by validation granularity, deliverability status, region ISO codes, and date sorting.
   - Standalone `/admin.html` page and full CSV dossier export.

---

## 🚀 Cloudflare Deployment (Workers & Pages)

### 1. Cloudflare Configuration Details
- **Worker Name:** `simone-jovita-maps-worker`
- **D1 Database Name:** `address_app_d1`
- **D1 Binding Name:** `DB`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 2. Steps to Deploy on Cloudflare

1. **Install Wrangler CLI (if not already installed):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Create the D1 Database:**
   ```bash
   wrangler d1 create address_app_d1
   ```
   *Copy the output `database_id` and replace `"your-d1-database-id-here"` in `wrangler.toml`.*

4. **Apply the Schema Migration:**
   ```bash
   wrangler d1 execute address_app_d1 --file=./migrations/0001_initial.sql
   ```

5. **Deploy Cloudflare Pages / Worker:**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=simone-jovita-maps
   ```
   Or deploy as a full Worker site:
   ```bash
   wrangler deploy
   ```

---

## 🐙 GitHub Push & CI/CD Setup

To push this codebase to your own GitHub repository:

1. **Initialize Git & Add Remote:**
   ```bash
   git init
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
   ```

2. **Stage and Commit:**
   ```bash
   git add .
   git commit -m "feat: complete production Google Maps Address Registration app with Cloudflare D1 and Firestore"
   ```

3. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```

4. **GitHub Actions Workflow:**
   The repository includes `.github/workflows/deploy.yml` which automatically builds and tests on every push.

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Server-side Google Maps Platform API key (Validation & Places) |
| `GEMINI_API_KEY` | Gemini AI API key for address intelligence |
| `ADMIN_TOKEN` | Token for admin portal access (default: `adm-secret-superkey-8899`) |
| `PORT` | Local dev / production port (default: `3000`) |
