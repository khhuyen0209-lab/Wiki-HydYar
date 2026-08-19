// ==========================================================
// 💳 HYDYAR — SEPAY PAYMENT MODULE
// ==========================================================
// Flow:
//
// Client
//   ↓
// POST /api/payment/create
//   ↓
// Server tạo invoice + lưu paymentOrders
//   ↓
// SePay Checkout
//   ↓
// Người dùng thanh toán
//   ↓
// SePay Webhook
//   ↓
// Server xác minh HMAC + giao dịch
//   ↓
// paymentOrders.status = "paid"
//   ↓
// Cấp Premium
//
// Client quay về:
// /?payment=success&order=HY-xxxx
//
// Sau đó client:
// GET /api/payment/status/HY-xxxx
//
// ⚠️ SECRET KEY CHỈ Ở SERVER
// ==========================================================

const crypto = require("crypto");
const express = require("express");


// ==========================================================
// CONFIG
// ==========================================================

const SEPAY_ENV =
    process.env.SEPAY_ENV || "sandbox";

const SEPAY_MERCHANT_ID =
    process.env.SEPAY_MERCHANT_ID;

const SEPAY_SECRET_KEY =
    process.env.SEPAY_SECRET_KEY;

// Secret riêng cho webhook
const SEPAY_WEBHOOK_SECRET =
    process.env.SEPAY_WEBHOOK_SECRET;


// ==========================================================
// PREMIUM PACKAGES
// ==========================================================
// 🔐 Server tự quyết định giá.
// Không tin amount từ client.
// ==========================================================

const PREMIUM_PACKAGES = {

    premium: {

        name: "Premium",

        amount: 30000,

        durationMonths: 1

    },

    "premium-plus": {

        name: "Premium+",

        amount: 300000,

        durationMonths: 12

    }

};


// ==========================================================
// VALIDATE ENV
// ==========================================================

if (!SEPAY_MERCHANT_ID) {

    console.warn(
        "⚠️ SEPAY_MERCHANT_ID chưa được cấu hình"
    );

}

if (!SEPAY_SECRET_KEY) {

    console.warn(
        "⚠️ SEPAY_SECRET_KEY chưa được cấu hình"
    );

}

if (!SEPAY_WEBHOOK_SECRET) {

    console.warn(
        "⚠️ SEPAY_WEBHOOK_SECRET chưa được cấu hình"
    );

}

if (
    SEPAY_ENV !== "sandbox" &&
    SEPAY_ENV !== "production"
) {

    throw new Error(
        "SEPAY_ENV phải là sandbox hoặc production"
    );

}


// ==========================================================
// SEPAY CLIENT
// ==========================================================

let sepayClient = null;
let sepayLoading = null;


// ==========================================================
// LOAD SDK
// ==========================================================

async function getSePayClient() {

    if (sepayClient) {

        return sepayClient;

    }

    if (sepayLoading) {

        return sepayLoading;

    }

    sepayLoading = (async () => {

        try {

            const module =
                await import("sepay-pg-node");

            const SePayPgClient =
                module.SePayPgClient;

            if (!SePayPgClient) {

                throw new Error(
                    "Không tìm thấy SePayPgClient"
                );

            }

            sepayClient =
                new SePayPgClient({

                    env:
                        SEPAY_ENV,

                    merchant_id:
                        SEPAY_MERCHANT_ID,

                    secret_key:
                        SEPAY_SECRET_KEY

                });

            console.log(
                `💳 SePay PG initialized: ${SEPAY_ENV}`
            );

            return sepayClient;

        } catch (err) {

            console.error(
                "❌ Không thể khởi tạo SePay:",
                err
            );

            throw err;

        } finally {

            sepayLoading = null;

        }

    })();

    return sepayLoading;

}


// ==========================================================
// ORDER ID
// ==========================================================

function generateOrderInvoice() {

    const timestamp =
        Date.now();

    const random =
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase();

    return `HY-${timestamp}-${random}`;

}


// ==========================================================
// VALIDATE AMOUNT
// ==========================================================

function validateAmount(amount) {

    const value =
        Number(amount);

    if (!Number.isInteger(value)) {

        throw new Error(
            "Số tiền phải là số nguyên"
        );

    }

    if (value <= 0) {

        throw new Error(
            "Số tiền phải lớn hơn 0"
        );

    }

    return value;

}


// ==========================================================
// GET PACKAGE
// ==========================================================

