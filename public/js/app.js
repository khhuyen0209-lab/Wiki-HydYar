// ============================================================
// js/app.js
// CHỈ GẮN KẾT — tạo appStatus + boot + export HydYarWiki ra window
// ============================================================
import state    from "./state.js";
import Ui       from "./ui.js";
import seo      from "./seo.js";
import markdown from "./markdown.js";
import Auth     from "./auth.js";
import Search   from "./search.js";
import Chat     from "./chat.js";
import Category from "./category.js";
import Policy   from "./policy.js";
import Article  from "./article.js";
import Router   from "./router.js";
import Boot     from "./boot.js";

// 1 OBJECT STATE DUY NHẤT
const appStatus = {
    state,
    modules: { Ui, seo, markdown, Auth, Search, Chat, Category, Policy, Article, Router, Boot }
};

// tiện ích global
if (typeof window !== "undefined") {
    window.markdown = markdown;
    window.seo = seo;
}

// PUBLIC API — GIỮ NGUYÊN 3 HÀM CHÍNH
const HydYarWiki = {
    async init() {
        if (appStatus.state.isBooted) return { ok:true, already:true };
        return Boot.init(appStatus);
    },
    navigate(to, opts) { return Router.navigate(to, opts); },
    back()            { return Router.back(); },

    // tham chiếu module (debug / mở rộng)
    appStatus,
    state: appStatus.state,
    modules: appStatus.modules,
    Ui, seo, markdown, Auth, Search, Chat, Category, Policy, Article, Router, Boot,

    // hàm tiện ích
    reload() { location.reload(); },
    go(path) { return this.navigate(path); }
};

// GÁN VÀO WINDOW NHƯ CŨ
if (typeof window !== "undefined") {
    window.HydYarWiki = HydYarWiki;

    // TỰ KHỞI ĐỘNG KHI TRANG SẴN SÀNG
    const autoStart = true;
    if (autoStart) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => HydYarWiki.init());
        } else {
            HydYarWiki.init();
        }
    }
}

export default HydYarWiki;
