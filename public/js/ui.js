/**
 * Ui.js
 * Chịu trách nhiệm: Quản lý UI Components, hiển thị, animation, event listener
 * Có lifecycle rõ ràng: init() chỉ chạy 1 lần, render() cập nhật UI từ state
 * Không tự quyết định route, chỉ phục vụ Router/Page
 */
export default class Ui {

    constructor(app) {
        this.app = app;
    }

    /* =====================================================
       🔧 UTILITY
       ===================================================== */
    icon(n) {
        return `<iconify-icon icon="${n}"></iconify-icon>`;
    }

    slugify(s) {
        return s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    /* =====================================================
       🧭 NAVIGATION DRAWER
       ✅ Cải tiến: Chỉ init 1 lần duy nhất
       ===================================================== */
    initNavigation() {
        const state = this.app.state;

        // Kiểm tra đã init chưa — ngăn gắn listener trùng lặp
        if (state.navigationInitialized) return;

        const menuBtn = document.getElementById("menuBtn");
        const drawer = document.getElementById("navigationDrawer");
        const overlay = document.getElementById("navOverlay");
        const closeBtn = document.getElementById("drawerClose");

        if (!menuBtn || !drawer || !overlay) {
            console.warn("[HydYar Wiki] Không tìm thấy Navigation.");
            return;
        }

        /* =====================================================
           🔓 OPEN
           ===================================================== */
        const openDrawer = () => {
            drawer.classList.add("open");
            overlay.classList.add("show");
            document.body.classList.add("navigation-open");
            menuBtn.classList.add("open");
            menuBtn.setAttribute("aria-expanded", "true");
        };

        /* =====================================================
           🔒 CLOSE
           ===================================================== */
        const closeDrawer = () => {
            drawer.classList.remove("open");
            overlay.classList.remove("show");
            document.body.classList.remove("navigation-open");
            menuBtn.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
        };

        // Lưu reference để các module khác có thể gọi
        state.drawer = { open: openDrawer, close: closeDrawer };

        /* =====================================================
           ☰ MENU
           ===================================================== */
        menuBtn.addEventListener("click", () => {
            if (drawer.classList.contains("open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        /* =====================================================
           ✕ CLOSE
           ===================================================== */
        closeBtn?.addEventListener("click", closeDrawer);

        /* =====================================================
           🌑 OVERLAY
           ===================================================== */
        overlay.addEventListener("click", closeDrawer);

        /* =====================================================
           🧭 NAVIGATION ITEMS
           ===================================================== */
        drawer.querySelectorAll(".drawer-nav-item").forEach(button => {
            button.addEventListener("click", () => {
                const page = button.dataset.page;
                if (!page) return;

                drawer.querySelectorAll(".drawer-nav-item").forEach(item => {
                    item.classList.toggle("active", item === button);
                });

                closeDrawer();
                HydYarWiki.navigate(page);
            });
        });

        /* =====================================================
           🔖 BOOKMARK
           ===================================================== */
        document.getElementById("drawerBookmark")?.addEventListener("click", () => {
            closeDrawer();
            HydYarWiki.navigate("profile");
        });

        /* =====================================================
           🕘 HISTORY
           ===================================================== */
        document.getElementById("drawerHistory")?.addEventListener("click", () => {
            closeDrawer();
            HydYarWiki.navigate("history");
        });

        /* =====================================================
           ⚙️ SETTINGS
           ===================================================== */
        document.getElementById("drawerSettings")?.addEventListener("click", () => {
            closeDrawer();
            HydYarWiki.navigate("settings");
        });

        /* =====================================================
           ⌨️ ESC
           ===================================================== */
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && drawer.classList.contains("open")) {
                closeDrawer();
            }
        });

        /* =====================================================
           🔙 POPSTATE — chỉ đóng drawer, không xử lý route
           ===================================================== */
        window.addEventListener("popstate", () => {
            closeDrawer();
        });

        /* =====================================================
           🖥️ RESPONSIVE BREAKPOINT
           ===================================================== */
        const desktopQuery = window.matchMedia("(min-width: 768px)");

        const handleBreakpoint = e => {
            if (e.matches) {
                closeDrawer();
            }
        };

        desktopQuery.addEventListener("change", handleBreakpoint);

        /* =====================================================
           👆 EDGE SWIPE
           ===================================================== */
        let startX = 0;
        let startY = 0;
        let tracking = false;

        const EDGE_SIZE = 24;
        const SWIPE_DISTANCE = 60;

        document.addEventListener("touchstart", e => {
            if (
                window.innerWidth >= 768 ||
                !e.touches ||
                e.touches.length !== 1
            ) {
                return;
            }

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            tracking = !drawer.classList.contains("open") && startX <= EDGE_SIZE;
        }, { passive: true });

        document.addEventListener("touchend", e => {
            if (!tracking) return;
            tracking = false;

            if (!e.changedTouches || e.changedTouches.length !== 1) {
                return;
            }

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);

            if (deltaX >= SWIPE_DISTANCE && deltaX > deltaY) {
                openDrawer();
            }
        }, { passive: true });

        // Đánh dấu đã init
        state.navigationInitialized = true;
    }

    /* =====================================================
       🌙 DARK MODE
       ✅ Cải tiến: State → Render, không gắn listener trùng
       ===================================================== */
    initDarkMode() {
        const { $dom: s } = this.app.state;
        s.darkModeToggle = document.getElementById("darkModeToggle");
        if (!s.darkModeToggle) return;

        // Đã init rồi → chỉ cập nhật UI
        if (s.darkModeToggle.dataset.initialized === "true") {
            this.renderDarkMode();
            return;
        }

        // ✅ Khôi phục từ localStorage vào State trước
        const storedTheme = localStorage.getItem("wiki-theme") || "light";
        this.app.state.theme = storedTheme;

        // Gắn listener 1 lần duy nhất
        s.darkModeToggle.addEventListener("click", () => {
            // User click → thay đổi State
            this.app.state.theme = this.app.state.theme === "dark" ? "light" : "dark";
            // Lưu State
            localStorage.setItem("wiki-theme", this.app.state.theme);
            // Render UI từ State
            this.renderDarkMode();
        });

        s.darkModeToggle.dataset.initialized = "true";
        this.renderDarkMode();
    }

    renderDarkMode() {
        const { $dom: s, theme } = this.app.state;
        document.documentElement.setAttribute("data-theme", theme);
        s.darkModeToggle?.querySelector(".toggle-switch")
            ?.classList.toggle("active", theme === "dark");
    }

    /* =====================================================
       ⚡ PERFORMANCE / OPTIMIZE
       ✅ Cải tiến: Khôi phục State từ localStorage trước
       ===================================================== */
    initPerformance() {
        const state = this.app.state;

        // ✅ Khôi phục từ localStorage vào State TRƯỚC
        const storedOptimize = localStorage.getItem("optimizeMode");
        state.optimizeEnabled = storedOptimize !== null ? storedOptimize === "true" : false;

        // Phát hiện thiết bị yếu
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

        // Đã init rồi → chỉ render
        if (btn.dataset.optimizeInit === "true") {
            this.renderPerformance();
            return;
        }

        // Gắn listener 1 lần
        btn.addEventListener("click", () => {
            state.optimizeEnabled = !state.optimizeEnabled;
            localStorage.setItem("optimizeMode", String(state.optimizeEnabled));
            this.renderPerformance();
        });

        btn.dataset.optimizeInit = "true";
        this.renderPerformance();
    }

    renderPerformance() {
        const state = this.app.state;
        const toggle = document.querySelector("#optimizeToggle .toggle-switch");

        document.documentElement.classList.toggle("low-end", state.optimizeEnabled);
        toggle?.classList.toggle("active", state.optimizeEnabled);

        // Xử lý animation setting
        const animationSetting = localStorage.getItem("wiki-animations");
        const animationEnabled = animationSetting === null ? true : animationSetting === "true";
        const shouldAnimate = !state.optimizeEnabled && animationEnabled;

        document.documentElement.classList.toggle("no-animations", !shouldAnimate);
        document.getElementById("settingsAnimations")
            ?.classList.toggle("settings-disabled", state.optimizeEnabled);
    }

    /* =====================================================
       🗄️ DOM CACHE + GLOBAL EVENTS
       ✅ Cải tiến: Chỉ init 1 lần
       ===================================================== */
    initDomCache() {
        const state = this.app.state;

        // Đã init rồi → bỏ qua
        if (state.domCacheInitialized) return;

        Object.assign(state.$dom, {
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

        // ===== Global Events =====
        document.getElementById("premiumBack")?.addEventListener("click", () => {
            HydYarWiki.back();
        });

        document.getElementById("openPremium")?.addEventListener("click", () => {
            HydYarWiki.navigate("premium");
        });

        document.getElementById("openCountryChat")?.addEventListener("click", () => {
            HydYarWiki.navigate("countryChat");
        });

        document.getElementById("wikiSetting")?.addEventListener("click", () => {
            HydYarWiki.navigate("settings");
        });

        document.getElementById("countryChatBack")?.addEventListener("click", () => {
            // Đóng drawer nếu đang mở
            this.app.state.drawer?.close?.();
            HydYarWiki.back();
        });

        state.domCacheInitialized = true;
    }

    /* =====================================================
       ⌨️ KEYBOARD DETECTION
       ===================================================== */
    initKeyboard() {
        const vh = window.visualViewport;
        if (!vh) return;

        const check = () => {
            const open = window.visualViewport &&
                visualViewport.height < window.innerHeight * 0.8;

            document.body.classList.toggle("keyboard-open", open);
        };

        vh.addEventListener("resize", check);
    }

    /* =====================================================
       💬 CHAT ANIMATION
       ✅ Cải tiến: KHÔNG tự nghe popstate để đoán route
       Chỉ cung cấp openChat() / closeChat() cho Router gọi
       ===================================================== */
    initChatAnimation() {
        const state = this.app.state;

        // Đã init rồi → bỏ qua
        if (state.chatAnimationInitialized) return;

        const header = document.querySelector(".chat-header");
        const input = document.querySelector(".chat-input");
        const bottom = document.querySelector(".bottom-nav");

        if (!header || !input) return;

        // Chuẩn bị animation
        header.classList.add("chat-animate");
        input.classList.add("chat-animate");

        // ✅ Chỉ cung cấp phương thức, Router sẽ gọi khi cần
        state.chatUI = {
            openChat: () => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        header.classList.add("chat-show");
                        input.classList.add("chat-show");
                        bottom?.classList.add("chat-hide");

                        requestAnimationFrame(() => {
                            this.app.chat.isScrolledInit = false;
                            const box = document.getElementById("countryChatMessages");
                            if (box && this.app.chat.messages.length > 0) {
                                this.app.chat.scrollToBottom(true);
                            }
                        });
                    });
                });
            },

