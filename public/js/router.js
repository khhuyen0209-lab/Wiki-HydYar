/**
 * Router.js
 * Chịu trách nhiệm duy nhất: Quản lý URL, History, Route, Params
 * Không xử lý logic UI chi tiết, không quản lý animation, không gắn event listener
 * Gọi Page/UI để xử lý phần hiển thị
 */
export default class Router {

    constructor(appStatus) {
        this.appStatus = appStatus;
        this.routes = this.createRoutes();
        this.currentRoute = "home";
        this.currentParams = {};
    }

    createRoutes() {
        const appStatus = this.appStatus;
        const router = this;

        /* =====================================================
           🧩 HELPER CHUNG — Chỉ thao tác navigation cơ bản
           ===================================================== */

        const showMainNavigation = () => {
            document.querySelector(".header")?.classList.remove("hidden");
            document.querySelector(".bottom-nav")?.classList.remove("hidden");
        };

        const hideMainNavigation = () => {
            document.querySelector(".header")?.classList.add("hidden");
            document.querySelector(".bottom-nav")?.classList.add("hidden");
        };

        /**
         * ✅ Cải tiến: Chỉ xóa active của các phần tử navigation chính
         * Không ảnh hưởng đến tab/modal/component con cũng dùng class "active"
         */
        const clearActive = () => {
            document.querySelectorAll(".nav-item, .drawer-nav-item, .page").forEach(el => {
                el.classList.remove("active");
            });
        };

        const setActivePage = page => {
            clearActive();
            if (!page) return;

            document.getElementById(`page-${page}`)?.classList.add("active");
            document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add("active");
            document.querySelector(`.drawer-nav-item[data-page="${page}"]`)?.classList.add("active");
        };

        const closeDrawer = () => {
            const drawer = document.getElementById("navigationDrawer");
            const overlay = document.getElementById("navOverlay");

            drawer?.classList.remove("open");
            overlay?.classList.remove("show");
            document.body.classList.remove("navigation-open");
        };

        const scrollTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant"
            });
        };

        /**
         * ✅ Cải tiến: Đóng Chat trước khi chuyển route
         * Tránh tình trạng UI Chat còn hiện khi đã rời trang
         */
        const cleanupBeforeRoute = (newRoute) => {
            if (router.currentRoute === "countryChat" && newRoute !== "countryChat") {
                appStatus.ui.closeChat();
            }
        };

        return {

            /* =====================================================
               🏠 HOME
               ===================================================== */


            /* =====================================================
   💳 PAYMENT SUCCESS
   ===================================================== */
"payment-success": {
    path: "/payment/success",
    async handler() {
        cleanupBeforeRoute("payment-success");
        closeDrawer();
        showMainNavigation();
        clearActive();

        // TODO: Hiển thị trang thanh toán thành công
        console.log("✅ Thanh toán thành công");

        scrollTop();
    }
},

/* =====================================================
   💳 PAYMENT ERROR
   ===================================================== */
"payment-error": {
    path: "/payment/error",
    async handler() {
        cleanupBeforeRoute("payment-error");
        closeDrawer();
        showMainNavigation();
        clearActive();

        console.log("❌ Thanh toán thất bại");

        scrollTop();
    }
},

/* =====================================================
   💳 PAYMENT CANCEL
   ===================================================== */
"payment-cancel": {
    path: "/payment/cancel",
    async handler() {
        cleanupBeforeRoute("payment-cancel");
        closeDrawer();
        showMainNavigation();
        clearActive();

        console.log("⚠️ Đã hủy thanh toán");

        scrollTop();
    }
},
          
            home: {
                path: "/",
                async handler() {
                    cleanupBeforeRoute("home");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("home");

                    await Promise.all([
                        appStatus.article.renderWiki(),
                        appStatus.category.renderCategory()
                    ]);

                    appStatus.seo.reset();
                    scrollTop();
                }
            },

            /* =====================================================
               📂 DANH MỤC
               ===================================================== */
            categories: {
                path: "/danh-muc",
                async handler() {
                    cleanupBeforeRoute("categories");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("categories");

                    const page = document.getElementById("page-categories");
                    if (page && appStatus.state.originalCategoryHTML) {
                        page.innerHTML = appStatus.state.originalCategoryHTML;
                    }

                    await appStatus.category.renderCategory();
                    appStatus.seo.updateCategory({ name: "Tất cả danh mục" });
                    scrollTop();
                }
            },

            /* =====================================================
               🔍 TÌM KIẾM
               ===================================================== */
            search: {
                path: "/tim-kiem",
                async handler() {
                    cleanupBeforeRoute("search");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("search");
                    appStatus.search.init();
                    scrollTop();
                }
            },

            /* =====================================================
               👥 CỘNG ĐỒNG
               ===================================================== */
            community: {
                path: "/cong-dong",
                async handler() {
                    cleanupBeforeRoute("community");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("community");
                    scrollTop();
                }
            },

            /* =====================================================
               💬 CHAT QUỐC GIA
               ✅ Cải tiến: Router chỉ quyết định "mở Chat",
               UI chịu trách nhiệm animation & hiển thị
               ===================================================== */
            countryChat: {
                path: "/cong-dong/chat",
                async handler() {
                    cleanupBeforeRoute("countryChat");
                    closeDrawer();
                    hideMainNavigation();
                    clearActive();

                    const chatPage = document.getElementById("page-country-chat");
                    chatPage?.classList.add("active");

                    // Gọi UI xử lý animation & hiển thị
                    appStatus.ui.openChat();

                    if (!appStatus.chat.ws) {
                        appStatus.chat.connect();
                    }

                    scrollTop();
                }
            },

            /* =====================================================
               👤 TÀI KHOẢN
               ✅ Cải tiến: Không làm dư thừa, setActivePage() chịu trách nhiệm hoàn toàn
               ===================================================== */
            profile: {
                path: "/tai-khoan",
                async handler() {
                    cleanupBeforeRoute("profile");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("profile");

                    const page = document.getElementById("page-profile");
                    if (page && appStatus.state.profileOriginalHTML) {
                        page.innerHTML = appStatus.state.profileOriginalHTML;
                    }

                    const policyBtn = document.getElementById("wikiPolicy");
                    if (policyBtn) {
                        policyBtn.onclick = () => {
                            HydYarWiki.navigate("policy");
                        };
                    }

                    appStatus.ui.initDarkMode();
                    appStatus.ui.initPerformance();
                    scrollTop();
                }
            },

          /* =====================================================
   👤 HỒ SƠ CÔNG KHAI
   ===================================================== */

"public-profile": {
    path: "/profile/:hydyarId",

    async handler({ hydyarId }) {

        console.log("🔍 ROUTER PUBLIC PROFILE");
        console.log("hydyarId =", hydyarId);
        console.log("typeof hydyarId =", typeof hydyarId);

        cleanupBeforeRoute("public-profile");

        closeDrawer();

        showMainNavigation();

        clearActive();

        document
            .getElementById("page-public-profile")
            ?.classList.add("active");

        await appStatus.ui.openPublicProfile(hydyarId);

        scrollTop();
    }
},

            /* =====================================================
               ⭐ GÓI NÂNG CAO
               ===================================================== */
            premium: {
                path: "/goi-nang-cao",
                async handler() {
                    cleanupBeforeRoute("premium");
                    closeDrawer();
                    showMainNavigation();
                    clearActive();

                    document.getElementById("page-premium")?.classList.add("active");

                    // ==============================
                    // 👤 ACCOUNT
                    // ==============================
                    const user = appStatus.auth?.user;
                    const accountName = document.getElementById("premiumAccountName");
                    const accountID = document.getElementById("premiumAccountID");
                    const inumiBalance = document.getElementById("premiumInumiBalance");
                    const currentName = document.getElementById("premiumCurrentName");
                    const currentStatus = document.getElementById("premiumCurrentStatus");

                    if (accountName) {
                        accountName.textContent = user?.displayName || user?.name || "Người dùng";
                    }
                    if (accountID) {
                        accountID.textContent = user?.id || "Chưa có ID";
                    }

                    // ==============================
                    // 💰 INUMI
                    // ==============================
                    if (inumiBalance) {
                        inumiBalance.textContent = `${user?.inumi ?? 0} Inumi`;
                    }

                    // ==============================
                    // ⭐ CURRENT PLAN
                    // ==============================
                    if (currentName) {
                        currentName.textContent = user?.plan || "Free";
                    }
                    if (currentStatus) {
                        currentStatus.textContent = "Đang sử dụng";
                    }

                    scrollTop();
                }
            },

            /* =====================================================
               📂 CHI TIẾT DANH MỤC
               ===================================================== */
            "category-detail": {
                path: "/danh-muc/:id",
                async handler({ id }) {
                    cleanupBeforeRoute("category-detail");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("categories");
                    await appStatus.category.openCategoryDetail(id);
                    scrollTop();
                }
            },

            /* =====================================================
               ⚙️ CÀI ĐẶT
               ===================================================== */
            settings: {
                path: "/cai-dat",
                async handler() {
                    cleanupBeforeRoute("settings");
                    closeDrawer();
                    showMainNavigation();
                    clearActive();

                    document.getElementById("page-settings")?.classList.add("active");
                    appStatus.ui.initSettings();
                    scrollTop();
                }
            },

            /* =====================================================
               📄 BÀI VIẾT
               ===================================================== */
            article: {
                path: "/:category/:id",
                async handler({ id }) {
                    cleanupBeforeRoute("article");
                    closeDrawer();
                    showMainNavigation();
                    clearActive();

                    document.getElementById("page-article")?.classList.add("active");
                    await appStatus.article.openArticleDetail(id);
                }
            },

            /* =====================================================
               📜 CHÍNH SÁCH
               ===================================================== */
            policy: {
                path: "/chinh-sach",
                async handler() {
                    cleanupBeforeRoute("policy");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("profile");
                    await appStatus.policy.openPolicyPage();
                    scrollTop();
                }
            },

            /* =====================================================
               🕘 LỊCH SỬ
               ===================================================== */
            history: {
                path: "/profile/history",
                async handler() {
                    cleanupBeforeRoute("history");
                    closeDrawer();
                    showMainNavigation();
                    clearActive();

                    document.getElementById("page-history")?.classList.add("active");
                    appStatus.history.open();
                    scrollTop();
                }
            },

            /* =====================================================
               📜 CHI TIẾT CHÍNH SÁCH
               ===================================================== */
            "policy-detail": {
                path: "/chinh-sach/:id",
                async handler({ id }) {
                    cleanupBeforeRoute("policy-detail");
                    closeDrawer();
                    showMainNavigation();
                    setActivePage("profile");

                    document.getElementById("page-profile")?.classList.add("active");
                    await appStatus.policy.openPolicyDetail(id);
                    scrollTop();
                }
            }
        };
    }

    init() {
        window.addEventListener("popstate", e => this.handlePopState(e));
        this.parseInitialURL();
    }

    async navigate(routeKey, params = {}) {
        const route = this.routes[routeKey];

        if (!route) {
            console.warn(`[Router] Route không tồn tại: ${routeKey}`);
            return;
        }

        let url = route.path;

        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, encodeURIComponent(value ?? ""));
        });

        url = url.replace(/\/:[^/]+/g, "").replace(/\/+/g, "/") || "/";

        if (location.pathname === url) {
            this.currentRoute = routeKey;
            this.currentParams = params;
            await route.handler(params);
            return;
        }

        history.pushState(
            { route: routeKey, ...params },
            "",
            url
        );

        this.currentRoute = routeKey;
        this.currentParams = params;
        await route.handler(params);
    }

    /**
     * ✅ Cải tiến: Kiểm tra có history nội bộ không
     * Nếu không có thì về trang chủ thay vì thoát khỏi SPA
     */
    goBack() {
        if (this.appStatus.state.isFullscreenMode) {
            this.appStatus.article.fullscreen.close();
            return;
        }

        if (window.history.length > 1) {
            history.back();
        } else {
            this.navigate("home");
        }
    }

    async handlePopState(e) {
        const state = e.state;

        if (state && state.route && this.routes[state.route]) {
            this.currentRoute = state.route;
            this.currentParams = state;
            await this.routes[state.route].handler(state);
            return;
        }

        await this.parseInitialURL(false);
    }

    async parseInitialURL(replaceState = true) {
        const parts = window.location.pathname
            .split("/")
            .filter(Boolean);

        let routeKey = "home";
        let params = {};

        if (!parts.length) {
            routeKey = "home";
        } else {
            switch (parts[0]) {
case "payment":
    if (parts[1] === "success") {
        routeKey = "payment-success";
    } else if (parts[1] === "error") {
        routeKey = "payment-error";
    } else if (parts[1] === "cancel") {
        routeKey = "payment-cancel";
    } else {
        routeKey = "home";
    }
    break;
                case "goi-nang-cao":
                    routeKey = "premium";
                    break;

                case "cai-dat":
                    routeKey = "settings";
                    break;

                case "danh-muc":
                    if (parts.length === 1) {
                        routeKey = "categories";
                    } else {
                        routeKey = "category-detail";
                        params = { id: decodeURIComponent(parts[1]) };
                    }
                    break;

                case "tim-kiem":
                    routeKey = "search";
                    break;

                case "cong-dong":
                    if (parts[1] === "chat") {
                        routeKey = "countryChat";
                    } else {
                        routeKey = "community";
                    }
                    break;

                case "tai-khoan":
                    routeKey = "profile";
                    break;

                case "chinh-sach":
                    if (parts.length === 1) {
                        routeKey = "policy";
                    } else {
                        routeKey = "policy-detail";
                        params = { id: decodeURIComponent(parts[1]) };
                    }
                    break;

                case "profile":

    // ==============================
    // 🕘 LỊCH SỬ CÁ NHÂN
    // ==============================

    if (parts[1] === "history") {

        routeKey =
            "history";

    }


    // ==============================
    // 👤 PROFILE NGƯỜI DÙNG
    // ==============================

    else if (parts[1]) {

        routeKey =
            "public-profile";


        params = {
    hydyarId: decodeURIComponent(parts[1])
};

    }


    // ==============================
    // ❌ KHÔNG CÓ TÊN
    // ==============================

    else {

        routeKey =
            "home";

    }

    break;

                default:
                    if (parts.length === 2) {
                        routeKey = "article";
                        params = {
                            category: decodeURIComponent(parts[0]),
                            id: decodeURIComponent(parts[1])
                        };
                    } else {
                        routeKey = "home";
                    }
                    break;
            }
        }

        const route = this.routes[routeKey];

        if (!route) {
            this.currentRoute = "home";
            this.currentParams = {};
            await this.routes.home.handler();
            return;
        }

        if (replaceState) {
            history.replaceState(
                { route: routeKey, ...params },
                "",
                location.pathname + location.search + location.hash
            );
        }

        this.currentRoute = routeKey;
        this.currentParams = params;
        await route.handler(params);
    }
}