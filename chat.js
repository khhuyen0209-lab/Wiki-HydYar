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


            // Xóa bản cũ nếu đã tồn tại
            list = list.filter(
                item =>
                    item.id !== article.id
            );


            // Thêm lên đầu
            list.unshift({

                id: article.id,

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


            // Giới hạn 100 bài
            localStorage.setItem(
                KEY,
                JSON.stringify(
                    list.slice(0, 100)
                )
            );

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


                return list.sort(
                    (a, b) =>
                        Number(b.time) -
                        Number(a.time)
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

            localStorage.removeItem(KEY);

        },


        // =====================================================
        // 🎨 RENDER UI
        // =====================================================

        render() {

            const listElement =
                document.getElementById(
                    "historyList"
                );


            const clearButton =
                document.getElementById(
                    "clearHistory"
                );


            if (!listElement) {

                console.error(
                    "Không tìm thấy #historyList"
                );

                return;

            }


            const list =
                this.get();


            // =================================================
            // 🗑️ HIỆN / ẨN NÚT XÓA
            // =================================================

            if (clearButton) {

                clearButton.style.display =
                    list.length
                        ? "block"
                        : "none";

            }


            // =================================================
            // 📭 EMPTY
            // =================================================

            if (!list.length) {

                listElement.innerHTML = `

                    <div class="empty-card">

                        <div class="card-content empty-content">

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

                `;

                return;

            }


            // =================================================
            // 📚 ARTICLES
            // =================================================

            listElement.innerHTML = list
                .map(article => {

                    const id =
                        appStatus.markdown.escapeHTML(
                            String(article.id)
                        );


                    const category =
                        appStatus.markdown.escapeHTML(
                            String(
                                article.categoryId ||
                                "khac"
                            )
                        );


                    const title =
                        appStatus.markdown.escapeHTML(
                            article.title ||
                            "Không có tiêu đề"
                        );


                    const desc =
                        appStatus.markdown.escapeHTML(
                            article.desc ||
                            "Chưa có mô tả"
                        );


                    const time =
                        new Date(
                            article.time
                        ).toLocaleString(
                            "vi-VN"
                        );


                    return `

                        <div
                            class="article-card"
                            data-id="${id}"
                            data-cat="${category}"
                        >

                            <div class="card-content">

                                <h3 class="card-title">
                                    ${title}
                                </h3>


                                <p class="card-desc">
                                    ${desc}
                                </p>


                                <small>
                                    ${time}
                                </small>

                            </div>

                        </div>

                    `;

                })
                .join("");


            // =================================================
            // 📖 CLICK ARTICLE
            // =================================================

            listElement
                .querySelectorAll(
                    ".article-card"
                )
                .forEach(card => {

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

                });

        },


        // =====================================================
        // 🚀 MỞ TRANG HISTORY
        // =====================================================

        open() {

            this.render();


            HydYarWiki.navigate(
                "history"
            );


            window.scrollTo(
                0,
                0
            );

        },


        // =====================================================
        // 🔧 INIT
        // =====================================================

        init() {

            // -----------------------------------------------
            // BACK
            // -----------------------------------------------

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


            // -----------------------------------------------
            // CLEAR
            // -----------------------------------------------

            document
                .getElementById("clearHistory")
                ?.addEventListener(
                    "click",
                    () => {

                        if (
                            !confirm(
                                "Xóa toàn bộ lịch sử đọc?"
                            )
                        ) {

                            return;

                        }


                        this.clear();


                        this.render();

                    }
                );

        }

    };

}