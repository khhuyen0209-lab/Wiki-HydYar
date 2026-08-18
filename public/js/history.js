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
                item => item.id !== article.id
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
        // ♻️ KHÔI PHỤC PROFILE
        // =====================================================

        restoreProfile() {

            const page =
                document.getElementById(
                    "page-profile"
                );


            if (!page) {

                console.error(
                    "Không tìm thấy page-profile"
                );

                return;

            }


            const original =
                appStatus.state.profileOriginalHTML;


            if (!original) {

                console.warn(
                    "Không có profileOriginalHTML để khôi phục."
                );

                return;

            }


            page.innerHTML = original;


            // Xóa bản backup sau khi khôi phục
            appStatus.state.profileOriginalHTML = "";


            // Đưa scroll về đầu
            window.scrollTo(
                0,
                0
            );

        },


        // =====================================================
        // 📚 MỞ TRANG LỊCH SỬ
        // =====================================================

        open() {

            const history = this;


            const page =
                document.getElementById(
                    "page-profile"
                );


            if (!page) {

                console.error(
                    "Không tìm thấy page-profile"
                );

                return;

            }


            // =================================================
            // 💾 LƯU PROFILE GỐC
            // =================================================

            if (
                !appStatus.state.profileOriginalHTML
            ) {

                appStatus.state.profileOriginalHTML =
                    page.innerHTML;

            }


            const list =
                history.get();


            // =================================================
            // 🧱 RENDER HISTORY
            // =================================================

            page.innerHTML = `

<div class="history-page">

    <!-- =========================================
         HEADER
         ========================================= -->

    <div
        style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:16px;
        "
    >

        <button
            id="historyBack"
            class="policy-back"
            style="
                margin:0;
                display:flex;
                align-items:center;
                gap:8px;
            "
        >

            ${appStatus.ui.icon(
                "solar:arrow-left-bold"
            )}

            Lịch sử đọc

        </button>


        ${
            list.length
                ?
                `
                <button
                    id="clearHistory"
                    style="
                        border:none;
                        padding:10px 16px;
                        border-radius:12px;
                        background:#ff5b5b;
                        color:white;
                        font-weight:600;
                        cursor:pointer;
                        transition:.2s;
                    "
                >
                    Xóa lịch sử
                </button>
                `
                :
                ""
        }

    </div>


    <!-- =========================================
         DANH SÁCH
         ========================================= -->

    <div class="policy-page">

        ${
            list.length

                ?

                list.map(article => `

                    <div
                        class="article-card"
                        data-id="${appStatus.markdown.escapeHTML(
                            String(article.id)
                        )}"
                        data-cat="${appStatus.markdown.escapeHTML(
                            String(
                                article.categoryId ||
                                "khac"
                            )
                        )}"
                    >

                        <div class="card-content">

                            <h3 class="card-title">

                                ${
                                    appStatus.markdown
                                        .escapeHTML(
                                            article.title ||
                                            "Không có tiêu đề"
                                        )
                                }

                            </h3>


                            <p class="card-desc">

                                ${
                                    appStatus.markdown
                                        .escapeHTML(
                                            article.desc ||
                                            "Chưa có mô tả"
                                        )
                                }

                            </p>


                            <small>

                                ${
                                    new Date(
                                        article.time
                                    ).toLocaleString(
                                        "vi-VN"
                                    )
                                }

                            </small>

                        </div>

                    </div>

                `).join("")

                :

                `

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

                `

        }

    </div>

</div>

`;


            // =================================================
            // ⬅️ BACK
            // =================================================

            document
                .getElementById("historyBack")
                ?.addEventListener(
                    "click",
                    () => {

                        // QUAN TRỌNG:
                        // Khôi phục Profile trước
                        history.restoreProfile();


                        // Sau đó mới navigate
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

                        if (
                            !confirm(
                                "Xóa toàn bộ lịch sử đọc?"
                            )
                        ) {

                            return;

                        }


                        history.clear();


                        // Render lại lịch sử
                        // KHÔNG khôi phục Profile
                        history.open();

                    }
                );


            // =================================================
            // 📖 MỞ BÀI VIẾT
            // =================================================

            page
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


            // =================================================
            // ⬆️ SCROLL TOP
            // =================================================

            window.scrollTo(
                0,
                0
            );

        }

    };

}