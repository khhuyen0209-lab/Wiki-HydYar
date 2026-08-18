const { WebSocketServer } = require("ws");

// ==============================================
// HYDYAR WEBSOCKET CHAT SYSTEM
// ==============================================

function registerChatRoutes({
    app,
    server,
    db,
    requireAuth
}) {

    // ==========================================
    // WEBSOCKET
    // ==========================================

    const wss = new WebSocketServer({
        server,
        path: "/ws/chat"
    });


    // ==========================================
    // RAM CHAT
    // ==========================================

    let chatMemory = [];

    const MAX_CHAT = 200;


    // ==========================================
    // CHAT RATE LIMIT
    // ==========================================

    const chatCooldown = new Map();

    const CHAT_DELAY = 1000;


    function canSendChat(uid) {

        const now = Date.now();

        const last =
            chatCooldown.get(uid) || 0;


        if (now - last < CHAT_DELAY) {

            return false;

        }


        chatCooldown.set(uid, now);

        return true;

    }


    // ==========================================
    // TỪ CẤM
    // ==========================================

    const bannedWords = [
        "đm",
        "dm",
        "cl",
        "cc",
        "fuck",
        "shit"
    ];


    // ==========================================
    // LOAD CHAT FIREBASE
    // ==========================================

    async function loadChat() {

        try {

            const snap = await db
                .collection("community")
                .doc("chat")
                .collection("messages")
                .orderBy("time", "desc")
                .limit(MAX_CHAT)
                .get();


            chatMemory = snap.docs
                .reverse()
                .map(d => d.data());


            console.log(
                `💬 Load ${chatMemory.length} chat`
            );


        } catch (err) {

            console.error(
                "❌ Load chat lỗi",
                err
            );

        }

    }


    loadChat();


    // ==========================================
    // SAVE CHAT FIREBASE
    // ==========================================

    async function saveChat() {

        if (chatMemory.length === 0)
            return;


        try {

            const ref =
                db
                    .collection("community")
                    .doc("chat")
                    .collection("messages");


            const batch = db.batch();


            const old =
                await ref
                    .orderBy("time")
                    .get();


            if (old.size > MAX_CHAT) {

                old.docs
                    .slice(
                        0,
                        old.size - MAX_CHAT
                    )
                    .forEach(doc => {

                        batch.delete(doc.ref);

                    });

            }


            chatMemory.forEach(msg => {

                batch.set(
                    ref.doc(String(msg.time)),
                    msg
                );

            });


            await batch.commit();


            console.log(
                "💾 Đã backup chat"
            );


        } catch (err) {

            console.error(
                "❌ Save chat lỗi",
                err
            );

        }

    }


    // ==========================================
    // BACKUP 15 PHÚT
    // ==========================================

    setInterval(() => {

        saveChat();

    }, 15 * 60 * 1000);


    // ==========================================
    // FILTER MESSAGE
    // ==========================================

    function cleanMessage(text) {

        let msg =
            String(text)
                .slice(0, 800);


        for (const word of bannedWords) {

            const reg =
                new RegExp(word, "gi");


            msg =
                msg.replace(
                    reg,
                    "***"
                );

        }


        return msg.trim();

    }


    // ==========================================
    // BROADCAST
    // ==========================================

    function broadcast(data) {

        wss.clients.forEach(client => {

            if (client.readyState === 1) {

                client.send(
                    JSON.stringify(data)
                );

            }

        });

    }


    // ==========================================
    // WEBSOCKET CONNECT
    // ==========================================

    wss.on("connection", async (ws, req) => {

        console.log(
            "🔌 WS CONNECT:",
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress,
            req.url
        );


        let user = null;


        // Gửi lịch sử

        ws.send(
            JSON.stringify({

                type: "history",

                data: chatMemory

            })
        );


        // ======================================
        // MESSAGE
        // ======================================

        ws.on("message", raw => {

            try {

                const data =
                    JSON.parse(raw);


                // ==================================
                // AUTH
                // ==================================

                if (data.type === "auth") {

                    user =
                        data.user || null;


                    console.log(
                        "👤 WS AUTH:",
                        user?.uid,
                        user?.name
                    );


                    return;

                }


                // ==================================
                // MESSAGE
                // ==================================

                if (data.type === "message") {

                    if (!user) {

                        ws.send(
                            JSON.stringify({

                                type: "error",

                                message:
                                    "Bạn cần đăng nhập để chat"

                            })
                        );

                        return;

                    }


                    // chống spam

                    if (!canSendChat(user.uid)) {

                        ws.send(
                            JSON.stringify({

                                type: "error",

                                message:
                                    "Bạn gửi quá nhanh, hãy chờ 1 giây"

                            })
                        );

                        return;

                    }


                    const text =
                        cleanMessage(
                            data.text || ""
                        );


                    if (!text)
                        return;


                    const msg = {

                        id: Date.now(),

                        uid: user.uid,

                        name:
                            user.name ||
                            "Người dùng",

                        avatar:
                            user.avatar ||
                            "",

                        text,

                        time: Date.now()

                    };


                    chatMemory.push(msg);


                    if (
                        chatMemory.length >
                        MAX_CHAT
                    ) {

                        chatMemory.shift();

                    }


                    // Gửi cho tất cả client

                    broadcast({

                        type: "message",

                        data: msg

                    });


                    // Backup khi đạt 100 tin

                    if (
                        chatMemory.length >= 100
                    ) {

                        saveChat();

                    }

                }


            } catch (e) {

                console.log(
                    "WS error",
                    e
                );

            }

        });

    });


    // ==============================================
    // CHAT API
    // ==============================================


    // ==========================================
    // LỊCH SỬ CHAT
    // ==========================================

    app.get(
        "/api/chat/history",
        requireAuth,
        async (req, res) => {

            res.json({

                success: true,

                data: chatMemory

            });

        }
    );


    // ==========================================
    // GỬI CHAT HTTP FALLBACK
    // ==========================================

    app.post(
        "/api/chat/send",
        requireAuth,
        async (req, res) => {

            try {

                const text =
                    cleanMessage(
                        req.body.text || ""
                    );


                if (!text) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Nội dung rỗng"

                    });

                }


                const user =
                    req.session.user;


                if (!canSendChat(user.uid)) {

                    return res.status(429).json({

                        success: false,

                        message:
                            "Bạn gửi quá nhanh"

                    });

                }


                const msg = {

                    id: Date.now(),

                    uid: user.uid,

                    name:
                        user.name ||
                        "Người dùng",

                    avatar:
                        user.avatar ||
                        "",

                    text,

                    time: Date.now()

                };


                chatMemory.push(msg);


                if (
                    chatMemory.length >
                    MAX_CHAT
                ) {

                    chatMemory.shift();

                }


                broadcast({

                    type: "message",

                    data: msg

                });


                res.json({

                    success: true,

                    data: msg

                });


            } catch (err) {

                console.error(
                    "Chat API lỗi:",
                    err
                );


                res.status(500).json({

                    success: false

                });

            }

        }
    );


    // ==========================================
    // EXPORT / CONTROL
    // ==========================================

    return {

        wss,

        loadChat,

        saveChat,

        getChatMemory: () =>
            chatMemory

    };

}


module.exports = {
    registerChatRoutes
};