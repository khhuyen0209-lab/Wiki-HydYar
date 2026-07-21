const express = require("express");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const app = express();

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

// ==============================
// SEO ĐỘNG CHO BÀI VIẾT
// ==============================
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

        const ogMeta = `
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

        html = html.replace("</head>", ogMeta);

        res.send(html);

    } catch (err) {
        console.error("SEO ERROR:", err);
        res.sendFile(path.join(__dirname, "public", "index.html"));
    }
});

// ==============================
// ROUTE DANH MỤC
// ==============================
app.get("/:category", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// SPA FALLBACK (Express 5)
// ==============================
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Wiki HydYar chạy cổng ${PORT}`);
});