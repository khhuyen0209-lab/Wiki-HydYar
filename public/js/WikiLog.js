// ==========================================================
// 📝 WIKILOG
// Hệ thống quản lý log toàn cục cho HydYar Wiki
// ==========================================================

class WikiLog {

    constructor() {

        // ==========================================
        // 🔌 CÔNG TẮC LOG TOÀN HỆ THỐNG
        // ==========================================

        this.enabled = true;

    }


    // ==========================================
    // 📝 LOG THƯỜNG
    // ==========================================

    log(...args) {

        if (!this.enabled) return;

        console.log(...args);

    }


    // ==========================================
    // ℹ️ INFO
    // ==========================================

    info(...args) {

        if (!this.enabled) return;

        console.info(...args);

    }


    // ==========================================
    // ⚠️ WARNING
    // ==========================================

    warn(...args) {

        if (!this.enabled) return;

        console.warn(...args);

    }


    // ==========================================
    // ❌ ERROR
    // ==========================================

    error(...args) {

        if (!this.enabled) return;

        console.error(...args);

    }


    // ==========================================
    // 🧪 DEBUG
    // ==========================================

    debug(...args) {

        if (!this.enabled) return;

        console.debug(...args);

    }


    // ==========================================
    // ⏱️ TIME
    // ==========================================

    time(label) {

        if (!this.enabled) return;

        console.time(label);

    }


    timeEnd(label) {

        if (!this.enabled) return;

        console.timeEnd(label);

    }


    // ==========================================
    // 📊 TABLE
    // ==========================================

    table(data) {

        if (!this.enabled) return;

        console.table(data);

    }


    // ==========================================
    // 🧹 CLEAR
    // ==========================================

    clear() {

        if (!this.enabled) return;

        console.clear();

    }


    // ==========================================
    // 🔧 BẬT / TẮT
    // ==========================================

    enable() {

        this.enabled = true;

    }


    disable() {

        this.enabled = false;

    }

}


// ==========================================================
// 🌐 SINGLETON
// ==========================================================

const WikiLogger = new WikiLog();

export default WikiLogger;