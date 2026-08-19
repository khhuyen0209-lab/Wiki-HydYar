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
    db
) {

    // ======================================================
    // CREATE PAYMENT
    // ======================================================

    app.post(
        "/api/payment/create",
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

                const user =
                    req.session?.user;


                if (!user) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Chưa đăng nhập"

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


                const snap =
                    await db
                        .collection("paymentOrders")
                        .doc(orderId)
                        .get();


                if (!snap.exists) {

                    return res.status(404).json({

                        success:
                            false,

                        message:
                            "Không tìm thấy đơn thanh toán"

                    });

                }


                const order =
                    snap.data();


                // Không cho user xem order
                // của người khác.
                const user =
                    req.session?.user;


                if (
                    !user ||
                    order.userId !== user.uid
                ) {

                    return res.status(403).json({

                        success:
                            false,

                        message:
                            "Không có quyền xem đơn này"

                    });

                }


                return res.json({

                    success:
                        true,

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

                    success:
                        false,

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
    // Route này phải được đăng ký TRƯỚC
    // app.use(express.json()).
    //
    // Vì HMAC cần RAW BODY.
    //
    // ======================================================

    app.post(
        "/api/payment/sepay/webhook",

        requireRawBodyMiddleware,

        async (req, res) => {

            try {

                const rawBody =
                    req.body.toString("utf8");


                if (!rawBody) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Empty body"

                    });

                }


                const signature =
                    req.headers[
                        "x-sepay-signature"
                    ];


                const timestamp =
                    req.headers[
                        "x-sepay-timestamp"
                    ];


                // ------------------------------------------
                // VERIFY HMAC
                // ------------------------------------------

                const valid =
                    verifyWebhookSignature(

                        rawBody,

                        signature,

                        timestamp

                    );


                if (!valid) {

                    console.warn(
                        "🚨 SePay webhook signature invalid"
                    );

                    return res.status(401).json({

                        success:
                            false,

                        message:
                            "Invalid signature"

                    });

                }


                // ------------------------------------------
                // PARSE JSON
                // ------------------------------------------

                let data;


                try {

                    data =
                        JSON.parse(
                            rawBody
                        );

                } catch {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Invalid JSON"

                    });

                }


                console.log(
                    "🔔 SePay Webhook:",
                    data
                );


                // ------------------------------------------
                // ONLY MONEY IN
                // ------------------------------------------

                if (
                    data.transferType &&
                    data.transferType !== "in"
                ) {

                    return res.json({

                        success:
                            true,

                        ignored:
                            true

                    });

                }


                // ------------------------------------------
                // FIND ORDER
                // ------------------------------------------

                const orderId =
                    extractOrderId(data);


                if (!orderId) {

                    console.warn(
                        "⚠️ Không tìm thấy HY order ID trong webhook"
                    );

                    // Không phải order của HydYar.
                    return res.json({

                        success:
                            true,

                        ignored:
                            true

                    });

                }


                // ------------------------------------------
                // LOAD ORDER
                // ------------------------------------------

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

                        success:
                            true,

                        ignored:
                            true

                    });

                }


                const order =
                    orderSnap.data();


                // ------------------------------------------
                // IDEMPOTENCY
                // ------------------------------------------

                if (
                    order.status === "paid" &&
                    order.premiumActivated === true
                ) {

                    return res.json({

                        success:
                            true,

                        alreadyProcessed:
                            true

                    });

                }


                // ------------------------------------------
                // AMOUNT
                // ------------------------------------------

                const transferAmount =
                    Number(
                        data.transferAmount
                    );


                if (
                    !Number.isFinite(
                        transferAmount
                    )
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Invalid transfer amount"

                    });

                }


                // ------------------------------------------
                // EXACT AMOUNT
                // ------------------------------------------

                if (
                    transferAmount !==
                    Number(order.amount)
                ) {

                    console.error(
                        "❌ Sai số tiền:",
                        {
                            orderId,
                            expected:
                                order.amount,
                            received:
                                transferAmount
                        }
                    );


                    await orderRef.update({

                        status:
                            "amount_mismatch",

                        webhookReceivedAt:
                            new Date()

                    });


                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Số tiền không khớp"

                    });

                }


                // ------------------------------------------
                // MARK PAID
                // ------------------------------------------

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


                // ------------------------------------------
                // ACTIVATE PREMIUM
                // ------------------------------------------

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
                    `🎉 Payment completed: ${orderId}`
                );


                return res.json({

                    success:
                        true,

                    status:
                        "paid"

                });

            } catch (err) {

                console.error(
                    "❌ SePay Webhook Error:",
                    err
                );

                return res.status(500).json({

                    success:
                        false,

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
// RAW BODY MIDDLEWARE
// ==========================================================
//
// SePay ký trên raw body.
// KHÔNG JSON.parse trước khi verify.
//
// ==========================================================

function requireRawBodyMiddleware(
    req,
    res,
    next
) {

    // Nếu body đã được parse bởi express.json()
    // thì không thể khôi phục chính xác raw bytes.
    //
    // Middleware này đọc raw body trực tiếp.

    let chunks = [];


    req.on("data", chunk => {

        chunks.push(chunk);

    });


    req.on("end", () => {

        req.body =
            Buffer.concat(chunks);

        next();

    });


    req.on("error", err => {

        console.error(
            "❌ Raw body error:",
            err
        );

        res.status(400).json({

            success:
                false,

            message:
                "Invalid request body"

        });

    });

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