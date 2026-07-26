const express = require("express");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();


// ==============================
// CORS + JSON
// ==============================
app.use(cors({
    origin(origin, callback) {
        if (
            !origin ||
            origin.startsWith("http://localhost:") ||
            origin === "https://wiki-hydyar.web.app" ||
            origin === "https://wiki-hydyar.firebaseapp.com"
        ) {
            return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(express.json());

app.use(cookieParser());

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

app.post("/api/auth/google", async (req, res) => {

    try {

        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Thiếu idToken"
            });
        }

        const decoded = await admin.auth().verifyIdToken(idToken);

        const expiresIn = 1000 * 60 * 60 * 24 * 7;

        const sessionCookie =
            await admin.auth().createSessionCookie(
                idToken,
                { expiresIn }
            );

        res.cookie("session", sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true,
            sameSite: "none"
        });

        await db.collection("users")
            .doc(decoded.uid)
            .set({
                uid: decoded.uid,
                displayName: decoded.name || "",
                email: decoded.email || "",
                photoURL: decoded.picture || "",
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            }, {
                merge: true
            });

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(401).json({
            success: false
        });

    }

});

app.get("/api/me", async (req, res) => {

    try {

        const session = req.cookies.session;

        if (!session) {
            return res.json({
                loggedIn: false
            });
        }

        const decoded = await admin.auth()
            .verifySessionCookie(session, true);

        const user = await db
            .collection("users")
            .doc(decoded.uid)
            .get();

        res.json({
            loggedIn: true,
            user: user.data()
        });

    } catch (err) {

        res.json({
            loggedIn: false
        });

    }

});

app.post("/api/logout", (req, res) => {

    res.clearCookie("session", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });

    res.json({
        success: true
    });

});

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