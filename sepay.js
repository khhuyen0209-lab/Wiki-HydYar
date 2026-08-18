// ==========================================================
// 💳 HYDYAR — SEPAY PAYMENT MODULE
// ==========================================================
// SePay PG Node.js SDK
// Package: sepay-pg-node
//
// Chức năng:
// - Khởi tạo SePay PG client
// - Tạo checkout form
// - Tạo order invoice
// - Chuẩn bị dữ liệu cho frontend
//
// ⚠️ SECRET KEY CHỈ ĐƯỢC DÙNG Ở SERVER
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

    // Tránh nhiều request cùng lúc tạo nhiều client
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
                    "Không tìm thấy SePayPgClient trong sepay-pg-node"
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
    // VALIDATE
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

    const amount =
        validateAmount(order_amount);


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

                // SePay hiện yêu cầu PURCHASE
                operation:
                    "PURCHASE",

                // Chuyển khoản ngân hàng
                payment_method:
                    "BANK_TRANSFER",

                // Invoice duy nhất
                order_invoice_number:
                    invoice,

                // VND
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

                custom_data:
                    custom_data || undefined

            });


    // ------------------------------------------------------
    // RESULT
    // ------------------------------------------------------

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
// EXPRESS ROUTES
// ==========================================================

function registerSePayRoutes(app) {

    // ======================================================
    // CREATE PAYMENT
    // ======================================================

    app.post(
        "/api/payment/create",
        async (req, res) => {

            try {

                const {

                    amount,
                    description,
                    customer_id,
                    success_url,
                    error_url,
                    cancel_url,
                    custom_data

                } = req.body;


                // ------------------------------------------
                // BASIC VALIDATION
                // ------------------------------------------

                if (
                    amount === undefined ||
                    amount === null
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Thiếu số tiền"

                    });

                }


                // ------------------------------------------
                // CREATE CHECKOUT
                // ------------------------------------------

                const result =
                    await createCheckout({

                        order_amount:
                            amount,

                        order_description:
                            description,

                        customer_id,

                        success_url,

                        error_url,

                        cancel_url,

                        custom_data

                    });


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
                        result.order_invoice_number,

                    order_amount:
                        result.order_amount

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
                        "Không thể tạo thanh toán"

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

    registerSePayRoutes

};