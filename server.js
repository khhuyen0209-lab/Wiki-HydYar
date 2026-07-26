const express = require("express");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const cors = require("cors");
const session = require("express-session");

const app = express();

// ==============================
// CORS + JSON + SESSION
// ==============================
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "hydyar-wiki-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
  }
}));

// ==============================
// FIREBASE ADMIN
// ==============================
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ==============================
// MIDDLEWARE BẢO MẬT
// ==============================
const requireAuth = (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
  next();
};
const requireAdmin = (req, res, next) => {
  if (req.session?.user?.role !== "admin") return res.status(403).json({ success: false, message: "Không có quyền" });
  next();
};

// ==============================
// FILE TĨNH
// ==============================
app.use(express.static(path.join(__dirname, "public")));

// ==============================================
// ✅ QUAN TRỌNG: XỬ LÝ ĐƯỜNG DẪN FIREBASE AUTH
// ==============================================
app.get("/__/auth/handler", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// API XÁC THỰC HOÀN CHỈNH
// ==============================
app.post("/api/login", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Thiếu token" });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    const userData = {
      uid,
      email: decoded.email || "",
      name: decoded.name || decoded.email?.split("@")[0] || "Người dùng",
      avatar: decoded.picture || "",
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    };

    if (!userSnap.exists) {
      await userRef.set({ ...userData, createdAt: admin.firestore.FieldValue.serverTimestamp(), role: "user", status: "active" });
      console.log("👤 Tạo người dùng mới:", uid);
    } else {
      await userRef.update(userData);
      console.log("🔄 Đăng nhập:", uid);
    }

    req.session.user = { uid, email: userData.email, name: userData.name, role: userSnap.exists ? userSnap.data().role : "user" };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("❌ Lỗi đăng nhập:", err);
    res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("connect.sid");
  res.json({ success: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

// ==============================
// API NỘI DUNG GIỮ NGUYÊN 100%
// ==============================
app.get("/api/featured", async (req, res) => {
  try {
    const snap = await db.collection("wikiArticles").where("featured", "==", true).limit(6).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi tải bài nổi bật" });
  }
});

app.post("/api/article/:id/view", async (req, res) => {
  try {
    await db.collection("wikiArticles").doc(req.params.id).update({ views: admin.firestore.FieldValue.increment(1) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==============================
// SEO + ROUTER SPA
// ==============================
const renderWithSEO = async (slug, req, res) => {
  try {
    let title = "Wiki HydYar - Tri thức mở rộng", desc = "Kho tri thức mở rộng", ogImage = "";
    if (slug) {
      const docSnap = await db.collection("wikiArticles").doc(slug).get();
      if (docSnap.exists) {
        const d = docSnap.data();
        title = `${d.title || title} | Wiki HydYar`;
        desc = d.desc || desc;
        ogImage = d.image || "";
      }
    }
    let html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
               .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}">`)
               .replace("</head>", `<meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}">${ogImage?`<meta property="og:image" content="${ogImage}">`:""}<meta name="twitter:card" content="summary_large_image"></head>`);
    res.send(html);
  } catch {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
};

app.get("/:category/:slug", (req, res) => renderWithSEO(req.params.slug, req, res));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ==============================
// KHỞI ĐỘNG
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Wiki HydYar chạy tại cổng ${PORT}`));
