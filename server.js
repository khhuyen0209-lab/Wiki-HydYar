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

app.use(express.static("public"));


// ==============================
// SEO ĐỘNG CHO BÀI VIẾT
// ==============================

app.get("/:category/:slug", async (req, res) => {

    const { slug } = req.params;

    try {

        const doc = await db
            .collection("articles")
            .doc(slug)
            .get();


        let title = "Wiki HydYar - Tri thức mở rộng";
        let desc = "Kho tri thức mở rộng";


        if (doc.exists) {

            const data = doc.data();

            title = `${data.title || title} | Wiki HydYar`;
            desc = data.desc || desc;

        }


        // Lấy index.html gốc
        let html = fs.readFileSync(
            path.join(__dirname, "public", "index.html"),
            "utf8"
        );


        // Đổi title
        html = html.replace(
            /<title>.*?<\/title>/,
            `<title>${title}</title>`
        );


        // Thêm OG Meta cho Zalo/Facebook
        html = html.replace(
            "</head>",
            `
<meta name="description" content="${desc}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}">

<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">

</head>
`
        );


        res.send(html);


    } catch (err) {

        console.error("SEO ERROR:", err);


        res.sendFile(
            path.join(__dirname, "public", "index.html")
        );

    }

});


// ==============================
// SPA FALLBACK
// ==============================

app.get("/*splat", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


// ==============================
// START
// ==============================

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        "Wiki HydYar running on port " + PORT
    );

});
