import {
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../firebase.js";

export default function Policy(appStatus) {

    return {

        async loadPolicyData() {

            if (Object.keys(appStatus.state.policyData).length) {
                return appStatus.state.policyData;
            }

            try {

                const r = await fetch("./policy.json", {
                    cache: "no-cache"
                });

                if (!r.ok) {
                    throw new Error("Không đọc được file");
                }

                appStatus.state.policyData = await r.json();

                return appStatus.state.policyData;

            } catch (e) {

                console.error("Lỗi policy.json:", e);

                return appStatus.state.policyData = {

                    "chinh-sach-bao-mat": {
                        title: "Chính sách bảo mật"
                    },

                    "chinh-sach-ban-quyen": {
                        title: "Chính sách bản quyền"
                    },

                    "dieu-khoan-su-dung": {
                        title: "Điều khoản sử dụng"
                    },

                    "tieu-chuan-noi-dung": {
                        title: "Tiêu chuẩn nội dung"
                    },

                    "gioi-thieu-hydyar-wiki": {
                        title: "Giới thiệu HydYar Wiki"
                    },

                    "gioi-thieu-unius-degens": {
                        title: "Giới thiệu Unius & Degens"
                    },

                    "giay-phep-ma-nguon-mo": {
                        title: "Giấy phép & Mã nguồn mở"
                    },

                    "bao-cao-vi-pham": {
                        title: "Báo cáo vi phạm"
                    },

                    "lien-he-ho-tro": {
                        title: "Liên hệ & Hỗ trợ"
                    },

                    "phien-ban-ung-dung": {
                        title: "Phiên bản ứng dụng"
                    }
                };
            }
        },

        async loadPolicyContent(id) {

            if (appStatus.state.policyContentCache[id]) {
                return appStatus.state.policyContentCache[id];
            }

            try {

                const s = await getDoc(
                    doc(db, "policies", id)
                );

                if (!s.exists()) {
                    return "";
                }

                const c = s.data().content || "";

                appStatus.state.policyContentCache[id] = c;

                return c;

            } catch (e) {

                console.warn(`Không tải được: ${id}`, e);

                return "";
            }
        },

        async openPolicyPage() {

            await this.loadPolicyData();

            const p = document.getElementById("page-profile");

            if (!appStatus.state.profileOriginalHTML) {
                appStatus.state.profileOriginalHTML = p.innerHTML;
            }

            p.innerHTML = `
                <button class="policy-back"
                        onclick="HydYarWiki.navigate('profile')">

                    ${appStatus.ui.icon("solar:arrow-left-bold")}

                    Chính sách của HydYar Wiki

                </button>

                <div class="policy-page">

                    <div class="policy-card">

                        ${Object.entries(appStatus.state.policyData)
                            .map(([k, i]) => `

                            <div class="policy-item"
                                 data-id="${appStatus.markdown.escapeHTML(k)}">

                                <div class="policy-icon">
                                    <iconify-icon
                                        icon="solar:document-text-bold">
                                    </iconify-icon>
                                </div>

                                <div class="policy-content">

                                    <div class="policy-title">
                                        ${appStatus.markdown.escapeHTML(
                                            i.title || k
                                        )}
                                    </div>

                                </div>

                                <div class="policy-arrow">
                                    ${appStatus.ui.icon(
                                        "solar:arrow-right-bold"
                                    )}
                                </div>

                            </div>

                        `).join("")}

                    </div>

                </div>
            `;

            p.querySelectorAll(".policy-item")
                .forEach(item => {

                    item.onclick = () =>
                        HydYarWiki.navigate(
                            "policy-detail",
                            {
                                id: item.dataset.id
                            }
                        );

                });

            appStatus.seo.updatePolicy({
                title: "Chính sách HydYar Wiki"
            });

            scrollTo(0, 0);
        },

        async openPolicyDetail(id) {

            const p = appStatus.state.policyData[id];

            if (!p) {
                return;
            }

            const x = document.getElementById("page-profile");

            if (id === "report") {

    const renderViolationHome = () => {

        x.innerHTML = `
            <button class="policy-back"
                    onclick="HydYarWiki.navigate('policy')">
                ${appStatus.ui.icon("solar:arrow-left-bold")}
                Báo cáo vi phạm
            </button>

            <div class="policy-detail">

                <div class="report-page">

                    <div class="report-page-header">

                        <div class="report-page-icon">
                            ${appStatus.ui.icon("solar:shield-warning-bold")}
                        </div>

                        <h1>Báo cáo vi phạm</h1>

                        <p>
                            Bạn có thể báo cáo bài viết hoặc người dùng
                            nếu phát hiện nội dung hoặc hành vi vi phạm
                            quy định của HydYar Wiki.
                        </p>

                    </div>

                    <div class="report-choice-list">

                        <button class="report-choice"
                                type="button"
                                data-report-type="article">

                            <div class="report-choice-icon">
                                ${appStatus.ui.icon("solar:document-text-bold")}
                            </div>

                            <div class="report-choice-body">

                                <h2>Báo cáo bài viết</h2>

                                <p>
                                    Báo cáo một bài viết có nội dung
                                    vi phạm tiêu chuẩn của HydYar Wiki.
                                </p>

                            </div>

                            <div class="report-choice-arrow">
                                ${appStatus.ui.icon("solar:arrow-right-bold")}
                            </div>

                        </button>

                        <button class="report-choice"
                                type="button"
                                data-report-type="user">

                            <div class="report-choice-icon">
                                ${appStatus.ui.icon("solar:user-bold")}
                            </div>

                            <div class="report-choice-body">

                                <h2>Báo cáo người dùng</h2>

                                <p>
                                    Báo cáo tài khoản có hành vi
                                    vi phạm quy định của HydYar Wiki.
                                </p>

                            </div>

                            <div class="report-choice-arrow">
                                ${appStatus.ui.icon("solar:arrow-right-bold")}
                            </div>

                        </button>

                    </div>

                    <div class="report-page-notice">

                        ${appStatus.ui.icon("solar:info-circle-bold")}

                        <span>
                            Chỉ gửi báo cáo khi bạn thực sự phát hiện
                            nội dung hoặc hành vi vi phạm.
                        </span>

                    </div>

                </div>

            </div>
        `;

        x.querySelectorAll(".report-choice")
            .forEach(button => {

                button.onclick = () => {
                    renderViolationForm(
                        button.dataset.reportType
                    );
                };

            });
    };


    const renderViolationForm = type => {

        const isArticle = type === "article";

        const title = isArticle
            ? "Báo cáo bài viết"
            : "Báo cáo người dùng";

        const description = isArticle
            ? "Cung cấp thông tin về bài viết mà bạn muốn báo cáo."
            : "Cung cấp thông tin về người dùng mà bạn muốn báo cáo.";

        const targetLabel = isArticle
            ? "ID hoặc liên kết bài viết"
            : "Tên hoặc ID người dùng";

        const targetPlaceholder = isArticle
            ? "Nhập ID hoặc liên kết bài viết..."
            : "Nhập tên hoặc ID người dùng...";

        const reasons = isArticle
            ? `
                <option value="">Chọn lý do báo cáo</option>
                <option value="spam">Spam hoặc quảng cáo không phù hợp</option>
                <option value="copyright">Vi phạm bản quyền</option>
                <option value="harmful">Nội dung gây hại</option>
                <option value="misinformation">Thông tin sai lệch</option>
                <option value="inappropriate">Nội dung không phù hợp</option>
                <option value="other">Lý do khác</option>
            `
            : `
                <option value="">Chọn lý do báo cáo</option>
                <option value="harassment">Quấy rối hoặc bắt nạt</option>
                <option value="spam">Spam hoặc quảng cáo</option>
                <option value="impersonation">Mạo danh</option>
                <option value="abuse">Hành vi lạm dụng</option>
                <option value="inappropriate">Hành vi không phù hợp</option>
                <option value="other">Lý do khác</option>
            `;

        x.innerHTML = `
            <button class="policy-back"
                    id="report-form-back">
                ${appStatus.ui.icon("solar:arrow-left-bold")}
                Báo cáo vi phạm
            </button>

            <div class="policy-detail">

                <div class="report-form-page">

                    <div class="report-form-header">

    <div class="report-form-title">

        <div class="report-form-icon">
            ${appStatus.ui.icon(
                isArticle
                    ? "solar:document-text-bold"
                    : "solar:user-bold"
            )}
        </div>

        <h1>${title}</h1>

    </div>

    <p>${description}</p>

</div>

                    <form id="report-form">

                        <label>
                            ${targetLabel}
                        </label>

                        <input
                            name="target"
                            type="text"
                            placeholder="${targetPlaceholder}"
                            autocomplete="off"
                            required
                        >

                        <label>
                            Lý do báo cáo
                        </label>

                        <select name="reason" required>
                            ${reasons}
                        </select>

                        <label>
                            Mô tả chi tiết
                        </label>

                        <textarea
                            name="description"
                            rows="6"
                            maxlength="2000"
                            placeholder="Mô tả vấn đề bạn phát hiện..."
                            required></textarea>

                        <div class="report-form-notice">
                            ${appStatus.ui.icon("solar:info-circle-bold")}

                            <span>
                                Hãy cung cấp thông tin chính xác để
                                đội ngũ quản trị có thể xem xét báo cáo.
                            </span>
                        </div>

                        <button
                            class="report-submit"
                            type="submit">

                            ${appStatus.ui.icon("solar:flag-bold")}

                            Gửi báo cáo

                        </button>

                    </form>

                </div>

            </div>
        `;

        x.querySelector("#report-form-back").onclick = () => {
            renderViolationHome();
        };

        x.querySelector("#report-form")
            .addEventListener("submit", event => {

                event.preventDefault();

                const form = event.currentTarget;

                const target = form.target.value.trim();
                const reason = form.reason.value;
                const description = form.description.value.trim();

                if (!target || !reason || !description) {
                    return;
                }

                const button =
                    form.querySelector(".report-submit");

                button.disabled = true;

                button.innerHTML = `
                    ${appStatus.ui.icon("solar:check-circle-bold")}
                    Đã ghi nhận báo cáo
                `;

                setTimeout(() => {

                    button.disabled = false;

                    button.innerHTML = `
                        ${appStatus.ui.icon("solar:flag-bold")}
                        Gửi báo cáo
                    `;

                    form.reset();

                }, 1500);
            });
    };


    renderViolationHome();

    appStatus.seo.updatePolicy({
        title: "Báo cáo vi phạm"
    });

    scrollTo(0, 0);

    return;
}
          
            if (id === "version") {

                x.innerHTML = `
                    <button class="policy-back"
                            onclick="HydYarWiki.navigate('policy')">

                        ${appStatus.ui.icon("solar:arrow-left-bold")}

                        Phiên bản ứng dụng
                    </button>

                    <div class="policy-detail">

                        <div class="app-version-page">

                            <div class="app-version-header">

                                <div class="app-version-icon">
                                    ${appStatus.ui.icon(
                                        "solar:layers-bold"
                                    )}
                                </div>

                                <h1>Phiên bản ứng dụng</h1>

                                <p>
                                    Thông tin về phiên bản hiện tại
                                    và lịch sử cập nhật của
                                    HydYar Wiki.
                                </p>

                            </div>

                            <div class="version-list">

                                <div class="version-card">

                                    <div class="version-number">
                                        v1.0.0
                                    </div>

                                    <div class="version-info">

                                        <h3>
                                            Phiên bản hiện tại
                                        </h3>

                                        <p>
                                            Phiên bản ổn định của
                                            HydYar Wiki.
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>
                `;

                appStatus.seo.updatePolicy({
                    title: "Phiên bản ứng dụng"
                });

                scrollTo(0, 0);

                return;
            }

            x.innerHTML = `
                <button class="policy-back"
                        onclick="HydYarWiki.navigate('policy')">

                    ${appStatus.ui.icon("solar:arrow-left-bold")}

                    Đang tải...
                </button>

                <div class="policy-detail"
                     style="text-align:center;padding:2rem;">

                    <p>Đang tải nội dung...</p>

                </div>
            `;

            try {

                const c = await this.loadPolicyContent(id);

                x.innerHTML = `
                    <button class="policy-back"
                            onclick="HydYarWiki.navigate('policy')">

                        ${appStatus.ui.icon("solar:arrow-left-bold")}

                        ${appStatus.markdown.escapeHTML(p.title)}

                    </button>

                    <div class="policy-detail">

                        <div class="policy-content-render">

                            ${appStatus.markdown.parse(c)}

                        </div>

                    </div>
                `;

                appStatus.seo.updatePolicy(p);

                scrollTo(0, 0);

            } catch (e) {

                console.error("Lỗi chính sách:", e);

                x.innerHTML = `
                    <button class="policy-back"
                            onclick="HydYarWiki.navigate('policy')">

                        ${appStatus.ui.icon("solar:arrow-left-bold")}

                        ${appStatus.markdown.escapeHTML(p.title)}

                    </button>

                    <div class="policy-detail"
                         style="color:var(--error);padding:2rem;">

                        <p>
                            ❌ Không tải được nội dung!
                        </p>

                        <small>
                            ${appStatus.markdown.escapeHTML(
                                e.message
                            )}
                        </small>

                    </div>
                `;
            }
        }

    };
}