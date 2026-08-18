import { ToolOverlay } from "./ToolOverlay.js";
import WikiLog from "../js/WikiLog.js";
// ==========================================================
// ✨ TEXT FORMATTER
// V2 — Natural Progressive Text Formatter
// ==========================================================

class TextFormatter {

    constructor(manager) {

        this.manager =
            manager;

        this.id =
            "textFormatter";

        this.overlay =
            null;

        this.textarea =
            null;

        this.status =
            null;

        this.copyButton =
            null;

        this.clearButton =
            null;

        this.undoButton =
            null;

        this.lastText =
            "";

        this.hasResult =
            false;


        // ==================================================
        // NATURAL RESPONSIVE LAYOUT
        // ==================================================

        this.resizeObserver =
            null;

        this.layoutFrame =
            null;

    }


    // ======================================================
    // OPEN
    // ======================================================

    async open() {

        if (!this.overlay) {

            this.create();

        }


        this.overlay.open();


        requestAnimationFrame(() => {

            this.textarea?.focus();

            this.updateNaturalLayout();

        });


        WikiLog.log(
            "[HydYar Wiki] Text Formatter opened"
        );

    }


    // ======================================================
    // CREATE
    // ======================================================

    create() {

        this.overlay =
            new ToolOverlay(
                this.manager
            );


        this.overlay.create({

            title:
                "Định dạng văn bản",

            icon:
                "solar:text-selection-bold"

        });


        // ==================================================
        // CONTAINER
        // ==================================================

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "text-formatter";


        // ==================================================
        // EDITOR
        // ==================================================

        const editor =
            document.createElement(
                "div"
            );

        editor.className =
            "text-formatter-editor";


        this.textarea =
            document.createElement(
                "textarea"
            );

        this.textarea.className =
            "text-formatter-input";

        this.textarea.placeholder =
            "Nhập hoặc dán nội dung cần định dạng...";

        this.textarea.spellcheck =
            true;


        editor.appendChild(
            this.textarea
        );


        // ==================================================
        // ACTIONS
        // ==================================================

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "text-formatter-actions";


        // ==================================================
        // FORMAT BUTTONS
        // ==================================================

        const formatButtons = [

            {
                id:
                    "trim",

                label:
                    "Xóa khoảng trắng đầu/cuối",

                icon:
                    "solar:eraser-bold"

            },

            {
                id:
                    "spaces",

                label:
                    "Gộp khoảng trắng",

                icon:
                    "solar:text-bold"

            },

            {
                id:
                    "emptyLines",

                label:
                    "Xóa dòng trống",

                icon:
                    "solar:document-text-bold"

            },

            {
                id:
                    "lineBreaks",

                label:
                    "Chuẩn hóa xuống dòng",

                icon:
                    "solar:transfer-horizontal-bold"

            },

            {
                id:
                    "upper",

                label:
                    "VIẾT HOA",

                icon:
                    "solar:text-bold"

            },

            {
                id:
                    "lower",

                label:
                    "viết thường",

                icon:
                    "solar:text-bold"

            },

            {
                id:
                    "capitalize",

                label:
                    "Viết Hoa Chữ Đầu",

                icon:
                    "solar:text-bold"

            },

            {
                id:
                    "removeSpecial",

                label:
                    "Xóa ký tự đặc biệt",

                icon:
                    "solar:filter-bold"

            },

            {
                id:
                    "removeNumbers",

                label:
                    "Xóa số",

                icon:
                    "solar:hashtag-square-bold"

            }

        ];


        formatButtons.forEach(
            config => {

                const button =
                    this.createActionButton(
                        config
                    );

                actions.appendChild(
                    button
                );

            }
        );


        // ==================================================
        // BOTTOM ACTIONS
        // ==================================================

        const bottom =
            document.createElement(
                "div"
            );

        bottom.className =
            "text-formatter-bottom";


        this.undoButton =
            this.createBottomButton(
                "↶",
                "Hoàn tác"
            );

        this.undoButton.disabled =
            true;


        this.copyButton =
            this.createBottomButton(
                "📋",
                "Sao chép"
            );


        this.clearButton =
            this.createBottomButton(
                "🗑️",
                "Xóa"
            );


        bottom.append(

            this.undoButton,

            this.copyButton,

            this.clearButton

        );


        // ==================================================
        // STATUS
        // ==================================================

        this.status =
            document.createElement(
                "div"
            );

        this.status.className =
            "text-formatter-status";

        this.status.textContent =
            "Sẵn sàng";


        // ==================================================
        // HINT
        // ==================================================

        const hint =
            document.createElement(
                "small"
            );

        hint.className =
            "text-formatter-hint";

        hint.textContent =
            "Văn bản chỉ được thay đổi khi bạn chọn một thao tác.";


        // ==================================================
        // APPEND
        // ==================================================

        container.append(

    editor,

    bottom,

    actions,

    this.status,

    hint

);


        this.overlay.setContent(
            container
        );


        this.bindEvents();


        this.updateButtons();


        /*
         * Khởi tạo responsive layout
         * sau khi DOM đã hoàn chỉnh.
         */

        this.initNaturalLayout();

    }


