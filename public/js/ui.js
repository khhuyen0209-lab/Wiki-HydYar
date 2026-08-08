export default class Ui {
    constructor(app) {
        this.app = app;
    }

      icon(n){return`<iconify-icon icon="${n}"></iconify-icon>`;}
      slugify(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
      initNavigation(){document.querySelectorAll(".nav-item").forEach(b=>{b.replaceWith(b.cloneNode(true));});document.querySelectorAll(".nav-item").forEach(b=>{b.addEventListener("click",()=>HydYarWiki.navigate(b.dataset.page));});}
      initDarkMode(){const{$dom:s}=this.app.state;s.darkModeToggle=document.getElementById("darkModeToggle");if(!s.darkModeToggle)return;const t=localStorage.getItem("wiki-theme")||"light";document.documentElement.setAttribute("data-theme",t);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",t==="dark");s.darkModeToggle.addEventListener("click",()=>{const n=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);localStorage.setItem("wiki-theme",n);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",n==="dark");});}
initPerformance() {

    const state = this.app.state;

    const isLowEnd =
        navigator.hardwareConcurrency <= 4 ||
        navigator.deviceMemory <= 4 ||
        innerWidth <= 360;

    if (isLowEnd) {
        document.documentElement.classList.add("low-end");
    }

    const btn = document.getElementById("optimizeToggle");

    if (!btn) {
        console.warn("Không tìm thấy optimizeToggle");
        return;
    }

    const toggle = btn.querySelector(".toggle-switch");

    const applyPerformance = () => {

        // ⚡ Chế độ tối ưu hiệu năng
        document.documentElement.classList.toggle(
            "low-end",
            state.optimizeEnabled
        );

        toggle?.classList.toggle(
            "active",
            state.optimizeEnabled
        );

        // 🎨 Kiểm tra setting hiệu ứng
        const animationSetting =
            localStorage.getItem("wiki-animations");

        const animationEnabled =
            animationSetting === null
                ? true
                : animationSetting === "true";

        // Optimize luôn có quyền ưu tiên
        const shouldAnimate =
            animationEnabled &&
            !state.optimizeEnabled;

        document.documentElement.classList.toggle(
            "no-animations",
            !shouldAnimate
        );

        // Khóa mục hiệu ứng khi optimize
        document
            .getElementById("settingsAnimations")
            ?.classList.toggle(
                "settings-disabled",
                state.optimizeEnabled
            );
    };

    // Áp dụng ngay khi khởi tạo
    applyPerformance();

    btn.onclick = () => {

        state.optimizeEnabled =
            !state.optimizeEnabled;

        localStorage.setItem(
            "optimizeMode",
            String(state.optimizeEnabled)
        );

        applyPerformance();
    };
}
      initDomCache() {

    Object.assign(this.app.state.$dom, {
        pageArticle: document.getElementById("page-article"),

        featuredArticles: document.getElementById("featuredArticles"),
        latestArticles: document.getElementById("latestArticles"),

        featuredCategories: document.getElementById("featuredCategories"),
        allCategories: document.getElementById("allCategories"),

categoryList: document.getElementById("categoryList"),

        // Tìm kiếm
        searchInput: document.getElementById("searchInput"),
        searchResults: document.getElementById("searchResults"),
        searchHistory: document.getElementById("searchHistory"),
        searchHistoryWrapper: document.getElementById("searchHistoryWrapper"),
        headerSearch: document.querySelector(".header-search input"),
        homeSearch: document.querySelector(".search-box input"),
        header: document.getElementById("header"),
        searchClose: document.getElementById("searchClose"),

        // Cài đặt
        darkModeToggle: document.getElementById("darkModeToggle"),
        optimizeToggle: document.getElementById("optimizeToggle"),

        // Khác
        bottomNav: document.querySelector(".bottom-nav")
    });

    // ===== Sự kiện =====

    document
    .getElementById("openCountryChat")
    ?.addEventListener("click", () => {
        HydYarWiki.navigate("countryChat");
    });

document
    .getElementById("wikiSetting")
    ?.addEventListener("click", () => {
        HydYarWiki.navigate("settings");
    });

document
    .getElementById("countryChatBack")
    ?.addEventListener("click", () => {
        document
            .querySelector(".header")
            ?.classList.remove("hidden");

        document
            .querySelector(".bottom-nav")
            ?.classList.remove("hidden");

        HydYarWiki.back();
    });
}

      initKeyboard() {
    const vh = window.visualViewport;

    if (!vh) return;

    const fullHeight = vh.height;

    const check = () => {
    const open =
        window.visualViewport &&
        visualViewport.height < window.innerHeight * 0.8;

    console.log({
        open,
        vv: visualViewport.height,
        inner: window.innerHeight
    });

    document.body.classList.toggle("keyboard-open", open);
};

    vh.addEventListener("resize", check);
}

      initChatAnimation(){

    const header = document.querySelector(".chat-header");
    const input = document.querySelector(".chat-input");
    const bottom = document.querySelector(".bottom-nav");

    if(!header || !input) return;


    // Chuẩn bị animation
    header.classList.add("chat-animate");
    input.classList.add("chat-animate");


    const openChat = ()=>{

        requestAnimationFrame(()=>{

            requestAnimationFrame(()=>{

                header.classList.add("chat-show");
                input.classList.add("chat-show");

                bottom?.classList.add("chat-hide");

            });

        });

    };


    const closeChat = ()=>{

        header.classList.remove("chat-show");
        input.classList.remove("chat-show");

        bottom?.classList.remove("chat-hide");

    };


    // Chỉ theo dõi khi back/forward trình duyệt
    window.addEventListener("popstate",()=>{

        if(location.pathname === "/cong-dong/chat"){

            openChat();

        }else{

            closeChat();

        }

    });


    // Xử lý bàn phím ảo
    if(window.visualViewport){

        visualViewport.addEventListener("resize",()=>{

            const keyboard =
                visualViewport.height <
                window.innerHeight * 0.8;


            document.body.classList.toggle(
                "keyboard-open",
                keyboard
            );

        });

    }

}

