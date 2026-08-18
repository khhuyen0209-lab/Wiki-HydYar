import { WordCounter } from "../tool/WordCounter.js";
import { TextFormatter } from "../tool/TextFormatter.js";
import { Calculator } from "../tool/Calculator.js";
import WikiLog from "./WikiLog.js";
// ==========================================================
// MẢNG 1 — TOOL MANAGER
// ==========================================================

class ToolManager {

    constructor(app) {

        this.app = app;

        this.storagePrefix = "wiki-tool-";

        this.tools = {

            wordCounter: {
    id: "wordCounter",
    name: "Đếm từ bài viết",
    icon: "solar:text-bold",
    description:
        "Đếm từ, ký tự và các thành phần trong văn bản.",
    defaultEnabled: false
},

textFormatter: {
    id: "textFormatter",
    name: "Định dạng văn bản",
    icon: "solar:text-selection-bold",
    description:
        "Làm sạch và chuẩn hóa văn bản nhanh chóng.",
    defaultEnabled: false
},

            calculator: {
                id: "calculator",
                name: "Máy tính cơ bản",
                icon: "solar:calculator-bold",
                description:
                    "Thực hiện các phép tính cơ bản.",
                defaultEnabled: false
            },

            quickNote: {
                id: "quickNote",
                name: "Note nhanh",
                icon: "solar:notes-bold",
                description:
                    "Ghi chú nhanh ngay trên thiết bị.",
                defaultEnabled: false
            }

        };

        this.loaded = new Set();

        this.instances = {};

        this.cssLoaded = false;

        this.accessibility = {

            root: null,
            handle: null,
            panel: null,
            list: null,

            expanded: false,
            dragging: false,

            startX: 0,
            currentX: 0,

            startY: 0,
            currentY: 0,

            dragDistance: 0,
            pointerId: null,
            justDragged: false,

            gestureDirection: null,

            positionY: 50,
            startPositionY: 50,

            positionMin: 8,
            positionMax: 92,

            openThreshold: 45,
            closeThreshold: 25,

            maxDrag: 220,

            positionStorageKey:
                "wiki-tool-accessibility-position"

        };

        this.initialized = false;

    }


    getKey(id) {

        return `${this.storagePrefix}${id}`;

    }


    isEnabled(id) {

        const tool = this.tools[id];

        if (!tool) {
            return false;
        }

        const stored =
            localStorage.getItem(
                this.getKey(id)
            );

        return stored === null
            ? tool.defaultEnabled
            : stored === "true";

    }


    async setEnabled(id, enabled) {

        if (!this.tools[id]) {
            return false;
        }

        enabled = Boolean(enabled);

        localStorage.setItem(
            this.getKey(id),
            String(enabled)
        );

        if (enabled) {
            await this.load(id);
        }

        this.renderAccessibility();

        return true;

    }


    async toggle(id) {

        if (!this.tools[id]) {
            return false;
        }

        return this.setEnabled(
            id,
            !this.isEnabled(id)
        );

    }


    getAll() {

        return Object.values(this.tools)
            .map(tool => ({
                ...tool,
                enabled:
                    this.isEnabled(tool.id)
            }));

    }


    getEnabled() {

        return this.getAll()
            .filter(tool => tool.enabled);

    }


    icon(name) {

        const element =
            document.createElement(
                "iconify-icon"
            );

        element.setAttribute(
            "icon",
            name
        );

        return element.outerHTML;

    }


    async loadCSS() {

        if (this.cssLoaded) {
            return;
        }

        const existing =
            document.querySelector(
                'link[data-hydyar-tools-css]'
            );

        if (existing) {

            this.cssLoaded = true;

            return;

        }

        await new Promise(
            (resolve, reject) => {

                const link =
                    document.createElement(
                        "link"
                    );

                link.rel =
                    "stylesheet";

                link.href =
                    "/css/tool.css";

                link.dataset.hydyarToolsCss =
                    "true";

                link.onload =
                    resolve;

                link.onerror = () => {

                    link.remove();

                    reject(
                        new Error(
                            "Không thể tải /css/tool.css"
                        )
                    );

                };

                document.head.appendChild(
                    link
                );

            }
        );

        this.cssLoaded = true;

    }


    async load(id) {

        const tool =
            this.tools[id];

        if (!tool) {
            return null;
        }

        if (!this.isEnabled(id)) {
            return null;
        }

        if (this.loaded.has(id)) {

            return (
                this.instances[id] ||
                null
            );

        }

        try {

            await this.loadCSS();

            let instance = null;

            switch (id) {

    case "wordCounter":
        instance =
            await this.initWordCounter();
        break;

    case "textFormatter":
        instance =
            await this.initTextFormatter();
        break;

    case "calculator":
        instance =
            await this.initCalculator();
        break;

    case "quickNote":
        instance =
            await this.initQuickNote();
        break;

    default:
        return null;

}

            this.instances[id] =
                instance;

            this.loaded.add(id);

            return instance;

         } catch (error) {

    WikiLog.error(
        `Tool "${id}" lỗi:`,
        error
    );

    return null;

}

    }


    async initWordCounter() {

        return new WordCounter(this);

    }

    async initTextFormatter() {

    return new TextFormatter(this);

    }

    async initCalculator() {

        return new Calculator(this);

    }


    async initQuickNote() {

        return new QuickNote(this);

    }


    async loadEnabled() {

        const enabled =
            this.getEnabled();

        await Promise.all(
            enabled.map(
                tool => this.load(tool.id)
            )
        );

    }


    createAccessibility() {

        if (
            document.getElementById(
                "wikiAccessibilityTools"
            )
        ) {
            return;
        }

        const root =
            document.createElement("div");

        root.id =
            "wikiAccessibilityTools";

        root.className =
            "wiki-accessibility-tools";

        const handle =
            document.createElement("button");

        handle.type =
            "button";

        handle.className =
            "wiki-tools-handle";

        handle.setAttribute(
            "aria-label",
            "Mở tiện ích Wiki"
        );

        handle.setAttribute(
            "aria-expanded",
            "false"
        );

        handle.innerHTML =
            this.icon(
                "solar:widget-bold"
            );

        const panel =
            document.createElement("div");

        panel.className =
            "wiki-tools-panel";

        panel.setAttribute(
            "aria-hidden",
            "true"
        );

        const list =
            document.createElement("div");

        list.className =
            "wiki-tools-list";

        panel.appendChild(list);

        root.append(
            handle,
            panel
        );

        document.body.appendChild(root);

        this.accessibility.root =
            root;

        this.accessibility.handle =
            handle;

        this.accessibility.panel =
            panel;

        this.accessibility.list =
            list;

        this.loadAccessibilityPosition();

        this.applyAccessibilityPosition();

        this.renderAccessibility();

        this.bindAccessibilityEvents();

    }


    loadAccessibilityPosition() {

        const a =
            this.accessibility;

        const saved =
            localStorage.getItem(
                a.positionStorageKey
            );

        if (saved !== null) {

            const value =
                Number(saved);

            if (Number.isFinite(value)) {

                a.positionY =
                    Math.min(
                        a.positionMax,
                        Math.max(
                            a.positionMin,
                            value
                        )
                    );

            }

        }

    }


