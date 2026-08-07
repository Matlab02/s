# Şəklini görmək olar? 🥺

Kiçik romantik veb layihə.


## CSS görünmürsə

`public/index.html` faylını iki dəfə klikləyib birbaşa açma.

Bu layihə server ilə işləməlidir:

```bash
npm install
npm start
```

Sonra brauzerdə yalnız bunu aç:

```text
http://localhost:3000
```

Windows-da istəsən `START_WINDOWS.bat` faylını da işlədə bilərsən.

## Lokal işlətmək

Node.js 18+ quraşdırılmış olmalıdır.

```bash
npm install
npm start
```

Sonra:

- Sayt: http://localhost:3000
- Admin: http://localhost:3000/admin

Standart admin şifrəsi lokal test üçün:

```text
123456
```

Real yayımda bunu dəyiş.

## Environment dəyişənləri

```text
ADMIN_PASSWORD=guclu_sifre
SESSION_SECRET=uzun_random_secret
PORT=3000
NODE_ENV=production
```

## Render.com

1. Layihəni GitHub-a yüklə.
2. Render.com-da "New Web Service" yarat.
3. Repository-ni seç.
4. Build Command:
   ```text
   npm install
   ```
5. Start Command:
   ```text
   npm start
   ```
6. Environment bölməsində:
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `NODE_ENV=production`
   əlavə et.

## Vacib qeyd

Bu sadə versiyada şəkillər serverin `uploads/` qovluğunda saxlanılır.

Render-in pulsuz instansiyalarında lokal disk daimi olmaya bilər və restart/deploy zamanı şəkillər silinə bilər. Şəkillərin qalıcı saxlanması üçün sonradan Cloudinary, Supabase Storage, S3 və ya persistent disk qoşmaq daha düzgündür.

İstifadəçinin cihazından heç bir şəkil avtomatik götürülmür. İstifadəçi şəkli özü seçir və "Göndər" düyməsinə basır.