initSettings() {

    const settings = [
        ["settingsAnimations", "wiki-animations", true],
        ["settingsReadingPosition", "wiki-reading-position", true],
        ["settingsToc", "wiki-toc", true],
        ["settingsNotifications", "wiki-notifications", true],
        ["settingsExperimental", "wiki-experimental", false]
    ];

    settings.forEach(([id, key, defaultValue]) => {

        const element = document.getElementById(id);
        if (!element) return;

        const toggle = element.querySelector(".toggle-switch");

        const stored = localStorage.getItem(key);

        let enabled =
            stored === null
                ? defaultValue
                : stored === "true";

        const render = () => {

            toggle?.classList.toggle(
                "active",
                enabled
            );

            // 🎨 Chỉ setting hiệu ứng mới xử lý animation
            if (key === "wiki-animations") {

                const optimize =
                    this.app.state.optimizeEnabled;

                const shouldAnimate =
                    enabled &&
                    !optimize;

                document.documentElement.classList.toggle(
                    "no-animations",
                    !shouldAnimate
                );

                element.classList.toggle(
                    "settings-disabled",
                    optimize
                );
            }
        };

        render();

        element.onclick = () => {

            // ⚡ Optimize đang bật → không cho đổi
            // setting hiệu ứng
            if (
                key === "wiki-animations" &&
                this.app.state.optimizeEnabled
            ) {
                return;
            }

            enabled = !enabled;

            localStorage.setItem(
                key,
                String(enabled)
            );

            render();
        };
    });


    // ==============================
    // 🔙 QUAY LẠI
    // ==============================

    document
        .getElementById("settingsBack")
        ?.addEventListener(
            "click",
            () => HydYarWiki.navigate("profile")
        );


    // ==============================
    // 🧹 XÓA DỮ LIỆU TẠM
    // ==============================

    document
        .getElementById("clearTempData")
        ?.addEventListener("click", async () => {

            const ok = confirm(
                "Xóa dữ liệu tạm?\n\n" +
                "Dữ liệu đăng nhập và các cài đặt sẽ được giữ lại."
            );

            if (!ok) return;

            try {

                sessionStorage.clear();

                if ("caches" in window) {

                    const cacheNames =
                        await caches.keys();

                    await Promise.all(
                        cacheNames.map(name =>
                            caches.delete(name)
                        )
                    );
                }

                [
                    "searchHistory",
                    "wikiSearchHistory",
                    "temporaryData",
                    "optimizeCache"
                ].forEach(key => {
                    localStorage.removeItem(key);
                });

                alert("Đã xóa dữ liệu tạm.");

            } catch (error) {

                console.error(
                    "Lỗi xóa dữ liệu tạm:",
                    error
                );

                alert(
                    "Không thể xóa hoàn toàn dữ liệu tạm."
                );
            }
        });


    // ==============================
    // 🗑️ XÓA TOÀN BỘ DỮ LIỆU
    // ==============================

    document
        .getElementById("clearAllData")
        ?.addEventListener("click", async () => {

            const ok = confirm(
                "⚠️ XÓA TOÀN BỘ DỮ LIỆU WIKI?\n\n" +
                "Thao tác này sẽ xóa dữ liệu được Wiki " +
                "lưu trên thiết bị, bao gồm cài đặt, " +
                "lịch sử, dữ liệu tạm và trạng thái đăng nhập.\n\n" +
                "Bạn có chắc chắn muốn tiếp tục?"
            );

            if (!ok) return;

            try {

                localStorage.clear();
                sessionStorage.clear();

                if ("caches" in window) {

                    const cacheNames =
                        await caches.keys();

                    await Promise.all(
                        cacheNames.map(name =>
                            caches.delete(name)
                        )
                    );
                }

                if (
                    "indexedDB" in window &&
                    indexedDB.databases
                ) {

                    const databases =
                        await indexedDB.databases();

                    await Promise.all(
                        databases
                            .filter(database => database.name)
                            .map(database =>
                                new Promise(resolve => {

                                    const request =
                                        indexedDB.deleteDatabase(
                                            database.name
                                        );

                                    request.onsuccess = resolve;
                                    request.onerror = resolve;
                                    request.onblocked = resolve;

                                })
                            )
                    );
                }

                alert(
                    "Đã xóa toàn bộ dữ liệu Wiki."
                );

                location.reload();

            } catch (error) {

                console.error(
                    "Lỗi xóa toàn bộ dữ liệu:",
                    error
                );

                alert(
                    "Không thể xóa toàn bộ dữ liệu."
                );
            }
        });
}
}