function getPremiumPackage(packageId) {

    const pkg =
        PREMIUM_PACKAGES[packageId];

    if (!pkg) {

        throw new Error(
            "Gói Premium không hợp lệ"
        );

    }

    return pkg;

}


// ==========================================================
// CREATE CHECKOUT
// ==========================================================

async function createCheckout({

    order_invoice_number,

    order_amount,

    order_description,

    customer_id,

    success_url,

    error_url,

    cancel_url,

    custom_data

}) {

    // ------------------------------------------------------
    // VALIDATE ENV
    // ------------------------------------------------------

    if (!SEPAY_MERCHANT_ID) {

        throw new Error(
            "Thiếu SEPAY_MERCHANT_ID"
        );

    }

    if (!SEPAY_SECRET_KEY) {

        throw new Error(
            "Thiếu SEPAY_SECRET_KEY"
        );

    }


    // ------------------------------------------------------
    // AMOUNT
    // ------------------------------------------------------

    const amount =
        validateAmount(order_amount);


    // ------------------------------------------------------
    // INVOICE
    // ------------------------------------------------------

    const invoice =
        order_invoice_number ||
        generateOrderInvoice();


    // ------------------------------------------------------
    // CLIENT
    // ------------------------------------------------------

    const client =
        await getSePayClient();


    // ------------------------------------------------------
    // CHECKOUT URL
    // ------------------------------------------------------

    const checkoutURL =
        client.checkout
            .initCheckoutUrl();


    // ------------------------------------------------------
    // PAYMENT FIELDS
    // ------------------------------------------------------

    const checkoutFormfields =
        client.checkout
            .initOneTimePaymentFields({

                operation:
                    "PURCHASE",

                payment_method:
                    "BANK_TRANSFER",

                order_invoice_number:
                    invoice,

                order_amount:
                    amount,

                currency:
                    "VND",

                order_description:
                    order_description ||
                    `Thanh toán ${invoice}`,

                customer_id:
                    customer_id || undefined,

                success_url:
                    success_url || undefined,

                error_url:
                    error_url || undefined,

                cancel_url:
                    cancel_url || undefined,

                // SePay SDK docs mô tả custom_data
                // là string.
                custom_data:
                    custom_data || undefined

            });


    return {

        success:
            true,

        checkoutURL,

        fields:
            checkoutFormfields,

        order_invoice_number:
            invoice,

        order_amount:
            amount

    };

}


// ==========================================================
// 🔐 HMAC WEBHOOK VERIFY
// ==========================================================

function verifyWebhookSignature(
    rawBody,
    signature,
    timestamp
) {

    if (
        !SEPAY_WEBHOOK_SECRET ||
        !signature ||
        !timestamp
    ) {

        return false;

    }


    // Chống replay
    const now =
        Math.floor(
            Date.now() / 1000
        );

    const requestTime =
        Number(timestamp);


    if (
        !Number.isFinite(requestTime) ||
        Math.abs(now - requestTime) > 300
    ) {

        return false;

    }


    const expected =
        "sha256=" +
        crypto
            .createHmac(
                "sha256",
                SEPAY_WEBHOOK_SECRET
            )
            .update(
                `${requestTime}.${rawBody}`
            )
            .digest("hex");


    const actualBuffer =
        Buffer.from(signature);

    const expectedBuffer =
        Buffer.from(expected);


    if (
        actualBuffer.length !==
        expectedBuffer.length
    ) {

        return false;

    }


    return crypto.timingSafeEqual(
        actualBuffer,
        expectedBuffer
    );

}


// ==========================================================
// 🔎 FIND ORDER ID FROM WEBHOOK
// ==========================================================

function extractOrderId(data) {

    // Tùy cấu hình payment code của SePay,
    // code thường là nơi phù hợp để chứa mã order.

    const candidates = [

        data.code,

        data.content,

        data.order_invoice_number,

        data.orderInvoiceNumber

    ];


    for (const value of candidates) {

        if (!value) continue;

        const text =
            String(value);


        const match =
            text.match(
                /HY-\d+-[A-Z0-9]+/i
            );


        if (match) {

            return match[0].toUpperCase();

        }

    }


    return null;

}


// ==========================================================
// 💎 ACTIVATE PREMIUM
// ==========================================================