    // ======================================================
    // CREATE ACTION BUTTON
    // ======================================================

    createActionButton(
        config
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "text-formatter-action";

        button.dataset.action =
            config.id;

        button.setAttribute(
            "aria-label",
            config.label
        );


        const icon =
            document.createElement(
                "span"
            );

        icon.className =
            "text-formatter-action-icon";

        icon.innerHTML =
            this.icon(
                config.icon
            );


        const label =
            document.createElement(
                "span"
            );

        label.className =
            "text-formatter-action-label";

        label.textContent =
            config.label;


        button.append(

            icon,

            label

        );


        return button;

    }


    // ======================================================
    // CREATE BOTTOM BUTTON
    // ======================================================

    createBottomButton(
        icon,
        label
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "text-formatter-bottom-button";

        button.innerHTML =
            `${icon}<span>${label}</span>`;

        button.setAttribute(
            "aria-label",
            label
        );


        return button;

    }


    // ======================================================
    // ICON
    // ======================================================

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


    // ======================================================
    // EVENTS
    // ======================================================

    bindEvents() {

        if (
            !this.textarea ||
            !this.overlay
        ) {

            return;

        }


        // ==================================================
        // FORMAT ACTIONS
        // ==================================================

        const actions =
            this.overlay.body?.querySelector(
                ".text-formatter-actions"
            );


        actions?.addEventListener(
            "click",
            e => {

                const button =
                    e.target.closest(
                        "[data-action]"
                    );


                if (!button) {

                    return;

                }


                this.format(
                    button.dataset.action
                );

            }
        );


        // ==================================================
        // UNDO
        // ==================================================

        this.undoButton?.addEventListener(
            "click",
            () => {

                this.undo();

            }
        );


        // ==================================================
        // COPY
        // ==================================================

        this.copyButton?.addEventListener(
            "click",
            () => {

                this.copy();

            }
        );


        // ==================================================
        // CLEAR
        // ==================================================

        this.clearButton?.addEventListener(
            "click",
            () => {

                this.clear();

            }
        );


        // ==================================================
        // INPUT
        // ==================================================

        this.textarea.addEventListener(
            "input",
            () => {

                this.hasResult =
                    false;

                this.lastText =
                    "";

                this.undoButton.disabled =
                    true;

                this.updateButtons();


                this.status.textContent =
                    this.textarea.value
                        ? "Đang chỉnh sửa"
                        : "Sẵn sàng";


                /*
                 * Nội dung thay đổi có thể làm
                 * layout thay đổi.
                 */

                this.scheduleNaturalLayout();

            }
        );


        // ==================================================
        // ESC
        // ==================================================

        this.overlay.overlay.addEventListener(
            "keydown",
            e => {

                if (
                    e.key === "Escape"
                ) {

                    this.overlay.close();

                }

            }
        );

    }


