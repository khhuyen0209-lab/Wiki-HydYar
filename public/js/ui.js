export default class Ui {
    constructor(app) {
        this.app = app;
    }

      icon(n){return`<iconify-icon icon="${n}"></iconify-icon>`;}
      slugify(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
initNavigation() {

    const menuBtn =
        document.getElementById("menuBtn");

    const drawer =
        document.getElementById("navigationDrawer");

    const overlay =
        document.getElementById("navOverlay");

    const closeBtn =
        document.getElementById("drawerClose");

    if (!menuBtn || !drawer || !overlay) {

        console.warn(
            "[HydYar Wiki] Không tìm thấy Navigation."
        );

        return;
    }


    /* =====================================================
       🔓 OPEN
       ===================================================== */

    const openDrawer = () => {

        /*
         * Desktop vẫn cho phép mở drawer.
         */

        drawer.classList.add("open");

        overlay.classList.add("show");

        document.body.classList.add(
            "navigation-open"
        );

        menuBtn.classList.add("open");

        menuBtn.setAttribute(
            "aria-expanded",
            "true"
        );
    };


    /* =====================================================
       🔒 CLOSE
       ===================================================== */

    const closeDrawer = () => {

        drawer.classList.remove("open");

        overlay.classList.remove("show");

        document.body.classList.remove(
            "navigation-open"
        );

        menuBtn.classList.remove("open");

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );
    };


    /* =====================================================
       ☰ MENU
       ===================================================== */

    menuBtn.addEventListener(
        "click",
        () => {

            if (
                drawer.classList.contains("open")
            ) {

                closeDrawer();

            } else {

                openDrawer();

            }

        }
    );


    /* =====================================================
       ✕ CLOSE
       ===================================================== */

    closeBtn?.addEventListener(
        "click",
        closeDrawer
    );


    /* =====================================================
       🌑 OVERLAY
       ===================================================== */

    overlay.addEventListener(
        "click",
        closeDrawer
    );


    /* =====================================================
       🧭 NAVIGATION
       ===================================================== */

    drawer
        .querySelectorAll(".drawer-nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    if (!page) return;

                    drawer
                        .querySelectorAll(
                            ".drawer-nav-item"
                        )
                        .forEach(item => {

                            item.classList.toggle(
                                "active",
                                item === button
                            );

                        });

                    closeDrawer();

                    HydYarWiki.navigate(page);
                }
            );

        });


    /* =====================================================
       🔖 BOOKMARK
       ===================================================== */

    document
        .getElementById("drawerBookmark")
        ?.addEventListener(
            "click",
            () => {

                closeDrawer();

                HydYarWiki.navigate(
                    "profile"
                );

            }
        );


    /* =====================================================
       🕘 HISTORY
       ===================================================== */

    document
        .getElementById("drawerHistory")
        ?.addEventListener(
            "click",
            () => {

                closeDrawer();

                HydYarWiki.navigate(
                    "history"
                );

            }
        );


    /* =====================================================
       ⚙️ SETTINGS
       ===================================================== */

    document
        .getElementById("drawerSettings")
        ?.addEventListener(
            "click",
            () => {

                closeDrawer();

                HydYarWiki.navigate(
                    "settings"
                );

            }
        );


    /* =====================================================
       ⌨️ ESC
       ===================================================== */

    document.addEventListener(
        "keydown",
        e => {

            if (
                e.key === "Escape" &&
                drawer.classList.contains("open")
            ) {

                closeDrawer();

            }

        }
    );


    /* =====================================================
       🔙 BACK / POPSTATE
       ===================================================== */

    window.addEventListener(
        "popstate",
        () => {

            closeDrawer();

        }
    );


    /* =====================================================
       🖥️ RESPONSIVE BREAKPOINT
       ===================================================== */

    const desktopQuery =
        window.matchMedia(
            "(min-width: 768px)"
        );


    const handleBreakpoint = e => {

        /*
         * Khi đổi kích thước màn hình,
         * reset trạng thái drawer.
         */

        if (e.matches) {

            closeDrawer();

        }

    };


    desktopQuery.addEventListener(
        "change",
        handleBreakpoint
    );


    /* =====================================================
       👆 EDGE SWIPE
       ===================================================== */

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const EDGE_SIZE = 24;
    const SWIPE_DISTANCE = 60;


    document.addEventListener(
        "touchstart",
        e => {

            if (
                window.innerWidth >= 768 ||
                !e.touches ||
                e.touches.length !== 1
            ) {
                return;
            }

            const touch =
                e.touches[0];

            startX =
                touch.clientX;

            startY =
                touch.clientY;

            tracking =
                !drawer.classList.contains("open") &&
                startX <= EDGE_SIZE;

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchend",
        e => {

            if (!tracking) return;

            tracking = false;

            if (
                !e.changedTouches ||
                e.changedTouches.length !== 1
            ) {
                return;
            }

            const touch =
                e.changedTouches[0];

            const deltaX =
                touch.clientX - startX;

            const deltaY =
                Math.abs(
                    touch.clientY - startY
                );

            if (
                deltaX >= SWIPE_DISTANCE &&
                deltaX > deltaY
            ) {

                openDrawer();

            }

        },
        {
            passive: true
        }
    );
}
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

    // ==============================
    // ⚡ ÁP DỤNG HIỆU NĂNG
    // ==============================

    const applyPerformance = () => {

        // Optimize
        document.documentElement.classList.toggle(
            "low-end",
            state.optimizeEnabled
        );

        toggle?.classList.toggle(
            "active",
            state.optimizeEnabled
        );

        // ==============================
        // 🎨 SETTING HIỆU ỨNG
        // ==============================

        const animationSetting =
            localStorage.getItem("wiki-animations");

        const animationEnabled =
            animationSetting === null
                ? true
                : animationSetting === "true";

        // Optimize có quyền ưu tiên cao nhất
        const shouldAnimate =
            !state.optimizeEnabled &&
            animationEnabled;

        // 🔥 Optimize bật = TẮT HIỆU ỨNG NGAY
        document.documentElement.classList.toggle(
            "no-animations",
            !shouldAnimate
        );

        // ==============================
        // 🔒 KHÓA SETTING HIỆU ỨNG
        // ==============================

        document
            .getElementById("settingsAnimations")
            ?.classList.toggle(
                "settings-disabled",
                state.optimizeEnabled
            );
    };

    // ==============================
    // 🚀 KHỞI TẠO
    // ==============================

    applyPerformance();

    // ==============================
    // ⚡ TOGGLE OPTIMIZE
    // ==============================

    btn.onclick = () => {

        state.optimizeEnabled =
            !state.optimizeEnabled;

        localStorage.setItem(
            "optimizeMode",
            String(state.optimizeEnabled)
        );

        // Áp dụng ngay
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
    .getElementById("openPremium")
    ?.addEventListener("click", () => {

        HydYarWiki.navigate("premium");

    });

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
            .getElementById("navigationDrawer")
            ?.classList.remove("open");

        document
            .getElementById("navOverlay")
            ?.classList.remove("show");

        document.body.classList.remove(
            "navigation-open"
        );

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

    // ==========================================
    // ⚙️ SETTING CƠ BẢN
    // ==========================================

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

            const optimize =
                this.app.state.optimizeEnabled;

            if (key === "wiki-animations") {

                const visualEnabled =
                    optimize ? false : enabled;

                toggle?.classList.toggle(
                    "active",
                    visualEnabled
                );

                const shouldAnimate =
                    enabled && !optimize;

                document.documentElement.classList.toggle(
                    "no-animations",
                    !shouldAnimate
                );

                element.classList.toggle(
                    "settings-disabled",
                    optimize
                );

            } else {

                toggle?.classList.toggle(
                    "active",
                    enabled
                );

            }
        };

        render();

        element.onclick = () => {

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


    // ==========================================
    // 🧰 TIỆN ÍCH WIKI
    // ==========================================

    const notification =
        document.getElementById("settingsNotifications");

    if (!notification) return;

    // Xóa card cũ nếu initSettings() bị gọi lại
    document
        .getElementById("settingsTools")
        ?.remove();

    const toolManager = this.app.tool;

    if (!toolManager) {

        console.warn(
            "[HydYar Wiki] Tool manager chưa được khởi tạo."
        );

    } else {

        const tools = toolManager.getAll();

        const allEnabled =
            tools.length > 0 &&
            tools.every(tool => tool.enabled);


        // ==========================================
        // 🧱 TẠO CARD RIÊNG
        // ==========================================

        const toolsCard =
            document.createElement("div");

        toolsCard.id = "settingsTools";

        // Dùng CARD CHUNG của Settings
        toolsCard.className =
            "settings-card settings-tools-card";


        toolsCard.innerHTML = `

            <!-- ==================================
                 TOOL TỔNG
            ================================== -->

            <div
                class="settings-item tool-main-setting"
                id="settingsToolsMain"
            >

                <div class="settings-item-icon">
                    ${this.icon("solar:widget-bold")}
                </div>

                <div class="settings-item-content">

                    <strong>
                        Tiện ích Wiki
                    </strong>

                    <span>
                        Bật các công cụ hỗ trợ khi sử dụng Wiki
                    </span>

                </div>

                <div class="tool-main-actions">

                    <!-- NÚT MỞ RỘNG -->
                    <button
    type="button"
    class="wiki-tools-expand"
    id="toolExpandBtn"
    aria-expanded="false"
>
    <iconify-icon
    icon="solar:alt-arrow-up-bold"
></iconify-icon>
</button>

                    <!-- TOGGLE TỔNG -->
                    <div
                        class="toggle-switch ${
                            allEnabled ? "active" : ""
                        }"
                        id="settingsToolsToggle"
                    ></div>

                </div>

            </div>


            <!-- ==================================
                 TOOL RIÊNG
            ================================== -->

            <div
                class="settings-tools-list"
                id="settingsToolsList"
                style="max-height:0;overflow:hidden;"
            >

                ${tools.map(tool => `

                    <div
                        class="settings-item tool-child-setting"
                        data-tool-id="${tool.id}"
                    >

                        <div class="settings-item-icon">
                            ${this.icon(tool.icon)}
                        </div>

                        <div class="settings-item-content">

                            <strong>
                                ${tool.name}
                            </strong>

                            <span>
                                ${tool.description}
                            </span>

                        </div>

                        <div
                            class="toggle-switch ${
                                tool.enabled
                                    ? "active"
                                    : ""
                            }"
                        ></div>

                    </div>

                `).join("")}

            </div>
        `;


        // ==========================================
        // 📌 QUAN TRỌNG:
        // CHÈN SAU CARD THÔNG BÁO
        // KHÔNG CHÈN VÀO CARD THÔNG BÁO
        // ==========================================

        const notificationCard =
            notification.closest(".settings-card") ||
            notification.parentElement;

        notificationCard?.parentNode.insertBefore(
            toolsCard,
            notificationCard.nextSibling
        );


        const mainToggle =
            toolsCard.querySelector(
                "#settingsToolsToggle"
            );

        const expandBtn =
            toolsCard.querySelector(
                "#toolExpandBtn"
            );

        const toolsList =
            toolsCard.querySelector(
                "#settingsToolsList"
            );


        // ==========================================
        // 🔽 MỞ / ĐÓNG TOOL
        // ==========================================

        expandBtn?.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                const expanded =
                    toolsCard.classList.toggle(
                        "tools-expanded"
                    );

                expandBtn.setAttribute(
                    "aria-expanded",
                    String(expanded)
                );

                // Đổi icon:
                // ▶ = đóng
                // ▼ = mở
                expandBtn.classList.toggle(
    "active",
    expanded
);

                toolsList.style.maxHeight =
                    expanded
                        ? `${toolsList.scrollHeight}px`
                        : "0px";
            }
        );


        // ==========================================
        // 🔄 RENDER TRẠNG THÁI
        // ==========================================

        const renderMain = () => {

            const current =
                toolManager.getAll();

            const enabled =
                current.length > 0 &&
                current.every(
                    tool => tool.enabled
                );


            // Toggle tổng
            mainToggle?.classList.toggle(
                "active",
                enabled
            );


            // Toggle từng tool
            current.forEach(tool => {

                const item =
                    toolsList.querySelector(
                        `[data-tool-id="${tool.id}"]`
                    );

                item
                    ?.querySelector(".toggle-switch")
                    ?.classList.toggle(
                        "active",
                        tool.enabled
                    );
            });
        };


        // ==========================================
        // ⚡ TOGGLE TỔNG
        // ==========================================

        mainToggle?.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                const current =
                    toolManager.getAll();

                const enable =
                    !(
                        current.length > 0 &&
                        current.every(
                            tool => tool.enabled
                        )
                    );


                // Bật / tắt TOÀN BỘ 3 TOOL
                current.forEach(tool => {

                    toolManager.setEnabled(
                        tool.id,
                        enable
                    );

                });


                renderMain();
            }
        );


        // ==========================================
        // 🧰 TOGGLE TOOL RIÊNG
        // ==========================================

        toolsList
            .querySelectorAll(
                "[data-tool-id]"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    e => {

                        e.stopPropagation();

                        const id =
                            item.dataset.toolId;

                        toolManager.toggle(id);

                        renderMain();
                    }
                );

            });


        // ==========================================
        // 🖱️ CLICK CARD CHÍNH
        // ==========================================

        document
            .getElementById("settingsToolsMain")
            ?.addEventListener(
                "click",
                e => {

                    // Không toggle khi bấm
                    // nút mở rộng hoặc switch
                    if (
                        e.target.closest(
                            "#toolExpandBtn, #settingsToolsToggle"
                        )
                    ) {
                        return;
                    }

                    expandBtn?.click();
                }
            );
    }


    // ==========================================
    // 🔙 QUAY LẠI
    // ==========================================

    document
        .getElementById("settingsBack")
        ?.addEventListener(
            "click",
            () =>
                HydYarWiki.navigate("profile")
        );


    // ==========================================
    // 🧹 XÓA DỮ LIỆU TẠM
    // ==========================================

    document
        .getElementById("clearTempData")
        ?.addEventListener(
            "click",
            async () => {

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
                            cacheNames.map(
                                name =>
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

                    alert(
                        "Đã xóa dữ liệu tạm."
                    );

                } catch (error) {

                    console.error(
                        "Lỗi xóa dữ liệu tạm:",
                        error
                    );

                    alert(
                        "Không thể xóa hoàn toàn dữ liệu tạm."
                    );
                }
            }
        );


    // ==========================================
    // 🗑️ XÓA TOÀN BỘ DỮ LIỆU
    // ==========================================

    document
        .getElementById("clearAllData")
        ?.addEventListener(
            "click",
            async () => {

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
                            cacheNames.map(
                                name =>
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
                                .filter(
                                    database =>
                                        database.name
                                )
                                .map(
                                    database =>
                                        new Promise(
                                            resolve => {

                                                const request =
                                                    indexedDB.deleteDatabase(
                                                        database.name
                                                    );

                                                request.onsuccess =
                                                    resolve;

                                                request.onerror =
                                                    resolve;

                                                request.onblocked =
                                                    resolve;

                                            }
                                        )
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
            }
        );
}
}