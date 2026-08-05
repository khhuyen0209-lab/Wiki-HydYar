import { searchArticles } from "../firebase.js";

export default class Search {
    constructor(app){
    this.app = app;
    this.historyKey = "wiki_search_history";
    this.initialized = false;
}
  
    getHistory(){
        return JSON.parse(localStorage.getItem(this.historyKey) || "[]");
    } 

    saveHistory(keyword){
        if(!keyword) return;

        let history=this.getHistory();

        history=history.filter(x=>x!==keyword);

        history.unshift(keyword);

        history=history.slice(0,8);

        localStorage.setItem(
            this.historyKey,
            JSON.stringify(history)
        );
    }

    renderHistory() {
    const box = this.app.state.$dom.searchHistory;
    if (!box) return;

    const history = this.getHistory();

    if (!history.length) {
        box.innerHTML = "";
        return;
    }

    box.innerHTML = `
        <div class="search-divider"></div>

        <div class="search-history-title">
            Lịch sử tìm kiếm
        </div>

        <div class="search-history-list">
            ${history.map(item => `
                <button class="history-item">
    <iconify-icon icon="solar:history-bold"></iconify-icon>
    <span>
    ${item}</span>
</button>
            `).join("")}
        </div>
    `;

    box.querySelectorAll(".history-item").forEach(btn => {
        btn.onclick = () => {
            const keyword = btn.textContent;
            this.app.state.$dom.searchInput.value = keyword;
            this.search(keyword);
        };
    });
}

    async search(keyword){

        keyword=keyword.trim();

        if(!keyword){
            this.app.state.$dom.searchResults.innerHTML="";
            return;
        }

        this.saveHistory(keyword);
        this.renderHistory();

        this.app.state.$dom.searchResults.innerHTML=
            this.app.article.articleCardSkeleton(4);

        try{

            const result=await searchArticles(keyword);

            this.app.state.$dom.searchResults.innerHTML=
                this.app.article.articleCard(result);

        }catch(e){

            this.app.state.$dom.searchResults.innerHTML=
                `<p>Lỗi tìm kiếm</p>`;

        }

    }

    init(){

        if(this.initialized) return;
    this.initialized = true;

    this.renderHistory();

        const searchInput=this.app.state.$dom.searchInput;

        if(searchInput){

            searchInput.addEventListener("input",e=>{

                this.search(e.target.value);

            });

        }

        const bindQuick=input=>{

            if(!input) return;

            input.addEventListener("keydown",e=>{

                if(e.key!=="Enter") return;

                HydYarWiki.navigate("search");

    requestAnimationFrame(()=>{

                    this.app.state.$dom.searchInput.value=input.value;

                    this.search(input.value);

                });

            });

        };

        bindQuick(this.app.state.$dom.headerSearch);

        bindQuick(this.app.state.$dom.homeSearch);


      const header = this.app.state.$dom.header;
const searchClose = this.app.state.$dom.searchClose;

if (header && searchInput) {

    searchInput.addEventListener("focus", () => {
        header.classList.add("searching");
    });

    searchInput.addEventListener("blur", () => {
        if (!searchInput.value.trim()) {
            header.classList.remove("searching");
        }
    });

    searchClose?.addEventListener("click", () => {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input"));
        header.classList.remove("searching");
        searchInput.blur();
    });

}
    }

}