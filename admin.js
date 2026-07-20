import { db } from "./firebase.js";
import {
    doc, getDoc, setDoc, serverTimestamp, collection, getDocs,
    query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// === HÀM DÙNG CHUNG ===
function icon(name) { return `<iconify-icon icon="${name}"></iconify-icon>`; }
let previousPage = 'home';


document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initArticleClick(); // ✅ Bấm mở bài viết chi tiết
    createArticle();
    createCategory();
    loadFeatured();
    loadLatest();
});


// =============================
// ĐIỀU HƯỚNG TRANG
// =============================
function initNavigation() {
    const nav = document.querySelectorAll(".nav-item");
    const pages = document.querySelectorAll(".page");

    nav.forEach(btn => {
        btn.onclick = () => {
            nav.forEach(x => x.classList.remove("active"));
            pages.forEach(x => x.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("page-" + btn.dataset.page).classList.add("active");
            window.scrollTo(0, 0);
        };
    });
}


// =============================
// ✅ CHỨC NĂNG MỞ BÀI VIẾT CHI TIẾT
// =============================
function initArticleClick() {
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.article-card');
        if (!card) return;
        const articleId = card.dataset.id;
        if (!articleId) return;

        // Lưu trang hiện tại để quay lại
        document.querySelectorAll('.page').forEach(p => {
            if (p.classList.contains('active')) previousPage = p.id.replace('page-', '');
        });

        openArticleDetail(articleId);
    });
}

async function openArticleDetail(articleId) {
    const pageArticle = document.getElementById('page-article');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    if (!pageArticle) return;

    // Chuyển sang trang chi tiết
    navItems.forEach(i => i.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-article').classList.add('active');
    window.scrollTo(0, 0);
    pageArticle.innerHTML = `<p>${icon("solar:refresh-circle-bold")} Đang tải nội dung...</p>`;

    try {
        const docSnap = await getDoc(doc(db, "wikiArticles", articleId));
        if (!docSnap.exists()) {
            pageArticle.innerHTML = `<p>${icon("solar:info-circle-bold")} Không tìm thấy bài viết!</p>`;
            return;
        }

        const a = docSnap.data();
        pageArticle.innerHTML = `
        <div class="article-container" style="padding:16px;">
            <button class="back-btn" id="backFromArticle" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:none;background:#f1f3f5;border-radius:8px;cursor:pointer;margin-bottom:16px;">
                ${icon("solar:arrow-left-bold")} Quay lại
            </button>

            <h1>${a.title || 'Không có tiêu đề'}</h1>
            <div style="color:#666;font-size:14px;margin:8px 0 16px;display:flex;gap:16px;">
                <span>${icon("solar:library-bold")} ${a.category || 'Khác'}</span>
                <span>${icon("solar:eye-bold")} ${a.views || 0} lượt xem</span>
                <span>${icon("solar:calendar-bold")} ${a.updatedAt ? new Date(a.updatedAt).toLocaleString('vi-VN') : 'Chưa cập nhật'}</span>
            </div>

            <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:20px;">
                <strong>Mô tả ngắn:</strong><br>${a.desc || 'Chưa có mô tả ngắn'}
            </div>

            <div style="line-height:1.8;white-space:pre-wrap;">
                <h3>Nội dung chi tiết</h3>
                ${a.fullContent || 'Chưa có nội dung chi tiết'}
            </div>
        </div>`;

        // Nút quay lại thông minh
        document.getElementById('backFromArticle').addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            document.querySelector(`[data-page="${previousPage}"]`).classList.add('active');
            document.getElementById(`page-${previousPage}`).classList.add('active');
        });

    } catch (err) {
        console.error(err);
        pageArticle.innerHTML = `<p>${icon("solar:danger-triangle-bold")} Lỗi tải nội dung: ${err.message}</p>`;
    }
}


// =============================
// ✅ TẠO BÀI VIẾT - ĐÃ THÊM NỘI DUNG DÀI
// =============================
function createArticle() {
    const btn = document.getElementById("createBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const id = document.getElementById("slug").value.trim().toLowerCase();
        const title = document.getElementById("title").value.trim();
        const desc = document.getElementById("desc").value.trim();
        const fullContent = document.getElementById("fullContent").value.trim(); // ✅ Ô nhập nội dung dài
        const category = document.getElementById("category").value.trim();
        const views = Number(document.getElementById("views").value) || 0;
        const featured = document.getElementById("featured").checked;

        if (!id) return alert("Chưa nhập ID bài viết");
        if (!title) return alert("Chưa nhập tiêu đề");
        if (!desc) return alert("Chưa nhập mô tả ngắn");
        if (!fullContent) return alert("Chưa nhập nội dung chi tiết");
        if (!category) return alert("Chưa nhập danh mục");

        try {
            await setDoc(doc(db, "wikiArticles", id), {
                title,
                desc,
                fullContent, // ✅ Lưu nội dung dài vào Firestore
                category,
                views,
                featured,
                updatedAt: new Date().toISOString(),
                createdAt: serverTimestamp()
            });

            alert("✅ Đã tạo bài viết thành công!");
            loadFeatured();
            loadLatest();

        } catch (e) {
            console.error(e);
            alert("Lỗi: " + e.message);
        }
    };
}


// =============================
// TẠO DANH MỤC
// =============================
function createCategory() {
    const btn = document.getElementById("categoryBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const id = document.getElementById("catId").value.trim().toLowerCase();
        const name = document.getElementById("catName").value.trim();
        const icon = document.getElementById("catIcon").value.trim();

        if (!id) return alert("Chưa nhập ID danh mục");
        if (!name) return alert("Chưa nhập tên danh mục");

        try {
            await setDoc(doc(db, "categories", id), { name, icon, count: 0 });
            alert("✅ Đã tạo danh mục thành công");
        } catch (e) {
            console.error(e);
            alert("Lỗi: " + e.message);
        }
    };
}


// =============================
// BÀI VIẾT NỔI BẬT - ĐÃ THÊM ID ĐỂ MỞ CHI TIẾT
// =============================
async function loadFeatured() {
    const box = document.getElementById("featuredList");
    if (!box) return;
    const q = query(collection(db, "wikiArticles"), where("featured", "==", true), limit(20));
    const snap = await getDocs(q);

    box.innerHTML = snap.docs.map(d => {
        const data = d.data();
        return `
        <div class="article-card" data-id="${d.id}">
            <div class="card-content">
                <h3>${data.title}</h3>
                <p>${data.desc}</p>
                <div style="margin-top:8px;font-size:13px;color:#666;">
                    ${icon("solar:library-bold")} ${data.category || 'Khác'}
                </div>
            </div>
        </div>`;
    }).join("");
}


// =============================
// BÀI VIẾT MỚI NHẤT - ĐÃ THÊM ID ĐỂ MỞ CHI TIẾT
// =============================
async function loadLatest() {
    const box = document.getElementById("latestList");
    if (!box) return;
    const q = query(collection(db, "wikiArticles"), orderBy("updatedAt", "desc"), limit(20));
    const snap = await getDocs(q);

    box.innerHTML = snap.docs.map(d => {
        const data = d.data();
        return `
        <div class="article-card" data-id="${d.id}">
            <div class="card-content">
                <h3>${data.title}</h3>
                <p>${data.desc}</p>
                <div style="margin-top:8px;font-size:13px;color:#666;">
                    ${icon("solar:library-bold")} ${data.category || 'Khác'}
                </div>
            </div>
        </div>`;
    }).join("");
}
