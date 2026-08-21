/**
 * Search.js
 * Chịu trách nhiệm:
 * - Tìm kiếm bài viết
 * - Tìm kiếm người dùng
 * - Lịch sử tìm kiếm
 * - Render kết quả
 *
 * API tìm kiếm duy nhất:
 * searchArticles(keyword)
 *
 * API trả về:
 * {
 *   articles: [],
 *   users: []
 * }
 */

import {
    searchArticles
} from "../firebase.js";


export default class Search {

    constructor(app) {

        this.app = app;

        this.historyKey = "wiki_search_history";

        this.initialized = false;

        // Chống request cũ ghi đè request mới
        this.searchRequestId = 0;
    }


    /* =====================================================
       🕘 SEARCH HISTORY
       ===================================================== */

    getHistory() {

        try {

            const history = JSON.parse(
                localStorage.getItem(this.historyKey) || "[]"
            );

            return Array.isArray(history)
                ? history
                : [];

        } catch (error) {

            console.warn(
                "[Search] Không thể đọc lịch sử tìm kiếm:",
                error
            );

            return [];
        }
    }


    saveHistory(keyword) {

        keyword = String(keyword ?? "").trim();

        if (!keyword) return;

        let history = this.getHistory();

        history = history.filter(
            item => item !== keyword
        );

        history.unshift(keyword);

        history = history.slice(0, 8);

        localStorage.setItem(
            this.historyKey,
            JSON.stringify(history)
        );
    }


    renderHistory() {

        const box =
            this.app.state.$dom.searchHistory;

        if (!box) return;

        const history = this.getHistory();

        if (!history.length) {

            box.innerHTML = "";

            return;
        }


        box.innerHTML = `

            <div class="search-divider"></div>

            <div class="search-history-title">
                Lịch sử tìm kiếm
            </div>

            <div class="search-history-list">

                ${history.map(item => `

                    <button
                        class="history-item"
                        type="button"
                        data-keyword="${this.escapeHTML(item)}"
                    >

                        <iconify-icon
                            icon="solar:history-bold">
                        </iconify-icon>

                        <span>
                            ${this.escapeHTML(item)}
                        </span>

                    </button>

                `).join("")}

            </div>
        `;


        box
            .querySelectorAll(".history-item")
            .forEach(btn => {

                btn.addEventListener("click", () => {

                    const keyword =
                        btn.dataset.keyword || "";

                    const searchInput =
                        this.app.state.$dom.searchInput;

                    if (searchInput) {

                        searchInput.value =
                            keyword;
                    }

                    this.search(keyword);
                });

            });
    }


    /* =====================================================
       🛡️ ESCAPE HTML
       ===================================================== */

