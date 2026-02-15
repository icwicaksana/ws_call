# Panduan Cepat Menjalankan VoIP

## Langkah-langkah:

1. **Jalankan Server**
   - Double-click file `start_server.bat` 
   - Atau buka Command Prompt dan jalankan:
     ```
     "D:/Work/BitHealth/Project/Livestream Gemini/VoIP/.venv/Scripts/python.exe" server.py
     ```

2. **Buka Browser**
   - Kunjungi: `http://localhost:8080`
   - Untuk testing dengan 2 pengguna, buka 2 tab browser atau gunakan browser berbeda

3. **Testing Panggilan**
   - Tab 1: Klik "Hubungkan ke Server" → "Mulai Panggilan"
   - Tab 2: Klik "Hubungkan ke Server" (akan otomatis menerima panggilan)
   - Bicara di salah satu tab dan dengarkan di tab lainnya

## Catatan Penting:
- Pastikan memberikan izin akses mikrofon saat diminta browser
- Server harus tetap berjalan selama penggunaan aplikasi
- Gunakan headphone untuk menghindari feedback audio
