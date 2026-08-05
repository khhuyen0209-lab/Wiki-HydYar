import {
    getCategories,
    db
} from "../firebase.js";

import {
    query,
    where,
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


export default function Category(appStatus){

return {

    categoryCardSkeleton(n = 6){

        return Array(n).fill(0).map(()=>`

            <div class="category-card skeleton-cate">

                <div class="skeleton skeleton-cate-icon"></div>

                <div class="skeleton-cate-text">

                    <div class="skeleton skeleton-cate-name"></div>

                    <div class="skeleton skeleton-cate-count"></div>

                </div>

            </div>

        `).join("");

    },


    categoryCard(list){

        if(!list?.length){

            return `
                <p style="padding:16px;">
                    Chưa có danh mục
                </p>
            `;

        }


        return list.map(c=>`

            <div class="category-card" data-id="${c.id}">

                <div class="category-icon">

                    ${appStatus.ui.icon(
                        c.icon || "solar:library-bold"
                    )}

                </div>


                <div class="category-name">

                    ${
                        appStatus.markdown.escapeHTML(
                            c.name || "Không tên"
                        )
                    }

                </div>


                <div class="category-count">

                    ${appStatus.ui.icon(
                        "solar:document-bold"
                    )}

                    ${c.count || 0} bài viết

                </div>


            </div>


        `).join("");

    },


    async renderCategory(){

        const {
            $dom
        } = appStatus.state;


        if(
            !$dom.featuredCategories ||
            !$dom.allCategories
        ){

            console.warn(
                "Không tìm thấy vùng render danh mục"
            );

            return;

        }


        const skeleton =
            this.categoryCardSkeleton();


        $dom.featuredCategories.innerHTML =
        $dom.allCategories.innerHTML =
            skeleton;



        try{


            const categories =
                await getCategories();



            appStatus.state.categories =
                categories;



            const html =
                this.categoryCard(categories);



            $dom.featuredCategories.innerHTML =
            $dom.allCategories.innerHTML =
                html;



        }catch(err){

            console.error(
                "Lỗi tải danh mục:",
                err
            );


            $dom.featuredCategories.innerHTML =
            $dom.allCategories.innerHTML = `

                <p>
                    Không thể tải danh mục
                </p>

            `;


        }


    },


    async openCategoryDetail(id){


        const page =
            document.getElementById(
                "page-categories"
            );


        if(!page) return;



        if(
            !appStatus.state.originalCategoryHTML
        ){

            appStatus.state.originalCategoryHTML =
                page.innerHTML;

        }



        const category =
            appStatus.state.categories.find(
                c=>c.id===id
            );



        page.innerHTML = `

            <div class="page-header">


                <button
                    class="back-btn"
                    id="backCate"
                >

                    ${appStatus.ui.icon(
                        "solar:arrow-left-bold"
                    )}

                    Quay lại

                </button>


                <h1>

                    ${
                        appStatus.markdown.escapeHTML(
                            category?.name || id
                        )
                    }

                </h1>


            </div>



            <div
                class="category-detail-content"
                id="cateContent"
            >

                ${
                    appStatus.article
                    .articleCardSkeleton(3)
                }


            </div>


        `;



        document
        .getElementById("backCate")
        ?.addEventListener(
            "click",
            ()=>HydYarWiki.back()
        );



        try{


            const q =
                query(
                    collection(
                        db,
                        "wikiArticles"
                    ),
                    where(
                        "categoryId",
                        "==",
                        id
                    )
                );



            const snap =
                await getDocs(q);



            const articles =
                snap.docs.map(d=>({

                    id:d.id,
                    ...d.data()

                }));



            document
            .getElementById("cateContent")
            .innerHTML =
                appStatus.article.articleCard(
                    articles
                );



            if(category){

                appStatus.seo
                .updateCategory(
                    category
                );

            }



        }catch(err){

            console.error(
                "Lỗi mở danh mục:",
                err
            );


            document
            .getElementById("cateContent")
            .innerHTML = `

                <p>
                    Lỗi:
                    ${
                        appStatus.markdown
                        .escapeHTML(
                            err.message
                        )
                    }
                </p>

            `;

        }


    },


    initCategoryClick(){


        document.addEventListener(
            "click",
            e=>{


                const card =
                    e.target.closest(
                        ".category-card"
                    );


                if(!card) return;



                HydYarWiki.navigate(
                    "category-detail",
                    {
                        id:card.dataset.id
                    }
                );


            }
        );


    }


};


}