    // ======================================================
    // FORMAT
    // ======================================================

    format(action) {

        if (
            !this.textarea
        ) {

            return;

        }


        const text =
            this.textarea.value;


        if (!text) {

            this.status.textContent =
                "Chưa có nội dung.";

            return;

        }


        /*
         * Lưu trạng thái trước khi xử lý.
         */

        this.lastText =
            text;


        let result =
            text;


        // ==================================================
        // TRIM
        // ==================================================

        if (
            action === "trim"
        ) {

            result =
                result
                    .split("\n")
                    .map(
                        line =>
                            line.trim()
                    )
                    .join("\n")
                    .trim();

        }


        // ==================================================
        // COLLAPSE SPACES
        // ==================================================

        else if (
            action === "spaces"
        ) {

            result =
                result.replace(
                    /[ \t]{2,}/g,
                    " "
                );

        }


        // ==================================================
        // REMOVE EMPTY LINES
        // ==================================================

        else if (
            action === "emptyLines"
        ) {

            result =
                result
                    .split(/\r?\n/)
                    .filter(
                        line =>
                            line.trim() !== ""
                    )
                    .join("\n");

        }


        // ==================================================
        // NORMALIZE LINE BREAKS
        // ==================================================

        else if (
            action === "lineBreaks"
        ) {

            result =
                result
                    .replace(
                        /\r\n/g,
                        "\n"
                    )
                    .replace(
                        /\r/g,
                        "\n"
                    )
                    .replace(
                        /\n{3,}/g,
                        "\n\n"
                    );

        }


        // ==================================================
        // UPPER
        // ==================================================

        else if (
            action === "upper"
        ) {

            result =
                result.toLocaleUpperCase();

        }


        // ==================================================
        // LOWER
        // ==================================================

        else if (
            action === "lower"
        ) {

            result =
                result.toLocaleLowerCase();

        }


        // ==================================================
        // CAPITALIZE
        // ==================================================

        else if (
            action === "capitalize"
        ) {

            result =
                result.replace(
                    /(^|[\s.!?;:]+)(\p{L})/gu,
                    (
                        match,
                        separator,
                        letter
                    ) =>
                        separator +
                        letter.toLocaleUpperCase()
                );

        }


        // ==================================================
        // REMOVE SPECIAL
        // ==================================================

        else if (
            action === "removeSpecial"
        ) {

            result =
                result.replace(
                    /[^\p{L}\p{N}\s]/gu,
                    ""
                );

        }


        // ==================================================
        // REMOVE NUMBERS
        // ==================================================

        else if (
            action === "removeNumbers"
        ) {

            result =
                result.replace(
                    /\p{N}/gu,
                    ""
                );

        }


        // ==================================================
        // APPLY
        // ==================================================

        this.textarea.value =
            result;


        this.hasResult =
            true;


        this.undoButton.disabled =
            false;


        this.status.textContent =
            "Đã định dạng";


        this.updateButtons();


        /*
         * Layout có thể thay đổi.
         */

        this.scheduleNaturalLayout();


        /*
         * Đưa con trỏ về cuối.
         */

        requestAnimationFrame(() => {

            this.textarea.focus();

            this.textarea.selectionStart =
                this.textarea.value.length;

            this.textarea.selectionEnd =
                this.textarea.value.length;

        });

    }


    // ======================================================
    // UNDO
    // ======================================================

    undo() {

        if (
            !this.hasResult ||
            !this.lastText
        ) {

            return;

        }


        const current =
            this.textarea.value;


        this.textarea.value =
            this.lastText;


        this.lastText =
            current;


        this.hasResult =
            false;


        this.undoButton.disabled =
            true;


        this.status.textContent =
            "Đã hoàn tác";


        this.updateButtons();


        this.scheduleNaturalLayout();


        requestAnimationFrame(() => {

            this.textarea.focus();

        });

    }


    // ======================================================
    // COPY
    // ======================================================