            closeChat: () => {
                header.classList.remove("chat-show");
                input.classList.remove("chat-show");
                bottom?.classList.remove("chat-hide");
            }
        };

        // Xử lý bàn phím ảo — trách nhiệm của UI
        if (window.visualViewport) {
            visualViewport.addEventListener("resize", () => {
                const keyboard = visualViewport.height < window.innerHeight * 0.8;
                document.body.classList.toggle("keyboard-open", keyboard);
            });
        }

        state.chatAnimationInitialized = true;
    }

    // Phương thức tiện ích cho Router gọi
    openChat() {
        this.app.state.chatUI?.openChat?.();
    }

    closeChat() {
        this.app.state.chatUI?.closeChat?.();
    }

    /* =====================================================
       ⚙️ SETTINGS
       ✅ Cải tiến: Chỉ init 1 lần, tách render, có thể destroy
       ===================================================== */
    initSettings() {
        const state = this.app.state;

        // Đã init rồi → chỉ cập nhật UI
        if (state.settingsInitialized) {
            this.renderSettings();
            return;
        }

        // Khởi tạo settings trong state nếu chưa có
        if (!state.settings) {
            state.settings = {};
        }

        // Lưu danh sách listener để có thể destroy sau này
        state._settingsListeners = [];

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
            let enabled = stored === null ? defaultValue : stored === "true";

            // Lưu vào state trung tâm
            state.settings[key] = enabled;

            const handler = () => {
                if (key === "wiki-animations" && state.optimizeEnabled) {
                    return;
                }

                state.settings[key] = !state.settings[key];
                localStorage.setItem(key, String(state.settings[key]));
                this.renderSettings();
            };

            element.addEventListener("click", handler);
            state._settingsListeners.push({ element, handler });
        });

        // ==========================================
        // 🧰 TIỆN ÍCH WIKI
        // ==========================================
        const notification = document.getElementById("settingsNotifications");
        if (notification) {
            // Xóa card cũ nếu initSettings() bị gọi lại
            document.getElementById("settingsTools")?.remove();

            const toolManager = this.app.tool;

            if (!toolManager) {
                console.warn("[HydYar Wiki] Tool manager chưa được khởi tạo.");
            } else {
                this._initSettingsTools(notification, toolManager);
            }
        }

        // ==========================================
        // 🔙 QUAY LẠI
        // ==========================================
        const settingsBack = document.getElementById("settingsBack");
        if (settingsBack) {
            const backHandler = () => HydYarWiki.navigate("profile");
            settingsBack.addEventListener("click", backHandler);
            state._settingsListeners.push({ element: settingsBack, handler: backHandler });
        }

        // ==========================================
        // 🧹 XÓA DỮ LIỆU TẠM
        // ==========================================
        const clearTempBtn = document.getElementById("clearTempData");
        if (clearTempBtn) {
            const tempHandler = async () => {
                const ok = confirm(
                    "Xóa dữ liệu tạm?\n\n" +
                    "Dữ liệu đăng nhập và các cài đặt sẽ được giữ lại."
                );
                if (!ok) return;

                try {
                    sessionStorage.clear();
                    if ("caches" in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                    ["searchHistory", "wikiSearchHistory", "temporaryData", "optimizeCache"]
                        .forEach(key => localStorage.removeItem(key));
                    alert("Đã xóa dữ liệu tạm.");
                } catch (error) {
                    console.error("Lỗi xóa dữ liệu tạm:", error);
                    alert("Không thể xóa hoàn toàn dữ liệu tạm.");
                }
            };
            clearTempBtn.addEventListener("click", tempHandler);
            state._settingsListeners.push({ element: clearTempBtn, handler: tempHandler });
        }

        // ==========================================
        // 🗑️ XÓA TOÀN BỘ DỮ LIỆU
        // ==========================================
        const clearAllBtn = document.getElementById("clearAllData");
        if (clearAllBtn) {
            const allHandler = async () => {
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
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }

                    if ("indexedDB" in window && indexedDB.databases) {
                        const databases = await indexedDB.databases();
                        await Promise.all(
                            databases
                                .filter(database => database.name)
                                .map(database => new Promise(resolve => {
                                    const request = indexedDB.deleteDatabase(database.name);
                                    request.onsuccess = resolve;
                                    request.onerror = resolve;
                                    request.onblocked = resolve;
                                }))
                        );
                    }

                    alert("Đã xóa toàn bộ dữ liệu Wiki.");
                    location.reload();
                } catch (error) {
                    console.error("Lỗi xóa toàn bộ dữ liệu:", error);
                    alert("Không thể xóa toàn bộ dữ liệu.");
                }
            };
            clearAllBtn.addEventListener("click", allHandler);
            state._settingsListeners.push({ element: clearAllBtn, handler: allHandler });
        }

        state.settingsInitialized = true;
        this.renderSettings();
    }

    /**
     * Khởi tạo phần Tools trong Settings
     */
    _initSettingsTools(notification, toolManager) {
        const state = this.app.state;
        const tools = toolManager.getAll();
        const allEnabled = tools.length > 0 && tools.every(tool => tool.enabled);

        const toolsCard = document.createElement("div");
        toolsCard.id = "settingsTools";
        toolsCard.className = "settings-card settings-tools-card";

        toolsCard.innerHTML = `
            <div class="settings-item tool-main-setting" id="settingsToolsMain">
                <div class="settings-item-icon">
                    ${this.icon("solar:widget-bold")}
                </div>
                <div class="settings-item-content">
                    <strong>Tiện ích Wiki</strong>
                    <span>Bật các công cụ hỗ trợ khi sử dụng Wiki</span>
                </div>
                <div class="tool-main-actions">
                    <button type="button" class="wiki-tools-expand" id="toolExpandBtn" aria-expanded="false">
                        <iconify-icon icon="solar:alt-arrow-up-bold"></iconify-icon>
                    </button>
                    <div class="toggle-switch ${allEnabled ? "active" : ""}" id="settingsToolsToggle"></div>
                </div>
            </div>
            <div class="settings-tools-list" id="settingsToolsList" style="max-height:0;overflow:hidden;">
                ${tools.map(tool => `
                    <div class="settings-item tool-child-setting" data-tool-id="${tool.id}">
                        <div class="settings-item-icon">
                            ${this.icon(tool.icon)}
                        </div>
                        <div class="settings-item-content">
                            <strong>${tool.name}</strong>
                            <span>${tool.description}</span>
                        </div>
                        <div class="toggle-switch ${tool.enabled ? "active" : ""}"></div>
                    </div>
                `).join("")}
            </div>
        `;

        const notificationCard = notification.closest(".settings-card") || notification.parentElement;
        notificationCard?.parentNode.insertBefore(toolsCard, notificationCard.nextSibling);

        const mainToggle = toolsCard.querySelector("#settingsToolsToggle");
        const expandBtn = toolsCard.querySelector("#toolExpandBtn");
        const toolsList = toolsCard.querySelector("#settingsToolsList");

        // 🔽 MỞ / ĐÓNG TOOL
        const expandHandler = e => {
            e.stopPropagation();
            const expanded = toolsCard.classList.toggle("tools-expanded");
            expandBtn.setAttribute("aria-expanded", String(expanded));
            expandBtn.classList.toggle("active", expanded);
            toolsList.style.maxHeight = expanded ? `${toolsList.scrollHeight}px` : "0px";
        };
        expandBtn?.addEventListener("click", expandHandler);
        state._settingsListeners.push({ element: expandBtn, handler: expandHandler });

        // 🔄 RENDER TRẠNG THÁI
        const renderMain = () => {
            const current = toolManager.getAll();
            const enabled = current.length > 0 && current.every(tool => tool.enabled);
            mainToggle?.classList.toggle("active", enabled);

            current.forEach(tool => {
                const item = toolsList.querySelector(`[data-tool-id="${tool.id}"]`);
                item?.querySelector(".toggle-switch")
                    ?.classList.toggle("active", tool.enabled);
            });
        };

        // ⚡ TOGGLE TỔNG
        const mainToggleHandler = e => {
            e.stopPropagation();
            const current = toolManager.getAll();
            const enable = !(current.length > 0 && current.every(tool => tool.enabled));
            current.forEach(tool => toolManager.setEnabled(tool.id, enable));
            renderMain();
        };
        mainToggle?.addEventListener("click", mainToggleHandler);
        state._settingsListeners.push({ element: mainToggle, handler: mainToggleHandler });

        // 🧰 TOGGLE TOOL RIÊNG
        toolsList.querySelectorAll("[data-tool-id]").forEach(item => {
            const toolHandler = e => {
                e.stopPropagation();
                const id = item.dataset.toolId;
                toolManager.toggle(id);
                renderMain();
            };
            item.addEventListener("click", toolHandler);
            state._settingsListeners.push({ element: item, handler: toolHandler });
        });

        // 🖱️ CLICK CARD CHÍNH
        const mainCard = document.getElementById("settingsToolsMain");
        if (mainCard) {
            const mainCardHandler = e => {
                if (e.target.closest("#toolExpandBtn, #settingsToolsToggle")) return;
                expandBtn?.click();
            };
            mainCard.addEventListener("click", mainCardHandler);
            state._settingsListeners.push({ element: mainCard, handler: mainCardHandler });
        }
    }

    renderSettings() {
        const state = this.app.state;
        if (!state.settings) return;

        const settingsMap = {
            "settingsAnimations": "wiki-animations",
            "settingsReadingPosition": "wiki-reading-position",
            "settingsToc": "wiki-toc",
            "settingsNotifications": "wiki-notifications",
            "settingsExperimental": "wiki-experimental"
        };

        Object.entries(settingsMap).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (!element) return;

            const toggle = element.querySelector(".toggle-switch");
            const enabled = state.settings[key];

            if (key === "wiki-animations") {
                const visualEnabled = state.optimizeEnabled ? false : enabled;
                toggle?.classList.toggle("active", visualEnabled);

                const shouldAnimate = enabled && !state.optimizeEnabled;
                document.documentElement.classList.toggle("no-animations", !shouldAnimate);
                element.classList.toggle("settings-disabled", state.optimizeEnabled);
            } else {
                toggle?.classList.toggle("active", enabled);
            }
        });
    }

      /* =====================================================
       👤 PUBLIC PROFILE
       Hiển thị hồ sơ công khai của người dùng
       Router chịu trách nhiệm route/back
       UI chịu trách nhiệm fetch + render
       ===================================================== */
    async openPublicProfile(name) {

        const loading =
            document.getElementById(
                "publicProfileLoading"
            );

        const content =
            document.getElementById(
                "publicProfileContent"
            );

        const error =
            document.getElementById(
                "publicProfileError"
            );

        const errorText =
            document.getElementById(
                "publicProfileErrorText"
            );

        // ==============================
        // RESET UI
        // ==============================

        loading?.classList.remove("hidden");
        content?.classList.add("hidden");
        error?.classList.add("hidden");

        try {

            // ==============================
            // REQUEST
            // ==============================

            const response =
                await fetch(
                    `/api/profile/${encodeURIComponent(name)}`,
                    {
                        credentials: "include"
                    }
                );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success ||
                !result.data
            ) {
                throw new Error(
                    result.message ||
                    "Không tìm thấy người dùng"
                );
            }

            const user = result.data;

            // ==============================
            // AVATAR
            // ==============================

            const avatar =
                document.getElementById(
                    "publicProfileAvatar"
                );

            if (avatar) {

                avatar.src =
                    user.avatar ||
                    "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(
                        user.name || "User"
                    );

                avatar.alt =
                    user.name || "Avatar";
            }

            // ==============================
            // NAME
            // ==============================

            document
                .getElementById(
                    "publicProfileName"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        user.name ||
                        "Người dùng"
                    )
                );

            // ==============================
            // ID
            // ==============================

            document
                .getElementById(
                    "publicProfileId"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        user.id ||
                        "Chưa có ID"
                    )
                );

            // ==============================
            // ROLE
            // ==============================

            const roleNames = {

                admin: "Quản trị viên",

                creator: "Nhà sáng tạo",

                moderator: "Kiểm duyệt viên",

                user: "Thành viên"

            };

            const role =
                roleNames[user.role] ||
                "Thành viên";

            document
                .getElementById(
                    "publicProfileRole"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        role
                    )
                );

            // ==============================
            // BIO
            // ==============================

            const bio =
                document.getElementById(
                    "publicProfileBio"
                );

            if (bio) {

                bio.textContent =
                    user.bio ||
                    "Chưa có giới thiệu.";
            }

            // ==============================
            // PREMIUM
            // ==============================

            const premium =
                document.getElementById(
                    "publicProfilePremium"
                );

            premium?.classList.toggle(
                "hidden",
                user.plan !== "Premium"
            );

            // ==============================
            // INFO
            // ==============================

            document
                .getElementById(
                    "publicProfileInfoName"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        user.name || "-"
                    )
                );

            document
                .getElementById(
                    "publicProfileInfoId"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        user.id || "-"
                    )
                );

            document
                .getElementById(
                    "publicProfileInfoRole"
                )
                ?.replaceChildren(
                    document.createTextNode(
                        role
                    )
                );

            // ==============================
            // CREATED AT
            // ==============================

            const createdAt =
                document.getElementById(
                    "publicProfileCreatedAt"
                );

            if (createdAt) {

                if (user.createdAt) {

                    const date =
                        new Date(
                            user.createdAt
                        );

                    createdAt.textContent =
                        date.toLocaleDateString(
                            "vi-VN"
                        );

                } else {

                    createdAt.textContent =
                        "Không rõ";

                }
            }

            // ==============================
            // STATS
            // ==============================

            const articleCount =
                document.getElementById(
                    "publicProfileArticleCount"
                );

            if (articleCount) {
                articleCount.textContent =
                    user.stats?.articles ?? 0;
            }

            const commentCount =
                document.getElementById(
                    "publicProfileCommentCount"
                );

            if (commentCount) {
                commentCount.textContent =
                    user.stats?.comments ?? 0;
            }

            const badgeCount =
                document.getElementById(
                    "publicProfileBadgeCount"
                );

            if (badgeCount) {
                badgeCount.textContent =
                    user.badges?.length ?? 0;
            }

            // ==============================
            // BADGES
            // ==============================

            const badgesSection =
                document.getElementById(
                    "publicProfileBadgesSection"
                );

            const badgesContainer =
                document.getElementById(
                    "publicProfileBadges"
                );

            if (
                badgesContainer &&
                Array.isArray(user.badges) &&
                user.badges.length
            ) {

                badgesContainer.innerHTML = "";

                user.badges.forEach(badge => {

                    const element =
                        document.createElement(
                            "div"
                        );

                    element.className =
                        "public-profile-badge";

                    element.textContent =
                        `🏆 ${badge}`;

                    badgesContainer.appendChild(
                        element
                    );

                });

                badgesSection
                    ?.classList.remove("hidden");

            } else {

                badgesSection
                    ?.classList.add("hidden");

            }

            // ==============================
            // HIỂN THỊ
            // ==============================

            loading?.classList.add("hidden");
            error?.classList.add("hidden");
            content?.classList.remove("hidden");

        } catch (err) {

            console.error(
                "❌ Public Profile:",
                err
            );

            loading?.classList.add("hidden");
            content?.classList.add("hidden");
            error?.classList.remove("hidden");

            if (errorText) {

                errorText.textContent =
                    err.message ||
                    "Không thể tải hồ sơ.";

            }

        }
    }

    /**
     * ✅ Destroy Settings — gỡ toàn bộ listener
     * Dùng khi cần reset hoàn toàn module
     */
    destroySettings() {
        const state = this.app.state;
        if (state._settingsListeners) {
            state._settingsListeners.forEach(({ element, handler }) => {
                try {
                    element.removeEventListener("click", handler);
                } catch (e) {
                    // Element có thể đã bị xóa khỏi DOM
                }
            });
        }
        state.settingsInitialized = false;
        state._settingsListeners = [];
    }
}