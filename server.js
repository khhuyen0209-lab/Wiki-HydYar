const express = require("express");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();


// ==============================
// CORS + JSON
// ==============================
app.use(cors({
    origin: "*"
}));

app.use(express.json());


// ==============================
// FIREBASE ADMIN
// ==============================
const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// ==============================
// FILE TĨNH
// ==============================
app.use(express.static(path.join(__dirname, "public")));


// =====================================================
// API
// =====================================================

// ---------- Bài nổi bật ----------
app.get("/api/featured", async (req, res) => {
    try {

        const snap = await db.collection("wikiArticles")
            .where("featured", "==", true)
            .limit(6)
            .get();

        const data = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });

    }
});


// ---------- Tăng view ----------
app.post("/api/article/:id/view", async (req, res) => {

    try {

        const ref = db
            .collection("wikiArticles")
            .doc(req.params.id);

        await ref.update({
            views: admin.firestore.FieldValue.increment(1)
        });

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });

    }

});


// =====================================================
// SEO BÀI VIẾT
// =====================================================

app.get("/:category/:slug", async (req, res) => {

    const { slug } = req.params;

    try {

        const docSnap = await db
            .collection("wikiArticles")
            .doc(slug)
            .get();

        let title = "Wiki HydYar - Tri thức mở rộng";
        let desc = "Kho tri thức mở rộng";
        let ogImage = "";

        if (docSnap.exists) {

            const data = docSnap.data();

            title = `${data.title || title} | Wiki HydYar`;
            desc = data.desc || desc;
            ogImage = data.image || "";

        }

        let html = fs.readFileSync(
            path.join(__dirname, "public", "index.html"),
            "utf8"
        );


        html = html.replace(
            /<title>.*?<\/title>/,
            `<title>${title}</title>`
        );


        html = html.replace(
            /<meta name="description"[^>]*>/,
            `<meta name="description" content="${desc}">`
        );


        const meta = `
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
</head>`;

        html = html.replace("</head>", meta);

        res.send(html);

    } catch (err) {

        console.error(err);

        res.sendFile(
            path.join(__dirname, "public", "index.html")
        );

    }

});


// =====================================================
// SPA
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/categories", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/community", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/:category", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Wiki HydYar chạy tại cổng ${PORT}`);
});