    async copy() {

        const text =
            this.textarea?.value || "";


        if (!text) {

            this.status.textContent =
                "Không có nội dung để sao chép.";

            return;

        }


        try {

            await navigator.clipboard.writeText(
                text
            );


            this.status.textContent =
                "Đã sao chép.";

        } catch (error) {

            this.textarea.select();


            const success =
                document.execCommand(
                    "copy"
                );


            this.status.textContent =
                success
                    ? "Đã sao chép."
                    : "Không thể sao chép.";

        }

    }


    // ======================================================
    // CLEAR
    // ======================================================

    clear() {

        if (
            !this.textarea?.value
        ) {

            return;

        }


        this.lastText =
            this.textarea.value;


        this.textarea.value =
            "";


        this.hasResult =
            false;


        this.undoButton.disabled =
            false;


        this.status.textContent =
            "Đã xóa nội dung";


        this.updateButtons();


        this.scheduleNaturalLayout();


        requestAnimationFrame(() => {

            this.textarea.focus();

        });

    }


    // ======================================================
    // NATURAL RESPONSIVE LAYOUT
    // ======================================================

    initNaturalLayout() {

        if (
            !this.overlay?.body ||
            this.resizeObserver
        ) {

            return;

        }


        const root =
            this.overlay.body.querySelector(
                ".text-formatter"
            );


        if (!root) {

            return;

        }


        this.resizeObserver =
            new ResizeObserver(
                () => {

                    this.scheduleNaturalLayout();

                }
            );


        /*
         * Theo dõi chính formatter.
         *
         * Khi ToolOverlay kéo cao/thấp,
         * hàm này tự chạy.
         */

        this.resizeObserver.observe(
            root
        );


        /*
         * Theo dõi cả overlay.
         *
         * Một số layout của ToolOverlay
         * có thể thay đổi kích thước ở
         * parent trước khi body thay đổi.
         */

        if (
            this.overlay.overlay
        ) {

            this.resizeObserver.observe(
                this.overlay.overlay
            );

        }


        this.updateNaturalLayout();

    }


    // ======================================================
    // SCHEDULE LAYOUT
    // ======================================================

    scheduleNaturalLayout() {

        if (
            this.layoutFrame
        ) {

            cancelAnimationFrame(
                this.layoutFrame
            );

        }


        this.layoutFrame =
            requestAnimationFrame(() => {

                this.layoutFrame =
                    null;

                this.updateNaturalLayout();

            });

    }


    // ======================================================
    // UPDATE NATURAL LAYOUT
    // ======================================================

