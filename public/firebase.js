// ===============================
// FIREBASE CONFIG + CACHE TOÀN CỤC
// ===============================
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getFirestore, collection, getDocs, query, where,
    orderBy, limit, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
export async function getFeaturedArticles(){
    const cacheKey = "featuredArticles";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const q = query(collection(db,"wikiArticles"), where("featured","==",true), limit(6));
    const snap = await getDocs(q);
    const result = snap.docs.map(d=>({id:d.id,...d.data()}));
    setCachedData(cacheKey, result, true);
    return result;
}

// ===============================
// WIKI MỚI CẬP NHẬT
// ===============================
export async function getLatestArticles(){
    const cacheKey = "latestArticles";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const q=query(collection(db,"wikiArticles"), orderBy("updatedAt","desc"), limit(10));
    const snap = await getDocs(q);
    const result = snap.docs.map(d=>({id:d.id,...d.data()}));
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
    const snap = await getDocs(collection(db,"wikiArticles"));
    return snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(article=> article.title?.toLowerCase().includes(keyword.toLowerCase()));
}
export async function getCommunityPosts(){
    const q=query(collection(db,"communityPosts"), orderBy("createdAt","desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d=>({id:d.id,...d.data()}));
}
export async function getCurrentUserData(){ return null; }
