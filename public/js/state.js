// js/state.js — 1 OBJECT DUY NHẤT CHO TOÀN APP
export default {
    isBooted: false,
    bootErrors: [],
    isLoading: false,
    loadingText: "",
    isNavigating: false,
    lastNavigateTime: 0,

    // Router
    currentPage: "home",
    currentRoute: null,
    currentParams: {},
    currentQuery: {},
    currentHash: "",
    historyStack: [],
    historyIndex: -1,

    // Auth
    isLoggedIn: false,
    authLoading: false,
    authLastCheck: 0,
    user: null,

    // Dữ liệu
    categoryList: [],
    categoryCache: {},
    articleCache: {},
    articleLoading: false,
    articleSkeletonVisible: false,
    policyCache: {},
    searchResults: [],
    readingProgress: 0,

    // Book mode
    bookMode: false,
    bookFontSize: 16,
    bookLineHeight: 1.8,
    bookCurrentChapter: 0,

    // Fullscreen
    isFullscreen: false,

    // DOM cache
    dom: {}
};
