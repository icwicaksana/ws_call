# VoIP Sederhana

Aplikasi VoIP (Voice over IP) sederhana menggunakan Python dan WebRTC. Aplikasi ini memungkinkan dua atau lebih pengguna untuk melakukan panggilan suara melalui browser web.

## Fitur

- Panggilan suara real-time menggunakan WebRTC
- Interface web yang mudah digunakan
- Server signaling menggunakan WebSocket
- Dukungan untuk multiple clients
- Echo cancellation dan noise suppression
- Log aktivitas real-time

## Teknologi yang Digunakan

- **Backend**: Python dengan asyncio, websockets, aiohttp
- **Frontend**: HTML5, CSS3, JavaScript (WebRTC API)
- **Protokol**: WebSocket untuk signaling, WebRTC untuk media

## Struktur Proyek

```
VoIP/
├── server.py              # Server Python utama
├── requirements.txt       # Dependencies Python
├── templates/
│   └── index.html        # Halaman web utama
├── static/
│   └── main.js           # Logika JavaScript klien
└── README.md             # Dokumentasi ini
```

## Instalasi dan Menjalankan

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Jalankan Server**
   ```bash
   python server.py
   ```

3. **Buka Browser**
   - Kunjungi `http://localhost:8080`
   - Untuk testing, buka beberapa tab browser atau gunakan browser yang berbeda

## Cara Menggunakan

1. **Koneksi ke Server**
   - Masukkan nama Anda
   - Klik tombol "Hubungkan ke Server"
   - Status akan berubah menjadi "Terhubung ke Server"

2. **Memulai Panggilan**
   - Pastikan browser sudah memberikan izin akses mikrofon
   - Klik "Mulai Panggilan" untuk memulai
   - Pengguna lain yang terhubung akan otomatis menerima panggilan

3. **Mengakhiri Panggilan**
   - Klik "Akhiri Panggilan" untuk mengakhiri panggilan
   - Atau tutup browser/tab

## Persyaratan Browser

- Chrome/Chromium (Direkomendasikan)
- Firefox
- Safari (iOS 11+)
- Edge

**Catatan**: Browser harus mendukung WebRTC dan harus mengizinkan akses mikrofon.

## Arsitektur Sistem

### Server (Python)

- **WebSocket Server** (Port 8765): Menangani signaling antar clients
- **HTTP Server** (Port 8080): Melayani halaman web dan file static
- **Signaling**: Merelay pesan offer, answer, dan ICE candidates

### Client (JavaScript)

- **WebRTC PeerConnection**: Menangani koneksi peer-to-peer
- **getUserMedia**: Mengakses mikrofon
- **WebSocket**: Komunikasi dengan server signaling

## Troubleshooting

### Mikrofon Tidak Terdeteksi
- Pastikan browser memiliki izin akses mikrofon
- Cek pengaturan mikrofon di sistem operasi
- Gunakan HTTPS jika diperlukan (untuk production)

### Koneksi Gagal
- Pastikan server berjalan di port 8080 dan 8765
- Cek firewall dan antivirus
- Pastikan tidak ada aplikasi lain yang menggunakan port tersebut

### Audio Tidak Terdengar
- Cek volume speaker/headphone
- Pastikan kedua pengguna sudah dalam panggilan
- Coba refresh halaman dan ulangi koneksi

## Pengembangan Lebih Lanjut

Aplikasi ini bisa dikembangkan dengan menambahkan:

- Autentikasi pengguna
- Room/channel terpisah
- Video calling
- Recording panggilan
- Chat text
- Enkripsi end-to-end
- TURN server untuk NAT traversal yang lebih baik
- Database untuk menyimpan riwayat panggilan

## Kontribusi

Silakan untuk berkontribusi dengan cara:
1. Fork repository ini
2. Buat branch baru untuk fitur Anda
3. Commit perubahan Anda
4. Buat pull request

## Lisensi

Proyek ini menggunakan lisensi MIT. Silakan gunakan dan modifikasi sesuai kebutuhan.

## Kontak

Jika ada pertanyaan atau masalah, silakan buat issue di repository ini.
