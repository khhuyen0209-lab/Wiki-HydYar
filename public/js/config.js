// js/config.js
export const CONFIG = {
    // ✅ SERVER THẬT CỦA BẠN
    API_ORIGIN: "https://wiki-hydyar.onrender.com",

    // Gọi API luôn đi qua /api
    API_PREFIX: "/api",

    // Thời gian chờ tối đa
    API_TIMEOUT: 8000,
    BOOT_TIMEOUT: 6000,

    // Render đã xử lý SPA fallback → không cần hash router
    HASH_ROUTER: false,

    // WebSocket chat thật
    WS_CHAT: "wss://wiki-hydyar.onrender.com/ws/chat"
};
