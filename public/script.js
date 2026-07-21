// Import đúng các hàm có sẵn trong firebase.js
import {
    getFeaturedArticles,
    getLatestArticles,
    getCategories,
    getArticleBySlug,
    db
} from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==============================
// HÀM DÙNG CHUNG
// ==============================
function icon(name) { return `<iconify-icon icon="${name}"></iconify-icon>`; }
let previousPage = 'home';
let originalCategoryHTML = '';
let categories = [];

// Khai báo biến toàn cục
let currentBookPage = 1;
let totalBookPages = 0;
let isFullscreenMode = false;

// ✅ ĐÃ SỬA: Tìm theo categoryId (space) và ánh xạ đúng tên
function getCategoryName(categoryId) {
    const c = categories.find(x => x.id === categoryId);
    return c ? c.name : "Khác";
}

// Chuyển định dạng Markdown
function parseMarkdown(text) {
    if (!text) return "";
    let html = text;

    html = html.replace(
        /!\[([^\]]*)\]\(\s*([^)]+?)\s*(?:\"([^\"]+)\")?\)/g,
        (match, alt, src, caption) => `
<div class="img-wrapper">
    <img src="${src}" alt="${alt}" loading="lazy"
         onerror="this.parentElement.innerHTML='<p class=&quot;img-error&quot;>Không tải được ảnh</p>'">
    ${caption ? `<div class="img-caption">${caption}</div>` : ""}
</div>`
    );

    html = html.replace(
        /^-?\s*([^:\n]+?)\s*:\s*(https?:\/\/[^\s<]+)/gm,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );

    html = html.replace(
        /(^|[\s>])(https?:\/\/[^\s<"]+)/gm,
        (match, space, url) => {
            try {
                const host = new URL(url).hostname.replace(/^www\./, "");
                let name = host;
                if (host.includes("wikipedia.org")) name = "Wikipedia";
                else if (host.includes("wikimedia.org")) name = "Wikimedia Commons";
                else if (host.includes("nasa.gov")) name = "NASA";
                else if (host.includes("esa.int")) name = "ESA";
                else if (host.includes("youtube.com")) name = "YouTube";
                else if (host.includes("github.com")) name = "GitHub";
                return `${space}<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${name}</a>`;
            } catch { return match; }
        }
    );

    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
    html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");
    html = html.replace(/(?:^- .*(?:\r?\n|$))+/gm, match => {
        const items = match.trim().split('\n').map(item => `<li>${item.replace(/^- /, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
    });
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.split(/\n{2,}/).map(part => {
        if (/^\s*</.test(part)) return part;
        return `<p>${part.replace(/\n/g, "<br>")}</p>`;
    }).join("");

    return html;
}

function splitContentToPages(html) {
    if (!html) return [''];
    const parts = html.split(/---trang\d+---/g).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [html];
}

// ==============================
// KHỔI PHỤC CHẾ ĐỘ TỐI & TỐI ƯU
// ==============================
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;
    const savedTheme = localStorage.getItem('wiki-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if(savedTheme === 'dark') toggle.querySelector('.toggle-switch')?.classList.add('active');
    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('wiki-theme', document.documentElement.getAttribute('data-theme'));
        toggle.querySelector('.toggle-switch')?.classList.toggle('active', isDark);
    });
}

(function performanceDetect(){
    let lowDevice = false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) lowDevice = true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) lowDevice = true;
    if (window.innerWidth <= 360) lowDevice = true;
    if (lowDevice) document.documentElement.classList.add("low-end");
})();

const optimizeToggle = document.getElementById("optimizeToggle");
const optimizeSwitch = optimizeToggle?.querySelector(".toggle-switch");
let optimizeEnabled = localStorage.getItem("optimizeMode") === "true";
if (optimizeEnabled) { document.documentElement.classList.add("low-end"); optimizeSwitch?.classList.add("active"); }
optimizeToggle?.addEventListener("click", () => {
    optimizeEnabled = !optimizeEnabled;
    document.documentElement.classList.toggle("low-end", optimizeEnabled);
    optimizeSwitch?.classList.toggle("active", optimizeEnabled);
    localStorage.setItem("optimizeMode", optimizeEnabled);
});

// ==============================
// KHỞI TẠO
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    initDarkMode();
    initNavigation();
    initCategoryClick();
    initArticleClick();
    renderWiki();
    renderCategory();

    const path = location.pathname.split("/").filter(Boolean);
    if (path.length >= 2) openArticleDetail(path[1]);
});

// ==============================
// ĐIỀU HƯỚNG
// ==============================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item, .page').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`page-${btn.dataset.page}`)?.classList.add('active');
            window.scrollTo(0, 0);
        });
    });
}

// ==============================
// DANH MỤC
// ==============================
function initCategoryClick() {
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.category-card');
        if (!item) return;
        const name = item.querySelector('.category-name')?.textContent.trim();
        if (!name) return;

        const category = categories.find(c => c.name === name);
        if (!category) return;

        document.querySelectorAll('.nav-item, .page').forEach(el => el.classList.remove('active'));
        document.querySelector('[data-page="categories"]')?.classList.add('active');
        document.getElementById('page-categories')?.classList.add('active');
        window.scrollTo(0, 0);
        setTimeout(() => openCategoryDetail(category.id), 50);
    });
}

async function openCategoryDetail(categoryId) {
    const page = document.getElementById('page-categories');
    if (!page) return;
    if (!originalCategoryHTML) originalCategoryHTML = page.innerHTML;

    const category = categories.find(c => c.id === categoryId);
    const categoryName = category?.name || categoryId;

    page.innerHTML = `
    <div class="page-header">
        <button class="back-btn" id="backCate">
            <span class="back-icon">${icon("solar:arrow-left-bold")}</span>
            <span class="back-text">Quay lại</span>
        </button>
        <h1>${categoryName}</h1>
    </div>
    <div class="category-detail-content" id="cateContent"><p>Đang tải...</p></div>`;

    document.getElementById('backCate').onclick = () => {
        if (originalCategoryHTML) page.innerHTML = originalCategoryHTML;
    };

    try {
        let all = [];
        try { all = await getLatestArticles(); } catch { all = await getFeaturedArticles(); }
        // ✅ Lọc đúng theo categoryId
        const filtered = all.filter(i => i.categoryId === categoryId);
        document.getElementById('cateContent').innerHTML = articleCard(filtered);
    } catch (e) {
        document.getElementById('cateContent').innerHTML = `<p>Lỗi: ${e.message}</p>`;
    }
}

// ==============================
// BÀI VIẾT
// ==============================
function initArticleClick() {
    document.addEventListener("click", handleArticleClick);
}

function handleArticleClick(e) {
    const card = e.target.closest(".article-card");
    if (!card) return;
    const slug = card.dataset.id;
    if (!slug) return;
    savePreviousPage();
    openArticleDetail(slug);
}

function savePreviousPage() {
    document.querySelectorAll(".page").forEach(page => {
        if (page.classList.contains("active")) previousPage = page.id.replace("page-", "");
    });
}

async function openArticleDetail(slug) {
    const pageArticle = document.getElementById("page-article");
    prepareArticlePage(pageArticle);
    renderArticleLoading(pageArticle);

    try {
        const article = await getArticleBySlug(slug);
        if (!article) { renderArticleNotFound(pageArticle); return; }

        updateArticleSEO(article);
        const pagesContent = splitContentToPages(article.content || "");
        renderArticle(pageArticle, article, pagesContent);
        requestAnimationFrame(initArticleEvents);

    } catch (err) { renderArticleError(pageArticle, err); }
}

function prepareArticlePage(pageArticle) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    pageArticle.classList.add("active");
    window.scrollTo(0, 0);
}

function renderArticleLoading(page) {
    page.innerHTML = `<div class="article-container"><p>${icon("solar:refresh-circle-line")} Đang tải...</p></div>`;
}
function renderArticleNotFound(page) {
    page.innerHTML = `<div class="article-container"><p>${icon("solar:info-circle-line")} Không tìm thấy bài viết</p></div>`;
}
function renderArticleError(page, err) {
    page.innerHTML = `<div class="article-container"><p>${icon("solar:danger-triangle-bold")} Lỗi tải nội dung: ${err.message}</p></div>`;
}

function renderArticle(page, article, pagesContent) {
    totalBookPages = Math.max(1, pagesContent.length);
    currentBookPage = 1;

    page.innerHTML = `
    <div class="article-container">
        <h1 class="wiki-title">${article.title}</h1>
        <hr class="divider-line">
        <div class="wiki-meta-row">
            <span class="meta-item">${icon("solar:library-2-bold")} ${getCategoryName(article.categoryId)}</span>
            <span class="meta-item">${icon("solar:eye-bold")} ${article.views || 0} lượt xem</span>
            <span class="meta-item">${icon("solar:calendar-bold")}
                ${article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
            </span>
        </div>
        <div class="wiki-reliability">${icon("solar:shield-check-bold")} Độ tin cậy: <strong>rất cao</strong></div>
        <hr class="divider-line">
        <div class="book-wrapper" id="bookWrapper">
            <button class="fullscreen-btn" id="fullscreenBtn">${icon("solar:full-screen-square-bold")}</button>
            <div class="book-pages" id="bookPages">
                ${pagesContent.map(item => `<div class="book-page markdown-body">${parseMarkdown(item)}</div>`).join("")}
            </div>
        </div>
        <div class="book-nav" id="normalBookNav">
            <button class="book-nav-btn" id="prevMainBtn">Quay lại</button>
            <span>Trang <span id="currentPageNum">1</span> / ${totalBookPages}</span>
            <button class="book-nav-btn" id="nextMainBtn" ${totalBookPages <= 1 ? "disabled" : ""}>Sau</button>
        </div>
        <hr class="divider-line">
        <div class="wiki-footer">
            <span class="footer-text">Wiki HydYar</span>
            <span class="verified-badge">${icon("solar:check-circle-broken")}</span>
        </div>
    </div>
    <div class="fs-controls" id="fsControls" style="display:none;">
        <button class="fs-btn" id="fsLeftBtn">Thoát</button>
        <div class="fs-page-nav">
            <span>Trang <span id="fsCurrentPage">1</span>/${totalBookPages}</span>
            <button class="fs-btn" id="fsNextBtn" ${totalBookPages <= 1 ? "disabled" : ""}>Sau</button>
        </div>
    </div>`;
}

// ✅ ĐÃ SỬA: Tạo link đúng dạng /space/big-bang
function updateArticleSEO(article) {
    const cat = article.categoryId || "khac";
    const id = article.id || article.slug;

    if (!id) {
        console.error("Bài viết không có ID:", article);
        return;
    }

    const url = `/${cat}/${id}`;

    history.pushState(
        { article: id },
        "",
        url
    );

    console.log("✅ Tạo link:", url);
}

function initArticleEvents() {
    document.getElementById("fullscreenBtn")?.addEventListener("click", toggleFullscreen);
    document.getElementById("nextMainBtn")?.addEventListener("click", () => changeBookPage(1));
    document.getElementById("fsNextBtn")?.addEventListener("click", () => changeBookPage(1));
    document.getElementById("prevMainBtn")?.addEventListener("click", () => currentBookPage <= 1 ? backToHome() : changeBookPage(-1));
    document.getElementById("fsLeftBtn")?.addEventListener("click", () => currentBookPage <= 1 ? closeFullscreen() : changeBookPage(-1));
    updateBookPageView();
}

function changeBookPage(step) {
    const newPage = currentBookPage + step;
    if (newPage < 1 || newPage > totalBookPages) return;
    currentBookPage = newPage;
    updateBookPageView();
}

function updateBookPageView() {
    const bookPages = document.getElementById('bookPages');
    const currentPageNum = document.getElementById('currentPageNum');
    const fsCurrentPage = document.getElementById('fsCurrentPage');
    const nextMainBtn = document.getElementById('nextMainBtn');
    const fsNextBtn = document.getElementById('fsNextBtn');
    const prevMainBtn = document.getElementById('prevMainBtn');
    const fsLeftBtn = document.getElementById('fsLeftBtn');

    if (!bookPages) return;
    bookPages.style.transform = `translateX(-${(currentBookPage - 1) * 100}%)`;
    if(currentPageNum) currentPageNum.textContent = currentBookPage;
    if(fsCurrentPage) fsCurrentPage.textContent = currentBookPage;

    const isLast = currentBookPage >= totalBookPages;
    if(nextMainBtn) nextMainBtn.disabled = isLast;
    if(fsNextBtn) fsNextBtn.disabled = isLast;
    if (prevMainBtn) prevMainBtn.textContent = currentBookPage <= 1 ? 'Quay lại' : 'Trước';
    if (fsLeftBtn) fsLeftBtn.textContent = currentBookPage <= 1 ? 'Thoát' : 'Trước';
}

function toggleFullscreen() {
    const bookWrap = document.getElementById('bookWrapper');
    const fsControls = document.getElementById('fsControls');
    const bottomNav = document.querySelector('.bottom-nav');
    const normalNav = document.getElementById('normalBookNav');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const wikiFooter = document.querySelector('.wiki-footer');
    const bookPages = document.getElementById('bookPages');
    if (!bookWrap || !fsControls || !bookPages) return;

    isFullscreenMode = !isFullscreenMode;
    if(isFullscreenMode) {
        bookPages.style.transform = `translateX(-${(currentBookPage - 1) * 100}%)`;
        bookWrap.classList.add('book-fullscreen');
        if(fullscreenBtn) fullscreenBtn.style.display = 'none';
        if(normalNav) normalNav.style.display = 'none';
        if(wikiFooter) wikiFooter.style.display = 'none';
        fsControls.style.display = 'flex';
        if(bottomNav) bottomNav.classList.add('bottom-nav-hidden');
    } else { closeFullscreen(); }
}

function closeFullscreen() {
    const bookWrap = document.getElementById('bookWrapper');
    const fsControls = document.getElementById('fsControls');
    const bottomNav = document.querySelector('.bottom-nav');
    const normalNav = document.getElementById('normalBookNav');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const wikiFooter = document.querySelector('.wiki-footer');
    const bookPages = document.getElementById('bookPages');
    if (!bookWrap || !fsControls || !bookPages) return;

    isFullscreenMode = false;
    bookPages.style.transform = `translateX(-${(currentBookPage - 1) * 100}%)`;
    bookWrap.classList.remove('book-fullscreen');
    if(fullscreenBtn) fullscreenBtn.style.display = 'flex';
    if(normalNav) normalNav.style.display = 'flex';
    if(wikiFooter) wikiFooter.style.display = 'flex';
    fsControls.style.display = 'none';
    if(bottomNav) bottomNav.classList.remove('bottom-nav-hidden');
}

function backToHome() {
    closeFullscreen();
    document.querySelectorAll('.nav-item, .page').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-page="home"]')?.classList.add('active');
    document.getElementById('page-home')?.classList.add('active');
    history.pushState({}, "", location.pathname);
}

window.addEventListener("popstate", () => {
    const path = location.pathname.split("/").filter(Boolean);
    path.length >= 2 ? openArticleDetail(path[1]) : backToHome();
});

// ==============================
// RENDER DANH SÁCH
// ==============================
function articleCard(list) {
    if(!list || list.length === 0) return `<p style="padding:16px;">Chưa có bài viết</p>`;
    return list.map(a=>`
    <div class="article-card" data-id="${a.id}">
        <div class="card-content">
            <h3 class="card-title">${a.title || "Không có tiêu đề"}</h3>
            <p class="card-desc">${a.desc || "Chưa có mô tả"}</p>
            <div class="card-meta">
                <span>${icon("solar:library-bold")} ${getCategoryName(a.categoryId)}</span>
                <span>${icon("solar:eye-bold")} ${a.views || 0}</span>
            </div>
        </div>
    </div>`).join("");
}

function categoryCard(list) {
    if(!list || list.length === 0) return `<p style="padding:16px;">Chưa có danh mục</p>`;
    return list.map(c=>`
    <div class="category-card">
        <div class="category-icon">${icon(c.icon || "solar:library-bold")}</div>
        <div class="category-name">${c.name || "Không tên"}</div>
        <div class="category-count">${icon("solar:document-bold")} ${c.count || 0} bài viết</div>
    </div>`).join("");
}

async function renderWiki() {
    const featured = document.getElementById("featuredArticles");
    const latest = document.getElementById("latestArticles");
    if(!featured || !latest) return;
    featured.innerHTML = `<p>Đang tải...</p>`;
    latest.innerHTML = `<p>Đang tải...</p>`;
    try {
        const [featData, latestData] = await Promise.all([getFeaturedArticles(), getLatestArticles()]);
        featured.innerHTML = articleCard(featData);
        latest.innerHTML = articleCard(latestData);
    } catch(err) {
        featured.innerHTML = `<p>Lỗi tải bài viết</p>`;
        latest.innerHTML = `<p>Lỗi tải bài viết</p>`;
    }
}

async function renderCategory() {
    const feat = document.getElementById("featuredCategories");
    const all = document.getElementById("allCategories");
    if(!feat || !all) return;
    try {
        categories = await getCategories();
        const html = categoryCard(categories);
        feat.innerHTML = html;
        all.innerHTML = html;
    } catch(err) {}
}

// ==============================
// TIỆN ÍCH CHUYỂN ĐỔI DỮ LIỆU
// ==============================
function slugify(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const categoryMap = {
    "Vũ trụ": "space", "Khoa học": "science", "Lịch sử": "history", "Địa lý": "geography",
    "Công nghệ": "tech", "Sinh học": "biology", "Vật lý": "physics", "Hóa học": "chemistry",
    "Toán học": "math", "Y học": "medicine", "Máy tính": "computer", "Lập trình": "coding",
    "Trò chơi": "game", "Âm nhạc": "music", "Nghệ thuật": "art", "Văn hóa": "culture",
    "Động vật": "animal", "Thực vật": "plant", "Con người": "human", "Cổ vật": "ancient",
    "Địa điểm": "place", "Nhân vật": "person", "Tổ chức": "org", "Sự kiện": "event",
    "Thiên văn": "space", "Hành tinh": "planet", "Ngôi sao": "star", "Thiên hà": "galaxy",
    "Hố đen": "black-hole"
};

// Chạy 1 lần để cập nhật ID cho danh mục
async function updateCategoryIds() {
    const snap = await getDocs(collection(db, "categories"));
    for (const d of snap.docs) {
        const data = d.data();
        const name = data.name || "";
        const id = categoryMap[name] || slugify(name);
        
        await updateDoc(doc(db, "categories", d.id), { id });
        console.log(`${name} → ${id}`);
    }
    console.log("✅ Hoàn thành cập nhật ID danh mục!");
}

// Khai báo hàm toàn cục
window.changeBookPage = changeBookPage;
window.toggleFullscreen = toggleFullscreen;
window.closeFullscreen = closeFullscreen;
window.backToHome = backToHome;
