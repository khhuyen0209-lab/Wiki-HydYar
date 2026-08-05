// ==============================================
// FILE: js/article.js
// ĐÃ SỬA: Loại bỏ mọi lỗi cú pháp, tách biến rõ ràng
// ==============================================
import { api } from "./api.js";
import Ui from "./ui.js";
import seo from "./seo.js";
import markdown from "./markdown.js";
import Category from "./category.js";
import { getArticleBySlug, getFeaturedArticles, getLatestArticles } from "../firebase.js";

const Article = {
    _app: null,
    setAppStatus(a) { this._app = a; },
    _s() { return this._app?.state || {}; },

    CACHE_TTL: 2 * 60 * 60 * 1000,
    WORDS_PER_MIN: 220,

    firestore: {
        async getById(slug, force = false) {
            const st = Article._s();
            if (!slug) return { ok: false, article: null };
            if (!force && st.articleCache?.[slug]) return { ok: true, article: st.articleCache[slug], cached: true };
            
            st.articleLoading = true;
            Article.skeleton.show();
            try {
                const art = await getArticleBySlug(slug);
                console.log("🔍 Trả về:", art, "| Tìm:", slug);
                if (!art) return { ok: false, article: null, notFound: true };
                
                art.slug = art.slug || art.id;
                st.articleCache = st.articleCache || {};
                st.articleCache[art.slug] = { ...art, _at: Date.now() };
                
                try { await api(`/article/${art.slug}/view`, { method: "POST" }).catch(() => {}); } catch (_) {}
                return { ok: true, article: art };
            } catch (err) {
                console.error("❌ Lỗi:", err);
                Ui.toast(err.message || "Không tải được bài viết", "error");
                return { ok: false, article: null, notFound: err.status === 404 };
            } finally {
                st.articleLoading = false;
                Article.skeleton.hide();
            }
        },
        async featured() {
            const list = await getFeaturedArticles();
            return Array.isArray(list) ? list.map(i => ({ ...i, slug: i.slug || i.id })) : [];
        },
        async latest() {
            const list = await getLatestArticles();
            return Array.isArray(list) ? list.map(i => ({ ...i, slug: i.slug || i.id })) : [];
        }
    },

    skeleton: {
        show() { const st = Article._s(); st.articleSkeletonVisible = true; st.dom?.skeleton?.style.display = "block"; },
        hide() { const st = Article._s(); st.articleSkeletonVisible = false; st.dom?.skeleton?.style.display = "none"; },
        articleCardSkeleton(n = 4) { return Array(n).fill(`<div class="article-card skeleton-card"><div class="card-content"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-desc"></div><div class="skeleton skeleton-desc"></div><div class="skeleton skeleton-meta"></div></div></div>`).join(""); },
        articleDetailSkeleton() { return `<div class="article-container"><div class="skeleton skeleton-article-title"></div><div class="skeleton skeleton-article-meta"></div><hr class="divider-line">${Array(7).fill('<div class="skeleton skeleton-article-line"></div>').join("")}</div>`; }
    },

    readingTime(text) {
        if (!text) return 1;
        const w = String(text).trim().split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.round(w / this.WORDS_PER_MIN));
    },
    getCategoryName(id) {
        const c = this._s().categories?.find(x => x.id === id);
        return c ? c.name : "Khác";
    },
    getReliabilityLabel(s) {
        if (s == null) return "Đang cập nhật";
        if (s >= 90) return "Rất cao";
        if (s >= 70) return "Cao";
        if (s >= 50) return "Trung bình";
        return "Thấp";
    },

    _cardHtml(item) {
        if (!item) return "";
        return this.render.articleCard([item]);
    },

    render: {
        articleCard(list) {
            if (!Array.isArray(list) || list.length === 0) {
                return `<div class="article-card empty-card"><div class="card-content empty-content"><iconify-icon icon="solar:file-text-bold"></iconify-icon><h3>Không tìm thấy bài viết</h3><p>Hãy thử từ khóa khác.</p></div></div>`;
            }
            let html = "";
            for (const a of list) {
                const slug = a.slug || a.id;
                const cat = a.category?.name || Article.getCategoryName(a.categoryId) || "Khác";
                const desc = (a.desc || a.excerpt || "Chưa có mô tả").slice(0, 120);
                const view = (a.views || 0).toLocaleString("vi-VN");
                html += `<a class="article-card" href="/${a.categoryId||"khac"}/${slug}" data-navigate="/${a.categoryId||"khac"}/${slug}" data-id="${a.id}" data-slug="${slug}" data-cat="${a.categoryId||"khac"}"><div class="card-content"><h3 class="card-title">${markdown.escapeHTML(a.title||"Không có tiêu đề")}</h3><p class="card-desc">${markdown.escapeHTML(desc)}</p><div class="card-meta"><span>📚 ${cat}</span><span>👁 ${view}</span></div></div></a>`;
            }
            return html;
        }
    },

    render(article) {
        const st = this._s();
        const d = st.dom || {};
        if (!d.articleContent || !article) return;

        seo.article(article);
        const htmlContent = markdown.parse(article.content || "");
        const readMin = this.readingTime(article.content || article.desc);
        const dateStr = article.updatedAt || article.createdAt || "";
        const authorStr = article.author?.name || article.authorName || "HydYar";
        const pages = markdown.buildPages?.(article) || article.pages || [];
        const hasPages = pages.length > 0;

        st.bookState = { slug: article.slug || article.id, current: 1, total: Math.max(1, pages.length) };

        let pageHtml = "";
        let tocHtml = "";
        if (hasPages) {
            for (let i = 0; i < pages.length; i++) {
                const p = pages[i];
                if (p.type === "infobox") {
                    pageHtml += `<div class="book-page markdown-body">${markdown.parse(p.info||"")}</div>`;
                    tocHtml += `<div class="toc-item" data-page="${i+1}"><iconify-icon icon="solar:widget-bold"></iconify-icon> Thông tin tổng quan</div>`;
                } else if (p.type === "toc") {
                    const subToc = pages.filter(x=>x.number).map((x,j)=>`<div class="toc-item" data-page="${j+1}">${x.number} ${x.title}</div>`).join("");
                    pageHtml += `<div class="book-page"><h2>Mục lục</h2>${subToc}</div>`;
                    tocHtml += `<div class="toc-item" data-page="${i+1}"><iconify-icon icon="solar:hamburger-menu-bold"></iconify-icon> Mục lục</div>`;
                } else if (p.type === "reference") {
                    pageHtml += `<div class="book-page markdown-body reference-page"><h2><iconify-icon icon="solar:book-bookmark-bold"></iconify-icon> Trang tham khảo</h2>${markdown.parse(p.content||"")}</div>`;
                    tocHtml += `<div class="toc-item" data-page="${i+1}"><iconify-icon icon="solar:book-bookmark-bold"></iconify-icon> Trang tham khảo</div>`;
                } else {
                    pageHtml += `<div class="book-page markdown-body"><h2>${p.number||""} ${p.title||""}</h2>${markdown.parse(p.content||"")}</div>`;
                    tocHtml += `<div class="toc-item" data-page="${i+1}">${p.number||""} ${p.title||""}</div>`;
                }
            }
        }

        const catLink = article.category?.name ? `<a class="art-cat" href="/danh-muc/${article.category.slug||article.category.id}" data-navigate="/danh-muc/${article.category.slug||article.category.id}">${article.category.name}</a>` : "";
        const dateShow = dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "";
        const viewShow = typeof article.views === "number" ? `<span>👁 ${article.views.toLocaleString("vi-VN")}</span>` : "";
        const imgShow = article.image ? `<figure class="art-cover"><img src="${article.image}" alt="${article.title||""}" loading="lazy"></figure>` : "";
        const relShow = this.getReliabilityLabel(article.reliability);
        const disableNext = pages.length <= 1 ? "disabled" : "";

        d.articleContent.innerHTML = `
        <div class="article-head">
            ${catLink}
            <h1>${article.title||""}</h1>
            <div class="art-meta">
                <span>👤 ${authorStr}</span>
                <span>📅 ${dateShow}</span>
                <span>⏱ ${readMin} phút</span>
                ${viewShow}
            </div>
            <div class="wiki-reliability"><iconify-icon icon="material-symbols:verified-rounded"></iconify-icon> Độ tin cậy: <strong>${relShow}</strong></div>
            ${imgShow}
        </div>
        <div class="article-body prose">${htmlContent}</div>
        ${hasPages ? `
        <div class="book-wrapper" id="bookWrapper">
            <div class="book-tools"><button class="toc-btn" id="tocBtn"><iconify-icon icon="solar:hamburger-menu-bold"></iconify-icon></button><button class="fullscreen-btn" id="fullscreenBtn"><iconify-icon icon="solar:full-screen-square-bold"></iconify-icon></button></div>
            <div class="book-pages" id="bookPages">${pageHtml}</div>
            <div class="toc-overlay" id="tocOverlay"><div class="toc-panel"><div class="toc-header"><span>Mục lục</span><button id="closeToc">✕</button></div><div class="toc-list">${tocHtml}</div></div></div>
        </div>
        <div class="book-nav" id="normalBookNav"><button class="book-nav-btn" id="prevMainBtn">Quay lại</button><span>Trang <span id="currentPageNum">1</span> / ${pages.length}</span><button class="book-nav-btn" id="nextMainBtn" ${disableNext}>Sau</button></div>
        <div class="fs-controls" id="fsControls" style="display:none;"><button class="fs-btn" id="fsLeftBtn">Thoát</button><div class="fs-page-nav"><span>Trang <span id="fsCurrentPage">1</span>/${pages.length}</span><button class="fs-btn" id="fsNextBtn" ${disableNext}>Sau</button></div></div>
        ` : ""}
        `;

        d.articleContent.querySelectorAll("a[href^='/']").forEach(link => {
            link.addEventListener("click", e => {
                const h = link.getAttribute("href");
                if (h.startsWith("#")) return;
                e.preventDefault();
                window.HydYarWiki?.navigate(h);
            });
        });
        d.articleContent.querySelectorAll("a[href^='http']").forEach(link => {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });

        requestAnimationFrame(() => this.bindPageEvents());
        Ui.scrollTop();
    },

    bindPageEvents() {
        const st = this._s();
        const d = st.dom || {};
        d.fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());
        d.nextMainBtn?.addEventListener("click", () => this.changeBookPage(1));
        d.fsNextBtn?.addEventListener("click", () => this.changeBookPage(1));
        d.prevMainBtn?.addEventListener("click", () => st.bookState.current > 1 ? this.changeBookPage(-1) : window.HydYarWiki?.back());
        d.fsLeftBtn?.addEventListener("click", () => st.bookState.current > 1 ? this.changeBookPage(-1) : this.closeFullscreen());
        document.getElementById("tocBtn")?.addEventListener("click", e => { e.stopPropagation(); document.getElementById("tocOverlay")?.classList.toggle("show"); });
        document.getElementById("closeToc")?.addEventListener("click", () => { document.getElementById("tocOverlay")?.classList.remove("show"); });
        document.getElementById("tocOverlay")?.addEventListener("click", e => { if (e.target.id === "tocOverlay") e.target.classList.remove("show"); });
        document.querySelectorAll(".toc-item").forEach(i => {
            i.onclick = () => {
                const p = Number(i.dataset.page);
                if (p >= 1 && p <= st.bookState.total) { st.bookState.current = p; this.updateBookPageView(); }
                document.getElementById("tocOverlay")?.classList.remove("show");
            };
        });
    },

    changeBookPage(delta) {
        const st = this._s();
        const b = st.bookState;
        const n = b.current + delta;
        if (n < 1 || n > b.total) return;
        b.current = n;
        sessionStorage.setItem(`book_page_${b.slug}`, b.current);
        this.updateBookPageView();
    },

    updateBookPageView() {
        const st = this._s();
        const d = st.dom || {};
        if (!d.bookPages) return;
        d.bookPages.style.transform = `translateX(-${(st.bookState.current - 1) * 100}%)`;
        d.currentPageNum.textContent = st.bookState.current;
        d.fsCurrentPage.textContent = st.bookState.current;
        const last = st.bookState.current >= st.bookState.total;
        d.nextMainBtn.disabled = last;
        d.fsNextBtn.disabled = last;
        d.prevMainBtn.textContent = st.bookState.current <= 1 ? "Quay lại" : "Trước";
        d.fsLeftBtn.textContent = st.bookState.current <= 1 ? "Thoát" : "Trước";
    },

    toggleFullscreen() {
        const st = this._s();
        const d = st.dom || {};
        st.isFullscreenMode = !st.isFullscreenMode;
        if (st.isFullscreenMode) {
            d.bookWrapper.classList.add("book-fullscreen");
            d.fullscreenBtn.style.display = "none";
            d.normalBookNav.style.display = "none";
            d.fsControls.style.display = "flex";
            d.bottomNav.classList.add("bottom-nav-hidden");
            d.bottomNav.style.pointerEvents = "none";
        } else {
            this.closeFullscreen();
        }
    },

    closeFullscreen() {
        const st = this._s();
        const d = st.dom || {};
        d.bookWrapper?.classList.remove("book-fullscreen");
        d.fullscreenBtn && (d.fullscreenBtn.style.display = "flex");
        d.normalBookNav && (d.normalBookNav.style.display = "flex");
        d.fsControls && (d.fsControls.style.display = "none");
        d.bottomNav?.classList.remove("bottom-nav-hidden");
        st.isFullscreenMode = false;
    },

    async handleRoute(p = {}) {
        const st = this._s();
        const d = st.dom || {};
        const slug = p.slug || p.id;
        if (!slug) { seo.reset(); Ui.toast("Thiếu mã bài viết", "error"); window.HydYarWiki?.navigate("/"); return; }
        if (!st.categoryList?.length) await Category.getList().catch(() => {});
        const res = await this.firestore.getById(slug);
        if (!res.ok || res.notFound || !res.article) {
            seo.set("Không tìm thấy bài viết | Wiki HydYar");
            if (d.articleContent) d.articleContent.innerHTML = `<div class="page-empty"><h2>Không tìm thấy bài viết</h2><button class="btn" onclick="HydYarWiki.navigate('/')">Về trang chủ</button></div>`;
            return;
        }
        this.render(res.article);
    },

    async renderWiki() {
        const st = this._s();
        const d = st.dom || {};
        if (!d.featuredArticles || !d.latestArticles) return;
        d.featuredArticles.innerHTML = d.latestArticles.innerHTML = this.skeleton.articleCardSkeleton();
        try {
            const [f, l] = await Promise.all([this.firestore.featured(), this.firestore.latest()]);
            d.featuredArticles.innerHTML = this.render.articleCard(f);
            d.latestArticles.innerHTML = this.render.articleCard(l);
        } catch (err) {
            console.error("Lỗi tải bài:", err);
            d.featuredArticles.innerHTML = d.latestArticles.innerHTML = `<p>Lỗi tải bài viết</p>`;
        }
    },

    initArticleClick() {
        document.addEventListener("click", e => {
            const c = e.target.closest(".article-card");
            if (!c) return;
            e.preventDefault();
            window.HydYarWiki?.navigate("article", { category: c.dataset.cat || "khac", slug: c.dataset.slug || c.dataset.id });
        });
    },

    init() {
        this.initArticleClick();
    }
};

export default Article;
