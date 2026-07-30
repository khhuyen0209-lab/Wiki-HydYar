// ===============================
// FIREBASE CONFIG + CACHE TOÀN CỤC
// ===============================
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getFirestore, collection, getDocs, query, where,
    orderBy, limit, doc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ===============================
// ĐỒNG BỘ FIREBASE -> SERVER
// ===============================
const API_URL = "https://wiki-hydyar.onrender.com";

export async function syncLoginToServer(user) {

    try {

        if(!user){
            throw new Error("Chưa đăng nhập");
        }

        const token = await user.getIdToken(true);

        const res = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        });


        if(!res.ok){
            throw new Error("Server không phản hồi");
        }


        const json = await res.json();


        if(!json.success){
            throw new Error(json.message || "Đồng bộ thất bại");
        }


        console.log("✅ Đã đồng bộ với Server");

        return true;


    } catch(err){

        console.error("❌ Không thể đồng bộ Server:", err);

        // Quan trọng: đẩy lỗi ra ngoài
        throw err;

    }

}

// ===============================
// 🔐 KHỞI TẠO VÀ XỬ LÝ AUTHENTICATION
// ===============================

// Check xem có đang chạy trong WebView (như Acode Preview) không
function isWebView() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return (ua.indexOf('wv') !== -1 || /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua));
}

// 1. Hàm gọi Đăng nhập (Dùng gán vào sự kiện Click của nút Đăng nhập)
export async function loginWithGoogle() {
    try {
        if (isWebView()) {
            console.log("Đang chạy trong WebView -> Redirect");
            await signInWithRedirect(auth, googleProvider);
            return;
        }

        console.log("Đang chạy trên trình duyệt -> Popup");

        const result = await signInWithPopup(auth, googleProvider);

        await syncLoginToServer(result.user);

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);

        if (
            error.code === "auth/popup-blocked" ||
            error.code === "auth/popup-closed-by-user"
        ) {
            await signInWithRedirect(auth, googleProvider);
        }
    }
}

// 2. Hàm Đăng xuất
export async function logoutUser() {
    try {

        await fetch(`${API_URL}/api/logout`, {
            method: "POST",
            credentials: "include"
        });

        await signOut(auth);

        console.log("Đã đăng xuất");

    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
}

// 3. Hàm Khởi tạo Auth (BẮT BUỘC KHỞI CHẠY LÚC APP LOAD)
export function initAuth(onUserChanged) {

    getRedirectResult(auth)
        .then(async (result) => {

            if (result?.user) {
                console.log("Đăng nhập Redirect thành công");

                await syncLoginToServer(result.user);
            }

        })
        .catch((error) => {
            console.error("Lỗi Redirect:", error);
        });

    onAuthStateChanged(auth, async (user) => {

        if (user) {

            await syncLoginToServer(user);

            console.log("User:", user.displayName);

            if (onUserChanged) onUserChanged(user);

        } else {

            console.log("Chưa đăng nhập");

            if (onUserChanged) onUserChanged(null);
        }

    });

}

// ===============================
// ✅ KHÔI PHỤC CACHE HOÀN CHỈNH
// ===============================
const CACHE_TIME = 5 * 60 * 1000; // 5 phút
const dataCache = new Map();
const wikiMetaCache = JSON.parse(sessionStorage.getItem("wikiMetaCache") || "{}");

function getCachedData(key) {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.time < CACHE_TIME) return cached.data;
    if (wikiMetaCache[key] && Date.now() - wikiMetaCache[key].time < CACHE_TIME) return wikiMetaCache[key].data;
    return null;
}

function setCachedData(key, data, persist = false) {
    dataCache.set(key, { data, time: Date.now() });
    if (persist) {
        wikiMetaCache[key] = { data, time: Date.now() };
        sessionStorage.setItem("wikiMetaCache", JSON.stringify(wikiMetaCache));
    }
}

// ===============================
// WIKI NỔI BẬT
// ===============================
export async function getFeaturedArticles() {

    const cacheKey = "featuredArticles";

    const cached = getCachedData(cacheKey);

    if (cached) return cached;

    try {

        const res = await fetch(`${API_URL}/api/featured`);

        const json = await res.json();

        if (!json.success) throw new Error();

        setCachedData(cacheKey, json.data, true);

        return json.data;

    } catch (err) {

        console.error(err);

        return [];

    }

}

// ===============================
// WIKI MỚI CẬP NHẬT
// ===============================
export async function getLatestArticles() {

    const cacheKey = "latestArticles";
    const cached = getCachedData(cacheKey);

    if (cached) return cached;

    try {

        const res = await fetch(`${API_URL}/api/latest`);

        const json = await res.json();

        if (!json.success) throw new Error();

        setCachedData(cacheKey, json.data, true);

        return json.data;

    } catch (err) {

        console.error("Lỗi tải bài mới:", err);

        return [];

    }

} 
// ===============================
// DANH MỤC
// ===============================
export async function getCategories() {

    const cacheKey = "categories";


    // Kiểm tra cache trước
    const cached = getCachedData(cacheKey);

    if (cached) {

        return cached;

    }


    try {

        const res = await fetch(
            `${API_URL}/api/categories`
        );


        if(!res.ok){

            throw new Error(
                "API danh mục không phản hồi"
            );

        }


        const json = await res.json();


        if(!json.success){

            throw new Error(
                json.message || "Lỗi tải danh mục"
            );

        }


        const result = json.data.map(item => ({

            id: item.id || item.docId,

            docId: item.docId || item.id,

            name: item.name || "Khác",

            icon: item.icon || "",

            count: item.count || 0,

            ...item

        }));


        // Lưu cache client
        setCachedData(
            cacheKey,
            result,
            true
        );


        return result;


    } catch(err){


        console.error(
            "❌ Lỗi tải danh mục:",
            err
        );


        // Nếu mất mạng thì lấy cache cũ
        const oldCache = getCachedData(cacheKey);

        if(oldCache){

            console.warn(
                "⚠️ Dùng danh mục từ cache"
            );

            return oldCache;

        }


        return [];

    }

}

// ===============================
// ✅ TÌM BÀI VIẾT ĐÚNG + CACHE
// ===============================
export async function getArticleBySlug(slug) {

    if (!slug) return null;

    const cleanSlug = slug.trim().toLowerCase();

    const cacheKey = `article_${cleanSlug}`;

    const cached = getCachedData(cacheKey);

    if (cached) return cached;

    try {

        const res = await fetch(`${API_URL}/api/article/${encodeURIComponent(cleanSlug)}`);

        const json = await res.json();

        if (!json.success) return null;

        setCachedData(cacheKey, json.data);

        return json.data;

    } catch (err) {

        console.error(err);

        return null;

    }

}

export async function getArticleById(id){
    const snap = await getDoc(doc(db, "wikiArticles", id));

    if(!snap.exists()) return null;

    return {
        id: snap.id,
        ...snap.data()
    };
}

// ===============================
// TÌM KIẾM / BÀI CỘNG ĐỒNG / USER
// ===============================
export async function searchArticles(keyword) {

    try {

        const res = await fetch(
            `${API_URL}/api/search?q=${encodeURIComponent(keyword)}`
        );

        const json = await res.json();

        if (!json.success) return [];

        return json.data;

    } catch (err) {

        console.error(err);

        return [];

    }

}

export async function getCommunityPosts(){
    const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCurrentUserData(){ 
    return auth.currentUser; 
}
