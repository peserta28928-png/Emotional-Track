# EmoTrack AutoBK MultiUser

Versi ini sudah memindahkan penyimpanan utama dari `window.storage` ke Supabase.

## Fitur
- Akun Supabase Email/Password untuk Siswa dan Guru BK.
- Siswa bergabung ke kelas memakai kode kelas.
- Check-in emosi dan jurnal tersimpan online di `emotion_entries`.
- Jurnal otomatis tersedia pada dashboard Guru BK kelas terkait; tidak ada tombol consent tambahan di aplikasi.
- Guru BK hanya dapat membaca data kelas yang ia kelola melalui RLS.
- Dashboard: ringkasan kelas, daftar siswa, jurnal, dan tindak lanjut.
- Export CSV ringkasan dan jurnal.
- Tindak lanjut Guru BK tersimpan di Supabase.

## Setup
1. Buat project di Supabase.
2. Buka SQL Editor dan jalankan seluruh `supabase_schema.sql`.
3. Pastikan Authentication > Providers > Email aktif.
4. Salin `.env.example` menjadi `.env.local`, lalu isi URL dan anon key project.
5. `npm install`
6. `npm run dev`

## Catatan penting
- Untuk penggunaan sekolah, akun Guru BK sebaiknya dibuat/ditetapkan oleh admin sekolah; demo ini memungkinkan pilihan peran saat pendaftaran.
- Jika verifikasi email Supabase aktif, pengguna harus memverifikasi email sebelum session tersedia.
- Jurnal adalah data pribadi siswa yang dalam konfigurasi ini memang otomatis dapat dibaca Guru BK yang mengelola kelas siswa, sesuai permintaan aplikasi.
