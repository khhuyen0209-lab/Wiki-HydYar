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


                // Không có user thì bỏ qua đồng bộ server
                if(user){

                    await syncLoginToServer(user);

                }


                this.user = user || null;

                this.updateUI();


                resolve(user);



            } catch(err){


                console.warn(
                    "⚠️ Không thể kết nối Server:",
                    err
                );


                const text =
                    document.getElementById("bootText");

                const btn =
                    document.getElementById("bootContinue");


                if(text)
                    text.textContent =
                    "⚠️ Mất kết nối máy chủ.";


                if(btn)
                    btn.style.display =
                    "block";



                // Cho app tiếp tục chạy offline
                this.user = user || null;

                this.updateUI();


                resolve(user);


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
        const userAvatar = document.getElementById("userAvatar");
        const profileAvatar = document.getElementById("profileAvatar");
        const profileName = document.getElementById("profileName");
        const profileUID = document.getElementById("profileUID");
        const menuList = document.querySelector(".menu-list");
        const loginBtn = document.getElementById("loginLogoutBtn");

        if (!loginBtn || !menuList) return;

        // --- CHƯA ĐĂNG NHẬP ---
        if (!this.user) {
            if (profileName) profileName.textContent = "Chưa đăng nhập";
            if (profileUID) profileUID.textContent = "Nhấn để đăng nhập";

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

            // Đặt lại vị trí nút
            if (loginBtn.parentElement) loginBtn.remove();
            menuList.prepend(loginBtn);
            return;
        }

        // --- ĐÃ ĐĂNG NHẬP ---
        if (profileName) profileName.textContent = this.user.displayName || "Người dùng";
        if (profileUID) profileUID.textContent = "@" + this.user.uid.substring(0, 8);

        if (this.user.photoURL) {
            if (userAvatar) {
                userAvatar.textContent = "";
                userAvatar.style.backgroundImage = `url("${this.user.photoURL}")`;
                userAvatar.style.backgroundSize = "cover";
                userAvatar.style.backgroundPosition = "center";
            }
            if (profileAvatar) {
                profileAvatar.textContent = "";
                profileAvatar.style.backgroundImage = `url("${this.user.photoURL}")`;
                profileAvatar.style.backgroundSize = "cover";
                profileAvatar.style.backgroundPosition = "center";
            }
        }

        loginBtn.innerHTML = `
            <iconify-icon icon="solar:logout-2-bold"></iconify-icon>
            <span>Đăng xuất</span>
        `;
        loginBtn.classList.add("text-danger");
        loginBtn.onclick = () => this.logout();

        // Đặt lại vị trí nút
        if (loginBtn.parentElement) loginBtn.remove();
        menuList.append(loginBtn);
    }

}