async function activatePremium(
    db,
    order
) {

    if (!order.userId) {

        throw new Error(
            "Order không có userId"
        );

    }

    if (!order.package) {

        throw new Error(
            "Order không có package"
        );

    }


    const pkg =
        getPremiumPackage(
            order.package
        );


    const userRef =
        db
            .collection("users")
            .doc(order.userId);


    const userSnap =
        await userRef.get();


    if (!userSnap.exists) {

        throw new Error(
            "Không tìm thấy user"
        );

    }


    const user =
        userSnap.data();


    // ------------------------------------------------------
    // TÍNH THỜI HẠN
    // ------------------------------------------------------

    const now =
        new Date();


    let startDate =
        now;


    // Nếu user đã có Premium còn hạn,
    // nối tiếp từ ngày hết hạn hiện tại.
    if (user.premiumUntil) {

        const currentUntil =
            user.premiumUntil.toDate
                ? user.premiumUntil.toDate()
                : new Date(
                    user.premiumUntil
                );


        if (
            !Number.isNaN(
                currentUntil.getTime()
            ) &&
            currentUntil > now
        ) {

            startDate =
                currentUntil;

        }

    }


    const premiumUntil =
        new Date(startDate);


    premiumUntil.setMonth(
        premiumUntil.getMonth() +
        pkg.durationMonths
    );


    // ------------------------------------------------------
    // UPDATE USER
    // ------------------------------------------------------

    await userRef.update({

        plan:
            pkg.name,

        premiumUntil:
            premiumUntil,

        premiumUpdatedAt:
            new Date(),

        premiumSource:
            "sepay",

        premiumOrderId:
            order.orderId

    });


    console.log(
        `💎 Premium activated: ${order.userId} → ${pkg.name}`
    );


    return {

        plan:
            pkg.name,

        premiumUntil

    };

}


// ==========================================================
// EXPRESS ROUTES
// ==========================================================

