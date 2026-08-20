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
// 🔔 SEPAY PG IPN
// ======================================================

app.post(
    "/api/payment/sepay/webhook",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

        console.log("");
        console.log("==========================================");
        console.log("🚨 SEPAY PG IPN ĐÃ VÀO SERVER");
        console.log("==========================================");

        try {

            // ------------------------------------------
            // RAW BODY
            // ------------------------------------------

            const rawBody =
                Buffer.isBuffer(req.body)
                    ? req.body.toString("utf8")
                    : JSON.stringify(req.body);


            console.log(
                "📦 Raw body:",
                rawBody
            );


            // ------------------------------------------
            // PARSE JSON
            // ------------------------------------------

            const data =
                JSON.parse(rawBody);


            console.log(
                "🔔 IPN DATA:"
            );

            console.log(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );


            // ------------------------------------------
            // CHECK NOTIFICATION TYPE
            // ------------------------------------------

            if (
                data.notification_type !==
                "ORDER_PAID"
            ) {

                console.log(
                    "ℹ️ Không phải ORDER_PAID:",
                    data.notification_type
                );

                return res.json({

                    success: true,

                    ignored: true

                });

            }


            // ------------------------------------------
            // GET ORDER ID
            // ------------------------------------------

            const orderId =
                data?.order?.order_invoice_number;


            console.log(
                "🆔 Order ID:",
                orderId
            );


            if (!orderId) {

                console.error(
                    "❌ Không tìm thấy order_invoice_number"
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Missing order invoice number"

                });

            }


            // ------------------------------------------
            // LOAD ORDER FROM FIRESTORE
            // ------------------------------------------

            const orderRef =
                db
                    .collection("paymentOrders")
                    .doc(orderId);


            const orderSnap =
                await orderRef.get();


            if (!orderSnap.exists) {

                console.error(
                    "❌ Không tìm thấy order:",
                    orderId
                );

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found"

                });

            }


            const order =
                orderSnap.data();


            console.log(
                "📄 Order found:",
                orderId
            );


            // ------------------------------------------
            // IDEMPOTENCY
            // ------------------------------------------

            if (
                order.premiumActivated === true
            ) {

                console.log(
                    "♻️ Order đã xử lý trước đó"
                );

                return res.json({

                    success: true,

                    alreadyProcessed: true

                });

            }


            // ------------------------------------------
            // CHECK PAYMENT STATUS
            // ------------------------------------------

            const orderStatus =
                data?.order?.order_status;

            const transactionStatus =
                data?.transaction?.transaction_status;


            console.log(
                "📊 Order status:",
                orderStatus
            );

            console.log(
                "📊 Transaction status:",
                transactionStatus
            );


            if (
                orderStatus !== "CAPTURED" ||
                transactionStatus !== "APPROVED"
            ) {

                console.warn(
                    "⚠️ Thanh toán chưa hoàn tất"
                );

                return res.json({

                    success: true,

                    ignored: true,

                    reason:
                        "payment_not_completed"

                });

            }


            // ------------------------------------------
            // CHECK AMOUNT
            // ------------------------------------------

            const receivedAmount =
                Number(
                    data
                        ?.transaction
                        ?.transaction_amount
                );


            console.log(
                "💰 Expected:",
                order.amount
            );

            console.log(
                "💰 Received:",
                receivedAmount
            );


            if (
                !Number.isFinite(
                    receivedAmount
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid transaction amount"

                });

            }


            if (
                receivedAmount !==
                Number(order.amount)
            ) {

                console.error(
                    "❌ SAI SỐ TIỀN!"
                );

                console.error({

                    expected:
                        order.amount,

                    received:
                        receivedAmount

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
                        "Amount mismatch"

                });

            }


            console.log(
                "✅ Số tiền hợp lệ"
            );


            // ------------------------------------------
            // CHECK CUSTOMER
            // ------------------------------------------

            const customerId =
                data?.customer?.customer_id;


            if (
                customerId &&
                customerId !== order.userId
            ) {

                console.error(
                    "❌ Customer không khớp!"
                );

                console.error({

                    expected:
                        order.userId,

                    received:
                        customerId

                });


                return res.status(400).json({

                    success: false,

                    message:
                        "Customer mismatch"

                });

            }


            console.log(
                "✅ Customer hợp lệ"
            );


            // ------------------------------------------
            // MARK AS PAID
            // ------------------------------------------

            await orderRef.update({

                status:
                    "paid",

                paidAt:
                    new Date(),

                sepayOrderId:
                    data?.order?.order_id ||
                    null,

                sepayTransactionId:
                    data?.transaction?.transaction_id ||
                    null,

                webhookReceivedAt:
                    new Date()

            });


            console.log(
                "💳 Order đã PAID"
            );


            // ------------------------------------------
            // ACTIVATE PREMIUM
            // ------------------------------------------

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


            // ------------------------------------------
            // MARK ACTIVATED
            // ------------------------------------------

            await orderRef.update({

                premiumActivated:
                    true,

                premiumActivatedAt:
                    new Date(),

                activatedPlan:
                    activation.plan

            });


            console.log(
                "🎉 PREMIUM ACTIVATED!"
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


            // ------------------------------------------
            // SUCCESS
            // ------------------------------------------

            return res.status(200).json({

                success: true,

                status: "paid",

                premiumActivated: true

            });

        } catch (err) {

            console.error(
                "❌ SEPAY IPN ERROR:"
            );

            console.error(err);
            console.error(err?.stack);


            return res.status(500).json({

                success: false,

                message:
                    "IPN processing error"

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