    applyAccessibilityPosition() {

        const a =
            this.accessibility;

        if (!a.root) {
            return;
        }

        a.root.style.top =
            `${a.positionY}%`;

    }


    saveAccessibilityPosition() {

        localStorage.setItem(
            this.accessibility.positionStorageKey,
            String(
                this.accessibility.positionY
            )
        );

    }


    renderAccessibility() {

        const {
            root,
            list
        } = this.accessibility;

        if (!root || !list) {
            return;
        }

        const enabledTools =
            this.getEnabled();

        root.classList.toggle(
            "tools-empty",
            enabledTools.length === 0
        );

        list.innerHTML = "";

        enabledTools.forEach(tool => {

            const item =
                document.createElement("button");

            item.type =
                "button";

            item.className =
                "wiki-tool-item";

            item.dataset.toolId =
                tool.id;

            const icon =
                document.createElement("span");

            icon.className =
                "wiki-tool-icon";

            icon.innerHTML =
                this.icon(tool.icon);

            const content =
                document.createElement("span");

            content.className =
                "wiki-tool-content";

            const name =
                document.createElement("strong");

            name.textContent =
                tool.name;

            const description =
                document.createElement("small");

            description.textContent =
                tool.description;

            content.append(
                name,
                description
            );

            item.append(
                icon,
                content
            );

            list.appendChild(item);

        });

    }


    bindAccessibilityEvents() {

        const {
            root,
            handle,
            list
        } = this.accessibility;

        if (
            !root ||
            !handle ||
            !list
        ) {
            return;
        }

        handle.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                if (
                    this.accessibility.justDragged
                ) {

                    this.accessibility.justDragged =
                        false;

                    return;

                }

                this.toggleAccessibility();

            }
        );

        list.addEventListener(
            "click",
            async e => {

                const item =
                    e.target.closest(
                        "[data-tool-id]"
                    );

                if (!item) {
                    return;
                }

                await this.handleToolClick(
                    item.dataset.toolId
                );

            }
        );

        document.addEventListener(
            "click",
            e => {

                if (
                    this.accessibility.expanded &&
                    !root.contains(e.target)
                ) {

                    this.closeAccessibility();

                }

            }
        );

        document.addEventListener(
            "keydown",
            e => {

                if (
                    e.key === "Escape" &&
                    this.accessibility.expanded
                ) {

                    this.closeAccessibility();

                }

            }
        );

        handle.addEventListener(
            "pointerdown",
            e => this.startAccessibilityDrag(e)
        );

        handle.addEventListener(
            "pointermove",
            e => this.moveAccessibilityDrag(e)
        );

        handle.addEventListener(
            "pointerup",
            e => this.endAccessibilityDrag(e)
        );

        handle.addEventListener(
            "pointercancel",
            e => this.cancelAccessibilityDrag(e)
        );

    }


    startAccessibilityDrag(e) {

        if (
            e.pointerType === "mouse" &&
            e.button !== 0
        ) {
            return;
        }

        const a =
            this.accessibility;

        a.dragging = true;

        a.pointerId =
            e.pointerId;

        a.startX =
            a.currentX =
            e.clientX;

        a.startY =
            a.currentY =
            e.clientY;

        a.startPositionY =
            a.positionY;

        a.dragDistance =
            0;

        a.justDragged =
            false;

        a.gestureDirection =
            null;

        this.accessibility.handle
            ?.setPointerCapture?.(
                e.pointerId
            );

    }


    moveAccessibilityDrag(e) {

        const a =
            this.accessibility;

        if (
            !a.dragging ||
            a.pointerId !== e.pointerId
        ) {
            return;
        }

        a.currentX =
            e.clientX;

        a.currentY =
            e.clientY;

        const deltaX =
            a.currentX -
            a.startX;

        const deltaY =
            a.currentY -
            a.startY;

        const absX =
            Math.abs(deltaX);

        const absY =
            Math.abs(deltaY);

        a.dragDistance =
            Math.max(
                absX,
                absY
            );

        if (
            a.dragDistance > 8
        ) {
            a.justDragged = true;
        }

        if (
            !a.gestureDirection &&
            a.dragDistance > 8
        ) {

            a.gestureDirection =
                absY > absX
                    ? "vertical"
                    : "horizontal";

        }

        if (
            a.gestureDirection ===
            "vertical"
        ) {

            const height =
                window.innerHeight;

            if (height <= 0) {
                return;
            }

            let position =
                a.startPositionY +
                (
                    deltaY /
                    height
                ) * 100;

            a.positionY =
                Math.min(
                    a.positionMax,
                    Math.max(
                        a.positionMin,
                        position
                    )
                );

            this.applyAccessibilityPosition();

            return;

        }

        if (
            a.gestureDirection !==
            "horizontal"
        ) {
            return;
        }

        let distance =
            deltaX;

        if (!a.expanded) {

            distance =
                Math.min(
                    0,
                    deltaX
                );

        } else {

            distance =
                Math.max(
                    0,
                    deltaX
                );

        }

        const progress =
            Math.min(
                1,
                Math.abs(distance) /
                a.maxDrag
            );

        a.root?.style.setProperty(
            "--tool-drag-progress",
            String(progress)
        );

        a.root?.classList.add(
            "is-dragging"
        );

    }


    endAccessibilityDrag(e) {

        const a =
            this.accessibility;

        if (
            !a.dragging ||
            a.pointerId !== e.pointerId
        ) {
            return;
        }

        const deltaX =
            a.currentX -
            a.startX;

        a.dragging =
            false;

        a.pointerId =
            null;

        a.root?.classList.remove(
            "is-dragging"
        );

        a.root?.style.removeProperty(
            "--tool-drag-progress"
        );

        if (
            a.dragDistance < 8
        ) {
            a.gestureDirection =
                null;
            return;
        }

        if (
            a.gestureDirection ===
            "vertical"
        ) {

            this.saveAccessibilityPosition();

        } else if (
            a.gestureDirection ===
            "horizontal"
        ) {

            if (
                !a.expanded &&
                deltaX < -a.openThreshold
            ) {

                this.openAccessibility();

            } else if (
                a.expanded &&
                deltaX > a.closeThreshold
            ) {

                this.closeAccessibility();

            } else if (a.expanded) {

                this.openAccessibility();

            } else {

                this.closeAccessibility();

            }

        }

        a.gestureDirection =
            null;

    }


    cancelAccessibilityDrag() {

        const a =
            this.accessibility;

        a.dragging =
            false;

        a.pointerId =
            null;

        a.dragDistance =
            0;

        a.gestureDirection =
            null;

        a.root?.classList.remove(
            "is-dragging"
        );

        a.root?.style.removeProperty(
            "--tool-drag-progress"
        );

        this.applyAccessibilityPosition();

    }


    openAccessibility() {

        const a =
            this.accessibility;

        a.expanded =
            true;

        a.handle?.setAttribute(
            "aria-expanded",
            "true"
        );

        a.panel?.setAttribute(
            "aria-hidden",
            "false"
        );

        a.root?.classList.add(
            "tools-open"
        );

    }


    closeAccessibility() {

        const a =
            this.accessibility;

        a.expanded =
            false;

        a.handle?.setAttribute(
            "aria-expanded",
            "false"
        );

        a.panel?.setAttribute(
            "aria-hidden",
            "true"
        );

        a.root?.classList.remove(
            "tools-open"
        );

    }


    toggleAccessibility() {

        if (
            this.accessibility.expanded
        ) {
            this.closeAccessibility();
        } else {
            this.openAccessibility();
        }

    }


    async handleToolClick(id) {

        if (!this.tools[id]) {
            return;
        }

        if (!this.isEnabled(id)) {

            await this.setEnabled(
                id,
                true
            );

        }

        const instance =
            await this.load(id);

        if (
            !instance
        ) {
            return;
        }

        if (
            typeof instance.open ===
            "function"
        ) {

            await instance.open();

        }

        this.renderAccessibility();

    }


    canUse(id) {

        return this.isEnabled(id);

    }


    async requireEnabled(id) {

        if (!this.tools[id]) {
            return false;
        }

        if (!this.isEnabled(id)) {

            alert(
                `${this.tools[id].name} đang được tắt.`
            );

            return false;

        }

        return (
            await this.load(id)
        ) !== null;

    }


    async init() {

        if (this.initialized) {
            return;
        }

        this.initialized =
            true;

        this.createAccessibility();

        await this.loadEnabled();

        WikiLog.log(
    "Tools:",
    this.getAll()
);

    }

}

