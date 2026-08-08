export default class Router {
    constructor(appStatus){
        this.appStatus = appStatus;
        this.routes = this.createRoutes();
    }

    createRoutes(){
        // Giữ nguyên tham chiếu appStatus như cũ, không cần đổi hàng trăm chỗ
        const appStatus = this.appStatus;

        return {
            home: {
                path: "/",
                async handler() {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="home"]')?.classList.add("active");
                    document.getElementById("page-home")?.classList.add("active");
                    await Promise.all([
                        appStatus.article.renderWiki(),
                        appStatus.category.renderCategory()
                    ]);
                    appStatus.seo.reset();
                    window.scrollTo(0, 0);
                }
            },

            categories: {
                path: "/danh-muc",
                async handler() {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="categories"]')?.classList.add("active");
                    document.getElementById("page-categories")?.classList.add("active");
                    const page = document.getElementById("page-categories");
                    if (page && appStatus.state.originalCategoryHTML) page.innerHTML = appStatus.state.originalCategoryHTML;
                    await appStatus.category.renderCategory();
                    appStatus.seo.updateCategory({ name: "Tất cả danh mục" });
                    window.scrollTo(0, 0);
                }
            },

            search: {
                path: "/tim-kiem",
                async handler() {
                    appStatus.search.init();
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="search"]')?.classList.add("active");
                    document.getElementById("page-search")?.classList.add("active");
                    window.scrollTo(0, 0);
                }
            },

            community: {
                path: "/cong-dong",
                async handler() {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="community"]')?.classList.add("active");
                    document.getElementById("page-community")?.classList.add("active");
                    window.scrollTo(0, 0);
                }
            },

            countryChat: {
                path:"/cong-dong/chat",
                async handler(){
                    const header = document.querySelector(".header");
                    const bottomNav = document.querySelector(".bottom-nav");
                    const chatPage = document.getElementById("page-country-chat");

                    chatPage?.classList.remove("active");
                    document.querySelector(".chat-header")?.classList.remove("chat-show");
                    document.querySelector(".chat-input")?.classList.remove("chat-show");

                    document.querySelectorAll(".nav-item,.page").forEach(el=>{
                        el.classList.remove("active");
                    });

                    header?.classList.add("hidden");
                    bottomNav?.classList.add("hidden");

                    void document.body.offsetHeight;

                    chatPage?.classList.add("active");
                    window.scrollTo(0,0);

                    if (!appStatus.chat.ws) {
                        appStatus.chat.connect();
                    }

                    requestAnimationFrame(()=>{
                        requestAnimationFrame(()=>{
                            document.querySelector(".chat-header")?.classList.add("chat-show");
                            document.querySelector(".chat-input")?.classList.add("chat-show");

                            requestAnimationFrame(() => {
                                appStatus.chat.isScrolledInit = false;
                                const box = document.getElementById("countryChatMessages");
                                if (box && appStatus.chat.messages.length > 0) {
                                    appStatus.chat.scrollToBottom(true);
                                }
                            });
                        });
                    });
                }
            },

            profile: {
                path: "/tai-khoan",
                async handler() {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page")
                        .forEach(el => el.classList.remove("active"));

                    document.querySelector('[data-page="profile"]')
                        ?.classList.add("active");

                    const page = document.getElementById("page-profile");

                    if (page && appStatus.state.profileOriginalHTML) {
                        page.innerHTML = appStatus.state.profileOriginalHTML;
                    }

                    page?.classList.add("active");

                    document.getElementById("wikiPolicy")
                        ?.addEventListener("click", () => HydYarWiki.navigate("policy"));

                    appStatus.ui.initDarkMode();
                    appStatus.ui.initPerformance();

                    window.scrollTo(0, 0);
                }
            },
                
            "category-detail": {
                path: "/danh-muc/:id",
                async handler({ id }) {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="categories"]')?.classList.add("active");
                    document.getElementById("page-categories")?.classList.add("active");
                    await appStatus.category.openCategoryDetail(id);
                }
            },

            settings: {
    path: "/cai-dat",

    async handler() {

        document
            .querySelector(".header")
            ?.classList.remove("hidden");

        document
            .querySelector(".bottom-nav")
            ?.classList.remove("hidden");

        document
            .querySelectorAll(".nav-item,.page")
            .forEach(el => el.classList.remove("active"));

        document
            .getElementById("page-settings")
            ?.classList.add("active");

        appStatus.ui.initSettings();

        window.scrollTo(0, 0);
    }
},
                
            article: {
                path: "/:category/:id",
                async handler({ id }) {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
                    document.getElementById("page-article")?.classList.add("active");
                    await appStatus.article.openArticleDetail(id);
                }
            },
                
            policy: {
                path: "/chinh-sach",
                async handler() {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="profile"]')?.classList.add("active");
                    document.getElementById("page-profile")?.classList.add("active");
                    await appStatus.policy.openPolicyPage();
                }
            },

            history:{
    path:"/profile/history",

    async handler(){

        document
        .querySelectorAll(".page")
        .forEach(p=>p.classList.remove("active"));

        document
        .getElementById("page-profile")
        ?.classList.add("active");


        appStatus.history.open();

    }
},

            "policy-detail": {
                path: "/chinh-sach/:id",
                async handler({ id }) {
                    document.querySelector(".header")?.classList.remove("hidden");
                    document.querySelector(".bottom-nav")?.classList.remove("hidden");
                    document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
                    document.querySelector('[data-page="profile"]')?.classList.add("active");
                    document.getElementById("page-profile")?.classList.add("active");
                    await appStatus.policy.openPolicyDetail(id);
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
        if (!route) return;

        let url = route.path;

        Object.entries(params).forEach(([k, v]) => {
            url = url.replace(`:${k}`, v || "");
        });

        url = url
            .replace(/\/:[^/]+/g, "")
            .replace(/\/+/g, "/") || "/";

        if (location.pathname === url) return;

        history.pushState(
            { route: routeKey, ...params },
            "",
            url
        );

        await route.handler(params);
    }

    goBack() {
        if (this.appStatus.state.isFullscreenMode) {
            this.appStatus.article.closeFullscreen();
        }
        history.back();
    }

    async handlePopState(e) {
        const state = e.state || { route: "home" };
        await (this.routes[state.route]?.handler || this.routes.home.handler)(state);
    }

    async parseInitialURL() {
        const p = window.location.pathname.split("/").filter(Boolean);

        if (!p.length)
            return this.routes.home.handler();

        switch (p[0]) {
            case "cai-dat":
    return this.routes.settings.handler();
            case "danh-muc":
                return p.length === 1
                    ? this.routes.categories.handler()
                    : this.routes["category-detail"].handler({ id: p[1] });

            case "tim-kiem":
                return this.routes.search.handler();

            case "cong-dong":
                return p[1] === "chat"
                    ? this.routes.countryChat.handler()
                    : this.routes.community.handler();

            case "tai-khoan":
                return this.routes.profile.handler();

            case "chinh-sach":
                return p.length === 1
                    ? this.routes.policy.handler()
                    : this.routes["policy-detail"].handler({ id: p[1] });

            default:
                if (p.length === 2)
                    return this.routes.article.handler({ id: p[1] });

                return this.routes.home.handler();
        }
    }
}
