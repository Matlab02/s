const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const uploadsDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  }
});

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimeLooksLikeImage = (file.mimetype || "").startsWith("image/");
    // Bəzi telefonlar HEIC/JPG üçün qeyri-dəqiq MIME göndərir. Uzantını da nəzərə alırıq.
    if (!mimeLooksLikeImage && !allowedExtensions.has(ext)) {
      return cb(new Error("Yalnız şəkil faylları qəbul olunur."));
    }
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect("/admin/login");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.post("/api/upload", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Şəkil maksimum 10 MB ola bilər."
          : err.message || "Şəkil göndərilmədi.";
      return res.status(400).json({ ok: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Şəkil seçilməyib." });
    }

    return res.json({ ok: true, message: "Şəkil uğurla göndərildi ❤️" });
  });
});

app.get("/admin/login", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/admin");
  res.send(`<!doctype html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin giriş</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body class="admin-page">
  <main class="admin-login-card">
    <h1>Admin giriş</h1>
    <form method="POST" action="/admin/login">
      <input type="password" name="password" placeholder="Şifrə" required autocomplete="current-password" />
      <button type="submit" class="yes-btn">Daxil ol</button>
    </form>
  </main>
</body>
</html>`);
});

app.post("/admin/login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  res.status(401).send(`<!doctype html>
<html lang="az"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/style.css"><title>Səhv şifrə</title></head>
<body class="admin-page"><main class="admin-login-card"><h1>Səhv şifrə</h1>
<p>Şifrə düzgün deyil.</p><a href="/admin/login">Geri qayıt</a></main></body></html>`);
});

app.post("/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

app.get("/admin", requireAdmin, (req, res) => {
  const files = fs
    .readdirSync(uploadsDir)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const full = path.join(uploadsDir, name);
      const stat = fs.statSync(full);
      return { name, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const cards = files.length
    ? files.map(({ name, mtime }) => `
      <article class="photo-card">
        <a href="/admin/image/${encodeURIComponent(name)}" target="_blank" rel="noopener">
          <img src="/admin/image/${encodeURIComponent(name)}" alt="Göndərilən şəkil" loading="lazy" />
        </a>
        <div class="photo-meta">
          <div>${escapeHtml(mtime.toLocaleString("az-AZ"))}</div>
          <div class="admin-actions">
            <a class="small-btn" href="/admin/download/${encodeURIComponent(name)}">Yüklə</a>
            <form method="POST" action="/admin/delete/${encodeURIComponent(name)}" onsubmit="return confirm('Şəkil silinsin?')">
              <button class="small-btn danger" type="submit">Sil</button>
            </form>
          </div>
        </div>
      </article>
    `).join("")
    : `<p class="empty-state">Hələ şəkil göndərilməyib.</p>`;

  res.send(`<!doctype html>
<html lang="az">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin panel</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body class="admin-page">
  <header class="admin-header">
    <div>
      <h1>Göndərilən şəkillər</h1>
      <p>${files.length} şəkil</p>
    </div>
    <form method="POST" action="/admin/logout">
      <button class="small-btn" type="submit">Çıxış</button>
    </form>
  </header>
  <main class="gallery">${cards}</main>
</body>
</html>`);
});

function safeFile(name) {
  const file = path.basename(name);
  const full = path.join(uploadsDir, file);
  if (!full.startsWith(uploadsDir)) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

app.get("/admin/image/:name", requireAdmin, (req, res) => {
  const full = safeFile(req.params.name);
  if (!full) return res.sendStatus(404);
  res.sendFile(full);
});

app.get("/admin/download/:name", requireAdmin, (req, res) => {
  const full = safeFile(req.params.name);
  if (!full) return res.sendStatus(404);
  res.download(full);
});

app.post("/admin/delete/:name", requireAdmin, (req, res) => {
  const full = safeFile(req.params.name);
  if (!full) return res.sendStatus(404);
  fs.unlinkSync(full);
  res.redirect("/admin");
});

app.listen(PORT, () => {
  console.log(`Sayt işləyir: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
