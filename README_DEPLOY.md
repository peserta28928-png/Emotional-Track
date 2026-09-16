# EmoTrack AutoBK MultiUser — Paket Deploy

Paket ini disiapkan untuk **GitHub Pages, Netlify, dan Vercel**. Aplikasi tetap menggunakan Supabase sebagai database/auth.

## 1. Supabase
1. Buat project Supabase.
2. Buka **SQL Editor** lalu jalankan seluruh isi `supabase_schema.sql`.
3. Pastikan Authentication → Providers → Email aktif.
4. Ambil **Project URL** dan **Publishable/Anon key** dari pengaturan API project.

> `VITE_SUPABASE_ANON_KEY` adalah key client-side. Jangan pernah memasukkan `service_role` key ke aplikasi/browser.

## 2. Netlify
1. Upload folder proyek ini ke GitHub, atau import repository ke Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Tambahkan environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. `netlify.toml` sudah disertakan.

## 3. Vercel
1. Import repository ke Vercel.
2. Framework akan terdeteksi sebagai Vite.
3. Tambahkan environment variables yang sama:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. `vercel.json` sudah disertakan.

## 4. GitHub Pages
Workflow otomatis sudah tersedia di `.github/workflows/deploy-pages.yml`.

1. Buat repository GitHub dan upload seluruh isi folder proyek ini.
2. Repository → **Settings → Pages → Source: GitHub Actions**.
3. Repository → **Settings → Secrets and variables → Actions → New repository secret**.
4. Tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Push ke branch `main`. Workflow akan membangun dan menerbitkan `dist` ke GitHub Pages.

## 5. Pengembangan lokal
```bash
npm install
copy .env.production.example .env.local
# isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
```

## Struktur penting
- `src/App.jsx` — aplikasi siswa & Guru BK
- `src/supabase.js` — koneksi Supabase
- `supabase_schema.sql` — tabel, RLS, dan fungsi join kelas
- `netlify.toml` — konfigurasi Netlify
- `vercel.json` — konfigurasi Vercel
- `.github/workflows/deploy-pages.yml` — deployment GitHub Pages
- `.env.production.example` — contoh environment variables

## Catatan
Build lokal belum disertakan sebagai `dist` karena environment Supabase harus diisi saat deployment. Setelah environment variables diatur di platform hosting, platform akan menjalankan `npm run build` secara otomatis.
