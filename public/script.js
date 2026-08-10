import {
    getFeaturedArticles,
    getLatestArticles,
    getCategories,
    getArticleBySlug,
    getArticleById,
    searchArticles,
    db,
    auth,
    googleProvider,
    syncLoginToServer
} from "./firebase.js";
  import {
    getDoc, doc, updateDoc, increment, query, where, getDocs, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    onAuthStateChanged, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import Boot from "/js/boot.js";
import Ui from "/js/ui.js";
import Seo from "/js/seo.js";
import Markdown from "/js/markdown.js";
import Search from "/js/search.js";
import Auth from "/js/auth.js";
import Category from "/js/category.js";
import Policy from "/js/policy.js";
import Chat from "/js/chat.js";
import Router from "/js/router.js";
import History from "/js/history.js";


(function () {
"use strict";

  // ==============================================
  // 🧠 APPSTATUS – CHỈ RENDER, KHÔNG ĐIỀU HƯỚNG
  // ==============================================
  const appStatus = {
    state: {
      originalCategoryHTML: "", profileOriginalHTML: "", categories: [],
      isFullscreenMode: false, bookState: { slug: null, current: 1, total: 0 },
      policyData: {}, policyContentCache: {},
      optimizeEnabled: localStorage.getItem("optimizeMode") === "true",
      categoryMap: {
        "Vũ trụ":"space","Khoa học":"science","Lịch sử":"history","Địa lý":"geography",
        "Công nghệ":"tech","Sinh học":"biology","Vật lý":"physics","Hóa học":"chemistry",
        "Toán học":"math","Y học":"medicine","Máy tính":"computer","Lập trình":"coding",
        "Trò chơi":"game","Âm nhạc":"music","Nghệ thuật":"art","Văn hóa":"culture",
        "Động vật":"animals","Thực vật":"plants","Con người":"human","Cổ vật":"ancient",
        "Địa điểm":"places","Nhân vật":"people","Tổ chức":"organizations","Sự kiện":"events",
        "Thiên văn":"astronomy","Hành tinh":"planets","Ngôi sao":"stars","Thiên hà":"galaxies",
        "Hố đen":"black-holes"
      },
      $dom: {},
      seoDefault: {
        title:"HydYar Wiki - Kho tri thức khoa học mở",
        description:"Kho tri thức mở về khoa học, thiên văn, lịch sử...",
        keywords:"wiki, tri thức, khoa học, thiên văn, lịch sử, giáo dục, hydyar",
        canonical:location.origin+"/",
        ogTitle:"HydYar Wiki - Kho tri thức khoa học mở",
        ogDesc:"Kho tri thức mở về khoa học, thiên văn, lịch sử...",
        ogImage:location.origin+"/og-image.png",
        ogType:"website", twitterCard:"summary_large_image"
      }
    },

    article: {
  // ==========================================
  // 🧰 UTILS – hàm thuần túy, không side effect
  // ==========================================
  utils: {
    getCategoryName(id) {
      const c = appStatus.state.categories.find(x => x.id === id);
      return c ? c.name : "Khác";
    },
    getReliabilityLabel(s) {
      return s == null ? "Đang cập nhật"
        : s >= 90 ? "Rất cao"
        : s >= 70 ? "Cao"
        : s >= 50 ? "Trung bình"
        : "Thấp";
    }
  },

  // ==========================================
  // 💀 SKELETON – render trạng thái loading
  // ==========================================
  skeleton: {
    articleCardSkeleton(n = 4) {
      return Array(n).fill(0).map(() =>
        `<div class="article-card skeleton-card">
          <div class="card-content">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-desc"></div>
            <div class="skeleton skeleton-desc"></div>
            <div class="skeleton skeleton-meta"></div>
          </div>
        </div>`
      ).join("");
    },
    articleDetailSkeleton() {
      return `<div class="article-container">
        <div class="skeleton skeleton-article-title"></div>
        <div class="skeleton skeleton-article-meta"></div>
        <hr class="divider-line">
        ${Array(7).fill('<div class="skeleton skeleton-article-line"></div>').join("")}
      </div>`;
    }
  },

  // ==========================================
  // 🎨 RENDER – tạo HTML từ dữ liệu
  // ==========================================
  render: {
    articleCard(list) {
      if (!list?.length)
    return `
    <div class="article-card empty-card">
        <div class="card-content empty-content">
            <iconify-icon icon="solar:file-text-bold"></iconify-icon>
            <h3>Không tìm thấy bài viết</h3>
            <p>Hãy thử từ khóa khác hoặc kiểm tra lại chính tả.</p>
        </div>
    </div>`;
      return list.map(a =>
        `<div class="article-card" data-id="${a.id}" data-cat="${a.categoryId || "khac"}">
          <div class="card-content">
            <h3 class="card-title">${appStatus.markdown.escapeHTML(a.title || "Không có tiêu đề")}</h3>
            <p class="card-desc">${appStatus.markdown.escapeHTML(a.desc || "Chưa có mô tả")}</p>
            <div class="card-meta">
              <span>${appStatus.ui.icon("solar:library-bold")} ${appStatus.article.utils.getCategoryName(a.categoryId)}</span>
              <span>${appStatus.ui.icon("solar:eye-bold")} ${a.views || 0}</span>
            </div>
          </div>
        </div>`
      ).join("");
    }
  },

  // ==========================================
  // 🔥 FIRESTORE – TẤT CẢ gọi API Firebase
  // ==========================================
  firestore: {
    async fetchFeatured() { return getFeaturedArticles(); },
    async fetchLatest() { return getLatestArticles(); },
    async fetchBySlug(id) { return getArticleBySlug(id); },
    async incrementViews(id) {

    const key = `viewed_${id}`;

    if(localStorage.getItem(key))
        return;

    localStorage.setItem(key,"1");

    setTimeout(()=>{
        localStorage.removeItem(key);
    },86400000);

    try{

        await fetch(`/api/article/${id}/view`,{
            method:"POST"
        });

    }catch(e){
        console.error(e);
    }

}
  },

  // ==========================================
  // 📖 BOOK – phân trang & trạng thái đọc sách
  // ==========================================
  book: {
    changePage(delta) {
      const b = appStatus.state.bookState;
      const n = b.current + delta;
      if (n < 1 || n > b.total) return;
      b.current = n;
      sessionStorage.setItem(`book_page_${b.slug}`, b.current);
      appStatus.article.book.updateView();
    },
    updateView() {
      const { bookState: b, $dom: d } = appStatus.state;
      if (!d.bookPages) return;
      d.bookPages.style.transition = "transform 0.25s ease";
d.bookPages.style.transform =
    `translateX(-${(b.current - 1) * 100}%)`;
      d.currentPageNum.textContent = b.current;
      d.fsCurrentPage.textContent = b.current;
      const isLast = b.current >= b.total;
      d.nextMainBtn.disabled = isLast;
      d.fsNextBtn.disabled = isLast;
      d.prevMainBtn.textContent = b.current <= 1 ? "Quay lại" : "Trước";
      d.fsLeftBtn.textContent = b.current <= 1 ? "Thoát" : "Trước";
    },
    reset(slug, pageCount) {
      const b = appStatus.state.bookState;
      b.slug = slug;
      b.total = Math.max(1, pageCount);
      b.current = Number(sessionStorage.getItem(`book_page_${slug}`)) || 1;
    }
  },

  // ==========================================
  // 🖥️ FULLSCREEN – chế độ đọc toàn màn hình
  // ==========================================
  fullscreen: {
    toggle() {
      const { isFullscreenMode: m, $dom: d } = appStatus.state;
      appStatus.state.isFullscreenMode = !m;
      if (appStatus.state.isFullscreenMode) {
        d.bookWrapper.classList.add("book-fullscreen");
        d.fullscreenBtn.style.display = "none";
        d.normalBookNav.style.display = "none";
        d.wikiFooter.style.display = "none";
        d.fsControls.style.display = "flex";
        d.bottomNav.classList.add("bottom-nav-hidden");
        d.bottomNav.style.pointerEvents = "none";
      } else {
        appStatus.article.fullscreen.close();
      }
    },
    close() {
    const { $dom: d } = appStatus.state;

    d.bookWrapper?.classList.remove("book-fullscreen");
    d.fullscreenBtn && (d.fullscreenBtn.style.display = "flex");
    d.normalBookNav && (d.normalBookNav.style.display = "flex");
    d.wikiFooter && (d.wikiFooter.style.display = "flex");
    d.fsControls && (d.fsControls.style.display = "none");
    d.bottomNav?.classList.remove("bottom-nav-hidden");

    appStatus.state.isFullscreenMode = false;
}
  },

  // ==========================================
  // 📄 READER – mở & render chi tiết bài viết
  // ==========================================
  reader: {
    cacheDom() {
      Object.assign(appStatus.state.$dom, {
        bookPages: document.getElementById("bookPages"),
        currentPageNum: document.getElementById("currentPageNum"),
        fsCurrentPage: document.getElementById("fsCurrentPage"),
        nextMainBtn: document.getElementById("nextMainBtn"),
        fsNextBtn: document.getElementById("fsNextBtn"),
        prevMainBtn: document.getElementById("prevMainBtn"),
        fsLeftBtn: document.getElementById("fsLeftBtn"),
        bookWrapper: document.getElementById("bookWrapper"),
        fsControls: document.getElementById("fsControls"),
        normalBookNav: document.getElementById("normalBookNav"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        wikiFooter: document.querySelector(".wiki-footer"),
        tocBtn: document.getElementById("tocBtn"),
        tocOverlay: document.getElementById("tocOverlay"),
        closeToc: document.getElementById("closeToc"),
      });
    },
    bindEvents() {
      const { $dom: d } = appStatus.state;
d.fullscreenBtn.addEventListener("click", () => appStatus.article.fullscreen.toggle());
      d.nextMainBtn.addEventListener("click", () => appStatus.article.book.changePage(1));
      d.fsNextBtn.addEventListener("click", () => appStatus.article.book.changePage(1));
      d.prevMainBtn.addEventListener("click", () => {
        if (appStatus.state.bookState.current > 1) appStatus.article.book.changePage(-1);
        else HydYarWiki.back();
      });
      d.fsLeftBtn.addEventListener("click", () => {
        if (appStatus.state.bookState.current > 1) appStatus.article.book.changePage(-1);
        else appStatus.article.fullscreen.close();
      });
    },
    renderNotFound() {
      appStatus.state.$dom.pageArticle.innerHTML =
        `<p style="padding:2rem;text-align:center;">
          ${appStatus.ui.icon("solar:info-circle-line")} Không tìm thấy bài viết
        </p>`;
    },
    renderError(err) {
      appStatus.state.$dom.pageArticle.innerHTML =
        `<p style="padding:2rem;text-align:center;color:var(--error);">
          ${appStatus.ui.icon("solar:close-circle-bold")} Lỗi tải: ${appStatus.markdown.escapeHTML(err.message)}
        </p>`;
    },
    renderArticle(article) {
  const { $dom: d, bookState: b } = appStatus.state;
  const pages = appStatus.markdown.buildPages(article);

  appStatus.article.book.reset(article.id, pages.length);

  d.pageArticle.innerHTML = `
    <div class="article-container">
      <h1 class="wiki-title">${appStatus.markdown.escapeHTML(article.title)}</h1>
      <hr class="divider-line">
      <div class="wiki-meta-row">
        <span>${appStatus.ui.icon("solar:library-2-bold")} ${appStatus.article.utils.getCategoryName(article.categoryId)}</span>
        <span>${appStatus.ui.icon("solar:eye-bold")} ${article.views || 0} lượt xem</span>
        <span>${appStatus.ui.icon("solar:calendar-bold")} ${article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span>
      </div>
      <div class="wiki-reliability">
        ${appStatus.ui.icon("material-symbols:verified-rounded")}
        Độ tin cậy: <strong>${appStatus.article.utils.getReliabilityLabel(article.reliability)}</strong>
      </div>
      <hr class="divider-line">
      <div class="book-wrapper" id="bookWrapper">
        <div class="book-tools">
          <button class="toc-btn" id="tocBtn">
            ${appStatus.ui.icon("solar:hamburger-menu-bold")}
          </button>
          <button class="fullscreen-btn" id="fullscreenBtn">
            ${appStatus.ui.icon("solar:full-screen-square-bold")}
          </button>
        </div>

        <div class="book-pages" id="bookPages">
  ${pages.map(page => {

    if (page.type === "infobox") {
      return `
      <div class="book-page markdown-body">
        ${appStatus.markdown.parse(page.info || "")}
      </div>`;
    }

    let pageIndex = 2;

    if (page.type === "toc") {
      return `
      <div class="book-page">
        <h2>Mục lục</h2>
        ${pages.map(page => {
          if (!page.number) return "";
          pageIndex++;
          return `
          <div class="toc-item" data-page="${pageIndex}">
            ${page.number} ${page.title}
          </div>`;
        }).join("")}
      </div>`;
    }

    // 📚 Trang tham khảo
    if (page.type === "reference") {
      return `
      <div class="book-page markdown-body reference-page">
        <h2>
          ${appStatus.ui.icon("solar:book-bookmark-bold")}
          Trang tham khảo
        </h2>

        ${appStatus.markdown.parse(page.content || "")}
      </div>`;
    }

    // Trang nội dung bình thường
    return `
    <div class="book-page markdown-body">
      <h2>${page.number} ${page.title}</h2>
      ${appStatus.markdown.parse(page.content)}
    </div>`;

  }).join("")}
</div>

        <!-- OVERLAY MỤC LỤC ĐƯỢC THÊM ĐÚNG VỊ TRÍ -->
        <div class="toc-overlay" id="tocOverlay">
          <div class="toc-panel">
            <div class="toc-header">
              <span>Mục lục</span>
              <button id="closeToc">✕</button>
            </div>
            <div class="toc-list">
  ${pages
    .map((p, i) => {

    // Trang thông tin tổng quan
    if (p.type === "infobox") {
        return `
        <div class="toc-item" data-page="${i + 1}">
            ${appStatus.ui.icon("solar:widget-bold")}
            Thông tin tổng quan
        </div>
        `;
    }

    // Trang mục lục
    if (p.type === "toc") {
        return `
        <div class="toc-item" data-page="${i + 1}">
            ${appStatus.ui.icon("solar:hamburger-menu-bold")}
            Mục lục
        </div>
        `;
    }

    // Trang tham khảo
    if (p.type === "reference") {
        return `
        <div class="toc-item" data-page="${i + 1}">
            ${appStatus.ui.icon("solar:book-bookmark-bold")}
            Trang tham khảo
        </div>
        `;
    }

    // Trang nội dung
    return `
    <div class="toc-item" data-page="${i + 1}">
        ${p.number} ${p.title}
    </div>
    `;

})
    .join("")}
</div>
          </div>
        </div>
      </div>

      <div class="book-nav" id="normalBookNav">
        <button class="book-nav-btn" id="prevMainBtn">Quay lại</button>
        <span>Trang <span id="currentPageNum">${b.current}</span> / ${b.total}</span>
        <button class="book-nav-btn" id="nextMainBtn" ${b.total <= 1 ? "disabled" : ""}>Sau</button>
      </div>
      <hr class="divider-line">
      <div class="wiki-footer">
        <span>Wiki HydYar</span>
        <span class="verified-badge">${appStatus.ui.icon("material-symbols:verified-rounded")}</span>
      </div>
      <div class="fs-controls" id="fsControls" style="display:none;">
        <button class="fs-btn" id="fsLeftBtn">Thoát</button>
        <div class="fs-page-nav">
          <span>Trang <span id="fsCurrentPage">${b.current}</span>/${b.total}</span>
          <button class="fs-btn" id="fsNextBtn" ${b.total <= 1 ? "disabled" : ""}>Sau</button>
        </div>
      </div>
    </div>`;

  appStatus.article.reader.cacheDom();
  requestAnimationFrame(() => {

    appStatus.article.reader.bindEvents();
    appStatus.article.book.updateView();

const bookPages = document.getElementById("bookPages");

if (bookPages) {

    let startX = 0;
    let startY = 0;
    let currentX = 0;

    let tracking = false;
    let horizontalGesture = false;
    let ignoreSwipe = false;

    const SWIPE_DISTANCE = 55;
    const DIRECTION_THRESHOLD = 10;

    // ==========================================
    // TOUCH START
    // ==========================================
    bookPages.addEventListener("touchstart", e => {

        if (!e.touches || e.touches.length !== 1) return;

        const target = e.target;

        // Không bắt swipe khi đang tương tác
        // với nội dung có thể kéo/bấm
        ignoreSwipe = !!target.closest(
            ".table-wrapper, .img-wrapper, input, textarea, select, button, a"
        );

        if (ignoreSwipe) {
            tracking = false;
            horizontalGesture = false;
            return;
        }

        const touch = e.touches[0];

        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;

        tracking = true;
        horizontalGesture = false;

    }, { passive: true });


    // ==========================================
    // TOUCH MOVE
    // ==========================================
    bookPages.addEventListener("touchmove", e => {

        if (ignoreSwipe) return;

        if (
            !tracking ||
            !e.touches ||
            e.touches.length !== 1
        ) return;

        const touch = e.touches[0];

        currentX = touch.clientX;

        const deltaX = currentX - startX;
        const deltaY = touch.clientY - startY;


        // Chưa đủ dữ liệu để xác định hướng
        if (
            Math.abs(deltaX) < DIRECTION_THRESHOLD &&
            Math.abs(deltaY) < DIRECTION_THRESHOLD
        ) {
            return;
        }


        // ==========================================
        // VUỐT DỌC → CHO TRÌNH DUYỆT SCROLL
        // ==========================================
        if (Math.abs(deltaY) > Math.abs(deltaX)) {

            horizontalGesture = false;

            return;
        }


        // ==========================================
        // VUỐT NGANG
        // ==========================================
        horizontalGesture = true;

        const b = appStatus.state.bookState;


        // ==========================================
        // GIỚI HẠN KÉO Ở ĐẦU / CUỐI SÁCH
        // ==========================================
        let dragX = deltaX;

        if (b.current <= 1 && dragX > 0) {
            dragX *= 0.25;
        }

        if (b.current >= b.total && dragX < 0) {
            dragX *= 0.25;
        }


        // ==========================================
        // KÉO TRANG THEO NGÓN TAY
        // ==========================================
        bookPages.style.transition = "none";

        bookPages.style.transform =
            `translateX(calc(-${(b.current - 1) * 100}% + ${dragX}px))`;

        bookPages.classList.add("swiping");

    }, { passive: true });


    // ==========================================
    // TOUCH END
    // ==========================================
    bookPages.addEventListener("touchend", () => {

        // Gesture bị bỏ qua
        if (ignoreSwipe) {

            ignoreSwipe = false;

            return;
        }

        if (!tracking) return;

        const deltaX = currentX - startX;

        tracking = false;

        bookPages.classList.remove("swiping");


        // ==========================================
        // KHÔNG PHẢI SWIPE NGANG
        // ==========================================
        if (!horizontalGesture) {

            bookPages.style.transition =
                "transform 0.2s ease";

            appStatus.article.book.updateView();

            horizontalGesture = false;

            return;
        }


        const b = appStatus.state.bookState;


        // ==========================================
        // ĐỦ DISTANCE → CHUYỂN TRANG
        // ==========================================
        if (Math.abs(deltaX) >= SWIPE_DISTANCE) {

            bookPages.style.transition =
                "transform 0.25s ease";


            // 👈 Vuốt trái → trang sau
            if (
                deltaX < 0 &&
                b.current < b.total
            ) {

                appStatus.article.book.changePage(1);

            }


            // 👉 Vuốt phải → trang trước
            else if (
                deltaX > 0 &&
                b.current > 1
            ) {

                appStatus.article.book.changePage(-1);

            }


            // Đang ở đầu/cuối
            else {

                appStatus.article.book.updateView();

            }

        }

        // ==========================================
        // CHƯA ĐỦ DISTANCE → QUAY LẠI
        // ==========================================
        else {

            bookPages.style.transition =
                "transform 0.2s ease";

            appStatus.article.book.updateView();

        }


        horizontalGesture = false;

    }, { passive: true });


    // ==========================================
    // TOUCH CANCEL
    // ==========================================
    bookPages.addEventListener("touchcancel", () => {

        tracking = false;
        horizontalGesture = false;
        ignoreSwipe = false;

        bookPages.classList.remove("swiping");

        bookPages.style.transition =
            "transform 0.2s ease";

        appStatus.article.book.updateView();

    }, { passive: true });


    // ==========================================
    // XÓA ANIMATION CLASS
    // ==========================================
    bookPages.addEventListener("animationend", e => {

        if (
            e.animationName === "bookSwipeNext" ||
            e.animationName === "bookSwipePrev"
        ) {

            bookPages.classList.remove(
                "swipe-next",
                "swipe-prev"
            );

        }

    });

}
    
document.querySelectorAll(".wiki-link").forEach(link => {

    link.onclick = async e => {

        e.preventDefault();

        const article = await getArticleById(link.dataset.id);

        if(!article){
            alert("Không tìm thấy bài viết.");
            return;
        }

        HydYarWiki.navigate("article",{
            category: article.categoryId || "khac",
            id: article.id
        });

    };

});
    
    const tocBtn = document.getElementById("tocBtn");
    const tocOverlay = document.getElementById("tocOverlay");
    const closeToc = document.getElementById("closeToc");

    // Mở / đóng mục lục
    tocBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        tocOverlay?.classList.toggle("show");
    });

    closeToc?.addEventListener("click", () => {
        tocOverlay?.classList.remove("show");
    });

    // Bấm ra ngoài để đóng
    tocOverlay?.addEventListener("click", (e) => {
        if (e.target === tocOverlay) {
            tocOverlay.classList.remove("show");
        }
    });

    // Chọn mục trong mục lục
    document.querySelectorAll(".toc-item").forEach(item => {

    item.onclick = () => {

        const page = Number(item.dataset.page);

        if(page >= 1 && page <= appStatus.state.bookState.total){

            appStatus.state.bookState.current = page;

            appStatus.article.book.updateView();

        }

        tocOverlay?.classList.remove("show");
    };

});

});
    },

    async open(id) {
      const { $dom: d } = appStatus.state;
      d.pageArticle.innerHTML = `<div class="article-container">${appStatus.article.skeleton.articleDetailSkeleton()}</div>`;
      try {
        const a = await appStatus.article.firestore.fetchBySlug(id);
        if (!a) return appStatus.article.reader.renderNotFound();
        await appStatus.article.firestore.incrementViews(a.id);
  appStatus.seo.updateArticle(a);
  appStatus.history.add(a);
  appStatus.article.reader.renderArticle(a);
      } catch (err) {
  d.featuredArticles.innerHTML = d.latestArticles.innerHTML = `<p>Lỗi tải bài viết</p>`;
        appStatus.article.reader.renderError(err);
      }
    }
  },

  // ==========================================
  // 🖱️ EVENT – bind sự kiện toàn cục
  // ==========================================
  event: {
    initCardClick() {
      document.addEventListener("click", e => {
        if (e.target.closest("button,a,.book-nav,.fs-controls,.fullscreen-btn")) return;
        const card = e.target.closest(".article-card");
        if (!card) return;
        HydYarWiki.navigate("article", {
          category: card.dataset.cat || "khac",
          id: card.dataset.id
        });
      });
    }
  },

  // ==========================================
  // 🌐 PUBLIC API – giữ nguyên 100% tên & hành vi
  // ==========================================
  getCategoryName(id) { return this.utils.getCategoryName(id); },
  getReliabilityLabel(s) { return this.utils.getReliabilityLabel(s); },
  articleCardSkeleton(n) { return this.skeleton.articleCardSkeleton(n); },
  articleDetailSkeleton() { return this.skeleton.articleDetailSkeleton(); },
  articleCard(list) { return this.render.articleCard(list); },

  async renderWiki() {
    const { $dom: d } = appStatus.state;
    if (!d.featuredArticles || !d.latestArticles) return;
    const sk = this.skeleton.articleCardSkeleton();
    d.featuredArticles.innerHTML = d.latestArticles.innerHTML = sk;
    try {
      const [f, l] = await Promise.all([
        this.firestore.fetchFeatured(),
        this.firestore.fetchLatest()
      ]);
      d.featuredArticles.innerHTML = this.render.articleCard(f);
      d.latestArticles.innerHTML = this.render.articleCard(l);
    } catch (err) {
  d.featuredArticles.innerHTML = d.latestArticles.innerHTML = `<p>Lỗi tải bài viết</p>`;
    }
  },

  changeBookPage(delta) { this.book.changePage(delta); },
  updateBookPageView() { this.book.updateView(); },
  toggleFullscreen() { this.fullscreen.toggle(); },
  closeFullscreen() { this.fullscreen.close(); },
  async openArticleDetail(id) { return this.reader.open(id); },
  initArticleClick() { this.event.initCardClick(); }
},

    async init(){

    // Hiện màn hình khởi động
    const boot = await Boot.wait();
    const result = await Promise.race([
    this.auth.check(),
    boot.offline
]);

try{

    this.ui.initDomCache();


if(result !== true){
    boot.success();
}
       
        this.ui.initDomCache();
     
        this.ui.initDarkMode();

        this.ui.initPerformance();

        this.ui.initKeyboard();

        this.ui.initChatAnimation();

        this.ui.initNavigation();

        this.category.renderCategory();

        this.article.initArticleClick();

        document
    .getElementById("wikiPolicy")
    ?.addEventListener(
        "click",
        ()=>HydYarWiki.navigate("policy")
    );

  document.addEventListener("click",e=>{

    if(e.target.closest("#wikiPolicy")){
        HydYarWiki.navigate("policy");
    }

    if(e.target.closest("#wikiHistory")){
        HydYarWiki.navigate("history");
    }

    if(e.target.closest("#historyBack")){
        HydYarWiki.navigate("profile");
    }

});

appStatus.category.initCategoryClick();

        appStatus.router.init();
        appStatus.chat.init();

    }catch(err){

        console.error("Khởi tạo thất bại:",err);

    }finally{

    if(navigator.onLine){
        bootDone();
    }

}

    }
  };

appStatus.ui = new Ui(appStatus);
appStatus.seo = new Seo(appStatus);
appStatus.markdown = new Markdown(appStatus);
appStatus.search = new Search(appStatus);
appStatus.auth = new Auth(appStatus);
appStatus.category = new Category(appStatus);
appStatus.policy = new Policy(appStatus);
appStatus.chat = new Chat(appStatus);
appStatus.router = new Router(appStatus);
appStatus.history = new History(appStatus);


  // ==============================================
  // 📤 API CÔNG KHAI – ĐÓNG BĂNG HOÀN TOÀN
  // ==============================================
  Object.defineProperty(window,"HydYarWiki",{
    value:Object.freeze({
      init:()=>appStatus.init(),
      navigate:(...a)=>appStatus.router.navigate(...a),
back:()=>appStatus.router.goBack()
    }),
    writable:false,configurable:false,enumerable:true
  });

  document.addEventListener("DOMContentLoaded",()=>HydYarWiki.init());

})();
