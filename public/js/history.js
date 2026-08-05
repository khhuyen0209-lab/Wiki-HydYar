// js/history.js

export default function History(appStatus){

    const KEY = "wiki_read_history";


    return {


        // =========================
        // THÊM LỊCH SỬ
        // =========================
        add(article){

    if(!article?.id) return;


    let list = JSON.parse(
        localStorage.getItem(KEY) || "[]"
    );


    list = list.filter(
        item => item.id !== article.id
    );


    list.unshift({

        id: article.id,

        title: article.title || "Không có tiêu đề",

        desc: article.desc || "",

        categoryId:
            article.categoryId || "khac",

        time: Date.now()

    });


    localStorage.setItem(
        KEY,
        JSON.stringify(
            list.slice(0,100)
        )
    );

},



        // =========================
        // LẤY LỊCH SỬ
        // =========================
        get(){

    try{

        const list = JSON.parse(
            localStorage.getItem(KEY) || "[]"
        );


        return list.sort(
            (a,b)=> Number(b.time) - Number(a.time)
        );


    }catch(e){

        console.error(
            "History parse lỗi:",
            e
        );

        return [];

    }

},



        // =========================
        // XÓA
        // =========================
        clear(){

            localStorage.removeItem(KEY);

        },



        // =========================
        // MỞ TRANG LỊCH SỬ
        // =========================
        open(){


            const history = this;


            const page =
                document.getElementById(
                    "page-profile"
                );


            if(!page){

                console.error(
                    "Không tìm thấy page-profile"
                );

                return;

            }



            // Lưu profile gốc
            if(
                !appStatus.state.profileOriginalHTML
            ){

                appStatus.state.profileOriginalHTML =
                    page.innerHTML;

            }



            const list = history.get();



            page.innerHTML = `

<div style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-bottom:16px;
">

    <button 
        id="historyBack"
        class="policy-back"
        style="
            margin:0;
            display:flex;
            align-items:center;
            gap:8px;
        ">

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
            ">

            Xóa lịch sử

        </button>
        `

        :

        ""

    }


</div>



<div class="policy-page">


${
    list.length

    ?

    list.map(article=>`

        <div 
            class="article-card"
            data-id="${article.id}"
            data-cat="${article.categoryId}">

            <div class="card-content">


                <h3 class="card-title">

                    ${
                    appStatus.markdown
                    .escapeHTML(
                        article.title
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
                    new Date(article.time)
                    .toLocaleString(
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

        <p>
            Chưa có lịch sử đọc.
        </p>

    </div>

    `

}


</div>

`;




            // =========================
            // BACK
            // =========================

            document
            .getElementById("historyBack")
            ?.addEventListener(
                "click",
                ()=>{

                    HydYarWiki.navigate(
                        "profile"
                    );

                }
            );




            // =========================
            // CLEAR
            // =========================

            document
            .getElementById("clearHistory")
            ?.addEventListener(
                "click",
                ()=>{


                    if(
                        confirm(
                            "Xóa toàn bộ lịch sử đọc?"
                        )
                    ){

                        history.clear();

                        history.open();

                    }


                }
            );





            // =========================
            // OPEN ARTICLE
            // =========================

            page
            .querySelectorAll(
                ".article-card"
            )
            .forEach(card=>{


                card.addEventListener(
                    "click",
                    ()=>{


                        HydYarWiki.navigate(
                            "article",
                            {

                                category:
                                card.dataset.cat ||
                                "khac",


                                id:
                                card.dataset.id

                            }
                        );


                    }
                );


            });



            window.scrollTo(
                0,
                0
            );


        }


    };

}