export default class PremiumPurchase {

    constructor(app) {

        this.app = app;

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
    // 🚀 INIT
    // ==========================================

    init() {

        this.bindPackageButtons();

    }


    // ==========================================
    // 🖱️ PACKAGE BUTTON
    // ==========================================

    bindPackageButtons() {

        document.addEventListener("click", e => {

            const button =
                e.target.closest(
                    ".premium-plan-button[data-package]"
                );

            if (!button) return;

            e.preventDefault();

            const packageId =
                button.dataset.package;

            this.open(packageId);

        });

    }


    // ==========================================
    // 📦 OPEN
    // ==========================================

    open(packageId) {

        const pkg =
            this.packages[packageId];

        if (!pkg) {

            console.warn(
                "[PremiumPurchase] Không tìm thấy gói:",
                packageId
            );

            return;

        }


        this.selectedPackage =
            packageId;


        this.render(pkg);

    }


    // ==========================================
    // 🎨 RENDER MODAL
    // ==========================================

    render(pkg) {

        this.close();


        const modal =
            document.createElement("div");

        modal.id =
            "premiumPurchaseModal";

        modal.className =
            "premium-purchase-modal";


        modal.innerHTML = `

            <div class="premium-purchase-overlay"
                 data-close="true">
            </div>


            <div class="premium-purchase">

                <div class="premium-purchase-header">

                    <div>

                        <span>
                            Nâng cấp thành viên
                        </span>

                        <h2>
                            ${pkg.name}
                        </h2>

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

                        <strong>
                            ${pkg.name}
                        </strong>

                    </div>


                    <div>

                        <span>Thời hạn</span>

                        <strong>
                            ${pkg.duration}
                        </strong>

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

                    <h3>
                        Phương thức thanh toán
                    </h3>


                    <button
                        class="premium-payment-method"
                        data-method="inumi"
                        type="button"
                    >

                        <span>
                            💎
                        </span>

                        <div>

                            <strong>
                                Thanh toán bằng Inumi
                            </strong>

                            <small>
                                Sử dụng số dư Inumi
                            </small>

                        </div>

                    </button>


                    <button
                        class="premium-payment-method"
                        data-method="deposit"
                        type="button"
                    >

                        <span>
                            💳
                        </span>

                        <div>

                            <strong>
                                Nạp tiền
                            </strong>

                            <small>
                                Nạp tiền rồi thanh toán
                            </small>

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


        this.bindModalEvents(modal);

    }


    // ==========================================
    // 🖱️ MODAL EVENTS
    // ==========================================

    bindModalEvents(modal) {

        modal.addEventListener("click", e => {

            const close =
                e.target.closest("[data-close]");

            if (close) {

                this.close();

                return;

            }


            const method =
                e.target.closest(
                    ".premium-payment-method"
                );

            if (!method) return;


            this.selectPayment(
                method.dataset.method
            );

        });

    }


    // ==========================================
    // 💳 PAYMENT
    // ==========================================

    selectPayment(method) {

        if (!this.selectedPackage) return;


        if (method === "inumi") {

            this.payWithInumi();

            return;

        }


        if (method === "deposit") {

            this.openDeposit();

        }

    }


    // ==========================================
    // 💎 INUMI
    // ==========================================

    payWithInumi() {

        console.log(
            "Thanh toán Inumi:",
            this.selectedPackage
        );


        /*
         * Sau này gọi API server:
         *
         * POST /api/premium/purchase
         *
         * Server kiểm tra:
         * - user
         * - package
         * - số dư
         * - giao dịch
         */


        alert(
            "Phần thanh toán bằng Inumi sẽ được kết nối với máy chủ."
        );

    }


    // ==========================================
    // 💳 DEPOSIT
    // ==========================================

    openDeposit() {

        alert(
            "Mở hệ thống nạp tiền."
        );

    }


    // ==========================================
    // ❌ CLOSE
    // ==========================================

    close() {

        const modal =
            document.getElementById(
                "premiumPurchaseModal"
            );

        if (!modal) return;


        modal.classList.remove("show");


        setTimeout(() => {

            modal.remove();

        }, 200);

    }

}