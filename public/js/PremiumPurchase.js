// ==============================================
// PREMIUM PURCHASE
// Tách rõ Logic và UI trong cùng 1 file
// ==============================================


// ==============================================
// 🔧 LOGIC LAYER
// Nghiệp vụ thuần túy: quản lý gói, validate, gọi API
// KHÔNG đụng DOM, KHÔNG phụ thuộc trình duyệt
// ==============================================

class PremiumPurchaseLogic {

    constructor() {

        this.selectedPackage = null;

        this.packages = {

            premium: {
                name: "Premium",
                price: 30000,
                duration: "1 tháng"
            },

            "premium-plus": {
                name: "Premium+",
                price: 300000,
                duration: "1 năm"
            },

            ultra: {
                name: "Ultra",
                price: null,
                duration: "Đang cập nhật"
            }

        };

    }


    // ==========================================
    // 📦 LẤY THÔNG TIN GÓI
    // ==========================================

    getPackage(packageId) {

        const pkg = this.packages[packageId];

        if (!pkg) {
            console.warn(
                "[PremiumPurchase] Không tìm thấy gói:",
                packageId
            );
            return null;
        }

        return pkg;

    }


    // ==========================================
    // ✅ CHỌN GÓI
    // ==========================================

    selectPackage(packageId) {

        const pkg = this.getPackage(packageId);

        if (!pkg) return false;

        this.selectedPackage = packageId;

        return {
            packageId,
            ...pkg
        };

    }


    // ==========================================
    // 🔍 KIỂM TRA GÓI CÓ THỂ THANH TOÁN
    // ==========================================

    canPay(packageId = this.selectedPackage) {

        const pkg = this.getPackage(packageId);

        if (!pkg) {
            return {
                ok: false,
                error: "Không tìm thấy gói."
            };
        }

        if (
            pkg.price === null ||
            !Number.isInteger(pkg.price) ||
            pkg.price <= 0
        ) {
            return {
                ok: false,
                error: "Gói này hiện chưa hỗ trợ thanh toán."
            };
        }

        return {
            ok: true,
            pkg
        };

    }


    // ==========================================
    // 💎 THANH TOÁN INUMI
    // ==========================================

    payWithInumi() {

        if (!this.selectedPackage) return;

        console.log(
            "Thanh toán Inumi:",
            this.selectedPackage
        );

        return {
            method: "inumi",
            packageId: this.selectedPackage
        };

    }


    // ==========================================
    // 💳 GỌI API TẠO THANH TOÁN SEPAY
    // ==========================================

async createSePayPayment(packageId = this.selectedPackage) {

    // ==========================================
    // 🔍 KIỂM TRA GÓI
    // ==========================================

    const check = this.canPay(packageId);

    if (!check.ok) {
        throw new Error(check.error);
    }

    const { pkg } = check;


    // ==========================================
    // 🔐 LẤY FIREBASE USER
    // ==========================================

    const currentUser = auth.currentUser;

    if (!currentUser) {

        throw new Error(
            "Chưa đăng nhập Firebase"
        );

    }


    // ==========================================
    // 🎫 LẤY FIREBASE ID TOKEN
    // ==========================================

    const token =
        await currentUser.getIdToken();


    // ==========================================
    // 💳 GỌI SERVER
    // ==========================================

    const response = await fetch(
        "https://wiki-hydyar.onrender.com/api/payment/create",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                // 🔐 Gửi Firebase token
                "Authorization":
                    `Bearer ${token}`
            },

            // Giữ lại session nếu có
            credentials: "include",

            body: JSON.stringify({

                // 🔐 Server tự quyết định giá
                package:
                    packageId,

                success_url:
                    `${location.origin}/?payment=success`,

                error_url:
                    `${location.origin}/?payment=error`,

                cancel_url:
                    `${location.origin}/?payment=cancel`

            })
        }
    );


    // ==========================================
    // 📦 ĐỌC RESPONSE
    // ==========================================

    const data =
        await response.json();


    // ==========================================
    // ❌ API ERROR
    // ==========================================

    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.message ||
            "Không thể tạo thanh toán"
        );

    }


    // ==========================================
    // 🔎 KIỂM TRA CHECKOUT
    // ==========================================

    if (
        !data.checkoutURL ||
        !data.fields
    ) {

        throw new Error(
            "SePay không trả về dữ liệu checkout"
        );

    }


    // ==========================================
    // 🧾 LOG
    // ==========================================

    console.log(
        "💳 SePay Checkout:",
        data
    );


    return data;

}

    // ==========================================
    // 🚀 TẠO FORM SUBMIT SEPAY
    // ==========================================

    buildSePayForm(checkoutURL, fields) {

        const form = document.createElement("form");

        form.method = "POST";
        form.action = checkoutURL;
        form.style.display = "none";

        Object.entries(fields).forEach(([key, value]) => {

            if (value === undefined || value === null) return;

            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value =
                typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);

            form.appendChild(input);

        });

        return form;

    }

}


