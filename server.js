const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const cors = require("cors");
const session = require("express-session");

const app = express();

const server = http.createServer(app);

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

// ==============================
// SESSION — ĐẶT TRƯỚC SEPAY
// ==============================
// SePay routes cần req.session.user để auth
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
// FIREBASE ADMIN — ĐẶT TRƯỚC SEPAY
// ==============================
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ==============================
// SEPAY — ĐĂNG KÝ SAU SESSION + FIREBASE
// ==============================
// Webhook cần đăng ký TRƯỚC app.use(express.json())
// để giữ được raw body cho HMAC verify
const {
    registerSePayRoutes
} = require("./sepay");

registerSePayRoutes(
    app,
    db,
    admin
);

// ==============================
// JSON PARSER — ĐẶT SAU SEPAY
// ==============================
app.use(express.json());

// ==============================
// CHAT
// ==============================
const {
    registerChatRoutes
} = require("./chat");


// ==============================
// TOOL: TÁCH WIKI PAGES
// ==============================

/* async function splitWikiPages() {

  const articleRef = db
    .collection("wikiArticles")
    .doc("big-bang");

  const snap = await articleRef.get();

  if (!snap.exists) {
    console.log("❌ Không tìm thấy bài viết");
    return;
  }


  const data = snap.data();

  const content = data.content;


  if (!content) {
    console.log("❌ Không có content");
    return;
  }



  // ==============================
  // XÓA PAGE CŨ
  // ==============================

  const oldPages = await articleRef
    .collection("pages")
    .get();


  if (!oldPages.empty) {

    const batch = db.batch();

    oldPages.forEach(doc=>{
      batch.delete(doc.ref);
    });


    await batch.commit();


    console.log(
      `🗑️ Đã xóa ${oldPages.size} page cũ`
    );

  }



  // ==============================
  // TÁCH PAGE
  // ==============================

  const pages = content.split(
    /---trang\d+---/i
  );


  let count = 0;



  for(let i = 1; i < pages.length; i++){


    let pageContent = pages[i].trim();


    if(!pageContent)
      continue;



    let title = `Trang ${i}`;



    const titleMatch =
      pageContent.match(
        /^## (?:Trang \d+: )?(.*)/m
      );



    if(titleMatch){

      title = titleMatch[1].trim();


      pageContent =
        pageContent.replace(
          /^## .*\n?/m,
          ""
        ).trim();

    }



    // ==============================
    // LEVEL
    // ==============================

    let level = 1;


    if(
      /^\s*\d+\.\d+\.\d+/m.test(pageContent)
    ){

      level = 3;

    }
    else if(
      /^\s*\d+\.\d+/m.test(pageContent)
    ){

      level = 2;

    }



    await articleRef
      .collection("pages")
      .doc(String(i))
      .set({

        title,

        content:pageContent,

        level,

        order:i,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp()

      });



    count++;


    console.log(
      `✅ Page ${i}: ${title} | level ${level}`
    );

  }



  console.log(
    `🎉 Hoàn tất tách ${count} page`
  );

} */ 

// ==============================
// HYDYAR RAM CACHE SYSTEM
// ==============================

