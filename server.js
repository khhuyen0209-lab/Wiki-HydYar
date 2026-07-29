const express = require("express");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const cors = require("cors");
const session = require("express-session");

const app = express();

// ==============================
// 🔧 CẤU HÌNH CÙNG DOMAIN
// ==============================
// 1. Tin tưởng proxy (bắt buộc trên Render)
app.set("trust proxy", 1);

// 2. CORS an toàn khi cùng domain
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// 3. Session giữ nguyên cấu hình phù hợp cùng domain
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
// TOOL: TÁCH WIKI PAGES
// ==============================

async function splitWikiPages() {

  const articleRef = db
    .collection("wikiArticles")
    .doc("big-bang");

  const snap = await articleRef.get();

  if (!snap.exists) {
    console.log("Không tìm thấy bài viết");
    return;
  }

  const content = snap.data().content || "";

  const pages = content.split(/---trang\d+---/);

  for (let i = 1; i < pages.length; i++) {

    let pageContent = pages[i].trim();

    if (!pageContent) continue;

    let title = `Trang ${i}`;

    const match = pageContent.match(
      /## Trang \d+: (.*)/
    );

    if (match) {
      title = match[1];

      pageContent = pageContent.replace(
        /## Trang \d+: .*\n/,
        ""
      ).trim();
    }

    await articleRef
      .collection("pages")
      .doc(String(i))
      .set({
        title,
        content: pageContent,
        order: i,
        updatedAt: new Date()
      });

    console.log(`✅ Tạo trang ${i}: ${title}`);
  }

  console.log("🎉 Tách trang hoàn tất");
}

// ==============================
// HYDYAR RAM CACHE SYSTEM
// ==============================

const HydYarCache = {

    wikiArticles: new Map(),
    featuredArticles: new Map(),
    latestArticles: new Map(),
    categories: new Map(),
    users: new Map(),
    seo: new Map()

};

// ==============================
// CACHE TTL
// ==============================

const CACHE_TIME = {

    ARTICLE: 2 * 60 * 60 * 1000,
    FEATURED: 30 * 60 * 1000,
    LATEST: 10 * 60 * 1000,
    CATEGORY: 24 * 60 * 60 * 1000,
    USER: 30 * 60 * 1000,
    SEO: 12 * 60 * 60 * 1000

};

// ==============================
// CACHE LIMIT
// ==============================

const CACHE_LIMIT = {

    ARTICLE: 1000,
    FEATURED: 20,
    LATEST: 20,
    CATEGORY: 100,
    USER: 1000,
    SEO: 500

};

// ==============================
// CACHE GET
// ==============================

function cacheGet(map, key) {

    const item = map.get(key);

    if (!item) return null;

    if (item.expire <= Date.now()) {

        map.delete(key);

        return null;

    }

    item.lastAccess = Date.now();

    return item.data;

}

// ==============================
// CACHE SET
// ==============================

function cacheSet(map, key, data, ttl, limit = Infinity) {

    if (map.has(key)) {

        map.delete(key);

    }

    if (map.size >= limit) {

        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [k, v] of map) {

            if (v.lastAccess < oldestTime) {

                oldestTime = v.lastAccess;
                oldestKey = k;

            }

        }

        if (oldestKey !== null) {

            map.delete(oldestKey);

        }

    }

    map.set(key, {

        data,
        expire: Date.now() + ttl,
        lastAccess: Date.now()

    });

}

// ==============================
// CACHE DELETE
// ==============================

function cacheDelete(map, key) {

    map.delete(key);

}

// ==============================
// CACHE CLEAR
// ==============================

function cacheClear(map) {

    map.clear();

}

// ==============================
// CLEAR ALL CACHE
// ==============================

function clearAllCache() {

    for (const map of Object.values(HydYarCache)) {

        map.clear();

    }

    console.log("🧹 Đã xóa toàn bộ HydYar Cache");

}

// ==============================
// CACHE STATS
// ==============================

