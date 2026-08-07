const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const crypto = require("crypto");

const app = express();

// Render reverse proxy arxasında işləyir.
// Secure session cookie üçün vacibdir.
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "local-development-secret-change-this-on-render";

const uploadsDir = path.join(__dirname, "uploads");

// uploads qovluğu yoxdursa yarat
fs.mkdirSync(uploadsDir, { recursive: true });

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 saat
    },
  })
);

// public qovluğu
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// UPLOAD CONFIG
// -------------------------

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || "").toLowerCase();

    if (!ext) {
      ext = ".jpg";
    }

    const randomName = crypto.randomBytes(8).toString("hex");

    cb(null, `${Date.now()}-${randomName}${ext}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = file.mimetype || "";

    const mimeLooksLikeImage = mime.startsWith("image/");
    const extensionAllowed = allowedExtensions.has(ext);

    if (!mimeLooksLikeImage && !extensionAllowed) {
      return cb(new Error("Yalnız şəkil faylları qəbul olunur."));
    }

    cb(null, true);
  },
});

// -------------------------
// ADMIN MIDDLEWARE
// -------------------------

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

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

function safeFile(name) {
  const fileName = path.basename(name);
  const fullPath = path.join(uploadsDir, fileName);

  if (!fullPath.startsWith(uploadsDir)) {
    return null;
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

// -------------------------
// UPLOAD API
// -------------------------

app.post("/api/upload", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      let message = "Şəkil göndərilmədi.";

      if (err.code === "LIMIT_FILE_SIZE") {
        message = "Şəkil maksimum 10 MB ola bilər.";
      } else if (err.message) {
        message = err.message;
      }

      return res.status(400).json({
        ok: false,
        message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Şəkil seçilməyib.",
      });
    }

    console.log("Yeni şəkil:", req.file.filename);

    return res.json({
      ok: true,
      message: "Şəkil uğurla göndərildi ❤️",
    });
  });
});

// -------------------------
// ADMIN LOGIN
// -------------------------

app.get("/admin/login", (req, res) => {
  if (req.session?.isAdmin) {
    return res.redirect("/admin");
  }

  res.send(`
<!doctype html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>Admin giriş</title>

  <link rel="stylesheet" href="/style.css">
</head>

<body class="admin-page">

  <main class="admin-login-card">

    <h1>Admin giriş</h1>

    <form
      method="POST"
      action="/admin/login"
    >

      <input
        type="password"
        name="password"
        placeholder="Admin şifrəsi"
        required
        autocomplete="current-password"
      >

      <button
        type="submit"
        class="yes-btn"
      >
        Daxil ol
      </button>

    </form>

  </main>

</body>
</html>
`);
});

app.post("/admin/login", (req, res) => {
  const password = req.body.password || "";

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).send(`
<!doctype html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>Səhv şifrə</title>

  <link rel="stylesheet" href="/style.css">
</head>

<body class="admin-page">

  <main class="admin-login-card">

    <h1>Səhv şifrə</h1>

    <p>Admin şifrəsi düzgün deyil.</p>

    <a href="/admin/login">
      Geri qayıt
    </a>

  </main>

</body>
</html>
`);
  }

  req.session.isAdmin = true;

  // Session-un yazılmasını gözləyirik.
  // Render-də login redirect problemlərinin qarşısını alır.
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);

      return res.status(500).send(
        "Admin session yaradılarkən xəta baş verdi."
      );
    }

    return res.redirect("/admin");
  });
});

// -------------------------
// ADMIN LOGOUT
// -------------------------

app.post("/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }

    res.clearCookie("connect.sid");

    return res.redirect("/admin/login");
  });
});

// -------------------------
// ADMIN PANEL
// -------------------------

app.get("/admin", requireAdmin, (req, res) => {
  let files = [];

  try {
    files = fs
      .readdirSync(uploadsDir)
      .filter((name) => {
        return !name.startsWith(".");
      })
      .map((name) => {
        const fullPath = path.join(
          uploadsDir,
          name
        );

        const stat = fs.statSync(fullPath);

        return {
          name,
          mtime: stat.mtime,
        };
      })
      .sort((a, b) => {
        return b.mtime - a.mtime;
      });
  } catch (err) {
    console.error(
      "Uploads read error:",
      err
    );
  }

  const cards = files.length
    ? files
        .map(({ name, mtime }) => {
          const encodedName =
            encodeURIComponent(name);

          return `
<article class="photo-card">

  <a
    href="/admin/image/${encodedName}"
    target="_blank"
    rel="noopener"
  >
    <img
      src="/admin/image/${encodedName}"
      alt="Göndərilən şəkil"
      loading="lazy"
    >
  </a>

  <div class="photo-meta">

    <div>
      ${escapeHtml(
        mtime.toLocaleString("az-AZ")
      )}
    </div>

    <div class="admin-actions">

      <a
        class="small-btn"
        href="/admin/download/${encodedName}"
      >
        Yüklə
      </a>

      <form
        method="POST"
        action="/admin/delete/${encodedName}"
        onsubmit="return confirm('Şəkil silinsin?')"
      >
        <button
          class="small-btn danger"
          type="submit"
        >
          Sil
        </button>
      </form>

    </div>

  </div>

</article>
`;
        })
        .join("")
    : `
<p class="empty-state">
  Hələ şəkil göndərilməyib.
</p>
`;

  res.send(`
<!doctype html>
<html lang="az">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>Admin panel</title>

  <link
    rel="stylesheet"
    href="/style.css"
  >

</head>

<body class="admin-page">

<header class="admin-header">

  <div>

    <h1>
      Göndərilən şəkillər
    </h1>

    <p>
      ${files.length} şəkil
    </p>

  </div>

  <form
    method="POST"
    action="/admin/logout"
  >

    <button
      class="small-btn"
      type="submit"
    >
      Çıxış
    </button>

  </form>

</header>

<main class="gallery">

  ${cards}

</main>

</body>

</html>
`);
});

// -------------------------
// ADMIN IMAGE PREVIEW
// -------------------------

app.get(
  "/admin/image/:name",
  requireAdmin,
  (req, res) => {
    const fullPath = safeFile(
      req.params.name
    );

    if (!fullPath) {
      return res.sendStatus(404);
    }

    return res.sendFile(fullPath);
  }
);

// -------------------------
// ADMIN IMAGE DOWNLOAD
// -------------------------

app.get(
  "/admin/download/:name",
  requireAdmin,
  (req, res) => {
    const fullPath = safeFile(
      req.params.name
    );

    if (!fullPath) {
      return res.sendStatus(404);
    }

    return res.download(fullPath);
  }
);

// -------------------------
// ADMIN IMAGE DELETE
// -------------------------

app.post(
  "/admin/delete/:name",
  requireAdmin,
  (req, res) => {
    const fullPath = safeFile(
      req.params.name
    );

    if (!fullPath) {
      return res.sendStatus(404);
    }

    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      return res.status(500).send(
        "Şəkil silinərkən xəta baş verdi."
      );
    }

    return res.redirect("/admin");
  }
);

// -------------------------
// HEALTH CHECK
// -------------------------

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
  });
});

// -------------------------
// 404
// -------------------------

app.use((req, res) => {
  res.status(404).send(
    "Səhifə tapılmadı."
  );
});

// -------------------------
// SERVER
// -------------------------

app.listen(PORT, () => {
  console.log(
    `Sayt işləyir: http://localhost:${PORT}`
  );

  console.log(
    `Admin: http://localhost:${PORT}/admin`
  );
});