    updateNaturalLayout() {

        if (
            !this.overlay?.body
        ) {

            return;

        }


        const root =
            this.overlay.body.querySelector(
                ".text-formatter"
            );

        const editor =
            root?.querySelector(
                ".text-formatter-editor"
            );

        const actions =
            root?.querySelector(
                ".text-formatter-actions"
            );

        const bottom =
            root?.querySelector(
                ".text-formatter-bottom"
            );

        const status =
            root?.querySelector(
                ".text-formatter-status"
            );

        const hint =
            root?.querySelector(
                ".text-formatter-hint"
            );


        if (
            !root ||
            !editor ||
            !actions ||
            !bottom ||
            !status
        ) {

            return;

        }


        const buttons =
            [
                ...actions.querySelectorAll(
                    ".text-formatter-action"
                )
            ];


        /*
         * --------------------------------------------------
         * RESET
         * --------------------------------------------------
         *
         * Trước tiên hiện lại toàn bộ.
         */

        buttons.forEach(
            button => {

                button.classList.remove(
                    "is-hidden"
                );

            }
        );


        bottom.classList.remove(
            "is-compressed"
        );


        /*
         * Hint chỉ là phần phụ.
         *
         * Khi thiếu không gian, bỏ hint
         * trước khi đụng tới action.
         */

        let hintHidden =
            false;


        /*
         * --------------------------------------------------
         * ĐO LAYOUT
         * --------------------------------------------------
         */

        const rootHeight =
            root.clientHeight;


        const bottomHeight =
            bottom.offsetHeight;


        const statusHeight =
            status.offsetHeight;


        const rootStyle =
            getComputedStyle(
                root
            );


        const gap =
            parseFloat(
                rootStyle.gap
            ) || 0;


        const editorMin =
            parseFloat(
                getComputedStyle(
                    editor
                ).minHeight
            ) || 0;


        /*
         * Khoảng cách giữa 5 phần:
         *
         * editor
         * actions
         * bottom
         * status
         * hint
         */

        const gaps =
            gap * 4;


        /*
         * ==================================================
         * HINT
         * ==================================================
         */

        let reserved =
            editorMin +
            bottomHeight +
            statusHeight +
            gaps +
            (
                hint
                    ? hint.offsetHeight
                    : 0
            );


        if (
            rootHeight < reserved &&
            hint
        ) {

            hint.style.display =
                "none";

            hintHidden =
                true;

            reserved =
                editorMin +
                bottomHeight +
                statusHeight +
                gaps;

        }


        /*
         * ==================================================
         * ACTION SPACE
         * ==================================================
         */

        let available =
            rootHeight -
            reserved;


        /*
         * Nếu vẫn còn đủ chỗ:
         * giữ nguyên tất cả.
         */

        if (
            available >= 0
        ) {

            return;

        }


        /*
         * ==================================================
         * THIẾU CHỖ
         * ==================================================
         *
         * Ẩn từng button từ cuối lên.
         */

        let shortage =
            Math.abs(
                available
            );


        /*
         * Lấy chiều cao thực tế
         * của từng button.
         */

        for (
            let i =
                buttons.length - 1;

            i >= 0 &&
            shortage > 0;

            i--
        ) {

            const button =
                buttons[i];


            const height =
                button.offsetHeight;


            /*
             * Ẩn nút.
             */

            button.classList.add(
                "is-hidden"
            );


            /*
             * Vì grid 2 cột,
             * nếu còn nút kế bên thì
             * ta giải phóng gần bằng
             * chiều cao của một hàng.
             */

            shortage -=
                height + gap;

        }


        /*
         * ==================================================
         * CHECK EDITOR
         * ==================================================
         */

        /*
         * Sau khi loại action,
         * browser cần một frame để
         * tính lại editor.
         */

        requestAnimationFrame(() => {

            const editorHeight =
                editor.offsetHeight;


            /*
             * Editor bắt đầu chạm giới hạn
             * → Bottom được nén nhẹ.
             */

            if (
                editorHeight <=
                editorMin + 5
            ) {

                bottom.classList.add(
                    "is-compressed"
                );

            }


            /*
             * Hint đã bị ẩn thì giữ hidden
             * trong trạng thái thiếu chiều cao.
             */

            if (
                hintHidden &&
                rootHeight >
                reserved + 20
            ) {

                hint.style.display =
                    "";

            }

        });

    }


    // ======================================================
    // UPDATE BUTTONS
    // ======================================================

    updateButtons() {

        const hasText =
            Boolean(
                this.textarea?.value
            );


        if (this.copyButton) {

            this.copyButton.disabled =
                !hasText;

        }


        if (this.clearButton) {

            this.clearButton.disabled =
                !hasText;

        }

    }


    // ======================================================
    // CLOSE
    // ======================================================

    close() {

        /*
         * Hủy animation frame.
         */

        if (
            this.layoutFrame
        ) {

            cancelAnimationFrame(
                this.layoutFrame
            );

            this.layoutFrame =
                null;

        }


        /*
         * Hủy ResizeObserver.
         */

        if (
            this.resizeObserver
        ) {

            this.resizeObserver.disconnect();

            this.resizeObserver =
                null;

        }


        if (!this.overlay) {

            return;

        }


        this.overlay.close();

    }


    // ======================================================
    // TOGGLE
    // ======================================================

    toggle() {

        if (!this.overlay) {

            this.open();

            return;

        }


        this.overlay.toggle();

    }

}


export {
    TextFormatter
};
