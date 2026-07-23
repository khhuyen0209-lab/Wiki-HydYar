import {
    getFeaturedArticles, getLatestArticles, getCategories, getArticleBySlug, db
  } from "./firebase.js";
  import {
    getDoc, doc, updateDoc, increment, query, where, getDocs, collection
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
(function () {
"use strict";

  // ==============================================
  // 🧭 ROUTER – ĐÃ SỬA LỖI NÚT BOTTOM & HIỂN THỊ TRANG
  // ==============================================
  const Router = {
    routes: {
      home: {
        path: "/",
        async handler() {
          document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
          document.querySelector('[data-page="home"]')?.classList.add("active");
          document.getElementById("page-home")?.classList.add("active");
          await Promise.all([
            appStatus.article.renderWiki(),
            appStatus.category.renderCategory()
          ]);
          appStatus.seo.reset();
          window.scrollTo(0, 0);
        }
      },
      categories: {
        path: "/danh-muc",
        async handler() {
          document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
          document.querySelector('[data-page="categories"]')?.classList.add("active");
          document.getElementById("page-categories")?.classList.add("active");
          const page = document.getElementById("page-categories");
          if (page && appStatus.state.originalCategoryHTML) page.innerHTML = appStatus.state.originalCategoryHTML;
          await appStatus.category.renderCategory();
          appStatus.seo.updateCategory({ name: "Tất cả danh mục" });
          window.scrollTo(0, 0);
        }
      },
      search: {
    path: "/tim-kiem",
    async handler() {
        document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
        document.querySelector('[data-page="search"]')?.classList.add("active");
        document.getElementById("page-search")?.classList.add("active");
        window.scrollTo(0, 0);
    }
},

community: {
    path: "/cong-dong",
    async handler() {
        document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
        document.querySelector('[data-page="community"]')?.classList.add("active");
        document.getElementById("page-community")?.classList.add("active");
        window.scrollTo(0, 0);
    }
},

profile: {
    path: "/tai-khoan",
    async handler() {
        document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
        document.querySelector('[data-page="profile"]')?.classList.add("active");
        document.getElementById("page-profile")?.classList.add("active");
        window.scrollTo(0, 0);
    }
},
      "category-detail": {
        path: "/danh-muc/:id",
        async handler({ id }) {
          document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
          document.querySelector('[data-page="categories"]')?.classList.add("active");
          document.getElementById("page-categories")?.classList.add("active");
          await appStatus.category.openCategoryDetail(id);
        }
      },
      article: {
        path: "/:category/:id",
        async handler({ id }) {
          document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
          document.getElementById("page-article")?.classList.add("active");
          await appStatus.article.openArticleDetail(id);
        }
      },
      policy: {
        path: "/chinh-sach",
        async handler() {
          document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
          document.querySelector('[data-page="profile"]')?.classList.add("active");
          document.getElementById("page-profile")?.classList.add("active");
          await appStatus.policy.openPolicyPage();
        }
      },
      "policy-detail": {
        path: "/chinh-sach/:id",
        async handler({ id }) {
          document.querySelectorAll(".nav-item,.page").forEach(el => el.classList.remove("active"));
          document.querySelector('[data-page="profile"]')?.classList.add("active");
          document.getElementById("page-profile")?.classList.add("active");
          await appStatus.policy.openPolicyDetail(id);
        }
      }
    },

    init() {
      window.addEventListener("popstate", e => this.handlePopState(e));
      this.parseInitialURL();
    },

    async navigate(routeKey, params = {}) {
    const route = this.routes[routeKey];
    if (!route) return;

    let url = route.path;

    Object.entries(params).forEach(([k, v]) => {
        url = url.replace(`:${k}`, v || "");
    });

    url = url
        .replace(/\/:[^/]+/g, "")
        .replace(/\/+/g, "/") || "/";

    if (location.pathname === url) return;

    history.pushState(
        { route: routeKey, ...params },
        "",
        url
    );

    await route.handler(params);
},

    goBack() {
      appStatus.article.closeFullscreen();
      history.back();
    },

    async handlePopState(e) {
      const state = e.state || { route: "home" };
      await (this.routes[state.route]?.handler || this.routes.home.handler)(state);
    },

    async parseInitialURL() {
    const p = window.location.pathname.split("/").filter(Boolean);

    if (!p.length)
        return this.routes.home.handler();

    switch (p[0]) {
        case "danh-muc":
            return p.length === 1
                ? this.routes.categories.handler()
                : this.routes["category-detail"].handler({ id: p[1] });

        case "tim-kiem":
            return this.routes.search.handler();

        case "cong-dong":
            return this.routes.community.handler();

        case "tai-khoan":
            return this.routes.profile.handler();

        case "chinh-sach":
            return p.length === 1
                ? this.routes.policy.handler()
                : this.routes["policy-detail"].handler({ id: p[1] });

        default:
            if (p.length === 2)
                return this.routes.article.handler({ id: p[1] });

            return this.routes.home.handler();
    }
}
  };

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

    seo: {
      getMeta(n){const s=n.startsWith("og:")||n.startsWith("twitter:")?"property":"name";let m=document.querySelector(`meta[${s}="${n}"]`);if(!m){m=document.createElement("meta");m.setAttribute(s,n);document.head.appendChild(m);}return m;},
      getCanonical(){let l=document.querySelector('link[rel="canonical"]');if(!l){l=document.createElement("link");l.rel="canonical";document.head.appendChild(l);}return l;},
      updateHome(){const d=appStatus.state.seoDefault;document.title=d.title;this.getMeta("description").content=d.description;this.getMeta("keywords").content=d.keywords;this.getCanonical().href=d.canonical;this.getMeta("og:title").content=d.ogTitle;this.getMeta("og:description").content=d.ogDesc;this.getMeta("og:url").content=d.canonical;this.getMeta("og:image").content=d.ogImage;this.getMeta("og:type").content=d.ogType;this.getMeta("twitter:card").content=d.twitterCard;},
      updateArticle(a){if(!a)return;const u=`${location.origin}/${a.categoryId||"khac"}/${a.id}`;document.title=`${a.title} | HydYar Wiki`;this.getMeta("description").content=a.desc||appStatus.state.seoDefault.description;this.getMeta("keywords").content=a.keywords||appStatus.state.seoDefault.keywords;this.getCanonical().href=u;this.getMeta("og:title").content=a.title;this.getMeta("og:description").content=a.desc||appStatus.state.seoDefault.description;this.getMeta("og:url").content=u;this.getMeta("og:image").content=a.cover||appStatus.state.seoDefault.ogImage;this.getMeta("og:type").content="article";},
      updateCategory(c){if(!c)return;const u=`${location.origin}/danh-muc/${appStatus.ui.slugify(c.name)}`;document.title=`${c.name} | HydYar Wiki`;this.getMeta("description").content=`Danh mục ${c.name}`;this.getCanonical().href=u;this.getMeta("og:title").content=c.name;this.getMeta("og:description").content=`Danh mục ${c.name}`;this.getMeta("og:url").content=u;},
      updatePolicy(p){if(!p)return;document.title=`${p.title} | HydYar Wiki`;this.getMeta("description").content=p.desc||"Chính sách";this.getCanonical().href=location.href;this.getMeta("og:title").content=p.title;this.getMeta("og:description").content=p.desc||"Chính sách";},
      reset(){this.updateHome();}
    },

    markdown: {
      escapeHTML(s){return s?s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):"";},
      parseCode(h){return h.replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`).replace(/`([^`]+)`/g,"<code>$1</code>");},
      parseTable(h){return h.replace(/^\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n)*$/gm,t=>{const r=t.trim().split("\n"),h=r[0].split("|").map(c=>c.trim()).filter(Boolean),b=r.slice(2).map(x=>`<tr>${x.split("|").map(c=>c.trim()).filter(Boolean).map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");return`<table class="md-table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${b}</tbody></table>`;});},
      parseImage(h){return h.replace(/!\[([^\]]*)\]\(\s*([^)]+?)\s*(?:"([^"]+)")?\)/g,(_,a,s,c)=>{if(!/^https?:\/\//.test(s))return`<p class="img-error">Link ảnh không hợp lệ</p>`;return`<div class="img-wrapper"><img src="${encodeURI(s)}" alt="${this.escapeHTML(a)}" loading="lazy" onerror="this.parentElement.innerHTML='<p class=&quot;img-error&quot;>Không tải được ảnh</p>'">${c?`<div class="img-caption">${this.escapeHTML(c)}</div>`:""}</div>`;});},
      parseLink(h){const t=this;return h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>').replace(/\(\s*([^)]+?)\s*\)\s*\[(https?:\/\/[^\s\]]+)\]/g,'<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>').replace(/^-?\s*([^:\n]+?)\s*:\s*(https?:\/\/[^\s<]+)/gm,(_,n,u)=>`<a href="${encodeURI(u)}" target="_blank" rel="noopener noreferrer" class="md-link">${t.escapeHTML(n)}</a>`).replace(/(^|[\s>])(https?:\/\/[^\s<"]+)/gm,(m,s,u)=>{try{const h=new URL(u).hostname.replace(/^www\./,""),n=/wikipedia\.org/.test(h)?"Wikipedia":/wikimedia\.org/.test(h)?"Wikimedia Commons":/nasa\.gov/.test(h)?"NASA":/esa\.int/.test(h)?"ESA":/youtube\.com/.test(h)?"YouTube":/github\.com/.test(h)?"GitHub":h;return`${s}<a href="${encodeURI(u)}" target="_blank" rel="noopener noreferrer" class="md-link">${n}</a>`;}catch{return m;}});},
      parseHeading(h){return h.replace(/^###### (.*)$/gm,"<h6>$1</h6>").replace(/^##### (.*)$/gm,"<h5>$1</h5>").replace(/^#### (.*)$/gm,"<h4>$1</h4>").replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>").replace(/^(\d+\.\d+(?:\.\d+)?)\s+(.*)$/gm,'<h4 class="md-sub-heading">$1 $2</h4>');},
      parseList(h){return h.replace(/^- \[ \] (.*)$/gm,'<div class="md-check"><input type="checkbox" disabled> $1</div>').replace(/^- \[x\] (.*)$/gmi,'<div class="md-check"><input type="checkbox" checked disabled> $1</div>').replace(/(?:^([-*]|\d+\.) .*(?:\r?\n|$))+/gm,m=>{const i=m.trim().split("\n").map(x=>x.replace(/^([-*]|\d+\.)\s*/,"").trim()).filter(Boolean);return`<ul>${i.map(x=>`<li>${x}</li>`).join("")}</ul>`;});},
      parseInline(h){return h.replace(/\*\*\*(.*?)\*\*\*/g,"<strong><em>$1</em></strong>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/__(.*?)__/g,"<strong>$1</strong>").replace(/_(.*?)_/g,"<em>$1</em>").replace(/~~(.*?)~~/g,"<del>$1</del>").replace(/\^([^^]+)\^/g,"<sup>$1</sup>").replace(/~([^~]+)~/g,"<sub>$1</sub>").replace(/:warning:/g,"⚠️").replace(/:white_check_mark:/g,"✅").replace(/:x:/g,"❌").replace(/:bulb:/g,"💡").replace(/:rocket:/g,"🚀").replace(/:book:/g,"📖");},
      parseParagraph(h){return h.split(/\n{2,}/).map(p=>/^\s*<(h\d|blockquote|ul|ol|table|pre|hr|div|img)/i.test(p)?p:`<p>${p.replace(/\n/g,"<br>")}</p>`).join("");},
      parse(t){if(!t)return"";let h=this.escapeHTML(t);h=this.parseCode(h);h=this.parseTable(h);h=this.parseImage(h);h=this.parseLink(h);h=this.parseHeading(h);h=h.replace(/^\s*&gt;\s?(.*)$/gm,"<blockquote>$1</blockquote>").replace(/^(---|\*\*\*|___)$/gm,"<hr>");h=this.parseList(h);h=this.parseInline(h);h=this.parseParagraph(h);return h;},
      splitContentToPages(h){return h?h.split(/---trang\d+---/g).map(x=>x.trim()).filter(Boolean):[""];}
    },

    article: {
      getCategoryName(id){const c=appStatus.state.categories.find(x=>x.id===id);return c?c.name:"Khác";},
      getReliabilityLabel(s){return s==null?"Đang cập nhật":s>=90?"Rất cao":s>=70?"Cao":s>=50?"Trung bình":"Thấp";},
      articleCardSkeleton(n=4){return Array(n).fill(0).map(()=>`<div class="article-card skeleton-card"><div class="card-content"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-desc"></div><div class="skeleton skeleton-desc"></div><div class="skeleton skeleton-meta"></div></div></div>`).join("");},
      articleDetailSkeleton(){return`<div class="article-container"><div class="skeleton skeleton-article-title"></div><div class="skeleton skeleton-article-meta"></div><hr class="divider-line">${Array(7).fill('<div class="skeleton skeleton-article-line"></div>').join("")}</div>`;},
      articleCard(l){return!l?.length?`<p style="padding:16px;">Chưa có bài viết</p>`:l.map(a=>`<div class="article-card" data-id="${a.id}" data-cat="${a.categoryId||"khac"}"><div class="card-content"><h3 class="card-title">${appStatus.markdown.escapeHTML(a.title||"Không có tiêu đề")}</h3><p class="card-desc">${appStatus.markdown.escapeHTML(a.desc||"Chưa có mô tả")}</p><div class="card-meta"><span>${appStatus.ui.icon("solar:library-bold")} ${appStatus.markdown.escapeHTML(this.getCategoryName(a.categoryId))}</span><span>${appStatus.ui.icon("solar:eye-bold")} ${a.views||0}</span></div></div></div>`).join("");},
      async renderWiki(){const{$dom:s}=appStatus.state;if(!s.featuredArticles||!s.latestArticles)return;s.featuredArticles.innerHTML=s.latestArticles.innerHTML=this.articleCardSkeleton();try{const[f,l]=await Promise.all([getFeaturedArticles(),getLatestArticles()]);s.featuredArticles.innerHTML=this.articleCard(f);s.latestArticles.innerHTML=this.articleCard(l);}catch(e){console.error("Lỗi tải bài viết:",e);s.featuredArticles.innerHTML=s.latestArticles.innerHTML=`<p>Lỗi tải bài viết</p>`;}},
      changeBookPage(s){const{bookState:b,$dom:d}=appStatus.state;const n=b.current+s;if(n<1||n>b.total)return;b.current=n;sessionStorage.setItem(`book_page_${b.slug}`,b.current);this.updateBookPageView();},
      updateBookPageView(){const{bookState:b,$dom:d}=appStatus.state;if(!d.bookPages)return;d.bookPages.style.transform=`translateX(-${(b.current-1)*100}%)`;d.currentPageNum.textContent=b.current;d.fsCurrentPage.textContent=b.current;const l=b.current>=b.total;d.nextMainBtn.disabled=l;d.fsNextBtn.disabled=l;d.prevMainBtn.textContent=b.current<=1?"Quay lại":"Trước";d.fsLeftBtn.textContent=b.current<=1?"Thoát":"Trước";},
      toggleFullscreen(){const{isFullscreenMode:m,$dom:d}=appStatus.state;appStatus.state.isFullscreenMode=!m;if(appStatus.state.isFullscreenMode){d.bookWrapper.classList.add("book-fullscreen");d.fullscreenBtn.style.display="none";d.normalBookNav.style.display="none";d.wikiFooter.style.display="none";d.fsControls.style.display="flex";d.bottomNav.classList.add("bottom-nav-hidden");d.bottomNav.style.pointerEvents="none";}else this.closeFullscreen();},
      closeFullscreen(){const{$dom:d}=appStatus.state;appStatus.state.isFullscreenMode=false;d.bookWrapper.classList.remove("book-fullscreen");d.fullscreenBtn.style.display="flex";d.normalBookNav.style.display="flex";d.wikiFooter.style.display="flex";d.fsControls.style.display="none";d.bottomNav.classList.remove("bottom-nav-hidden");d.bottomNav.style.pointerEvents="auto";},

      async openArticleDetail(id){const{$dom:d,bookState:b}=appStatus.state;d.pageArticle.innerHTML=`<div class="article-container">${this.articleDetailSkeleton()}</div>`;try{const a=await getArticleBySlug(id);if(!a){d.pageArticle.innerHTML=`<p style="padding:2rem;text-align:center;">${appStatus.ui.icon("solar:info-circle-line")} Không tìm thấy bài viết</p>`;return;}const k=`viewed_${a.id}`;if(!localStorage.getItem(k)){localStorage.setItem(k,"1");setTimeout(()=>localStorage.removeItem(k),86400000);updateDoc(doc(db,"wikiArticles",a.id),{views:increment(1)}).catch(()=>{});}appStatus.seo.updateArticle(a);const p=appStatus.markdown.splitContentToPages(a.content||"");b.slug=a.id;b.total=Math.max(1,p.length);b.current=Number(sessionStorage.getItem(`book_page_${a.id}`))||1;d.pageArticle.innerHTML=`<div class="article-container"><h1 class="wiki-title">${appStatus.markdown.escapeHTML(a.title)}</h1><hr class="divider-line"><div class="wiki-meta-row"><span>${appStatus.ui.icon("solar:library-2-bold")} ${appStatus.markdown.escapeHTML(this.getCategoryName(a.categoryId))}</span><span>${appStatus.ui.icon("solar:eye-bold")} ${a.views||0} lượt xem</span><span>${appStatus.ui.icon("solar:calendar-bold")} ${a.updatedAt?new Date(a.updatedAt).toLocaleDateString("vi-VN"):"Chưa cập nhật"}</span></div><div class="wiki-reliability">${appStatus.ui.icon("material-symbols:verified-rounded")} Độ tin cậy: <strong>${this.getReliabilityLabel(a.reliability)}</strong></div><hr class="divider-line"><div class="book-wrapper" id="bookWrapper"><button class="fullscreen-btn" id="fullscreenBtn">${appStatus.ui.icon("solar:full-screen-square-bold")}</button><div class="book-pages" id="bookPages">${p.map(x=>`<div class="book-page markdown-body">${appStatus.markdown.parse(x)}</div>`).join("")}</div></div><div class="book-nav" id="normalBookNav"><button class="book-nav-btn" id="prevMainBtn">Quay lại</button><span>Trang <span id="currentPageNum">${b.current}</span> / ${b.total}</span><button class="book-nav-btn" id="nextMainBtn" ${b.total<=1?"disabled":""}>Sau</button></div><hr class="divider-line"><div class="wiki-footer"><span>Wiki HydYar</span><span class="verified-badge">${appStatus.ui.icon("material-symbols:verified-rounded")}</span></div><div class="fs-controls" id="fsControls" style="display:none;"><button class="fs-btn" id="fsLeftBtn">Thoát</button><div class="fs-page-nav"><span>Trang <span id="fsCurrentPage">${b.current}</span>/${b.total}</span><button class="fs-btn" id="fsNextBtn" ${b.total<=1?"disabled":""}>Sau</button></div></div></div>`;Object.assign(appStatus.state.$dom,{bookPages:document.getElementById("bookPages"),currentPageNum:document.getElementById("currentPageNum"),fsCurrentPage:document.getElementById("fsCurrentPage"),nextMainBtn:document.getElementById("nextMainBtn"),fsNextBtn:document.getElementById("fsNextBtn"),prevMainBtn:document.getElementById("prevMainBtn"),fsLeftBtn:document.getElementById("fsLeftBtn"),bookWrapper:document.getElementById("bookWrapper"),fsControls:document.getElementById("fsControls"),normalBookNav:document.getElementById("normalBookNav"),fullscreenBtn:document.getElementById("fullscreenBtn"),wikiFooter:document.querySelector(".wiki-footer")});requestAnimationFrame(()=>{d.fullscreenBtn.addEventListener("click",()=>this.toggleFullscreen());d.nextMainBtn.addEventListener("click",()=>this.changeBookPage(1));d.fsNextBtn.addEventListener("click",()=>this.changeBookPage(1));d.prevMainBtn.addEventListener("click",()=>{if(b.current>1)this.changeBookPage(-1);else HydYarWiki.back();});d.fsLeftBtn.addEventListener("click",()=>{if(b.current>1)this.changeBookPage(-1);else this.closeFullscreen();});this.updateBookPageView();});}catch(e){console.error("Lỗi mở bài viết:",e);d.pageArticle.innerHTML=`<p style="padding:2rem;text-align:center;color:var(--error);">${appStatus.ui.icon("solar:close-circle-bold")} Lỗi tải: ${appStatus.markdown.escapeHTML(e.message)}</p>`;}},

      initArticleClick(){document.addEventListener("click",e=>{if(e.target.closest("button,a,.book-nav,.fs-controls,.fullscreen-btn"))return;const c=e.target.closest(".article-card");if(!c)return;HydYarWiki.navigate("article",{category:c.dataset.cat||"khac",id:c.dataset.id});});}
    },

    category:{
      categoryCardSkeleton(n=6){return Array(n).fill(0).map(()=>`<div class="category-card skeleton-cate"><div class="skeleton skeleton-cate-icon"></div><div class="skeleton-cate-text"><div class="skeleton skeleton-cate-name"></div><div class="skeleton skeleton-cate-count"></div></div></div>`).join("");},
      categoryCard(l){return!l?.length?`<p style="padding:16px;">Chưa có danh mục</p>`:l.map(c=>`<div class="category-card" data-id="${c.id}"><div class="category-icon">${appStatus.ui.icon(c.icon||"solar:library-bold")}</div><div class="category-name">${appStatus.markdown.escapeHTML(c.name||"Không tên")}</div><div class="category-count">${appStatus.ui.icon("solar:document-bold")} ${c.count||0} bài viết</div></div>`).join("");},
      async renderCategory(){const{$dom:s}=appStatus.state;if(!s.featuredCategories||!s.allCategories)return;s.featuredCategories.innerHTML=s.allCategories.innerHTML=this.categoryCardSkeleton();try{appStatus.state.categories=await getCategories();const h=this.categoryCard(appStatus.state.categories);s.featuredCategories.innerHTML=s.allCategories.innerHTML=h;}catch(e){console.error("Lỗi tải danh mục:",e);}},
      async openCategoryDetail(id){const p=document.getElementById("page-categories");if(!p)return;if(!appStatus.state.originalCategoryHTML)appStatus.state.originalCategoryHTML=p.innerHTML;const c=appStatus.state.categories.find(x=>x.id===id);p.innerHTML=`<div class="page-header"><button class="back-btn" id="backCate">${appStatus.ui.icon("solar:arrow-left-bold")} Quay lại</button><h1>${appStatus.markdown.escapeHTML(c?.name||id)}</h1></div><div class="category-detail-content" id="cateContent">${appStatus.article.articleCardSkeleton(3)}</div>`;document.getElementById("backCate").onclick=()=>HydYarWiki.back();try{const q=query(collection(db,"wikiArticles"),where("categoryId","==",id));const s=await getDocs(q);document.getElementById("cateContent").innerHTML=appStatus.article.articleCard(s.docs.map(d=>({id:d.id,...d.data()})));c&&appStatus.seo.updateCategory(c);}catch(e){console.error("Lỗi danh mục:",e);document.getElementById("cateContent").innerHTML=`<p>Lỗi: ${appStatus.markdown.escapeHTML(e.message)}</p>`;}},
      initCategoryClick(){document.addEventListener("click",e=>{const i=e.target.closest(".category-card");if(!i)return;HydYarWiki.navigate("category-detail",{id:i.dataset.id});});}
    },

    policy:{
      async loadPolicyData(){if(Object.keys(appStatus.state.policyData).length)return appStatus.state.policyData;try{const r=await fetch("./policy.json",{cache:"no-cache"});if(!r.ok)throw new Error("Không đọc được file");appStatus.state.policyData=await r.json();return appStatus.state.policyData;}catch(e){console.error("Lỗi policy.json:",e);return appStatus.state.policyData={"chinh-sach-bao-mat":{title:"Chính sách bảo mật"},"chinh-sach-ban-quyen":{title:"Chính sách bản quyền"},"dieu-khoan-su-dung":{title:"Điều khoản sử dụng"},"tieu-chuan-noi-dung":{title:"Tiêu chuẩn nội dung"},"bao-cao-vi-pham":{title:"Báo cáo vi phạm"},"lien-he-ho-tro":{title:"Liên hệ & Hỗ trợ"},"gioi-thieu-hydyar-wiki":{title:"Giới thiệu HydYar Wiki"},"giay-phep-ma-nguon-mo":{title:"Giấy phép & Mã nguồn mở"},"phien-ban-ung-dung":{title:"Phiên bản ứng dụng"}};}},
      async loadPolicyContent(id){if(appStatus.state.policyContentCache[id])return appStatus.state.policyContentCache[id];try{const s=await getDoc(doc(db,"policies",id));if(!s.exists())return"";const c=s.data().content||"";appStatus.state.policyContentCache[id]=c;return c;}catch(e){console.warn(`Không tải được: ${id}`,e);return"";}},
      async openPolicyPage(){await this.loadPolicyData();const p=document.getElementById("page-profile");if(!appStatus.state.profileOriginalHTML)appStatus.state.profileOriginalHTML=p.innerHTML;p.innerHTML=`<button class="policy-back" onclick="HydYarWiki.navigate('policy')">${appStatus.ui.icon("solar:arrow-left-bold")} Chính sách của HydYar Wiki</button><div class="policy-page"><div class="policy-card">${Object.entries(appStatus.state.policyData).map(([k,i])=>`<div class="policy-item" data-id="${appStatus.markdown.escapeHTML(k)}"><div class="policy-icon"><iconify-icon icon="solar:document-text-bold"></iconify-icon></div><div class="policy-content"><div class="policy-title">${appStatus.markdown.escapeHTML(i.title||k)}</div></div><div class="policy-arrow">${appStatus.ui.icon("solar:arrow-right-bold")}</div></div>`).join("")}</div></div>`;p.querySelectorAll(".policy-item").forEach(i=>i.onclick=()=>HydYarWiki.navigate("policy-detail",{id:i.dataset.id}));appStatus.seo.updatePolicy({title:"Chính sách HydYar Wiki"});scrollTo(0,0);},
      async openPolicyDetail(id) {
    const p = appStatus.state.policyData[id];
    if (!p) return;

    const x = document.getElementById("page-profile");

    x.innerHTML = `
      <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
        ${appStatus.ui.icon("solar:arrow-left-bold")} Đang tải...
      </button>
      <div class="policy-detail" style="text-align:center;padding:2rem;">
        <p>Đang tải nội dung...</p>
      </div>
    `;

    try {
      const c = await this.loadPolicyContent(id);

      x.innerHTML = `
        <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
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
        <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
          ${appStatus.ui.icon("solar:arrow-left-bold")}
          ${appStatus.markdown.escapeHTML(p.title)}
        </button>

        <div class="policy-detail"
             style="color:var(--error);padding:2rem;">
          <p>❌ Không tải được nội dung!</p>
          <small>${appStatus.markdown.escapeHTML(e.message)}</small>
        </div>
      `;
    }
  }
},

    ui:{
      icon(n){return`<iconify-icon icon="${n}"></iconify-icon>`;},
      slugify(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");},
      initNavigation(){document.querySelectorAll(".nav-item").forEach(b=>{b.replaceWith(b.cloneNode(true));});document.querySelectorAll(".nav-item").forEach(b=>{b.addEventListener("click",()=>HydYarWiki.navigate(b.dataset.page));});},
      initDarkMode(){const{$dom:s}=appStatus.state;s.darkModeToggle=document.getElementById("darkModeToggle");if(!s.darkModeToggle)return;const t=localStorage.getItem("wiki-theme")||"light";document.documentElement.setAttribute("data-theme",t);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",t==="dark");s.darkModeToggle.addEventListener("click",()=>{const n=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);localStorage.setItem("wiki-theme",n);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",n==="dark");});},
      initPerformance(){const l=navigator.hardwareConcurrency<=4||navigator.deviceMemory<=4||innerWidth<=360;l&&document.documentElement.classList.add("low-end");const{$dom:s,optimizeEnabled:o}=appStatus.state;s.optimizeToggle=document.getElementById("optimizeToggle");const t=s.optimizeToggle?.querySelector(".toggle-switch");o&&(document.documentElement.classList.add("low-end"),t?.classList.add("active"));s.optimizeToggle?.addEventListener("click",()=>{appStatus.state.optimizeEnabled=!appStatus.state.optimizeEnabled;document.documentElement.classList.toggle("low-end",appStatus.state.optimizeEnabled);t?.classList.toggle("active",appStatus.state.optimizeEnabled);localStorage.setItem("optimizeMode",appStatus.state.optimizeEnabled);});},
      initDomCache(){Object.assign(appStatus.state.$dom,{pageArticle:document.getElementById("page-article"),featuredArticles:document.getElementById("featuredArticles"),latestArticles:document.getElementById("latestArticles"),featuredCategories:document.getElementById("featuredCategories"),allCategories:document.getElementById("allCategories"),darkModeToggle:document.getElementById("darkModeToggle"),optimizeToggle:document.getElementById("optimizeToggle"),bottomNav:document.querySelector(".bottom-nav")});}
    },

    async init(){this.ui.initDomCache();this.ui.initDarkMode();this.ui.initPerformance();this.ui.initNavigation();this.category.initCategoryClick();this.article.initArticleClick();document.getElementById("wikiPolicy")?.addEventListener("click",()=>HydYarWiki.navigate("policy"));Router.init();}
  };

  // ==============================================
  // 📤 API CÔNG KHAI – ĐÓNG BĂNG HOÀN TOÀN
  // ==============================================
  Object.defineProperty(window,"HydYarWiki",{
    value:Object.freeze({
      init:()=>appStatus.init(),
      navigate:(...a)=>Router.navigate(...a),
      back:()=>Router.goBack()
    }),
    writable:false,configurable:false,enumerable:true
  });

  document.addEventListener("DOMContentLoaded",()=>HydYarWiki.init());

})();