    escapeHTML(value) {

        return String(value ?? "")

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       🔎 SEARCH
       ===================================================== */

    async search(keyword) {

        keyword =
            String(keyword ?? "").trim();


        const searchResults =
            this.app.state.$dom.searchResults;


        if (!searchResults) return;


        /* =================================================
           EMPTY
        ================================================= */

        if (!keyword) {

            this.searchRequestId++;

            searchResults.innerHTML = "";

            return;
        }


        /* =================================================
           REQUEST ID
           Chống:

           request A: "abc"
           request B: "abcd"

           nhưng A trả về sau B
           → A không được ghi đè kết quả B
        ================================================= */

        const requestId =
            ++this.searchRequestId;


        /* =================================================
           SAVE HISTORY
        ================================================= */

        this.saveHistory(keyword);

        this.renderHistory();


        /* =================================================
           LOADING
        ================================================= */

        searchResults.innerHTML =
            this.app.article.articleCardSkeleton(4);


        try {

            /* =================================================
               🔎 API SEARCH

               searchArticles(keyword)

               → /api/search?q=keyword

               → {
                    articles: [],
                    users: []
                 }
            ================================================= */

            const result =
                await searchArticles(keyword);


            // Nếu đã có request mới hơn
            if (requestId !== this.searchRequestId) {
                return;
            }


            const articles =
                Array.isArray(result?.articles)
                    ? result.articles
                    : [];


            const users =
                Array.isArray(result?.users)
                    ? result.users
                    : [];


            let html = "";


            /* =================================================
               👤 USERS
            ================================================= */

            if (users.length) {

                html += `

                    <section
                        class="search-user-section"
                    >

                        <div
                            class="search-section-title"
                        >

                            <iconify-icon
                                icon="solar:users-group-rounded-bold"
                            ></iconify-icon>

                            <span>
                                Người dùng
                            </span>

                        </div>


                        <div
                            class="search-user-list"
                        >

                            ${users.map(user => {

                                /*
                                 * Backend có thể trả:
                                 *
                                 * id
                                 * uid
                                 * hydyarId
                                 *
                                 * Ưu tiên HydYar ID.
                                 */

                                const id =
                                    user.hydyarId ||
                                    user.id ||
                                    user.uid ||
                                    "";


                                const name =
                                    user.name ||
                                    user.displayName ||
                                    "Người dùng";


                                const avatar =
                                    user.avatar ||
                                    user.photoURL ||
                                    "";


                                const role =
                                    user.role ||
                                    "user";


                                const roleNames = {

                                    admin:
                                        "Quản trị viên",

                                    creator:
                                        "Nhà sáng tạo",

                                    moderator:
                                        "Kiểm duyệt viên",

                                    user:
                                        "Thành viên"

                                };


                                const roleName =
                                    roleNames[role] ||
                                    role;


                                return `

                                    <button
                                        class="search-user-card"
                                        data-user-id="${this.escapeHTML(id)}"
                                        type="button"
                                    >

                                        <div
                                            class="search-user-avatar"
                                        >

                                            ${
                                                avatar

                                                ?

                                                `
                                                    <img
                                                        src="${this.escapeHTML(avatar)}"
                                                        alt="${this.escapeHTML(name)}"
                                                        loading="lazy"
                                                    >
                                                `

                                                :

                                                `
                                                    <iconify-icon
                                                        icon="solar:user-circle-bold"
                                                    ></iconify-icon>
                                                `
                                            }

                                        </div>


                                        <div
                                            class="search-user-info"
                                        >

                                            <strong>
                                                ${this.escapeHTML(name)}
                                            </strong>


                                            ${
                                                id

                                                ?

                                                `
                                                    <span>
                                                        HY | ${this.escapeHTML(id)}
                                                    </span>
                                                `

                                                :

                                                ""
                                            }


                                            <small>
                                                ${this.escapeHTML(roleName)}
                                            </small>

                                        </div>


                                        <iconify-icon
                                            class="search-user-arrow"
                                            icon="solar:arrow-right-2-bold"
                                        ></iconify-icon>

                                    </button>

                                `;

                            }).join("")}

                        </div>

                    </section>

                `;
            }


            /* =================================================
               📚 ARTICLES
            ================================================= */

            if (articles.length) {

                html += `

                    <section
                        class="search-article-section"
                    >

                        <div
                            class="search-section-title"
                        >

                            <iconify-icon
                                icon="solar:document-text-bold"
                            ></iconify-icon>

                            <span>
                                Bài viết
                            </span>

                        </div>


                        <div
                            class="search-results-list"
                        >

                            ${this.app.article.articleCard(
                                articles
                            )}

                        </div>

                    </section>

                `;
            }


            /* =================================================
               ❌ NOTHING FOUND
            ================================================= */

            if (
                !users.length &&
                !articles.length
            ) {

                html = `

                    <div
                        class="search-empty"
                    >

                        <iconify-icon
                            icon="solar:magnifer-bold"
                        ></iconify-icon>


                        <h3>
                            Không tìm thấy kết quả
                        </h3>


                        <p>
                            Không có người dùng hoặc bài viết
                            phù hợp với
                            "${this.escapeHTML(keyword)}".
                        </p>

                    </div>

                `;
            }


            /* =================================================
               🎨 RENDER
            ================================================= */

            searchResults.innerHTML =
                html;


            /* =================================================
               👤 USER CLICK
            ================================================= */

            searchResults
                .querySelectorAll(".search-user-card")
                .forEach(card => {

                    card.addEventListener(
                        "click",
                        () => {

                            const id =
                                card.dataset.userId;


                            if (!id) {

                                console.warn(
                                    "[Search] User không có HydYar ID."
                                );

                                return;
                            }


                            /*
                             * Mở public profile.
                             *
                             * Ui.openPublicProfile()
                             * sẽ nhận:
                             *
                             * hydyarId
                             *
                             * Router chịu trách nhiệm route.
                             */

                            HydYarWiki.navigate(
                                "public-profile",
                                {
                                    hydyarId: id
                                }
                            );

                        }
                    );

                });


        } catch (error) {

            // Request cũ không được hiển thị lỗi
            if (requestId !== this.searchRequestId) {
                return;
            }


            console.error(
                "[Search] Search error:",
                error
            );


            searchResults.innerHTML = `

                <div
                    class="search-empty"
                >

                    <iconify-icon
                        icon="solar:danger-circle-bold"
                    ></iconify-icon>


                    <h3>
                        Lỗi tìm kiếm
                    </h3>


                    <p>
                        Không thể tải kết quả tìm kiếm.
                    </p>

                </div>

            `;
        }
    }


    /* =====================================================
       🚀 INIT
    ===================================================== */

    init() {

        if (this.initialized) return;

        this.initialized = true;


        /* =================================================
           HISTORY
        ================================================= */

        this.renderHistory();


        /* =================================================
           MAIN SEARCH INPUT
        ================================================= */

        const searchInput =
            this.app.state.$dom.searchInput;


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                e => {

                    this.search(
                        e.target.value
                    );

                }
            );

        }


        /* =================================================
           QUICK SEARCH
           Header + Home
        ================================================= */

        const bindQuick = input => {

            if (!input) return;


            input.addEventListener(
                "keydown",
                e => {

                    if (e.key !== "Enter") {
                        return;
                    }


                    const keyword =
                        input.value.trim();


                    if (!keyword) return;


                    HydYarWiki.navigate(
                        "search"
                    );


                    requestAnimationFrame(() => {

                        const mainInput =
                            this.app.state.$dom.searchInput;


                        if (!mainInput) return;


                        mainInput.value =
                            keyword;


                        this.search(
                            keyword
                        );

                    });

                }
            );

        };


        bindQuick(
            this.app.state.$dom.headerSearch
        );


        bindQuick(
            this.app.state.$dom.homeSearch
        );


        /* =================================================
           🔍 HEADER SEARCH UI
        ================================================= */

        const header =
            this.app.state.$dom.header;


        const searchClose =
            this.app.state.$dom.searchClose;


        if (
            header &&
            searchInput
        ) {

            searchInput.addEventListener(
                "focus",
                () => {

                    header.classList.add(
                        "searching"
                    );

                }
            );


            searchInput.addEventListener(
                "blur",
                () => {

                    if (
                        !searchInput.value.trim()
                    ) {

                        header.classList.remove(
                            "searching"
                        );

                    }

                }
            );


            searchClose?.addEventListener(
                "click",
                () => {

                    searchInput.value = "";


                    searchInput.dispatchEvent(
                        new Event("input")
                    );


                    header.classList.remove(
                        "searching"
                    );


                    searchInput.blur();

                }
            );

        }

    }

}