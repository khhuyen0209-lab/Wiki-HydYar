import {
    auth,
    googleProvider,
    syncLoginToServer
} from "../firebase.js";

import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export default class Auth {

    constructor(app){
        this.app = app;
        this.user = null;
    }

    
    isWebView() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        return (ua.indexOf('wv') !== -1 || /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua));
    }

    async check() {

    try {

        const redirectRes = await getRedirectResult(auth);

        if (redirectRes) {
            console.log(
                "Đăng nhập thành công từ Redirect:",
                redirectRes.user
            );
        }

    } catch (err) {

        console.warn(
            "Bỏ qua lỗi redirect:",
            err.code
        );

    }

    return new Promise((resolve) => {

        onAuthStateChanged(auth, async (user) => {

            if (user) {

                console.log(
                    "✅ Firebase Auto Login",
                    user.uid
                );

            } else {

                console.log(
                    "❌ Chưa đăng nhập"
                );

            }

            try {

                // ==============================
                // 👤 ĐỒNG BỘ USER VỚI SERVER
                // ==============================

                if (user) {

                    const serverUser =
                        await syncLoginToServer(user);

                    console.log(
                        "🌐 USER TỪ SERVER:",
                        serverUser
                    );

                    // ==============================
                    // ⭐ DÙNG USER SERVER
                    // ==============================

                    this.user =
                        serverUser || user;

                } else {

                    this.user = null;

                }

                this.updateUI();

                resolve(this.user);

            } catch (err) {

                console.warn(
                    "⚠️ Không thể kết nối Server:",
                    err
                );

                const text =
                    document.getElementById("bootText");

                const btn =
                    document.getElementById("bootContinue");

                if (text)
                    text.textContent =
                        "⚠️ Mất kết nối máy chủ.";

                if (btn)
                    btn.style.display =
                        "block";

                // ==============================
                // OFFLINE FALLBACK
                // ==============================

                this.user =
                    user || null;

                this.updateUI();
              

                resolve(this.user);

            }

        });

    });

}

    async login() {
        try {
            if (this.isWebView()) {
                console.log("Môi trường WebView/Acode: Chuyển sang signInWithRedirect");
                await signInWithRedirect(auth, googleProvider);
            } else {
                console.log("Môi trường Trình duyệt chuẩn: Chạy signInWithPopup");
                await signInWithPopup(auth, googleProvider);
            }
        } catch (err) {
            console.error("Đăng nhập thất bại:", err.code, err.message);

            // Fallback: Nếu trình duyệt thường nhưng chặn Popup thì dùng Redirect
            if (err.code === "auth/popup-blocked") {
                console.warn("Popup bị chặn, chuyển sang Redirect...");
                await signInWithRedirect(auth, googleProvider);
                return;
            }

            let msg = "Đăng nhập thất bại, vui lòng thử lại sau.";
            if (err.code === "auth/cancelled-popup-request") {
                msg = "Đã hủy đăng nhập.";
            } else if (err.code === "auth/network-request-failed") {
                msg = "Lỗi mạng, kiểm tra kết nối internet nhé.";
            }

            alert(msg);
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.user = null;
            this.updateUI();
        } catch (err) {
            console.error("Đăng xuất thất bại:", err);
        }
    }

    updateUI() {
console.log("🔥 THIS.USER =", this.user);
console.log("🆔 HYDYAR ID =", this.user?.id);
console.log("🔥 FIREBASE UID =", this.user?.uid);
    const userAvatar = document.getElementById("userAvatar");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileName = document.getElementById("profileName");
    const profileUID = document.getElementById("profileUID");
    const menuList = document.querySelector(".menu-list");
    const loginBtn = document.getElementById("loginLogoutBtn");

    if (!loginBtn || !menuList) return;

    // ==============================
    // CHƯA ĐĂNG NHẬP
    // ==============================
    if (!this.user) {

        if (profileName)
            profileName.textContent = "Chưa đăng nhập";

        if (profileUID)
            profileUID.textContent = "Nhấn để đăng nhập";

        if (userAvatar) {
            userAvatar.textContent = "👤";
            userAvatar.style.backgroundImage = "";
            userAvatar.onclick = () => this.login();
        }

        if (profileAvatar) {
            profileAvatar.textContent = "👤";
            profileAvatar.style.backgroundImage = "";
            profileAvatar.onclick = () => this.login();
        }

        loginBtn.innerHTML = `
            <iconify-icon icon="solar:login-3-bold"></iconify-icon>
            <span>Đăng nhập</span>
        `;

        loginBtn.classList.remove("text-danger");
        loginBtn.onclick = () => this.login();

        // Đưa nút đăng nhập lên đầu
        if (loginBtn.parentElement)
            loginBtn.remove();

        menuList.prepend(loginBtn);

        return;
    }

    // ==============================
    // ĐÃ ĐĂNG NHẬP
    // ==============================

    if (profileName) {
        profileName.textContent =
            this.user.displayName ||
            this.user.name ||
            "Người dùng";
    }

    // ==============================
    // HYDYAR ID
    // ==============================

    if (profileUID) {
    profileUID.textContent = this.user.id || "Chưa có ID";
}

    // ==============================
    // AVATAR
    // ==============================

    if (this.user.photoURL || this.user.avatar) {

        const avatar =
            this.user.photoURL ||
            this.user.avatar;

        if (userAvatar) {
            userAvatar.textContent = "";
            userAvatar.style.backgroundImage =
                `url("${avatar}")`;
            userAvatar.style.backgroundSize = "cover";
            userAvatar.style.backgroundPosition = "center";
        }

        if (profileAvatar) {
            profileAvatar.textContent = "";
            profileAvatar.style.backgroundImage =
                `url("${avatar}")`;
            profileAvatar.style.backgroundSize = "cover";
            profileAvatar.style.backgroundPosition = "center";
        }

    }

    // ==============================
    // NÚT ĐĂNG XUẤT
    // ==============================

    loginBtn.innerHTML = `
        <iconify-icon icon="solar:logout-2-bold"></iconify-icon>
        <span>Đăng xuất</span>
    `;

    loginBtn.classList.add("text-danger");
    loginBtn.onclick = () => this.logout();

    // Đưa nút đăng xuất xuống cuối
    if (loginBtn.parentElement)
        loginBtn.remove();

    menuList.append(loginBtn);
}

}