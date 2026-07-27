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
            console.log("Đang chạy trong WebView/Acode -> Dùng Redirect");
            await signInWithRedirect(auth, googleProvider);
        } else {
            console.log("Đang chạy trên trình duyệt chuẩn -> Dùng Popup");
            await signInWithPopup(auth, googleProvider);
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        // Fallback: Nếu popup bị trình duyệt chặn thì ép dùng Redirect
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            await signInWithRedirect(auth, googleProvider);
        }
    }
}

// 2. Hàm Đăng xuất
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log("Đã đăng xuất");
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
}

// 3. Hàm Khởi tạo Auth (BẮT BUỘC KHỞI CHẠY LÚC APP LOAD)
export function initAuth(onUserChanged) {
    // A. Bắt kết quả trả về từ Redirect (Nếu trước đó dùng signInWithRedirect)
    getRedirectResult(auth)
        .then((result) => {
            if (result) {
                console.log("Đăng nhập thành công từ Redirect:", result.user);
            }
        })
        .catch((error) => {
            console.error("Lỗi xử lý Redirect:", error);
        });

    // B. Lắng nghe trạng thái User (Login / Logout)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User hiện tại:", user.displayName, user.email);
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
// API CONFIG
// ===============================
const API_URL = "https://wiki-hydyar.onrender.com";

// ===============================
// WIKI NỔI BẬT
// ===============================
export async function getFeaturedArticles() {
    const cacheKey = "featuredArticles";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const res = await fetch(`${API_URL}/api/featured`, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });
        const text = await res.text();
        console.log("API RESPONSE:", text);

        const json = JSON.parse(text);
        if (!json.success) throw new Error("API trả về lỗi");

        setCachedData(cacheKey, json.data, true);
        return json.data;
    } catch(err) {
        console.error("Lỗi tải wiki nổi bật:", err);
        return [];
    }
}

// ===============================
// WIKI MỚI CẬP NHẬT
// ===============================
export async function getLatestArticles(){
    const cacheKey = "latestArticles";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const q = query(collection(db, "wikiArticles"), orderBy("updatedAt", "desc"), limit(10));
    const snap = await getDocs(q);
    const result = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCachedData(cacheKey, result, true);
    return result;
}

// ===============================
// DANH MỤC
// ===============================
export async function getCategories() {
    const cacheKey = "categories";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const snap = await getDocs(collection(db, "categories"));
    const result = snap.docs.map(d => ({
        id: d.data().id || d.id, docId: d.id, name: d.data().name || "Khác",
        icon: d.data().icon, count: d.data().count || 0, ...d.data()
    }));
    setCachedData(cacheKey, result, true);
    return result;
}

// ===============================
// ✅ TÌM BÀI VIẾT ĐÚNG + CACHE
// ===============================
export async function getArticleBySlug(slug) {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') return null;
    const cleanSlug = slug.trim().toLowerCase();
    const cacheKey = `article_${cleanSlug}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const ref = doc(db, "wikiArticles", cleanSlug);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const result = { id: snap.id, ...snap.data() };
            setCachedData(cacheKey, result);
            return result;
        }
    } catch {}

    try {
        const q = query(collection(db, "wikiArticles"), where("slug", "==", cleanSlug), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        const result = { id: d.id, ...d.data() };
        setCachedData(cacheKey, result);
        return result;
    } catch { return null; }
}

// ===============================
// TÌM KIẾM / BÀI CỘNG ĐỒNG / USER
// ===============================
export async function searchArticles(keyword){
    keyword = keyword.toLowerCase();
    const snap = await getDocs(collection(db, "wikiArticles"));
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(article => (
            article.title?.toLowerCase().includes(keyword) ||
            article.desc?.toLowerCase().includes(keyword) ||
            article.keywords?.toLowerCase().includes(keyword)
        ));
}

export async function getCommunityPosts(){
    const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCurrentUserData(){ 
    return auth.currentUser; 
}
