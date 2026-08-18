export default class Router {

    constructor(appStatus) {

        this.appStatus = appStatus;

        this.routes = this.createRoutes();

    }


    createRoutes() {

        const appStatus = this.appStatus;
        const router = this;


        const showMainNavigation = () => {

            document
                .querySelector(".header")
                ?.classList.remove("hidden");

            document
                .querySelector(".bottom-nav")
                ?.classList.remove("hidden");

        };


        const hideMainNavigation = () => {

            document
                .querySelector(".header")
                ?.classList.add("hidden");

            document
                .querySelector(".bottom-nav")
                ?.classList.add("hidden");

        };


        const clearActive = () => {

            document
                .querySelectorAll(
                    ".nav-item, .drawer-nav-item, .page"
                )
                .forEach(el => {

                    el.classList.remove("active");

                });

        };


        const setActivePage = page => {

            clearActive();

            if (!page) return;


            document
                .getElementById(`page-${page}`)
                ?.classList.add("active");


            document
                .querySelector(
                    `.nav-item[data-page="${page}"]`
                )
                ?.classList.add("active");


            document
                .querySelector(
                    `.drawer-nav-item[data-page="${page}"]`
                )
                ?.classList.add("active");

        };


        const closeDrawer = () => {

            const drawer =
                document.getElementById("navigationDrawer");

            const overlay =
                document.getElementById("navOverlay");


            drawer?.classList.remove("open");

            overlay?.classList.remove("show");

            document.body.classList.remove(
                "navigation-open"
            );

        };


        const scrollTop = () => {

            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant"
            });

        };


        return {


            home: {

                path: "/",

                async handler() {

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


            categories: {

                path: "/danh-muc",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("categories");


                    const page =
                        document.getElementById(
                            "page-categories"
                        );


                    if (
                        page &&
                        appStatus.state.originalCategoryHTML
                    ) {

                        page.innerHTML =
                            appStatus.state.originalCategoryHTML;

                    }


                    await appStatus.category
                        .renderCategory();


                    appStatus.seo.updateCategory({

                        name: "Tất cả danh mục"

                    });


                    scrollTop();

                }

            },


            search: {

                path: "/tim-kiem",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("search");

                    appStatus.search.init();

                    scrollTop();

                }

            },


            community: {

                path: "/cong-dong",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("community");

                    scrollTop();

                }

            },


            countryChat: {

                path: "/cong-dong/chat",

                async handler() {

                    closeDrawer();


                    const header =
                        document.querySelector(".header");

                    const bottomNav =
                        document.querySelector(
                            ".bottom-nav"
                        );

                    const chatPage =
                        document.getElementById(
                            "page-country-chat"
                        );


                    chatPage?.classList.remove("active");


                    document
                        .querySelector(".chat-header")
                        ?.classList.remove("chat-show");


                    document
                        .querySelector(".chat-input")
                        ?.classList.remove("chat-show");


                    clearActive();


                    header?.classList.add("hidden");

                    bottomNav?.classList.add("hidden");


                    void document.body.offsetHeight;


                    chatPage?.classList.add("active");

                    scrollTop();


                    if (!appStatus.chat.ws) {

                        appStatus.chat.connect();

                    }


                    requestAnimationFrame(() => {

                        requestAnimationFrame(() => {

                            document
                                .querySelector(".chat-header")
                                ?.classList.add("chat-show");


                            document
                                .querySelector(".chat-input")
                                ?.classList.add("chat-show");


                            requestAnimationFrame(() => {

                                appStatus.chat
                                    .isScrolledInit = false;


                                const box =
                                    document.getElementById(
                                        "countryChatMessages"
                                    );


                                if (
                                    box &&
                                    appStatus.chat.messages.length > 0
                                ) {

                                    appStatus.chat
                                        .scrollToBottom(true);

                                }

                            });

                        });

                    });

                }

            },


            profile: {

                path: "/tai-khoan",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("profile");


                    const page =
                        document.getElementById(
                            "page-profile"
                        );


                    if (
                        page &&
                        appStatus.state.profileOriginalHTML
                    ) {

                        page.innerHTML =
                            appStatus.state.profileOriginalHTML;

                    }


                    page?.classList.add("active");


                    document
                        .querySelector(
                            '.nav-item[data-page="profile"]'
                        )
                        ?.classList.add("active");


                    document
                        .querySelector(
                            '.drawer-nav-item[data-page="profile"]'
                        )
                        ?.classList.add("active");


                    const policyBtn =
                        document.getElementById(
                            "wikiPolicy"
                        );


                    if (policyBtn) {

                        policyBtn.onclick = () => {

                            HydYarWiki.navigate(
                                "policy"
                            );

                        };

                    }


                    appStatus.ui.initDarkMode();

                    appStatus.ui.initPerformance();

                    scrollTop();

                }

            },


            premium: {

    path: "/goi-nang-cao",

    async handler() {

        closeDrawer();
        showMainNavigation();
        clearActive();

        document
            .getElementById("page-premium")
            ?.classList.add("active");


        // ==============================
        // 👤 ACCOUNT
        // ==============================

        const user =
            appStatus.auth?.user;

        const accountName =
            document.getElementById(
                "premiumAccountName"
            );

        const accountID =
            document.getElementById(
                "premiumAccountID"
            );

        const inumiBalance =
            document.getElementById(
                "premiumInumiBalance"
            );

        const currentName =
            document.getElementById(
                "premiumCurrentName"
            );

        const currentStatus =
            document.getElementById(
                "premiumCurrentStatus"
            );


        if (accountName) {

            accountName.textContent =
                user?.displayName ||
                user?.name ||
                "Người dùng";

        }


        if (accountID) {

            accountID.textContent =
                user?.id ||
                "Chưa có ID";

        }


        // ==============================
        // 💰 INUMI
        // ==============================

        if (inumiBalance) {

            inumiBalance.textContent =
                `${user?.inumi ?? 0} Inumi`;

        }


        // ==============================
        // ⭐ CURRENT PLAN
        // ==============================

        if (currentName) {

            currentName.textContent =
                user?.plan ||
                "Free";

        }


        if (currentStatus) {

            currentStatus.textContent =
                "Đang sử dụng";

        }


        scrollTop();

    }

},


            "category-detail": {

                path: "/danh-muc/:id",

                async handler({ id }) {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("categories");


                    await appStatus.category
                        .openCategoryDetail(id);


                    scrollTop();

                }

            },


            settings: {

                path: "/cai-dat",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    clearActive();


                    document
                        .getElementById("page-settings")
                        ?.classList.add("active");


                    appStatus.ui.initSettings();

                    scrollTop();

                }

            },


            article: {

                path: "/:category/:id",

                async handler({ id }) {

                    closeDrawer();

                    showMainNavigation();

                    clearActive();


                    document
                        .getElementById("page-article")
                        ?.classList.add("active");


                    await appStatus.article
                        .openArticleDetail(id);

                }

            },


            policy: {

                path: "/chinh-sach",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("profile");


                    await appStatus.policy
                        .openPolicyPage();


                    scrollTop();

                }

            },


            history: {

                path: "/profile/history",

                async handler() {

                    closeDrawer();

                    showMainNavigation();

                    clearActive();


                    document
                        .getElementById("page-profile")
                        ?.classList.add("active");


                    document
                        .querySelector(
                            '.nav-item[data-page="profile"]'
                        )
                        ?.classList.add("active");


                    document
                        .querySelector(
                            '.drawer-nav-item[data-page="profile"]'
                        )
                        ?.classList.add("active");


                    appStatus.history.open();

                    scrollTop();

                }

            },


            "policy-detail": {

                path: "/chinh-sach/:id",

                async handler({ id }) {

                    closeDrawer();

                    showMainNavigation();

                    setActivePage("profile");


                    document
                        .getElementById("page-profile")
                        ?.classList.add("active");


                    await appStatus.policy
                        .openPolicyDetail(id);


                    scrollTop();

                }

            }

        };

    }


    init() {

        window.addEventListener(
            "popstate",
            e => this.handlePopState(e)
        );


        this.parseInitialURL();

    }


    async navigate(routeKey, params = {}) {

        const route =
            this.routes[routeKey];


        if (!route) {

            console.warn(
                `[Router] Route không tồn tại: ${routeKey}`
            );

            return;

        }


        let url = route.path;


        Object.entries(params)
            .forEach(([key, value]) => {

                url = url.replace(
                    `:${key}`,
                    encodeURIComponent(value ?? "")
                );

            });


        url = url
            .replace(/\/:[^/]+/g, "")
            .replace(/\/+/g, "/") || "/";


        if (location.pathname === url) {

            await route.handler(params);

            return;

        }


        history.pushState(

            {
                route: routeKey,
                ...params
            },

            "",

            url

        );


        await route.handler(params);

    }


    goBack() {

        if (
            this.appStatus.state.isFullscreenMode
        ) {

            this.appStatus
                .article
                .fullscreen
                .close();

            return;

        }


        history.back();

    }


    async handlePopState(e) {

        const state =
            e.state;


        if (
            state &&
            state.route &&
            this.routes[state.route]
        ) {

            await this.routes[state.route]
                .handler(state);

            return;

        }


        await this.parseInitialURL(false);

    }


    async parseInitialURL(
        replaceState = true
    ) {

        const parts =
            window.location.pathname
                .split("/")
                .filter(Boolean);


        let routeKey = "home";

        let params = {};


        if (!parts.length) {

            routeKey = "home";

        }

        else {

            switch (parts[0]) {

                case "goi-nang-cao":

                    routeKey = "premium";

                    break;


                case "cai-dat":

                    routeKey = "settings";

                    break;


                case "danh-muc":

                    if (parts.length === 1) {

                        routeKey = "categories";

                    }

                    else {

                        routeKey =
                            "category-detail";

                        params = {

                            id:
                                decodeURIComponent(
                                    parts[1]
                                )

                        };

                    }

                    break;


                case "tim-kiem":

                    routeKey = "search";

                    break;


                case "cong-dong":

                    if (
                        parts[1] === "chat"
                    ) {

                        routeKey =
                            "countryChat";

                    }

                    else {

                        routeKey =
                            "community";

                    }

                    break;


                case "tai-khoan":

                    routeKey = "profile";

                    break;


                case "chinh-sach":

                    if (parts.length === 1) {

                        routeKey = "policy";

                    }

                    else {

                        routeKey =
                            "policy-detail";

                        params = {

                            id:
                                decodeURIComponent(
                                    parts[1]
                                )

                        };

                    }

                    break;


                case "profile":

                    if (
                        parts[1] === "history"
                    ) {

                        routeKey = "history";

                    }

                    else {

                        routeKey = "home";

                    }

                    break;


                default:

                    if (parts.length === 2) {

                        routeKey = "article";

                        params = {

                            category:
                                decodeURIComponent(
                                    parts[0]
                                ),

                            id:
                                decodeURIComponent(
                                    parts[1]
                                )

                        };

                    }

                    else {

                        routeKey = "home";

                    }

                    break;

            }

        }


        const route =
            this.routes[routeKey];


        if (!route) {

            await this.routes.home.handler();

            return;

        }


        if (replaceState) {

            history.replaceState(

                {
                    route: routeKey,
                    ...params
                },

                "",

                location.pathname +
                location.search +
                location.hash

            );

        }


        await route.handler(params);

    }

}