// ==============================================
// 🎨 UI LAYER
// Chịu trách nhiệm render modal, bind sự kiện DOM,
// show/hide loading, đóng modal
// KHÔNG chứa logic nghiệp vụ, gọi API
// ==============================================

class PremiumPurchaseUI {

    constructor() {
        this.onSelectPackage = null;   // callback(packageId)
        this.onSelectPayment = null;   // callback(method)
        this.onClose = null;           // callback()
    }


    // ==========================================
    // 🖱️ BIND NÚT CHỌN GÓI (toàn trang)
    // ==========================================

    bindPackageButtons() {

        document.addEventListener("click", e => {

            const button = e.target.closest(
                ".premium-plan-button[data-package]"
            );

            if (!button) return;

            e.preventDefault();

            const packageId = button.dataset.package;

            if (typeof this.onSelectPackage === "function") {
                this.onSelectPackage(packageId);
            }

        });

    }


    // ==========================================
    // 🎨 RENDER MODAL
    // ==========================================

    render(pkg) {

        this.close();

        const modal = document.createElement("div");
        modal.id = "premiumPurchaseModal";
        modal.className = "premium-purchase-modal";

        modal.innerHTML = `

            <div class="premium-purchase-overlay"
                 data-close="true">
            </div>

            <div class="premium-purchase">

                <div class="premium-purchase-header">

                    <div>
                        <span>Nâng cấp thành viên</span>
                        <h2>${pkg.name}</h2>
                    </div>

                    <button
                        class="premium-purchase-close"
                        type="button"
                        data-close="true"
                    >
                        ✕
                    </button>

                </div>


                <div class="premium-purchase-info">

                    <div>
                        <span>Gói</span>
                        <strong>${pkg.name}</strong>
                    </div>

                    <div>
                        <span>Thời hạn</span>
                        <strong>${pkg.duration}</strong>
                    </div>

                    <div>
                        <span>Giá</span>
                        <strong>
                            ${
                                pkg.price === null
                                ? "Liên hệ"
                                : `${pkg.price.toLocaleString("vi-VN")}đ`
                            }
                        </strong>
                    </div>

                </div>


                <div class="premium-purchase-methods">

                    <h3>Phương thức thanh toán</h3>

                    <button
                        class="premium-payment-method"
                        data-method="inumi"
                        type="button"
                    >
                        <span>💎</span>
                        <div>
                            <strong>Thanh toán bằng Inumi</strong>
                            <small>Sử dụng số dư Inumi</small>
                        </div>
                    </button>

                    <button
                        class="premium-payment-method"
                        data-method="deposit"
                        type="button"
                    >
                        <span>💳</span>
                        <div>
                            <strong>Nạp tiền</strong>
                            <small>Thanh toán qua SePay</small>
                        </div>
                    </button>

                </div>


                <div class="premium-purchase-footer">

                    <button
                        class="premium-purchase-cancel"
                        type="button"
                        data-close="true"
                    >
                        Hủy
                    </button>

                </div>

            </div>

        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add("show");
        });

        this._bindModalEvents(modal);

    }


    // ==========================================
    // 🖱️ BIND SỰ KIỆN TRONG MODAL
    // ==========================================

    _bindModalEvents(modal) {

        modal.addEventListener("click", e => {

            const close = e.target.closest("[data-close]");

            if (close) {
                this.close();
                if (typeof this.onClose === "function") {
                    this.onClose();
                }
                return;
            }

            const method = e.target.closest(
                ".premium-payment-method"
            );

            if (!method) return;

            if (typeof this.onSelectPayment === "function") {
                this.onSelectPayment(method.dataset.method);
            }

        });

    }


    // ==========================================
    // ⏳ SHOW LOADING
    // ==========================================

    showPaymentLoading() {

        this.hidePaymentLoading();

        const loading = document.createElement("div");
        loading.id = "sepayPaymentLoading";
        loading.className = "premium-payment-loading";

        loading.innerHTML = `
            <div class="premium-payment-loading-box">
                <div class="premium-payment-spinner">⏳</div>
                <strong>Đang tạo thanh toán...</strong>
                <small>Vui lòng chờ một chút</small>
            </div>
        `;

        document.body.appendChild(loading);

    }


    // ==========================================
    // ❌ HIDE LOADING
    // ==========================================

    hidePaymentLoading() {

        const loading = document.getElementById(
            "sepayPaymentLoading"
        );

        if (loading) loading.remove();

    }


    // ==========================================
    // 🚀 SUBMIT FORM (SePay)
    // ==========================================

    submitForm(formElement) {

        document.body.appendChild(formElement);
        formElement.submit();

    }


    // ==========================================
    // ❌ CLOSE MODAL
    // ==========================================

    close() {

        const modal = document.getElementById(
            "premiumPurchaseModal"
        );

        if (!modal) return;

        modal.classList.remove("show");

        setTimeout(() => {
            modal.remove();
        }, 200);

    }


    // ==========================================
    // ⚠️ SHOW ERROR
    // ==========================================

    showError(message) {

        alert(
            "Không thể tạo thanh toán.\n\n" +
            (message || "Vui lòng thử lại sau.")
        );

    }


    // ==========================================
    // ℹ️ SHOW INFO
    // ==========================================

    showInfo(message) {
        alert(message);
    }

}


// ==============================================
// 🔗 MAIN CLASS (ĐIỀU PHỐI)
// Kết nối Logic layer và UI layer
// ==============================================

export default class PremiumPurchase {

    constructor(app) {

        this.app = app;

        // Khởi tạo 2 layer độc lập
        this.logic = new PremiumPurchaseLogic();
        this.ui = new PremiumPurchaseUI();

        // Kết nối UI events → Logic
        this._bindUIActions();

    }


    // ==========================================
    // 🔗 KẾT NỐI UI VÀ LOGIC
    // ==========================================

    _bindUIActions() {

        // User click nút chọn gói → Logic chọn gói → UI render modal
        this.ui.onSelectPackage = (packageId) => {
            this.open(packageId);
        };

        // User chọn phương thức thanh toán → xử lý tương ứng
        this.ui.onSelectPayment = (method) => {
            this.selectPayment(method);
        };

    }


    // ==========================================
    // 🚀 INIT
    // ==========================================

    init() {
        this.ui.bindPackageButtons();
    }


    // ==========================================
    // 📦 OPEN MODAL THEO GÓI
    // ==========================================

    open(packageId) {

        const result = this.logic.selectPackage(packageId);

        if (!result) return;

        // UI chỉ nhận dữ liệu gói, không biết logic bên trong
        this.ui.render({
            name: result.name,
            price: result.price,
            duration: result.duration
        });

    }


    // ==========================================
    // 💳 CHỌN PHƯƠNG THỨC THANH TOÁN
    // ==========================================

    selectPayment(method) {

        if (!this.logic.selectedPackage) return;

        if (method === "inumi") {
            this._handleInumiPayment();
            return;
        }

        if (method === "deposit") {
            this._handleSePayPayment();
        }

    }


    // ==========================================
    // 💎 XỬ LÝ THANH TOÁN INUMI
    // ==========================================

    _handleInumiPayment() {

        const result = this.logic.payWithInumi();

        if (result) {
            this.ui.showInfo(
                "Phần thanh toán bằng Inumi sẽ được kết nối với máy chủ."
            );
        }

    }


    // ==========================================
    // 💳 XỬ LÝ THANH TOÁN SEPAY
    // ==========================================

    async _handleSePayPayment() {

        // Đóng modal
        this.ui.close();

        // Show loading
        this.ui.showPaymentLoading();

        try {

            // Gọi API qua Logic layer
            const data = await this.logic.createSePayPayment();

            // Build form qua Logic, submit qua UI
            const form = this.logic.buildSePayForm(
                data.checkoutURL,
                data.fields
            );

            this.ui.submitForm(form);

        } catch (error) {

            console.error(
                "❌ SePay Payment Error:",
                error
            );

            this.ui.hidePaymentLoading();
            this.ui.showError(error.message);

        }

    }


    // ==========================================
    // ❌ CLOSE MODAL (public API)
    // ==========================================

    close() {
        this.ui.close();
    }

}