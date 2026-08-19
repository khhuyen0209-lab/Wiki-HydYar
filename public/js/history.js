// js/history.js

export default function History(appStatus) {

    const KEY = "wiki_read_history";


    return {

        // =====================================================
        // 📚 THÊM LỊCH SỬ
        // =====================================================

        add(article) {

            if (!article?.id) return;


            let list = [];

            try {

                list = JSON.parse(
                    localStorage.getItem(KEY) || "[]"
                );


                if (!Array.isArray(list)) {

                    list = [];

                }

            } catch (e) {

                console.warn(
                    "Không thể đọc lịch sử:",
                    e
                );

                list = [];

            }


            // Xóa bản cũ nếu bài viết đã tồn tại
            list = list.filter(
                item =>
                    String(item.id) !==
                    String(article.id)
            );


            // Thêm bài mới lên đầu
            list.unshift({

                id:
                    article.id,

                title:
                    article.title ||
                    "Không có tiêu đề",

                desc:
                    article.desc ||
                    "",

                categoryId:
                    article.categoryId ||
                    "khac",

                time:
                    Date.now()

            });


            // Giới hạn tối đa 100 bài
            try {

                localStorage.setItem(
                    KEY,
                    JSON.stringify(
                        list.slice(0, 100)
                    )
                );

            } catch (e) {

                console.warn(
                    "Không thể lưu lịch sử:",
                    e
                );

            }

        },


        // =====================================================
        // 📖 LẤY LỊCH SỬ
        // =====================================================

        get() {

            try {

                const list = JSON.parse(
                    localStorage.getItem(KEY) || "[]"
                );


                if (!Array.isArray(list)) {

                    return [];

                }


                return list
                    .filter(
                        item =>
                            item &&
                            item.id
                    )
                    .sort(
                        (a, b) =>
                            Number(b.time || 0) -
                            Number(a.time || 0)
                    );

            } catch (e) {

                console.error(
                    "History parse lỗi:",
                    e
                );

                return [];

            }

        },


        // =====================================================
        // 🗑️ XÓA LỊCH SỬ
        // =====================================================

        clear() {

            try {

                localStorage.removeItem(KEY);

            } catch (e) {

                console.warn(
                    "Không thể xóa lịch sử:",
                    e
                );

            }

        },


        // =====================================================
        // 🎨 RENDER
        // =====================================================

        render() {

            const page =
                document.getElementById(
                    "page-history"
                );


            if (!page) {

                console.error(
                    "[History] Không tìm thấy #page-history"
                );

                return;

            }


            const list =
                this.get();


            page.innerHTML = `

                <div class="history-page">

                    <!-- =====================================
                         HEADER
                         ===================================== -->

                    <div
                        class="history-header"
                    >

                        <button
                            id="historyBack"
                            class="policy-back"
                            type="button"
                        >

                            ${appStatus.ui.icon(
                                "solar:arrow-left-bold"
                            )}

                            <span>
                                Lịch sử đọc
                            </span>

                        </button>


                        ${
                            list.length
                                ?
                                `
                                <button
                                    id="clearHistory"
                                    class="history-clear"
                                    type="button"
                                >
                                    Xóa lịch sử
                                </button>
                                `
                                :
                                ""
                        }

                    </div>


                    <!-- =====================================
                         LIST
                         ===================================== -->

                    <div
                        class="policy-page"
                        id="historyList"
                    >

                        ${
                            list.length

                                ?

                                list
                                    .map(
                                        article => {

                                            const id =
                                                appStatus.markdown
                                                    .escapeHTML(
                                                        String(
                                                            article.id
                                                        )
                                                    );


                                            const category =
                                                appStatus.markdown
                                                    .escapeHTML(
                                                        String(
                                                            article.categoryId ||
                                                            "khac"
                                                        )
                                                    );


                                            const title =
                                                appStatus.markdown
                                                    .escapeHTML(
                                                        article.title ||
                                                        "Không có tiêu đề"
                                                    );


                                            const desc =
                                                appStatus.markdown
                                                    .escapeHTML(
                                                        article.desc ||
                                                        "Chưa có mô tả"
                                                    );


                                            const time =
                                                Number(
                                                    article.time
                                                );


                                            const date =
                                                Number.isFinite(
                                                    time
                                                )
                                                    ?
                                                    new Date(
                                                        time
                                                    ).toLocaleString(
                                                        "vi-VN"
                                                    )
                                                    :
                                                    "";



                                            return `

                                                <div
                                                    class="article-card"
                                                    data-id="${id}"
                                                    data-cat="${category}"
                                                >

                                                    <div class="card-content">

                                                        <h3
                                                            class="card-title"
                                                        >
                                                            ${title}
                                                        </h3>


                                                        <p
                                                            class="card-desc"
                                                        >
                                                            ${desc}
                                                        </p>


                                                        ${
                                                            date
                                                                ?
                                                                `
                                                                <small>
                                                                    ${date}
                                                                </small>
                                                                `
                                                                :
                                                                ""
                                                        }

                                                    </div>

                                                </div>

                                            `;

                                        }
                                    )
                                    .join("")

                                :

                                `

                                <div class="empty-card">

                                    <div
                                        class="card-content empty-content"
                                    >

                                        ${appStatus.ui.icon(
                                            "solar:clock-circle-bold"
                                        )}

                                        <h3>
                                            Chưa có lịch sử đọc
                                        </h3>

                                        <p>
                                            Những bài viết bạn đã đọc
                                            sẽ xuất hiện ở đây.
                                        </p>

                                    </div>

                                </div>

                                `

                        }

                    </div>

                </div>

            `;


            this.bindEvents();

        },


        // =====================================================
        // 🔗 EVENTS
        // =====================================================

        bindEvents() {

            const page =
                document.getElementById(
                    "page-history"
                );


            if (!page) return;


            // =================================================
            // ⬅️ BACK
            // =================================================

            document
                .getElementById("historyBack")
                ?.addEventListener(
                    "click",
                    () => {

                        HydYarWiki.navigate(
                            "profile"
                        );

                    }
                );


            // =================================================
            // 🗑️ CLEAR
            // =================================================

            document
                .getElementById("clearHistory")
                ?.addEventListener(
                    "click",
                    () => {

                        const confirmed =
                            confirm(
                                "Xóa toàn bộ lịch sử đọc?"
                            );


                        if (!confirmed) {

                            return;

                        }


                        this.clear();


                        this.render();

                    }
                );


            // =================================================
            // 📖 ARTICLE
            // =================================================

            page
                .querySelectorAll(
                    ".article-card[data-id]"
                )
                .forEach(
                    card => {

                        card.addEventListener(
                            "click",
                            () => {

                                const id =
                                    card.dataset.id;


                                const category =
                                    card.dataset.cat ||
                                    "khac";


                                if (!id) {

                                    return;

                                }


                                HydYarWiki.navigate(
                                    "article",
                                    {

                                        category:
                                            category,

                                        id:
                                            id

                                    }
                                );

                            }
                        );

                    }
                );

        },


        // =====================================================
        // 📚 MỞ TRANG LỊCH SỬ
        // =====================================================

        open() {

            this.render();


            window.scrollTo({

                top: 0,

                left: 0,

                behavior: "instant"

            });

        }

    };

}