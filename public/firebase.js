// ===============================
// FIREBASE CONFIG
// ===============================

import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    getDoc,

    // Thêm 2 dòng này
    updateDoc,
    writeBatch

}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey: "AIzaSyBdEzvwzf-O-fTFbZyThoFcc45RSIHhiXA",

    authDomain: "wiki-hydyar.firebaseapp.com",

    projectId: "wiki-hydyar",

    storageBucket: "wiki-hydyar.firebasestorage.app",

    messagingSenderId: "592832721653",

    appId: "1:592832721653:web:13c99da7d18f4853f04bbc"

};



const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);



// ===============================
// WIKI NỔI BẬT
// ===============================

export async function getFeaturedArticles(){

    const q = query(

        collection(db,"wikiArticles"),

        where(
            "featured",
            "==",
            true
        ),

        limit(6)

    );


    const snap = await getDocs(q);



    return snap.docs.map(d=>({

        id:d.id,

        ...d.data()

    }));

}





// ===============================
// WIKI MỚI CẬP NHẬT
// ===============================

export async function getLatestArticles(){


    const q=query(

        collection(db,"wikiArticles"),

        orderBy(
            "updatedAt",
            "desc"
        ),

        limit(10)

    );



    const snap = await getDocs(q);



    return snap.docs.map(d=>({

        id:d.id,

        ...d.data()

    }));

}




// ===============================
// DANH MỤC
// ===============================

// Trong firebase.js
export async function getCategories() {
    const snap = await getDocs(collection(db, "categories"));

    return snap.docs.map(d => ({
        id: d.data().id || d.id,
        docId: d.id,
        ...d.data()
    }));
}





// ===============================
// LẤY CHI TIẾT WIKI
// ===============================

// ===============================
// LẤY CHI TIẾT WIKI
// ===============================

export async function getArticleBySlug(slug) {

    const ref = doc(
        db,
        "wikiArticles",
        slug
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) {
        return null;
    }

    return {
        id: snap.id,   // id = Document ID (ví dụ: "big-bang")
        ...snap.data()
    };

}




// ===============================
// TÌM KIẾM
// ===============================

export async function searchArticles(keyword){


    const snap = await getDocs(

        collection(
            db,
            "wikiArticles"
        )

    );



    return snap.docs

    .map(d=>({

        id:d.id,

        ...d.data()

    }))


    .filter(article=>


        article.title

        ?.toLowerCase()

        .includes(

            keyword.toLowerCase()

        )

    );


}




// ===============================
// BÀI CỘNG ĐỒNG
// ===============================

export async function getCommunityPosts(){


    const q=query(

        collection(
            db,
            "communityPosts"
        ),

        orderBy(
            "createdAt",
            "desc"
        ),

        limit(20)

    );



    const snap = await getDocs(q);



    return snap.docs.map(d=>({

        id:d.id,

        ...d.data()

    }));



}




// ===============================
// USER
// ===============================

export async function getCurrentUserData(){

    return null;

}