function registerSePayRoutes(
    app,
    db,
    admin
) {

    // ======================================================
    // CREATE PAYMENT
    // ======================================================

    app.post(
        "/api/payment/create",

        express.json(),

        async (req, res) => {

            try {

                const {

                    package: packageId,

                    // Giữ amount để tương thích
                    // client cũ nhưng KHÔNG tin nó.
                    amount,

                    description,

                    customer_id,

                    success_url,

                    error_url,

                    cancel_url

                } = req.body || {};


                // ------------------------------------------
                // AUTH
                // ------------------------------------------
let user = req.session?.user;

console.log("========== 💳 PAYMENT AUTH ==========");
console.log(
    "Session user:",
    user
        ? `${user.uid}`
        : "NONE"
);

const authHeader =
    req.headers.authorization;

console.log(
    "Authorization:",
    authHeader
        ? "Bearer PRESENT"
        : "MISSING"
);


if (!user && authHeader?.startsWith("Bearer ")) {

    try {

        const token =
            authHeader.substring(7);

        console.log(
            "🔐 Firebase token received:",
            token.length,
            "characters"
        );

        const decoded =
            await admin
                .auth()
                .verifyIdToken(token);

        console.log(
            "✅ Firebase token valid:",
            decoded.uid
        );

        user = {
            uid: decoded.uid
        };

    } catch (err) {

        console.error(
            "❌ Firebase verifyIdToken FAILED:",
            err
        );

        return res.status(401).json({

            success: false,

            message:
                "Firebase token không hợp lệ",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : err.message

        });

    }

}


if (!user) {

    return res.status(401).json({

        success: false,

        message: "Chưa đăng nhập"

    });

}


                // ------------------------------------------
                // PACKAGE
                // ------------------------------------------

                if (!packageId) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Thiếu package"

                    });

                }


                const pkg =
                    getPremiumPackage(
                        packageId
                    );


                // ------------------------------------------
                // 🔐 SERVER-SIDE PRICE
                // ------------------------------------------

                const serverAmount =
                    pkg.amount;


                // ------------------------------------------
                // OPTIONAL: PHÁT HIỆN CLIENT GỬI SAI GIÁ
                // ------------------------------------------

                if (
                    amount !== undefined &&
                    Number(amount) !== serverAmount
                ) {

                    console.warn(
                        "⚠️ Client gửi amount không khớp:",
                        {
                            packageId,
                            clientAmount: amount,
                            serverAmount
                        }
                    );

                }


                // ------------------------------------------
                // CREATE INVOICE
                // ------------------------------------------

                const invoice =
                    generateOrderInvoice();


                // ------------------------------------------
                // CUSTOM DATA
                // ------------------------------------------

                const customData =
                    JSON.stringify({

                        type:
                            "premium",

                        package:
                            packageId

                    });


                // ------------------------------------------
                // CREATE CHECKOUT
                // ------------------------------------------

                const result =
                    await createCheckout({

                        order_invoice_number:
                            invoice,

                        order_amount:
                            serverAmount,

                        order_description:
                            description ||
                            `HydYar - ${pkg.name}`,

                        customer_id:
                            customer_id ||
                            user.uid,

                        success_url:
                            success_url,

                        error_url:
                            error_url,

                        cancel_url:
                            cancel_url,

                        custom_data:
                            customData

                    });


                // ------------------------------------------
                // SAVE ORDER
                // ------------------------------------------

                await db
                    .collection("paymentOrders")
                    .doc(invoice)
                    .set({

                        orderId:
                            invoice,

                        userId:
                            user.uid,

                        hydyarId:
                            user.id || null,

                        package:
                            packageId,

                        packageName:
                            pkg.name,

                        amount:
                            serverAmount,

                        currency:
                            "VND",

                        status:
                            "pending",

                        provider:
                            "sepay",

                        environment:
                            SEPAY_ENV,

                        createdAt:
                            new Date(),

                        paidAt:
                            null,

                        premiumActivated:
                            false

                    });


                console.log(
                    `🧾 Payment order created: ${invoice}`
                );


                // ------------------------------------------
                // RESPONSE
                // ------------------------------------------

                return res.json({

                    success:
                        true,

                    checkoutURL:
                        result.checkoutURL,

                    fields:
                        result.fields,

                    order_invoice_number:
                        invoice,

                    order_amount:
                        serverAmount

                });

            } catch (err) {

                console.error(
                    "❌ SePay Create Payment Error:",
                    err
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        err.message ||
                        "Không thể tạo thanh toán"

                });

            }

        }
    );


    // ======================================================
    // PAYMENT STATUS
    // ======================================================

    app.get(
    "/api/payment/status/:orderId",
    async (req, res) => {

        try {

            const orderId =
                req.params.orderId;


            // ==========================================
            // 🔐 AUTH
            // ==========================================

            let user =
                req.session?.user;


            // Nếu không có session → thử Firebase token
            if (!user) {

                const authHeader =
                    req.headers.authorization;

                if (
                    authHeader &&
                    authHeader.startsWith("Bearer ")
                ) {

                    try {

                        const token =
                            authHeader.substring(7);

                        const decoded =
                            await admin
                                .auth()
                                .verifyIdToken(token);

                        user = {
                            uid: decoded.uid
                        };

                    } catch (err) {

                        console.error(
                            "❌ Payment Status Firebase Auth Error:",
                            err.message
                        );

                        return res.status(401).json({

                            success: false,

                            message:
                                "Firebase token không hợp lệ"

                        });

                    }

                }

            }


            // Không có cả session lẫn Firebase token
            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Chưa đăng nhập"

                });

            }


            // ==========================================
            // 📦 LOAD ORDER
            // ==========================================

            const snap =
                await db
                    .collection("paymentOrders")
                    .doc(orderId)
                    .get();


            if (!snap.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Không tìm thấy đơn thanh toán"

                });

            }


            const order =
                snap.data();


            // ==========================================
            // 🔐 OWNERSHIP CHECK
            // ==========================================

            if (
                order.userId !== user.uid
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Không có quyền xem đơn này"

                });

            }


            // ==========================================
            // 📤 RESPONSE
            // ==========================================

            return res.json({

                success: true,

                order: {

                    orderId:
                        order.orderId,

                    package:
                        order.package,

                    packageName:
                        order.packageName,

                    amount:
                        order.amount,

                    currency:
                        order.currency,

                    status:
                        order.status,

                    premiumActivated:
                        Boolean(
                            order.premiumActivated
                        ),

                    paidAt:
                        order.paidAt || null

                }

            });

        } catch (err) {

            console.error(
                "❌ Payment Status Error:",
                err
            );

            return res.status(500).json({

                success: false,

                message:
                    "Không thể kiểm tra thanh toán"

            });

        }

    }
);


    // ======================================================
    // 🔔 SEPAY WEBHOOK
    // ======================================================
    //
    // QUAN TRỌNG:
    // Dùng express.raw() để lấy RAW BODY cho HMAC verify.
    // Route này phải được đăng ký TRƯỚC
    // app.use(express.json()) ở server.js.
    //
    // ======================================================

    // ======================================================
// 🔔 SEPAY WEBHOOK
// ======================================================