// ==========================================================
// 🪟 TOOL OVERLAY
// Cửa sổ nổi độc lập cho từng Accessibility Tool
// ==========================================================

class ToolOverlay {

    constructor(manager) {

        this.manager = manager;

        this.overlay = null;
        this.header = null;
        this.body = null;
        this.resizeHandle = null;


        // ==================================================
        // POINTER STATE
        // ==================================================

        this.dragging = false;
        this.resizing = false;

        this.pointerId = null;


        // ==================================================
        // DRAG
        // ==================================================

        this.startX = 0;
        this.startY = 0;

        this.startLeft = 0;
        this.startTop = 0;


        // ==================================================
        // RESIZE
        // ==================================================

        this.startWidth = 0;
        this.startHeight = 0;


        // ==================================================
        // TOUCH / PINCH RESIZE
        // ==================================================

        this.touchPointers =
            new Map();

        this.pinchResizing = false;

        this.pinchStartDistance = 0;

        this.pinchStartWidth = 0;
        this.pinchStartHeight = 0;


        // ==================================================
        // SNAP STATE
        // ==================================================

        this.snapped = false;
        this.snapSide = null;

        // Khoảng overlay chừa lại khi snap
        this.snapPeek = 10;

        // Ngưỡng vượt quá 50% overlay
        this.snapThreshold = 0.5;

                // Phân biệt click thật vs kéo xong thả tay
        this.wasDragged = false;


        // Vị trí trước khi snap
        this.preSnapLeft = null;
        this.preSnapTop = null;

        // Kích thước trước khi snap
        this.preSnapWidth = null;
        this.preSnapHeight = null;


        // ==================================================
        // LIMITS
        // ==================================================

        this.minWidth = 280;
        this.minHeight = 180;


        // ==================================================
        // RESIZE HANDLE
        // ==================================================

        this.minResizeHandle =
            24;

        this.maxResizeHandle =
            48;


        // ==================================================
        // STORAGE
        // ==================================================

        this.storageKey =
            "wiki-tool-overlay";

    }


    // ======================================================
    // CREATE
    // ======================================================

    create(options = {}) {

        if (this.overlay) {
            return this;
        }


        const overlay =
            document.createElement(
                "section"
            );


        overlay.className =
            "wiki-tool-overlay";


        overlay.innerHTML = `

            <div class="wiki-tool-overlay-header">

                <div class="wiki-tool-overlay-title">

                    <span
                        class="wiki-tool-overlay-icon"
                        aria-hidden="true">
                    </span>

                    <strong></strong>

                </div>


                <div class="wiki-tool-overlay-actions">

                    <button
                        type="button"
                        class="wiki-tool-overlay-minimize"
                        aria-label="Thu nhỏ"
                        title="Thu nhỏ">
                        −
                    </button>


                    <button
                        type="button"
                        class="wiki-tool-overlay-close"
                        aria-label="Đóng"
                        title="Đóng">
                        ×
                    </button>

                </div>

            </div>


            <div class="wiki-tool-overlay-body"></div>


            <div
                class="wiki-tool-overlay-resize"
                aria-hidden="true">
            </div>

        `;


        document.body.appendChild(
            overlay
        );


        // ==================================================
        // REFERENCES
        // ==================================================

        this.overlay =
            overlay;

        this.header =
            overlay.querySelector(
                ".wiki-tool-overlay-header"
            );

        this.body =
            overlay.querySelector(
                ".wiki-tool-overlay-body"
            );

        this.resizeHandle =
            overlay.querySelector(
                ".wiki-tool-overlay-resize"
            );


        const title =
            overlay.querySelector(
                ".wiki-tool-overlay-title strong"
            );


        const icon =
            overlay.querySelector(
                ".wiki-tool-overlay-icon"
            );


        // ==================================================
        // TITLE
        // ==================================================

        title.textContent =
            options.title ||
            "Tiện ích";


        // ==================================================
        // ICON
        // ==================================================

        if (
            options.icon &&
            this.manager &&
            typeof this.manager.icon ===
                "function"
        ) {

            icon.innerHTML =
                this.manager.icon(
                    options.icon
                );

        }


        // ==================================================
        // INITIAL RESIZE HANDLE
        // ==================================================

        this.updateResizeHandle();


        // ==================================================
        // RESTORE
        // ==================================================

        this.restore();


        // ==================================================
        // EVENTS
        // ==================================================

        this.bindEvents();


        return this;

    }


    // ======================================================
    // SET CONTENT
    // ======================================================

    setContent(content) {

        if (!this.body) {
            return;
        }


        this.body.innerHTML = "";


        // HTML string

        if (
            typeof content ===
            "string"
        ) {

            this.body.innerHTML =
                content;

            return;

        }


        // DOM Node

        if (
            content instanceof Node
        ) {

            this.body.appendChild(
                content
            );

        }

    }


    // ======================================================
    // OPEN
    // ======================================================

    open() {

        if (!this.overlay) {

            this.create();

        }


        this.overlay.classList.add(
            "is-visible"
        );


        this.clampToViewport();

        this.updateResizeHandle();

    }


    // ======================================================
    // CLOSE
    // ======================================================

    close() {

        if (!this.overlay) {
            return;
        }


        this.cancelInteractions();


        /*
         * Đóng tool thì dọn dẹp
         * trạng thái snap luôn.
         */

        if (this.snapped) {

            this.unfreezeBody();

            this.snapped =
                false;

            this.snapSide =
                null;

        }


        this.overlay.classList.remove(
            "is-snapped"
        );


        this.overlay.classList.remove(
            "snap-left",
            "snap-right",
            "snap-top",
            "snap-bottom"
        );


        this.overlay.classList.remove(
            "is-visible"
        );

    }


