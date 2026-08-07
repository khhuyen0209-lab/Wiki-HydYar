import {
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../firebase.js";

export default function Policy(appStatus){

    return {
async loadPolicyData() {
    if (Object.keys(appStatus.state.policyData).length) {
        return appStatus.state.policyData;
    }

    try {
        const r = await fetch("./policy.json", {
            cache: "no-cache"
        });

        if (!r.ok) {
            throw new Error("Không đọc được file");
        }

        appStatus.state.policyData = await r.json();

        return appStatus.state.policyData;

    } catch (e) {
        console.error("Lỗi policy.json:", e);

        return appStatus.state.policyData = {
            "chinh-sach-bao-mat": {
                title: "Chính sách bảo mật"
            },

            "chinh-sach-ban-quyen": {
                title: "Chính sách bản quyền"
            },

            "dieu-khoan-su-dung": {
                title: "Điều khoản sử dụng"
            },

            "tieu-chuan-noi-dung": {
                title: "Tiêu chuẩn nội dung"
            },

            "gioi-thieu-hydyar-wiki": {
                title: "Giới thiệu HydYar Wiki"
            },

             "gioi-thieu-unius-degens": {
                title: "Giới thiệu Unius & Degens"
             },

            "giay-phep-ma-nguon-mo": {
                title: "Giấy phép & Mã nguồn mở"
            },

            "bao-cao-vi-pham": {
                title: "Báo cáo vi phạm"
            },

            "lien-he-ho-tro": {
                title: "Liên hệ & Hỗ trợ"
            },

            "phien-ban-ung-dung": {
                title: "Phiên bản ứng dụng"
            }
        };
    }
},      async loadPolicyContent(id){if(appStatus.state.policyContentCache[id])return appStatus.state.policyContentCache[id];try{const s=await getDoc(doc(db,"policies",id));if(!s.exists())return"";const c=s.data().content||"";appStatus.state.policyContentCache[id]=c;return c;}catch(e){console.warn(`Không tải được: ${id}`,e);return"";}},
      async openPolicyPage() {
    await this.loadPolicyData();
    const p = document.getElementById("page-profile");

    if (!appStatus.state.profileOriginalHTML)
        appStatus.state.profileOriginalHTML = p.innerHTML;

    p.innerHTML = `
        <button class="policy-back"
                onclick="HydYarWiki.navigate('profile')">
            ${appStatus.ui.icon("solar:arrow-left-bold")}
            Chính sách của HydYar Wiki
        </button>

        <div class="policy-page">
            <div class="policy-card">
                ${Object.entries(appStatus.state.policyData).map(([k,i])=>`
                    <div class="policy-item" data-id="${appStatus.markdown.escapeHTML(k)}">
                        <div class="policy-icon">
                            <iconify-icon icon="solar:document-text-bold"></iconify-icon>
                        </div>
                        <div class="policy-content">
                            <div class="policy-title">
                                ${appStatus.markdown.escapeHTML(i.title||k)}
                            </div>
                        </div>
                        <div class="policy-arrow">
                            ${appStatus.ui.icon("solar:arrow-right-bold")}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;

    p.querySelectorAll(".policy-item")
        .forEach(i => i.onclick = () =>
            HydYarWiki.navigate("policy-detail", { id: i.dataset.id }));

    appStatus.seo.updatePolicy({ title: "Chính sách HydYar Wiki" });
    scrollTo(0,0);
},
      async openPolicyDetail(id) {
    const p = appStatus.state.policyData[id];
    if (!p) return;

    const x = document.getElementById("page-profile");

    x.innerHTML = `
      <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
        ${appStatus.ui.icon("solar:arrow-left-bold")} Đang tải...
      </button>
      <div class="policy-detail" style="text-align:center;padding:2rem;">
        <p>Đang tải nội dung...</p>
      </div>
    `;

    try {
      const c = await this.loadPolicyContent(id);

      x.innerHTML = `
        <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
          ${appStatus.ui.icon("solar:arrow-left-bold")}
          ${appStatus.markdown.escapeHTML(p.title)}
        </button>

        <div class="policy-detail">
          <div class="policy-content-render">
            ${appStatus.markdown.parse(c)}
          </div>
        </div>
      `;

      appStatus.seo.updatePolicy(p);
      scrollTo(0, 0);

    } catch (e) {
      console.error("Lỗi chính sách:", e);

      x.innerHTML = `
        <button class="policy-back" onclick="HydYarWiki.navigate('policy')">
          ${appStatus.ui.icon("solar:arrow-left-bold")}
          ${appStatus.markdown.escapeHTML(p.title)}
        </button>

        <div class="policy-detail"
             style="color:var(--error);padding:2rem;">
          <p>❌ Không tải được nội dung!</p>
          <small>${appStatus.markdown.escapeHTML(e.message)}</small>
        </div>
      `;
    }
  }

    };

}