app.post(
    "/api/payment/sepay/webhook",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

        console.log("");
        console.log("==========================================");
        console.log("🚨🚨🚨 SEPAY WEBHOOK ĐÃ VÀO SERVER 🚨🚨🚨");
        console.log("==========================================");

        try {

            // ==================================================
            // 🔍 DEBUG REQUEST
            // ==================================================

            console.log(
                "📍 Method:",
                req.method
            );

            console.log(
                "📍 URL:",
                req.originalUrl
            );

            console.log(
                "📍 Content-Type:",
                req.headers["content-type"] || "MISSING"
            );

            console.log(
                "🔐 Signature:",
                req.headers["x-sepay-signature"]
                    ? "PRESENT"
                    : "MISSING"
            );

            console.log(
                "⏱️ Timestamp:",
                req.headers["x-sepay-timestamp"]
                    ? "PRESENT"
                    : "MISSING"
            );


            // ==================================================
            // RAW BODY
            // ==================================================

            if (!Buffer.isBuffer(req.body)) {

                console.error(
                    "❌ req.body không phải Buffer!"
                );

                console.error(
                    "Body type:",
                    typeof req.body
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Webhook body không hợp lệ"

                });

            }


            const rawBody =
                req.body.toString("utf8");


            console.log(
                "📦 Raw body length:",
                rawBody.length
            );

            console.log(
                "📦 Raw body:",
                rawBody
            );


            if (!rawBody) {

                console.error(
                    "❌ Webhook body rỗng"
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Empty body"

                });

            }


            // ==================================================
            // HMAC HEADERS
            // ==================================================

            const signature =
                req.headers[
                    "x-sepay-signature"
                ];

            const timestamp =
                req.headers[
                    "x-sepay-timestamp"
                ];


            console.log(
                "🔐 HMAC secret configured:",
                SEPAY_WEBHOOK_SECRET
                    ? "YES"
                    : "NO"
            );


            if (!signature) {

                console.error(
                    "❌ Thiếu X-SePay-Signature"
                );

                return res.status(401).json({

                    success: false,

                    message:
                        "Missing signature"

                });

            }


            if (!timestamp) {

                console.error(
                    "❌ Thiếu X-SePay-Timestamp"
                );

                return res.status(401).json({

                    success: false,

                    message:
                        "Missing timestamp"

                });

            }


            // ==================================================
            // VERIFY HMAC
            // ==================================================

            console.log(
                "🔐 Đang xác minh HMAC..."
            );


            const valid =
                verifyWebhookSignature(
                    rawBody,
                    signature,
                    timestamp
                );


            if (!valid) {

                console.error(
                    "🚨 HMAC INVALID"
                );

                console.error(
                    "Signature:",
                    signature
                );

                console.error(
                    "Timestamp:",
                    timestamp
                );

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid signature"

                });

            }


            console.log(
                "✅ HMAC hợp lệ"
            );


            // ==================================================
            // PARSE JSON
            // ==================================================

            let data;


            try {

                data =
                    JSON.parse(
                        rawBody
                    );

            } catch (err) {

                console.error(
                    "❌ JSON webhook không hợp lệ:",
                    err
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid JSON"

                });

            }


            console.log(
                "🔔 SePay Webhook DATA:"
            );

            console.log(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );


            // ==================================================
            // ONLY MONEY IN
            // ==================================================

            if (
                data.transferType &&
                data.transferType !== "in"
            ) {

                console.log(
                    "ℹ️ Bỏ qua giao dịch tiền ra:",
                    data.transferType
                );

                return res.json({

                    success: true,

                    ignored: true,

                    reason:
                        "transferType_not_in"

                });

            }


            // ==================================================
            // FIND HYDYAR ORDER
            // ==================================================

            console.log(
                "🔎 Đang tìm HY order ID..."
            );


            const orderId =
                extractOrderId(data);


            console.log(
                "🆔 Extracted orderId:",
                orderId || "NONE"
            );


            if (!orderId) {

                console.warn(
                    "⚠️ Không tìm thấy HY order ID trong webhook"
                );

                console.warn(
                    "📦 Các field nhận được:",
                    Object.keys(data)
                );

                return res.json({

                    success: true,

                    ignored: true,

                    reason:
                        "order_not_found"

                });

            }


            // ==================================================
            // LOAD ORDER
            // ==================================================

            console.log(
                "📦 Đang tải payment order:",
                orderId
            );


            const orderRef =
                db
                    .collection("paymentOrders")
                    .doc(orderId);


            const orderSnap =
                await orderRef.get();


            if (!orderSnap.exists) {

                console.warn(
                    "⚠️ Webhook order không tồn tại:",
                    orderId
                );

                return res.json({

                    success: true,

                    ignored: true,

                    reason:
                        "order_not_exists"

                });

            }


            const order =
                orderSnap.data();


            console.log(
                "📄 Payment order:",
                JSON.stringify(
                    order,
                    null,
                    2
                )
            );


            // ==================================================
            // IDEMPOTENCY
            // ==================================================

            if (
                order.status === "paid" &&
                order.premiumActivated === true
            ) {

                console.log(
                    "♻️ Order đã được xử lý:",
                    orderId
                );

                return res.json({

                    success: true,

                    alreadyProcessed: true

                });

            }


            // ==================================================
            // AMOUNT
            // ==================================================

            const transferAmount =
                Number(
                    data.transferAmount
                );


            console.log(
                "💰 Transfer amount:",
                transferAmount
            );

            console.log(
                "💰 Expected amount:",
                order.amount
            );


            if (
                !Number.isFinite(
                    transferAmount
                )
            ) {

                console.error(
                    "❌ transferAmount không hợp lệ"
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid transfer amount"

                });

            }


            // ==================================================
            // EXACT AMOUNT
            // ==================================================

            if (
                transferAmount !==
                Number(order.amount)
            ) {

                console.error(
                    "❌ SAI SỐ TIỀN"
                );

                console.error({

                    orderId,

                    expected:
                        order.amount,

                    received:
                        transferAmount

                });


                await orderRef.update({

                    status:
                        "amount_mismatch",

                    webhookReceivedAt:
                        new Date()

                });


                return res.status(400).json({

                    success: false,

                    message:
                        "Số tiền không khớp"

                });

            }


            console.log(
                "✅ Số tiền chính xác"
            );


            // ==================================================
            // MARK PAID
            // ==================================================

            console.log(
                "💳 Đang đánh dấu order PAID..."
            );


            await orderRef.update({

                status:
                    "paid",

                paidAt:
                    new Date(),

                sepayTransactionId:
                    data.id || null,

                sepayReferenceCode:
                    data.referenceCode ||
                    null,

                webhookReceivedAt:
                    new Date()

            });


            console.log(
                "✅ Order đã chuyển sang PAID:",
                orderId
            );


            // ==================================================
            // ACTIVATE PREMIUM
            // ==================================================

            console.log(
                "💎 Đang kích hoạt Premium..."
            );


            const activation =
                await activatePremium(
                    db,
                    {
                        ...order,
                        orderId
                    }
                );


            console.log(
                "💎 Premium activation:",
                activation
            );


            // ==================================================
            // MARK ACTIVATED
            // ==================================================

            await orderRef.update({

                premiumActivated:
                    true,

                premiumActivatedAt:
                    new Date(),

                activatedPlan:
                    activation.plan

            });


            console.log(
                "✅ Premium đã kích hoạt:"
            );

            console.log({

                orderId,

                userId:
                    order.userId,

                plan:
                    activation.plan,

                premiumUntil:
                    activation.premiumUntil

            });


            // ==================================================
            // SUCCESS
            // ==================================================

            console.log(
                "🎉 PAYMENT COMPLETED:",
                orderId
            );

            console.log(
                "=========================================="
            );


            return res.json({

                success: true,

                status:
                    "paid",

                premiumActivated:
                    true

            });


        } catch (err) {

            console.error("");
            console.error(
                "❌❌❌ SEPAY WEBHOOK ERROR ❌❌❌"
            );

            console.error(
                err
            );

            console.error(
                err?.stack
            );

            console.error(
                "=========================================="
            );


            return res.status(500).json({

                success: false,

                message:
                    "Webhook processing error"

            });

        }

    }
);


    // ======================================================
    // HEALTH CHECK
    // ======================================================

    app.get(
        "/api/payment/sepay/status",
        async (req, res) => {

            try {

                await getSePayClient();

                return res.json({

                    success:
                        true,

                    provider:
                        "SePay",

                    environment:
                        SEPAY_ENV,

                    configured:
                        Boolean(
                            SEPAY_MERCHANT_ID &&
                            SEPAY_SECRET_KEY
                        ),

                    webhookConfigured:
                        Boolean(
                            SEPAY_WEBHOOK_SECRET
                        )

                });

            } catch (err) {

                return res.status(500).json({

                    success:
                        false,

                    provider:
                        "SePay",

                    message:
                        "SePay chưa sẵn sàng"

                });

            }

        }
    );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getSePayClient,

    createCheckout,

    generateOrderInvoice,

    registerSePayRoutes,

    getPremiumPackage,

    PREMIUM_PACKAGES

};