function cacheStats() {

    const ram = process.memoryUsage();

    return {

        wikiArticles: HydYarCache.wikiArticles.size,
        featuredArticles: HydYarCache.featuredArticles.size,
        latestArticles: HydYarCache.latestArticles.size,
        categories: HydYarCache.categories.size,
        users: HydYarCache.users.size,
        seo: HydYarCache.seo.size,

        total:

            HydYarCache.wikiArticles.size +
            HydYarCache.featuredArticles.size +
            HydYarCache.latestArticles.size +
            HydYarCache.categories.size +
            HydYarCache.users.size +
            HydYarCache.seo.size,

        heapUsedMB: Math.round(ram.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(ram.heapTotal / 1024 / 1024),
        rssMB: Math.round(ram.rss / 1024 / 1024)

    };

}

// ==============================
// CACHE CLEANER
// ==============================

setInterval(() => {

    const now = Date.now();

    let removed = 0;

    for (const map of Object.values(HydYarCache)) {

        if (!(map instanceof Map)) continue;

        for (const [key, value] of map) {

            if (value.expire <= now) {

                map.delete(key);

                removed++;

            }

        }

    }

    const ramMB = process.memoryUsage().heapUsed / 1024 / 1024;

    if (ramMB > 420) {

        console.log("⚠ RAM cao (" + Math.round(ramMB) + "MB) -> Dọn toàn bộ cache");

        clearAllCache();

        if (global.gc) {

            global.gc();

        }

    }

    if (removed > 0) {

        console.log(`🗑️ Cache Cleaner: Đã xóa ${removed} cache`);

    }

}, 5 * 60 * 1000);

// ==============================
// CACHE LOGGER
// ==============================

setInterval(() => {

    const s = cacheStats();

    console.log(`
================ HYDYAR CACHE ================

📄 Articles  : ${s.wikiArticles}
⭐ Featured  : ${s.featuredArticles}
🆕 Latest    : ${s.latestArticles}
📂 Category  : ${s.categories}
👤 Users     : ${s.users}
🌐 SEO       : ${s.seo}

📦 Total Cache : ${s.total}

🧠 Heap Used  : ${s.heapUsedMB} MB
🧠 Heap Total : ${s.heapTotalMB} MB
💾 RSS        : ${s.rssMB} MB

==============================================
`);

}, 30 * 60 * 1000);

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
// XỬ LÝ ĐƯỜNG DẪN FIREBASE AUTH
// ==============================================
app.get("/__/auth/handler", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// API XÁC THỰC
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
    
    // 4. Lưu session rõ ràng trước khi trả về
    req.session.save((err) => {
      if (err) {
        console.error("❌ Lỗi lưu session:", err);
        return res.status(500).json({ success: false, message: "Không thể lưu phiên đăng nhập" });
      }
      res.json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error("❌ Lỗi đăng nhập:", err);
    res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
});

app.post("/api/logout", (req, res) => {
  // 5. Hủy session an toàn
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Lỗi đăng xuất:", err);
      return res.status(500).json({ success: false, message: "Không thể đăng xuất" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

// 6. API kiểm tra trạng thái đăng nhập
app.get("/api/auth/status", (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, loggedIn: false });
  }
  res.json({ success: true, loggedIn: true, user: req.session.user });
});

// ==============================
// API NỘI DUNG
// ==============================
app.get("/api/featured", async (req, res) => {

    const cache = cacheGet(HydYarCache.featuredArticles, "featured");

    if (cache) {
        return res.json({
            success: true,
            cached: true,
            data: cache
        });
    }

    try {

        const snap = await db.collection("wikiArticles")
            .where("featured", "==", true)
            .orderBy("updatedAt", "desc")
            .limit(3)
            .get();

        const data = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        cacheSet(
            HydYarCache.featuredArticles,
            "featured",
            data,
            CACHE_TIME.FEATURED
        );

        res.json({
            success: true,
            cached: false,
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Không thể tải bài nổi bật"
        });

    }

});

app.get("/api/latest", async (req, res) => {

    const cache = cacheGet(HydYarCache.wikiArticles, "latest");

    if (cache) {
        return res.json({
            success: true,
            cached: true,
            data: cache
        });
    }

    try {

        const snap = await db.collection("wikiArticles")
            .orderBy("updatedAt", "desc")
            .limit(3)
            .get();

        const data = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        cacheSet(
            HydYarCache.wikiArticles,
            "latest",
            data,
            CACHE_TIME.FEATURED
        );

        res.json({
            success: true,
            cached: false,
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Không thể tải bài mới"
        });

    }

});

app.get("/api/article/:id", async (req, res) => {

    const id = req.params.id;

    const cache = cacheGet(HydYarCache.wikiArticles, id);

    if (cache) {
        return res.json({
            success: true,
            cached: true,
            data: cache
        });
    }

    try {

        const doc = await db.collection("wikiArticles")
            .doc(id)
            .get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bài viết"
            });
        }

        const data = {
            id: doc.id,
            ...doc.data()
        };

        cacheSet(
            HydYarCache.wikiArticles,
            id,
            data,
            CACHE_TIME.ARTICLE
        );

        res.json({
            success: true,
            cached: false,
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Không thể tải bài viết"
        });

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
splitWikiPages().then(() => {

  app.listen(PORT, () => 
    console.log(`✅ Wiki HydYar chạy tại cổng ${PORT}`)
  );

});