const HydYarCache = {
    articlePreview: new Map(),
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

    PREVIEW: 2 * 60 * 60 * 1000,
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
    ARTICLE: 250,
    PREVIEW: 250,
    FEATURED: 20,
    LATEST: 20,
    CATEGORY: 100,
    USER: 1000,
    SEO: 500
}

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

    if (ramMB > 320) {

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
// FIRESTORE REALTIME CACHE UPDATE
// ==============================

// Theo dõi bài viết
db.collection("wikiArticles")
.onSnapshot(snapshot => {

    let hasArticleChange = false;

    snapshot.docChanges().forEach(change => {

        const id = change.doc.id;

        // ==============================
        // 🧹 XÓA CACHE BÀI VIẾT
        // ==============================

        cacheDelete(
            HydYarCache.wikiArticles,
            id
        );

        cacheDelete(
            HydYarCache.articlePreview,
            id
        );

        // ==============================
        // 🧹 XÓA CACHE DANH SÁCH
        // ==============================

        cacheDelete(
            HydYarCache.featuredArticles,
            "featured"
        );

        cacheDelete(
            HydYarCache.latestArticles,
            "latest"
        );

        hasArticleChange = true;

        console.log(
            `♻️ Article ${change.type}: ${id}`
        );

    });

    // ==============================
    // 📊 CẬP NHẬT COUNT DANH MỤC
    // ==============================

    if (hasArticleChange) {

        scheduleCategoryCountSync();

    }

}, err => {

    console.error(
        "❌ Firestore Article Watch Error:",
        err
    );

});

// ==============================
// 🚀 INITIAL CATEGORY COUNT SYNC
// ==============================

setTimeout(() => {

    syncCategoryCounts();

}, 2000);


// Theo dõi tất cả subcollection pages
db.collectionGroup("pages")
.onSnapshot(snapshot => {

    snapshot.docChanges().forEach(change => {

        // Document cha của pages chính là bài viết
        const articleRef = change.doc.ref.parent.parent;

        if (!articleRef) return;

        const articleId = articleRef.id;

        // Xóa cache bài viết
        cacheDelete(HydYarCache.wikiArticles, articleId);
        cacheDelete(HydYarCache.articlePreview, articleId);

        console.log(
            `📄 Page ${change.type}: ${articleId}/${change.doc.id}`
        );

    });

}, err => {

    console.error("❌ Firestore Pages Watch Error:", err);

});

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

// ==============================================
// 💬 CHAT MODULE
// ==============================================

registerChatRoutes({
    app,
    server,
    db,
    requireAuth
});

// ==============================
// 📊 CATEGORY ARTICLE COUNTER
// ==============================

let categoryCountSyncTimer = null;
let categoryCountSyncRunning = false;

async function syncCategoryCounts() {

    if (categoryCountSyncRunning) return;

    categoryCountSyncRunning = true;

    try {

        console.log("📊 Đang đồng bộ số bài theo danh mục...");

        // ==============================
        // LẤY TẤT CẢ BÀI VIẾT
        // ==============================

        const articlesSnap = await db
            .collection("wikiArticles")
            .get();

        const counts = new Map();

        articlesSnap.forEach(doc => {

            const data = doc.data();

            const categoryId = data.categoryId;

            // Bài không có danh mục
            if (!categoryId) return;

            counts.set(
                categoryId,
                (counts.get(categoryId) || 0) + 1
            );

        });

        // ==============================
        // LẤY TẤT CẢ DANH MỤC
        // ==============================

        const categoriesSnap = await db
            .collection("categories")
            .get();

        const batch = db.batch();

        let updated = 0;

        categoriesSnap.forEach(doc => {

            const data = doc.data();

            const categoryId =
                data.id || doc.id;

            const count =
                counts.get(categoryId) || 0;

            if ((data.count || 0) !== count) {

                batch.update(
                    doc.ref,
                    {
                        count,

                        countUpdatedAt:
                            admin.firestore.FieldValue.serverTimestamp()
                    }
                );

                updated++;

            }

        });

        // ==============================
        // CẬP NHẬT FIRESTORE
        // ==============================

        if (updated > 0) {

            await batch.commit();

            console.log(
                `✅ Đã cập nhật ${updated} danh mục`
            );

        }

        // ==============================
        // 🧹 INVALIDATE CATEGORY CACHE
        // ==============================

        if (updated > 0) {

            cacheDelete(
                HydYarCache.categories,
                "categories"
            );

            console.log(
                "🧹 Đã xóa cache categories"
            );

        }

        console.log(
            `📊 Category Counter hoàn tất: ${updated} danh mục thay đổi`
        );

    } catch (err) {

        console.error(
            "❌ Lỗi đồng bộ Category Counter:",
            err
        );

    } finally {

        categoryCountSyncRunning = false;

    }

}


// ==============================
// ⏱️ DEBOUNCE CATEGORY SYNC
// ==============================

function scheduleCategoryCountSync() {

    clearTimeout(categoryCountSyncTimer);

    categoryCountSyncTimer = setTimeout(() => {

        syncCategoryCounts();

    }, 1500);

}

// ==============================
// 🆔 HYDYAR USER ID GENERATOR
// ==============================

async function generateHydYarUserId() {

    let digits = 6;

    while (true) {

        const min =
            Math.pow(10, digits - 1);

        const max =
            Math.pow(10, digits) - 1;

        // 🎲 Sinh số ngẫu nhiên
        const number =
            Math.floor(
                Math.random() *
                (max - min + 1)
            ) + min;

        // Định dạng: HY | số
        const id =
            `HY | ${number}`;

        // 🔎 Kiểm tra trùng ID
        const snap =
            await db
                .collection("users")
                .where("id", "==", id)
                .limit(1)
                .get();

        // Không trùng
        if (snap.empty) {

            return id;

        }

        console.log(
            `⚠️ ID ${id} đã tồn tại → sinh lại`
        );

    }

}

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

    // ==============================
    // 🔑 NHẬN FIREBASE TOKEN
    // ==============================

    const { token } = req.body;

    if (!token) {

      return res.status(400).json({

        success: false,

        message: "Thiếu token"

      });

    }


    // ==============================
    // 🔐 XÁC THỰC FIREBASE TOKEN
    // ==============================

    const decoded =
      await admin.auth().verifyIdToken(token);


    const uid =
      decoded.uid;


    // ==============================
    // 👤 USER FIRESTORE
    // ==============================

    const userRef =
      db
        .collection("users")
        .doc(uid);


    const userSnap =
      await userRef.get();


    // ==============================
    // 📦 DỮ LIỆU USER
    // ==============================

    const userData = {

      uid,

      email:
        decoded.email || "",

      name:
        decoded.name ||
        decoded.email?.split("@")[0] ||
        "Người dùng",

      avatar:
        decoded.picture || "",

      lastLogin:
        admin.firestore.FieldValue
          .serverTimestamp()

    };


    // ==============================
    // 🆔 HYDYAR USER ID
    // ==============================

    let hydyarId = null;


    // ==============================
    // 🆕 TẠO USER MỚI
    // ==============================

    if (!userSnap.exists) {

      // 🎲 Sinh ID ngẫu nhiên
      hydyarId =
        await generateHydYarUserId();


      await userRef.set({

        ...userData,


        // ==============================
        // 🆔 ID CÔNG KHAI HYDYAR
        // ==============================

        id:
          hydyarId,


        // ==============================
        // 📅 THỜI GIAN TẠO
        // ==============================

        createdAt:
          admin.firestore.FieldValue
            .serverTimestamp(),


        // ==============================
        // 🔐 QUYỀN
        // ==============================

        role:
          "user",


        // ==============================
        // 🟢 TRẠNG THÁI
        // ==============================

        status:
          "active"

      });


      console.log(

        "👤 Tạo người dùng mới:",
        uid,
        "| ID:",
        hydyarId

      );

    }


    // ==============================
    // 🔄 USER ĐÃ TỒN TẠI
    // ==============================

    else {

      // Lấy ID HydYar hiện tại
      hydyarId =
        userSnap.data().id || null;


      // Cập nhật thông tin đăng nhập
      await userRef.update(
        userData
      );


      console.log(

        "🔄 Đăng nhập:",
        uid,
        "| ID:",
        hydyarId || "Không có"

      );

    }


    // ==============================
// 🔐 TẠO SESSION USER
// ==============================

const currentUserData = userSnap.exists
    ? userSnap.data()
    : {
        role: "user",
        status: "active",
        plan: "Free"
    };

req.session.user = {

    // Firebase UID
    uid,

    // HydYar ID
    id: hydyarId,

    // Email
    email: userData.email,

    // Tên
    name: userData.name,

    // Avatar
    avatar: userData.avatar,

    // Quyền
    role:
        currentUserData.role || "user",

    // Trạng thái
    status:
        currentUserData.status || "active",

    // ==============================
    // 💎 PLAN
    // ==============================
    plan:
        currentUserData.plan || "Free",

    // ==============================
    // 💳 PREMIUM
    // ==============================
    premiumOrderId:
        currentUserData.premiumOrderId || null,

    premiumSource:
        currentUserData.premiumSource || null,

    premiumUntil:
        currentUserData.premiumUntil || null,

    premiumUpdatedAt:
        currentUserData.premiumUpdatedAt || null

};


    // ==============================
    // 💾 LƯU SESSION
    // ==============================

    req.session.save((err) => {

      if (err) {

        console.error(
          "❌ Lỗi lưu session:",
          err
        );


        return res.status(500).json({

          success: false,

          message:
            "Không thể lưu phiên đăng nhập"

        });

      }


      // ==============================
      // ✅ LOGIN THÀNH CÔNG
      // ==============================

      res.json({

        success: true,

        user:
          req.session.user

      });

    });

  } catch (err) {

    // ==============================
    // ❌ LOGIN ERROR
    // ==============================

    console.error(
      "❌ Lỗi đăng nhập:",
      err
    );


    res.status(401).json({

      success: false,

      message:
        "Token không hợp lệ"

    });

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

app.get("/api/me", requireAuth, async (req, res) => {

    try {

        const uid = req.session.user.uid;

        const userRef = db
            .collection("users")
            .doc(uid);

        const userSnap = await userRef.get();

        if (!userSnap.exists) {

            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });

        }

        const data = userSnap.data();

        // ==============================
        // 🔄 ĐỒNG BỘ SESSION
        // ==============================

        req.session.user = {

            ...req.session.user,

            role:
                data.role || "user",

            status:
                data.status || "active",

            plan:
                data.plan || "Free",

            premiumOrderId:
                data.premiumOrderId || null,

            premiumSource:
                data.premiumSource || null,

            premiumUntil:
                data.premiumUntil || null,

            premiumUpdatedAt:
                data.premiumUpdatedAt || null

        };

        // ==============================
        // 💾 LƯU SESSION
        // ==============================

        req.session.save((err) => {

            if (err) {

                console.error(
                    "❌ Lỗi đồng bộ session:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Không thể đồng bộ phiên"
                });

            }

            res.json({

                success: true,

                user:
                    req.session.user

            });

        });

    } catch (err) {

        console.error(
            "❌ /api/me Error:",
            err
        );

        res.status(500).json({

            success: false,

            message: "Không thể lấy thông tin người dùng"

        });

    }

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

    const cache = cacheGet(
        HydYarCache.featuredArticles,
        "featured"
    );

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

        const data = snap.docs.map(doc => {

            const d = {
    type: "article",
    id: doc.id,
    ...doc.data()
};

            if (d.createdAt?.toDate) {
                d.createdAt = d.createdAt.toDate().toISOString();
            }

            if (d.updatedAt?.toDate) {
                d.updatedAt = d.updatedAt.toDate().toISOString();
            }

            // Lưu Preview Cache
            cacheSet(
                HydYarCache.articlePreview,
                d.id,
                d,
                CACHE_TIME.ARTICLE,
                CACHE_LIMIT.ARTICLE
            );

            return d;

        });

        // Lưu danh sách Featured
        cacheSet(
            HydYarCache.featuredArticles,
            "featured",
            data,
            CACHE_TIME.FEATURED,
            CACHE_LIMIT.FEATURED
        );

        return res.json({
            success: true,
            cached: false,
            data
        });

    } catch (err) {

        console.error("❌ Featured Error:", err);

        return res.status(500).json({
            success: false,
            message: "Không thể tải bài nổi bật"
        });

    }

});

