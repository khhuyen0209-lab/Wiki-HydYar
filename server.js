const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();


// ==============================
// FIREBASE ADMIN
// ==============================

// Dùng biến môi trường Railway
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


        const html = `
<!DOCTYPE html>
<html lang="vi">

<head>

<meta charset="UTF-8">

<title>${title}</title>

<meta name="description" content="${desc}">


<!-- Open Graph (Zalo/Facebook) -->

<meta property="og:type" content="article">

<meta property="og:title" content="${title}">

<meta property="og:description" content="${desc}">

<meta property="og:url" content="${req.protocol}://${req.get("host")}${req.originalUrl}">


<!-- Twitter -->

<meta name="twitter:card" content="summary">

<meta name="twitter:title" content="${title}">

<meta name="twitter:description" content="${desc}">


</head>


<body>

<div id="app"></div>


<script type="module" src="/script.js"></script>


</body>

</html>
`;

        res.send(html);


    } catch (err) {

        console.error(err);

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
// START SERVER
// ==============================

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        "Wiki HydYar running on port " + PORT
    );

});
