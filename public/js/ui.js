export default class Ui {
    constructor(app) {
        this.app = app;
    }

      icon(n){return`<iconify-icon icon="${n}"></iconify-icon>`;}
      slugify(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
      initNavigation(){document.querySelectorAll(".nav-item").forEach(b=>{b.replaceWith(b.cloneNode(true));});document.querySelectorAll(".nav-item").forEach(b=>{b.addEventListener("click",()=>HydYarWiki.navigate(b.dataset.page));});}
      initDarkMode(){const{$dom:s}=this.app.state;s.darkModeToggle=document.getElementById("darkModeToggle");if(!s.darkModeToggle)return;const t=localStorage.getItem("wiki-theme")||"light";document.documentElement.setAttribute("data-theme",t);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",t==="dark");s.darkModeToggle.addEventListener("click",()=>{const n=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);localStorage.setItem("wiki-theme",n);s.darkModeToggle.querySelector(".toggle-switch")?.classList.toggle("active",n==="dark");});}
      initPerformance(){
    const state = this.app.state;

    const isLowEnd =
        navigator.hardwareConcurrency <= 4 ||
        navigator.deviceMemory <= 4 ||
        innerWidth <= 360;

    if(isLowEnd){
        document.documentElement.classList.add("low-end");
    }

    const btn = document.getElementById("optimizeToggle");
    if(!btn) {
        console.warn("Không tìm thấy optimizeToggle");
        return;
    }

    const toggle = btn.querySelector(".toggle-switch");

    if(state.optimizeEnabled){
        document.documentElement.classList.add("low-end");
        toggle?.classList.add("active");
    }

    btn.onclick = () => {
        state.optimizeEnabled = !state.optimizeEnabled;

        document.documentElement.classList.toggle(
            "low-end",
            state.optimizeEnabled
        );

        toggle?.classList.toggle(
            "active",
            state.optimizeEnabled
        );

        localStorage.setItem(
            "optimizeMode",
            String(state.optimizeEnabled)
        );
    };
}
      initDomCache() {

    Object.assign(this.app.state.$dom, {
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

    // ===== Sự kiện =====

    document
        .getElementById("openCountryChat")
        ?.addEventListener("click", () => {
            HydYarWiki.navigate("countryChat");
        });

    document
        .getElementById("countryChatBack")
        ?.addEventListener("click", () => {

            document
                .querySelector(".header")
                ?.classList.remove("hidden");

            document
                .querySelector(".bottom-nav")
                ?.classList.remove("hidden");

            HydYarWiki.back();
        });
}

      initKeyboard() {
    const vh = window.visualViewport;

    if (!vh) return;

    const fullHeight = vh.height;

    const check = () => {
    const open =
        window.visualViewport &&
        visualViewport.height < window.innerHeight * 0.8;

    console.log({
        open,
        vv: visualViewport.height,
        inner: window.innerHeight
    });

    document.body.classList.toggle("keyboard-open", open);
};

    vh.addEventListener("resize", check);
}

      initChatAnimation(){

    const header = document.querySelector(".chat-header");
    const input = document.querySelector(".chat-input");
    const bottom = document.querySelector(".bottom-nav");

    if(!header || !input) return;


    // Chuẩn bị animation
    header.classList.add("chat-animate");
    input.classList.add("chat-animate");


    const openChat = ()=>{

        requestAnimationFrame(()=>{

            requestAnimationFrame(()=>{

                header.classList.add("chat-show");
                input.classList.add("chat-show");

                bottom?.classList.add("chat-hide");

            });

        });

    };


    const closeChat = ()=>{

        header.classList.remove("chat-show");
        input.classList.remove("chat-show");

        bottom?.classList.remove("chat-hide");

    };


    // Chỉ theo dõi khi back/forward trình duyệt
    window.addEventListener("popstate",()=>{

        if(location.pathname === "/cong-dong/chat"){

            openChat();

        }else{

            closeChat();

        }

    });


    // Xử lý bàn phím ảo
    if(window.visualViewport){

        visualViewport.addEventListener("resize",()=>{

            const keyboard =
                visualViewport.height <
                window.innerHeight * 0.8;


            document.body.classList.toggle(
                "keyboard-open",
                keyboard
            );

        });

    }

}
}