app.get("/api/latest", async (req, res) => {

    const cache = cacheGet(
        HydYarCache.latestArticles,
        "latest"
    );

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

        const data = snap.docs.map(doc => {

            const d = {
    type: "article",
    id: doc.id,
    ...doc.data()
};

            if (d.createdAt?.toDate) {
                d.createdAt = d.createdAt.toDate().toISOString();
            }

            if (d.updatedAt?.toDate) {
                d.updatedAt = d.updatedAt.toDate().toISOString();
            }

            // Lưu Preview Cache
            cacheSet(
                HydYarCache.articlePreview,
                d.id,
                d,
                CACHE_TIME.ARTICLE,
                CACHE_LIMIT.ARTICLE // hoặc CACHE_LIMIT.PREVIEW nếu bạn tách riêng
            );

            return d;

        });

        // Lưu danh sách Latest
        cacheSet(
            HydYarCache.latestArticles,
            "latest",
            data,
            CACHE_TIME.LATEST,
            CACHE_LIMIT.LATEST
        );

        return res.json({
            success: true,
            cached: false,
            data
        });

    } catch (err) {

        console.error("❌ Latest Error:", err);

        return res.status(500).json({
            success: false,
            message: "Không thể tải bài mới"
        });

    }

});

app.get("/api/article/:id", async (req, res) => {

    const id = req.params.id;

    // Kiểm tra Full Cache
    const cache = cacheGet(
        HydYarCache.wikiArticles,
        id
    );

    if (cache) {
        return res.json({
            success: true,
            cached: true,
            data: cache
        });
    }

    try {

        const articleRef = db
            .collection("wikiArticles")
            .doc(id);

        // Lấy bài viết và pages song song
        const [articleSnap, pagesSnap] = await Promise.all([
            articleRef.get(),
            articleRef
                .collection("pages")
                .orderBy("order")
                .get()
        ]);

        if (!articleSnap.exists) {

            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bài viết"
            });

        }

        // Xử lý pages
        const pages = pagesSnap.docs.map(doc => {

            const page = {
                id: Number(doc.id),
                ...doc.data()
            };

            if (page.createdAt?.toDate) {
                page.createdAt = page.createdAt.toDate().toISOString();
            }

            if (page.updatedAt?.toDate) {
                page.updatedAt = page.updatedAt.toDate().toISOString();
            }

            return page;

        });

        // Dữ liệu bài viết
        const article = {
    type: "article",
    id: articleSnap.id,
    ...articleSnap.data(),
    pages
};

        if (article.createdAt?.toDate) {
            article.createdAt = article.createdAt.toDate().toISOString();
        }

        if (article.updatedAt?.toDate) {
            article.updatedAt = article.updatedAt.toDate().toISOString();
        }

        // Lưu Full Cache
        cacheSet(
            HydYarCache.wikiArticles,
            id,
            article,
            CACHE_TIME.ARTICLE,
            CACHE_LIMIT.ARTICLE
        );

        // Lưu Preview Cache
        cacheSet(
            HydYarCache.articlePreview,
            id,
            {
                id: article.id,
                title: article.title,
                desc: article.desc,
                image: article.image,
                categoryId: article.categoryId,
                featured: article.featured,
                views: article.views,
                keywords: article.keywords,
                createdAt: article.createdAt,
                updatedAt: article.updatedAt
            },
            CACHE_TIME.ARTICLE,
            CACHE_LIMIT.ARTICLE // hoặc CACHE_LIMIT.PREVIEW nếu có
        );

        return res.json({
            success: true,
            cached: false,
            data: article
        });

    } catch (err) {

        console.error("❌ Lỗi tải bài viết:", err);

        return res.status(500).json({
            success: false,
            message: "Lỗi tải bài viết"
        });

    }

});

