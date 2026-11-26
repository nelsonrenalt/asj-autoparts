# ASJ Autoparts — Website Katalog

Website katalog spare part mobil & truk **ASJ Autoparts** (Jember).
Pembeli melihat produk di website, lalu membeli lewat Shopee / Tokopedia / TikTok Shop atau bertanya via WhatsApp.

Website statis (HTML + CSS + JavaScript), tanpa server — bisa di-hosting gratis di GitHub Pages.

## Struktur
| File | Isi |
|---|---|
| `index.html` | Halaman utama |
| `assets/js/config.js` | **Pengaturan toko**: nomor WA, jam buka, link Shopee/Tokopedia/TikTok |
| `assets/js/app.js` | Logika katalog (cari, filter, detail produk) |
| `assets/css/style.css` | Tampilan |
| `data/products.json` | Data produk (dibuat otomatis dari export Shopee) |
| `tools/build_products.py` | Skrip pembuat `products.json` |

## Mengubah info toko
Buka `assets/js/config.js`, ubah isinya, simpan, lalu upload ke GitHub.

## Memperbarui daftar produk dari Shopee
1. Shopee Seller Centre → **Produk Saya → Update Massal** → download *Info Dasar*, *Info Penjualan*, dan *Info Media*.
2. Taruh semua file `.xlsx` dalam satu folder.
3. Jalankan:
   ```
   pip install python-calamine
   python tools/build_products.py "C:\path\ke\folder\export"
   ```
4. Upload ke GitHub:
   ```
   git add .
   git commit -m "Update produk"
   git push
   ```
   Website otomatis ter-update dalam 1–2 menit.

## Mencoba di komputer sendiri
```
python -m http.server 8000
```
Lalu buka http://localhost:8000