    // ======================================================
    // TOGGLE
    // ======================================================

    toggle() {

        if (!this.overlay) {

            this.create();

        }


        this.overlay.classList.toggle(
            "is-visible"
        );


        if (
            this.overlay.classList.contains(
                "is-visible"
            )
        ) {

            this.clampToViewport();

            this.updateResizeHandle();

        }

    }


    // ======================================================
    // MINIMIZE
    // ======================================================

    minimize() {

        if (!this.overlay) {
            return;
        }


        this.cancelInteractions();


        /*
         * Nếu đang snap:
         * bung ra trước rồi mới minimize.
         *
         * Tránh combo bí ẩn
         * snap + minimized + frozen.
         */

        if (this.snapped) {

            this.unsnap();

        }


        this.overlay.classList.toggle(
            "is-minimized"
        );


        this.updateResizeHandle();


        this.save();

    }


        // ======================================================
    // BIND EVENTS
    // ======================================================

    bindEvents() {

        if (
            !this.overlay ||
            !this.header ||
            !this.resizeHandle
        ) {
            return;
        }


        const close =
            this.overlay.querySelector(
                ".wiki-tool-overlay-close"
            );


        const minimize =
            this.overlay.querySelector(
                ".wiki-tool-overlay-minimize"
            );


        // ==================================================
        // CLOSE
        // ==================================================

        close.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                this.close();

            }
        );


        // ==================================================
        // MINIMIZE
        // ==================================================

        minimize.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                this.minimize();

            }
        );


        // ==================================================
        // DRAG
        // ==================================================

        this.header.addEventListener(
            "pointerdown",
            e => {

                /*
                 * Touch pointer được lưu trước.
                 * Nếu xuất hiện ngón thứ 2,
                 * drag sẽ bị hủy.
                 */

                if (
                    e.pointerType === "touch"
                ) {

                    this.registerTouchPointer(
                        e
                    );


                    if (
                        this.touchPointers.size >= 2
                    ) {

                        this.cancelDrag();

                        this.startPinchResize();

                        e.preventDefault();

                        return;

                    }

                }


                /*
                 * Không drag khi click button.
                 */

                if (
                    e.target.closest(
                        "button"
                    )
                ) {
                    return;
                }


                /*
                 * Không drag khi đang
                 * pinch / resize.
                 */

                if (
                    this.resizing ||
                    this.pinchResizing
                ) {
                    return;
                }


                this.startDrag(e);

            }
        );


        this.header.addEventListener(
            "pointermove",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.updateTouchPointer(
                        e
                    );


                    if (
                        this.touchPointers.size >= 2
                    ) {

                        this.movePinchResize(
                            e
                        );

                        return;

                    }

                }


                this.moveDrag(e);

            }
        );


        this.header.addEventListener(
            "pointerup",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.removeTouchPointer(
                        e
                    );

                    this.endPinchResize();

                }


                this.endDrag(e);

            }
        );


        this.header.addEventListener(
            "pointercancel",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.removeTouchPointer(
                        e
                    );

                    this.endPinchResize();

                }


                this.endDrag(e);

            }
        );


        // ==================================================
        // ✅ MỚI: ẤN 1 LẦN VÀO HEADER SNAP → BUNG NGAY
        // ==================================================
        this.header.addEventListener(
            "click",
            e => {

                // Chỉ kích hoạt khi đang snap
                if (!this.snapped) {
                    return;
                }

                // Không bung nếu click vào nút - / ×
                if (e.target.closest("button")) {
                    return;
                }

                // CHỈ bung khi là CLICK THẬT
                // Di chuyển > 3px = đang kéo → bỏ qua
                if (this.wasDragged) {
                    return;
                }

                e.stopPropagation();
                this.unsnap();

            }
        );


        // ==================================================
        // RESIZE HANDLE
        // ==================================================

        this.resizeHandle.addEventListener(
            "pointerdown",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.registerTouchPointer(
                        e
                    );


                    if (
                        this.touchPointers.size >= 2
                    ) {

                        this.cancelResize();

                        this.startPinchResize();

                        e.preventDefault();

                        return;

                    }

                }


                this.startResize(e);

            }
        );


        this.resizeHandle.addEventListener(
            "pointermove",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.updateTouchPointer(
                        e
                    );


                    if (
                        this.touchPointers.size >= 2
                    ) {

                        this.movePinchResize(
                            e
                        );

                        return;

                    }

                }


                this.moveResize(e);

            }
        );


        this.resizeHandle.addEventListener(
            "pointerup",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.removeTouchPointer(
                        e
                    );

                    this.endPinchResize();

                }


                this.endResize(e);

            }
        );


        this.resizeHandle.addEventListener(
            "pointercancel",
            e => {

                if (
                    e.pointerType === "touch"
                ) {

                    this.removeTouchPointer(
                        e
                    );

                    this.endPinchResize();

                }


                this.endResize(e);

            }
        );


        // ==================================================
        // TOUCH GESTURE TRÊN TOÀN OVERLAY
        // ==================================================

        this.overlay.addEventListener(
            "pointerdown",
            e => {

                if (
                    e.pointerType !== "touch"
                ) {
                    return;
                }


                this.registerTouchPointer(
                    e
                );


                if (
                    this.touchPointers.size >= 2
                ) {

                    this.cancelDrag();

                    this.cancelResize();

                    this.startPinchResize();

                    e.preventDefault();

                }

            }
        );


        this.overlay.addEventListener(
            "pointermove",
            e => {

                if (
                    e.pointerType !== "touch"
                ) {
                    return;
                }


                this.updateTouchPointer(
                    e
                );


                if (
                    this.pinchResizing &&
                    this.touchPointers.size >= 2
                ) {

                    this.movePinchResize(
                        e
                    );

                    e.preventDefault();

                }

            }
        );


        this.overlay.addEventListener(
            "pointerup",
            e => {

                if (
                    e.pointerType !== "touch"
                ) {
                    return;
                }


                this.removeTouchPointer(
                    e
                );


                if (
                    this.touchPointers.size < 2
                ) {

                    this.endPinchResize();

                }

            }
        );


        this.overlay.addEventListener(
            "pointercancel",
            e => {

                if (
                    e.pointerType !== "touch"
                ) {
                    return;
                }


                this.removeTouchPointer(
                    e
                );


                if (
                    this.touchPointers.size < 2
                ) {

                    this.endPinchResize();

                }

            }
        );


        // ==================================================
        // WINDOW RESIZE
        // ==================================================

        window.addEventListener(
            "resize",
            () => {

                /*
                 * Snap thì giữ đúng trạng thái
                 * ở mép mới của viewport.
                 */

                if (this.snapped) {

                    this.snap(
                        this.snapSide
                    );

                    return;

                }


                this.clampToViewport();

                this.updateResizeHandle();

            }
        );

    }


    // ======================================================
    // START DRAG
    // ======================================================

    startDrag(e) {

        if (
            e.pointerType === "mouse" &&
            e.button !== 0
        ) {
            return;
        }


        if (
            this.resizing ||
            this.pinchResizing
        ) {
            return;
        }


        /*
         * Đang snap:
         * chạm vào phần đang lộ ra
         * → bung overlay ra để kéo.
         */

        if (this.snapped) {

            this.unsnap();

        }


        // ✅ Reset cờ: mới ấn xuống → chưa di chuyển
        this.wasDragged = false;


        const rect =
            this.overlay.getBoundingClientRect();


        this.dragging =
            true;

        this.pointerId =
            e.pointerId;


        this.startX =
            e.clientX;

        this.startY =
            e.clientY;


        this.startLeft =
            rect.left;

        this.startTop =
            rect.top;


        this.overlay.style.transform =
            "none";


        this.overlay.style.left =
            `${rect.left}px`;

        this.overlay.style.top =
            `${rect.top}px`;


        try {

            this.header.setPointerCapture(
                e.pointerId
            );

        } catch {}


        e.preventDefault();

    }


    // ======================================================
    // MOVE DRAG
    // ======================================================
    // ⚠️ QUAN TRỌNG: BỎ CLAMP TRONG LÚC KÉO
    // Phải cho overlay đi ra ngoài viewport
    // thì detectSnapSide() mới có cơ hội kích hoạt.
    // ======================================================

    moveDrag(e) {

        if (
            !this.dragging ||
            this.pointerId !== e.pointerId ||
            this.pinchResizing
        ) {
            return;
        }


        const deltaX =
            e.clientX -
            this.startX;


        const deltaY =
            e.clientY -
            this.startY;


        // ✅ Di chuyển > 3px → tính là ĐANG KÉO
        // click handler sẽ bỏ qua trường hợp này
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            this.wasDragged = true;
        }


        /*
         * Tính vị trí TUYỆT ĐỐI,
         * KHÔNG clamp vào viewport.
         *
         * Cho phép kéo hoàn toàn ra ngoài
         * để người dùng cảm nhận được
         * ngưỡng "rẹt" vào mép.
         */

        const left =
            this.startLeft +
            deltaX;


        const top =
            this.startTop +
            deltaY;


        this.overlay.style.left =
            `${left}px`;

        this.overlay.style.top =
            `${top}px`;


        e.preventDefault();

    }



    // ======================================================
    // END DRAG
    // ======================================================

    endDrag(e) {

        if (
            this.pointerId !== e.pointerId
        ) {
            return;
        }


        this.dragging =
            false;

        this.pointerId =
            null;


        try {

            if (
                this.header.hasPointerCapture(
                    e.pointerId
                )
            ) {

                this.header.releasePointerCapture(
                    e.pointerId
                );

            }

        } catch {}


        /*
         * Thả chuột/ngón tay:
         * nếu đã đi quá 50% ra ngoài
         * → snap.
         */

        this.checkSnapAfterDrag();


        /*
         * Chỉ save khi KHÔNG snap.
         * Snap là runtime state,
         * không lưu xuống localStorage.
         */

        if (!this.snapped) {

            this.save();

        }

    }


    // ======================================================
    // CANCEL DRAG
    // ======================================================

    cancelDrag() {

        if (!this.dragging) {
            return;
        }


        this.dragging =
            false;

        this.pointerId =
            null;

    }


    // ======================================================
    // START RESIZE
    // ======================================================

    startResize(e) {

        if (
            e.pointerType === "mouse" &&
            e.button !== 0
        ) {
            return;
        }


        if (
            this.dragging ||
            this.pinchResizing ||
            this.overlay.classList.contains(
                "is-minimized"
            )
        ) {
            return;
        }


        /*
         * Đang snap thì không resize
         * trực tiếp. Bung ra trước.
         */

        if (this.snapped) {

            this.unsnap();

        }


        const rect =
            this.overlay.getBoundingClientRect();


        this.resizing =
            true;

        this.pointerId =
            e.pointerId;


        this.startX =
            e.clientX;

        this.startY =
            e.clientY;


        this.startWidth =
            rect.width;

        this.startHeight =
            rect.height;


        /*
         * Bỏ transform center.
         */

        this.overlay.style.transform =
            "none";


        this.overlay.style.left =
            `${rect.left}px`;

        this.overlay.style.top =
            `${rect.top}px`;


        this.overlay.classList.add(
            "is-resizing"
        );


        try {

            this.resizeHandle.setPointerCapture(
                e.pointerId
            );

        } catch {}


        e.preventDefault();

    }


    // ======================================================
    // MOVE RESIZE
    // ======================================================

    moveResize(e) {

        if (
            !this.resizing ||
            this.pointerId !== e.pointerId
        ) {
            return;
        }


        const deltaX =
            e.clientX -
            this.startX;


        const deltaY =
            e.clientY -
            this.startY;


        const rect =
            this.overlay.getBoundingClientRect();


        const padding =
            window.innerWidth <= 600
                ? 10
                : 4;


        const maxWidth =
            Math.max(
                this.minWidth,
                window.innerWidth -
                rect.left -
                padding
            );


        const maxHeight =
            Math.max(
                this.minHeight,
                window.innerHeight -
                rect.top -
                padding
            );


        const width =
            Math.max(
                this.minWidth,
                Math.min(
                    maxWidth,
                    this.startWidth +
                    deltaX
                )
            );


        const height =
            Math.max(
                this.minHeight,
                Math.min(
                    maxHeight,
                    this.startHeight +
                    deltaY
                )
            );


        this.setSize(
            width,
            height
        );


        e.preventDefault();

    }


    // ======================================================
    // END RESIZE
    // ======================================================

    endResize(e) {

        if (
            !this.resizing
        ) {
            return;
        }


        if (
            e &&
            this.pointerId !== e.pointerId
        ) {
            return;
        }


        this.resizing =
            false;

        this.pointerId =
            null;


        this.overlay.classList.remove(
            "is-resizing"
        );


        try {

            if (
                e &&
                this.resizeHandle.hasPointerCapture(
                    e.pointerId
                )
            ) {

                this.resizeHandle.releasePointerCapture(
                    e.pointerId
                );

            }

        } catch {}


        this.updateResizeHandle();

        this.save();

    }


    // ======================================================
    // CANCEL RESIZE
    // ======================================================

    cancelResize() {

        this.resizing =
            false;

        this.pointerId =
            null;


        if (this.overlay) {

            this.overlay.classList.remove(
                "is-resizing"
            );

        }

    }


    // ======================================================
    // TOUCH POINTER
    // ======================================================

    registerTouchPointer(e) {

        if (
            e.pointerType !== "touch"
        ) {
            return;
        }


        this.touchPointers.set(
            e.pointerId,
            {
                x: e.clientX,
                y: e.clientY
            }
        );

    }


    // ======================================================
    // UPDATE TOUCH POINTER
    // ======================================================

    updateTouchPointer(e) {

        if (
            e.pointerType !== "touch"
        ) {
            return;
        }


        if (
            !this.touchPointers.has(
                e.pointerId
            )
        ) {
            return;
        }


        this.touchPointers.set(
            e.pointerId,
            {
                x: e.clientX,
                y: e.clientY
            }
        );

    }


    // ======================================================
    // REMOVE TOUCH POINTER
    // ======================================================

    removeTouchPointer(e) {

        if (
            e.pointerType !== "touch"
        ) {
            return;
        }


        this.touchPointers.delete(
            e.pointerId
        );

    }


    // ======================================================
    // START PINCH RESIZE
    // ======================================================

    startPinchResize() {

        if (
            !this.overlay ||
            this.touchPointers.size < 2 ||
            this.overlay.classList.contains(
                "is-minimized"
            )
        ) {
            return;
        }


        const pointers =
            [...this.touchPointers.values()];


        const distance =
            this.getPointerDistance(
                pointers[0],
                pointers[1]
            );


        if (
            distance <= 0
        ) {
            return;
        }


        const rect =
            this.overlay.getBoundingClientRect();


        this.pinchResizing =
            true;


        this.pinchStartDistance =
            distance;


        this.pinchStartWidth =
            rect.width;

        this.pinchStartHeight =
            rect.height;


        /*
         * Chuyển sang tọa độ thật.
         */

        this.overlay.style.transform =
            "none";


        this.overlay.style.left =
            `${rect.left}px`;

        this.overlay.style.top =
            `${rect.top}px`;


        this.overlay.classList.add(
            "is-resizing"
        );


        /*
         * Trong lúc pinch,
         * không để animation kích thước
         * làm cảm giác bị trễ.
         */

        this.overlay.classList.add(
            "no-animated"
        );

    }


    // ======================================================
    // MOVE PINCH RESIZE
    // ======================================================

    movePinchResize(e) {

        if (
            !this.pinchResizing ||
            this.touchPointers.size < 2
        ) {
            return;
        }


        this.updateTouchPointer(e);


        const pointers =
            [...this.touchPointers.values()];


        if (
            pointers.length < 2
        ) {
            return;
        }


        const distance =
            this.getPointerDistance(
                pointers[0],
                pointers[1]
            );


        if (
            this.pinchStartDistance <= 0
        ) {
            return;
        }


        /*
         * Khoảng cách 2 ngón tăng
         * → overlay lớn.
         *
         * Khoảng cách giảm
         * → overlay nhỏ.
         */

        const scale =
            distance /
            this.pinchStartDistance;


        let width =
            this.pinchStartWidth *
            scale;


        let height =
            this.pinchStartHeight *
            scale;


        const rect =
            this.overlay.getBoundingClientRect();


        const padding =
            10;


        const maxWidth =
            Math.max(
                this.minWidth,
                window.innerWidth -
                rect.left -
                padding
            );


        const maxHeight =
            Math.max(
                this.minHeight,
                window.innerHeight -
                rect.top -
                padding
            );


        /*
         * Giữ tỷ lệ ban đầu.
         */

        const ratio =
            this.pinchStartHeight /
            this.pinchStartWidth;


        /*
         * Nếu width vượt giới hạn,
         * tính lại height.
         */

        if (
            width > maxWidth
        ) {

            width =
                maxWidth;

            height =
                width *
                ratio;

        }


        /*
         * Nếu height vượt giới hạn,
         * tính lại width.
         */

        if (
            height > maxHeight
        ) {

            height =
                maxHeight;

            width =
                height /
                ratio;

        }


        /*
         * Không nhỏ hơn minimum.
         */

        if (
            width < this.minWidth
        ) {

            width =
                this.minWidth;

            height =
                width *
                ratio;

        }


        if (
            height < this.minHeight
        ) {

            height =
                this.minHeight;

            width =
                height /
                ratio;

        }


        /*
         * Clamp lần cuối.
         */

        width =
            Math.min(
                width,
                maxWidth
            );


        height =
            Math.min(
                height,
                maxHeight
            );


        this.setSize(
            width,
            height
        );


        e.preventDefault();

    }


    // ======================================================
    // END PINCH RESIZE
    // ======================================================

    endPinchResize() {

        if (
            !this.pinchResizing
        ) {
            return;
        }


        this.pinchResizing =
            false;


        this.overlay.classList.remove(
            "is-resizing"
        );


        this.overlay.classList.remove(
            "no-animated"
        );


        this.pinchStartDistance =
            0;


        this.pinchStartWidth =
            0;

        this.pinchStartHeight =
            0;


        this.updateResizeHandle();

        this.save();

    }


    // ======================================================
    // GET POINTER DISTANCE
    // ======================================================

    getPointerDistance(a, b) {

        return Math.hypot(
            b.x - a.x,
            b.y - a.y
        );

    }


    // ======================================================
    // SET SIZE
    // ======================================================

    setSize(width, height) {

        if (!this.overlay) {
            return;
        }


        this.overlay.style.width =
            `${width}px`;

        this.overlay.style.height =
            `${height}px`;


        this.updateResizeHandle();

    }


    // ======================================================
    // UPDATE RESIZE HANDLE
    // ======================================================

    updateResizeHandle() {

        if (
            !this.overlay ||
            !this.resizeHandle
        ) {
            return;
        }


        if (
            this.overlay.classList.contains(
                "is-minimized"
            )
        ) {

            this.resizeHandle.style
                .removeProperty(
                    "width"
                );

            this.resizeHandle.style
                .removeProperty(
                    "height"
                );

            return;

        }


        const width =
            this.overlay.offsetWidth;


        const height =
            this.overlay.offsetHeight;


        /*
         * Handle tỷ lệ thuận nhẹ với
         * kích thước overlay.
         *
         * Không bao giờ quá nhỏ
         * hoặc quá lớn.
         */

        const size =
            Math.min(
                this.maxResizeHandle,
                Math.max(
                    this.minResizeHandle,
                    Math.min(
                        width,
                        height
                    ) * 0.12
                )
            );


        this.resizeHandle.style.width =
            `${size}px`;

        this.resizeHandle.style.height =
            `${size}px`;

    }


    // ======================================================
    // SNAP DETECTION
    // ======================================================

    detectSnapSide() {

        if (!this.overlay) {
            return null;
        }


        const rect =
            this.overlay.getBoundingClientRect();


        const width =
            rect.width;

        const height =
            rect.height;


        /*
         * Khoảng overlay phải đi ra ngoài
         * viewport trước khi snap.
         *
         * Hiện tại: > 50% kích thước overlay.
         */

        const horizontalThreshold =
            width *
            this.snapThreshold;


        const verticalThreshold =
            height *
            this.snapThreshold;


        /*
         * LEFT
         */

        if (
            rect.left <
            -horizontalThreshold
        ) {

            return "left";

        }


        /*
         * RIGHT
         */

        if (
            rect.right >
            window.innerWidth +
            horizontalThreshold
        ) {

            return "right";

        }


        /*
         * TOP
         */

        if (
            rect.top <
            -verticalThreshold
        ) {

            return "top";

        }


        /*
         * BOTTOM
         */

        if (
            rect.bottom >
            window.innerHeight +
            verticalThreshold
        ) {

            return "bottom";

        }


        return null;

    }


    // ======================================================
    // SNAP
    // ======================================================

    snap(side) {

        if (
            !this.overlay ||
            !side
        ) {
            return;
        }


        /*
         * Nếu đã snap cùng phía
         * thì không làm lại.
         *
         * (window.resize gọi snap()
         * liên tục nên cần guard này).
         */

        if (
            this.snapped &&
            this.snapSide === side
        ) {
            return;
        }


        const rect =
            this.overlay.getBoundingClientRect();


        /*
         * Lưu trạng thái trước snap
         * CHỈ KHI chuyển từ bình thường
         * sang snap (lần đầu).
         *
         * Nếu resize window rồi gọi snap()
         * lại, không ghi đè preSnap.
         */

        if (!this.snapped) {

            this.preSnapLeft =
                rect.left;

            this.preSnapTop =
                rect.top;

            this.preSnapWidth =
                rect.width;

            this.preSnapHeight =
                rect.height;

        }


        this.cancelInteractions();


        this.snapped =
            true;

        this.snapSide =
            side;


        /*
         * Tắt animation trong lúc
         * chuyển sang trạng thái snap.
         */

        this.overlay.classList.add(
            "no-animated"
        );


        this.overlay.classList.add(
            "is-snapped"
        );


        this.overlay.classList.add(
            `snap-${side}`
        );


        /*
         * Đóng băng body.
         *
         * Không destroy content,
         * chỉ loại nó khỏi UI/layout.
         */

        this.freezeBody();


        /*
         * Đưa overlay ra đúng mép.
         *
         * transform = none để left/top
         * tính chính xác tuyệt đối.
         */

        this.overlay.style.transform =
            "none";


        if (
            side === "left"
        ) {

            this.overlay.style.left =
                `${-(rect.width - this.snapPeek)}px`;

            this.overlay.style.top =
                `${Math.max(
                    0,
                    Math.min(
                        window.innerHeight -
                        rect.height,
                        rect.top
                    )
                )}px`;

        }


        else if (
            side === "right"
        ) {

            this.overlay.style.left =
                `${window.innerWidth - this.snapPeek}px`;

            this.overlay.style.top =
                `${Math.max(
                    0,
                    Math.min(
                        window.innerHeight -
                        rect.height,
                        rect.top
                    )
                )}px`;

        }


        else if (
            side === "top"
        ) {

            this.overlay.style.left =
                `${Math.max(
                    0,
                    Math.min(
                        window.innerWidth -
                        rect.width,
                        rect.left
                    )
                )}px`;

            this.overlay.style.top =
                `${-(rect.height - this.snapPeek)}px`;

        }


        else if (
            side === "bottom"
        ) {

            this.overlay.style.left =
                `${Math.max(
                    0,
                    Math.min(
                        window.innerWidth -
                        rect.width,
                        rect.left
                    )
                )}px`;

            this.overlay.style.top =
                `${window.innerHeight - this.snapPeek}px`;

        }


        requestAnimationFrame(() => {

            this.overlay.classList.remove(
                "no-animated"
            );

        });


        /*
         * Snap là runtime state,
         * KHÔNG gọi this.save() ở đây.
         *
         * Người dùng F5 không nên thấy
         * tool bị kẹt 90% ở mép màn hình.
         */

    }


    // ======================================================
    // FREEZE BODY
    // ======================================================

    freezeBody() {

        if (!this.body) {
            return;
        }


        /*
         * Không dùng display:none.
         *
         * Giữ nguyên DOM/content để khi
         * unsnap không phải render lại tool.
         *
         * ⚠️ Lưu ý:
         * visibility:hidden + pointer-events:none
         * chỉ dừng UI, không dừng JS (setInterval...).
         *
         * Sau này nếu có tool nặng,
         * nên bổ sung:
         *   this.toolInstance?.pause?.()
         *   this.toolInstance?.resume?.()
         * ở snap / unsnap.
         */

        this.body.setAttribute(
            "aria-hidden",
            "true"
        );


        this.body.style.pointerEvents =
            "none";

        this.body.style.visibility =
            "hidden";


        this.body.style.overflow =
            "hidden";


        if (this.resizeHandle) {

            this.resizeHandle.style.pointerEvents =
                "none";

        }

    }


    // ======================================================
    // UNFREEZE BODY
    // ======================================================

    unfreezeBody() {

        if (!this.body) {
            return;
        }


        this.body.removeAttribute(
            "aria-hidden"
        );


        this.body.style.removeProperty(
            "pointer-events"
        );

        this.body.style.removeProperty(
            "visibility"
        );

        this.body.style.removeProperty(
            "overflow"
        );


        if (this.resizeHandle) {

            this.resizeHandle.style.removeProperty(
                "pointer-events"
            );

        }

    }


    // ======================================================
    // UNSNAP
    // ======================================================

    unsnap() {

        if (
            !this.overlay ||
            !this.snapped
        ) {
            return;
        }


        this.overlay.classList.add(
            "no-animated"
        );


        this.overlay.classList.remove(
            "is-snapped"
        );


        if (this.snapSide) {

            this.overlay.classList.remove(
                `snap-${this.snapSide}`
            );

        }


        this.unfreezeBody();


        this.snapped =
            false;

        this.snapSide =
            null;


        /*
         * Khôi phục vị trí + kích thước cũ.
         *
         * Nếu viewport đã thay đổi,
         * clamp lại sau đó.
         */

        if (
            Number.isFinite(
                this.preSnapLeft
            )
        ) {

            this.overlay.style.left =
                `${this.preSnapLeft}px`;

        }


        if (
            Number.isFinite(
                this.preSnapTop
            )
        ) {

            this.overlay.style.top =
                `${this.preSnapTop}px`;

        }


        if (
            Number.isFinite(
                this.preSnapWidth
            )
        ) {

            this.overlay.style.width =
                `${this.preSnapWidth}px`;

        }


        if (
            Number.isFinite(
                this.preSnapHeight
            )
        ) {

            this.overlay.style.height =
                `${this.preSnapHeight}px`;

        }


        requestAnimationFrame(() => {

            this.clampToViewport();


            requestAnimationFrame(() => {

                this.overlay.classList.remove(
                    "no-animated"
                );

            });

        });


        this.save();

    }


    // ======================================================
    // CHECK SNAP AFTER DRAG
    // ======================================================

    checkSnapAfterDrag() {

        if (
            !this.overlay ||
            this.snapped
        ) {
            return;
        }


        const side =
            this.detectSnapSide();


        if (side) {

            this.snap(side);

        } else {

            /*
             * Không đủ ngưỡng snap →
             * kéo lại vào trong viewport
             * như cũ.
             */

            this.clampToViewport();

        }

    }


    // ======================================================
    // CLAMP TO VIEWPORT
    // ======================================================

    clampToViewport() {

        if (!this.overlay) {
            return;
        }


        /*
         * Đang snap thì không đụng tới.
         * Vị trí do snap() quản lý.
         */

        if (this.snapped) {
            return;
        }


        /*
         * Nếu còn transform center,
         * CSS tự căn giữa.
         */

        if (
            this.overlay.style.transform !==
            "none"
        ) {
            return;
        }


        const rect =
            this.overlay
                .getBoundingClientRect();


        const width =
            this.overlay.offsetWidth;


        const height =
            this.overlay.offsetHeight;


        const padding =
            window.innerWidth <= 600
                ? 10
                : 4;


        /*
         * Nếu viewport nhỏ hơn minimum,
         * ưu tiên viewport.
         */

        const maxWidth =
            Math.max(
                0,
                window.innerWidth -
                padding * 2
            );


        const maxHeight =
            Math.max(
                0,
                window.innerHeight -
                padding * 2
            );


        if (
            width > maxWidth
        ) {

            this.overlay.classList.add(
                "no-animated"
            );


            this.overlay.style.width =
                `${maxWidth}px`;

        }


        if (
            height > maxHeight
        ) {

            this.overlay.classList.add(
                "no-animated"
            );


            this.overlay.style.height =
                `${maxHeight}px`;

        }


        requestAnimationFrame(() => {

            const newRect =
                this.overlay
                    .getBoundingClientRect();


            const maxLeft =
                Math.max(
                    0,
                    window.innerWidth -
                    newRect.width -
                    padding
                );


            const maxTop =
                Math.max(
                    0,
                    window.innerHeight -
                    newRect.height -
                    padding
                );


            const left =
                Math.max(
                    padding,
                    Math.min(
                        maxLeft,
                        newRect.left
                    )
                );


            const top =
                Math.max(
                    padding,
                    Math.min(
                        maxTop,
                        newRect.top
                    )
                );


            this.overlay.style.left =
                `${left}px`;

            this.overlay.style.top =
                `${top}px`;


            this.updateResizeHandle();


            requestAnimationFrame(() => {

                this.overlay.classList.remove(
                    "no-animated"
                );

            });

        });

    }


    // ======================================================
    // CANCEL ALL INTERACTIONS
    // ======================================================

    cancelInteractions() {

        this.cancelDrag();

        this.cancelResize();


        this.pinchResizing =
            false;


        this.touchPointers.clear();


        if (this.overlay) {

            this.overlay.classList.remove(
                "is-resizing"
            );

            this.overlay.classList.remove(
                "no-animated"
            );

        }


        this.pointerId =
            null;

    }


    // ======================================================
    // SAVE
    // ======================================================
    // ⚠️ SNAP KHÔNG ĐƯỢC LƯU
    // Chỉ lưu size + position + minimized.
    // Mở trang mới → luôn về overlay bình thường.
    // Tránh trường hợp "Ủa cái tool đâu???"
    // ======================================================

    save() {

        if (!this.overlay) {
            return;
        }


        /*
         * Đang snap thì không ghi đè
         * vị trí/kích thước thật.
         */

        if (this.snapped) {
            return;
        }


        const rect =
            this.overlay.getBoundingClientRect();


        /*
         * ==========================================
         * Desktop / Mobile profile
         * ==========================================
         */

        const mode =
            window.innerWidth <= 600
                ? "mobile"
                : "desktop";


        let data = {};


        try {

            data =
                JSON.parse(
                    localStorage.getItem(
                        this.storageKey
                    )
                ) || {};

        } catch {

            data = {};

        }


        /*
         * ==========================================
         * Lưu riêng từng profile
         * ==========================================
         */

        data[mode] = {

            left:
                rect.left,

            top:
                rect.top,

            width:
                rect.width,

            height:
                rect.height

        };


        /*
         * ==========================================
         * Minimized cũng lưu riêng
         * ==========================================
         */

        data[mode].minimized =
            this.overlay.classList.contains(
                "is-minimized"
            );


        localStorage.setItem(
            this.storageKey,
            JSON.stringify(data)
        );

    }


    // ======================================================
    // RESTORE
    // ======================================================

    restore() {

        if (!this.overlay) {
            return;
        }


        let data;


        try {

            data =
                JSON.parse(
                    localStorage.getItem(
                        this.storageKey
                    )
                );

        } catch {

            data = null;

        }


        if (!data) {
            return;
        }


        /*
         * ==========================================
         * Desktop / Mobile
         * ==========================================
         */

        const mode =
            window.innerWidth <= 600
                ? "mobile"
                : "desktop";


        const saved =
            data[mode];


        if (!saved) {
            return;
        }


        /*
         * ==========================================
         * Viewport limits
         * ==========================================
         */

        const padding =
            window.innerWidth <= 600
                ? 10
                : 20;


        const maxWidth =
            Math.max(
                0,
                window.innerWidth -
                padding * 2
            );


        const maxHeight =
            Math.max(
                0,
                window.innerHeight -
                padding * 2
            );


        /*
         * ==========================================
         * Width
         * ==========================================
         */

        if (
            Number.isFinite(
                saved.width
            )
        ) {

            const width =
                Math.min(
                    saved.width,
                    maxWidth
                );


            this.overlay.style.width =
                `${width}px`;

        }


        /*
         * ==========================================
         * Height
         * ==========================================
         */

        if (
            Number.isFinite(
                saved.height
            )
        ) {

            const height =
                Math.min(
                    saved.height,
                    maxHeight
                );


            this.overlay.style.height =
                `${height}px`;

        }


        /*
         * ==========================================
         * Chuyển sang tọa độ thực
         * ==========================================
         */

        this.overlay.style.transform =
            "none";


        /*
         * ==========================================
         * Không animate khi restore
         * ==========================================
         */

        this.overlay.classList.add(
            "no-animated"
        );


        requestAnimationFrame(() => {

            const rect =
                this.overlay
                    .getBoundingClientRect();


            const maxLeft =
                Math.max(
                    padding,
                    window.innerWidth -
                    rect.width -
                    padding
                );


            const maxTop =
                Math.max(
                    padding,
                    window.innerHeight -
                    rect.height -
                    padding
                );


            const left =
                Number.isFinite(
                    saved.left
                )
                    ? Math.max(
                        padding,
                        Math.min(
                            maxLeft,
                            saved.left
                        )
                    )
                    : Math.max(
                        padding,
                        (
                            window.innerWidth -
                            rect.width
                        ) / 2
                    );


            const top =
                Number.isFinite(
                    saved.top
                )
                    ? Math.max(
                        padding,
                        Math.min(
                            maxTop,
                            saved.top
                        )
                    )
                    : Math.max(
                        padding,
                        (
                            window.innerHeight -
                            rect.height
                        ) / 2
                    );


            this.overlay.style.left =
                `${left}px`;

            this.overlay.style.top =
                `${top}px`;


            /*
             * Restore minimized state.
             *
             * SNAP KHÔNG được restore.
             * Mở trang mới luôn là
             * overlay bình thường.
             */

            if (
                saved.minimized === true
            ) {

                this.overlay.classList.add(
                    "is-minimized"
                );

            } else {

                this.overlay.classList.remove(
                    "is-minimized"
                );

            }


            this.updateResizeHandle();


            requestAnimationFrame(() => {

                this.overlay.classList.remove(
                    "no-animated"
                );

            });

        });

    }

}


export default ToolManager;