app.get("/api/categories", async (req, res) => {

    const cache = cacheGet(
        HydYarCache.categories,
        "categories"
    );


    if (cache) {

        return res.json({
            success: true,
            cached: true,
            data: cache
        });

    }


    try {

        const snap = await db
            .collection("categories")
            .get();


        const data = snap.docs.map(doc => {

            return {
                id: doc.data().id || doc.id,
                docId: doc.id,
                name: doc.data().name || "Khác",
                icon: doc.data().icon || "",
                count: doc.data().count || 0,
                ...doc.data()
            };

        });


        cacheSet(
            HydYarCache.categories,
            "categories",
            data,
            CACHE_TIME.CATEGORY,
            CACHE_LIMIT.CATEGORY
        );


        res.json({

            success:true,

            cached:false,

            data

        });


    } catch(err){

        console.error(
            "❌ Lỗi tải danh mục:",
            err
        );


        res.status(500).json({

            success:false,

            message:"Không thể tải danh mục"

        });

    }

});

app.get("/api/search", async (req, res) => {

    try {

        const keyword = (req.query.q || "")
            .trim()
            .toLowerCase();

        if (!keyword) {
            return res.json({
                success: true,
                cached: true,
                data: []
            });
        }

        let result = [];

        // ==============================
        // Tìm trong Preview Cache
        // ==============================

        for (const [, item] of HydYarCache.articlePreview.entries()) {

            if (item.expire <= Date.now()) continue;

            const article = item.data;

            if (!article) continue;

            if (
                article.title?.toLowerCase().includes(keyword) ||
                article.desc?.toLowerCase().includes(keyword) ||
                article.keywords?.toLowerCase().includes(keyword)
            ) {

                result.push(article);

                if (result.length >= 20) break;

            }

        }

        if (result.length > 0) {

            return res.json({
                success: true,
                cached: true,
                data: result
            });

        }

        // ==============================
        // Không có trong cache -> Firestore
        // ==============================

        const snap = await db.collection("wikiArticles").get();

        result = snap.docs.map(doc => {

            const data = {
    type: "article",
    id: doc.id,
    ...doc.data()
};

            if (data.createdAt?.toDate) {
                data.createdAt = data.createdAt.toDate().toISOString();
            }

            if (data.updatedAt?.toDate) {
                data.updatedAt = data.updatedAt.toDate().toISOString();
            }

            // Lưu Preview Cache
            cacheSet(
                HydYarCache.articlePreview,
                data.id,
                data,
                CACHE_TIME.ARTICLE,
                CACHE_LIMIT.ARTICLE
            );

            return data;

        }).filter(article =>

            article.title?.toLowerCase().includes(keyword) ||
            article.desc?.toLowerCase().includes(keyword) ||
            article.keywords?.toLowerCase().includes(keyword)

        ).slice(0, 20);

        return res.json({
            success: true,
            cached: false,
            data: result
        });

    } catch (err) {

        console.error("❌ Search Error:", err);

        return res.status(500).json({
            success: false,
            message: "Lỗi tìm kiếm"
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

server.on("upgrade",(request,socket,head)=>{

    console.log(
        "⬆️ WS UPGRADE:",
        request.url
    );

});

const PORT = process.env.PORT || 3000;

server.listen(PORT,()=>{

    console.log(
        `✅ Wiki HydYar chạy tại cổng ${PORT}`
    );

});