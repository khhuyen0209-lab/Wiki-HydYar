import { ToolOverlay } from "./ToolOverlay.js";
import WikiLog from "../js/WikiLog.js";
// ==========================================================
// 📝 WORD COUNTER
// V4 — Progressive Text Analyzer
// ==========================================================

class WordCounter {

    constructor(manager) {

        this.manager =
            manager;

        this.id =
            "wordCounter";

        this.overlay =
            null;

        this.textarea =
            null;

        this.clearButton =
            null;

        this.status =
            null;

        this.stats = {};

        this.analysisToken =
            0;

        this.processing =
            false;

        /*
         * Mỗi lượt tối đa 800 ký tự.
         */

        this.chunkSize =
            800;


        // ==================================================
        // LONG PRESS
        // ==================================================

        this.longPressTimer =
            null;

        this.longPressTriggered =
            false;

        this.longPressDelay =
            500;

    }


    // ======================================================
    // OPEN
    // ======================================================

    async open() {

        if (!this.overlay) {

            this.create();

        }


        this.overlay.open();


        if (this.textarea) {

            requestAnimationFrame(() => {

                this.textarea.focus();

            });

        }


        WikiLog.log(
            "[HydYar Wiki] Word Counter opened"
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
                "Phân tích văn bản",

            icon:
                "solar:text-bold"

        });


        // ==================================================
        // CONTAINER
        // ==================================================

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "word-counter";


        // ==================================================
        // EDITOR
        // ==================================================

        const editor =
            document.createElement(
                "div"
            );

        editor.className =
            "word-counter-editor";


        // ==================================================
        // TEXTAREA
        // ==================================================

        this.textarea =
            document.createElement(
                "textarea"
            );

        this.textarea.className =
            "word-counter-input";

        this.textarea.placeholder =
            "Nhập hoặc dán nội dung cần phân tích...";

        this.textarea.spellcheck =
            true;


        // ==================================================
        // FULLSCREEN BACK
        // ==================================================

        const fullscreenBack =
            document.createElement(
                "button"
            );

        fullscreenBack.type =
            "button";

        fullscreenBack.className =
            "word-counter-fullscreen-back";

        fullscreenBack.setAttribute(
            "aria-label",
            "Thu nhỏ khung nhập"
        );

        fullscreenBack.textContent =
            "←";


        // ==================================================
        // CLEAR BUTTON
        // ==================================================

        this.clearButton =
            document.createElement(
                "button"
            );

        this.clearButton.type =
            "button";

        this.clearButton.className =
            "word-counter-clear is-hidden";

        this.clearButton.textContent =
            "🗑️ Xóa";

        this.clearButton.setAttribute(
            "aria-label",
            "Xóa toàn bộ nội dung"
        );

        /*
         * Quan trọng:
         *
         * Nút nằm TRONG editor.
         *
         * Vì vậy CSS position:absolute
         * sẽ bám vào .word-counter-editor.
         */

        this.clearButton.hidden =
            true;


        // ==================================================
        // EDITOR APPEND
        // ==================================================

        editor.append(

            fullscreenBack,

            this.textarea,

            this.clearButton

        );


        // ==================================================
        // MAIN STATS
        // ==================================================

        const mainStats =
            document.createElement(
                "div"
            );

        mainStats.className =
            "word-counter-main-stats";


        this.stats.characters =
            this.createMainStat(
                "Ký tự",
                "0"
            );


        this.stats.words =
            this.createMainStat(
                "Từ",
                "0"
            );


        this.stats.letters =
            this.createMainStat(
                "Chữ",
                "0"
            );


        mainStats.append(

            this.stats.characters.element,

            this.stats.words.element,

            this.stats.letters.element

        );


        // ==================================================
        // DETAILS
        // ==================================================

        const details =
            document.createElement(
                "div"
            );

        details.className =
            "word-counter-details";


        this.stats.numbers =
            this.createDetail(
                "Số",
                "0"
            );


        this.stats.special =
            this.createDetail(
                "Ký tự đặc biệt",
                "0"
            );


        this.stats.spaces =
            this.createDetail(
                "Khoảng trắng",
                "0"
            );


        this.stats.longSpaces =
            this.createDetail(
                "Khoảng trắng dài",
                "0"
            );


        this.stats.lines =
            this.createDetail(
                "Xuống dòng",
                "0"
            );


        details.append(

            this.stats.numbers.element,

            this.stats.special.element,

            this.stats.spaces.element,

            this.stats.longSpaces.element,

            this.stats.lines.element

        );


        // ==================================================
        // STATUS
        // ==================================================

        this.status =
            document.createElement(
                "div"
            );

        this.status.className =
            "word-counter-status";

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
            "word-counter-hint";

        hint.textContent =
            "Nhấn giữ vùng nhập để mở rộng toàn màn hình.";


        // ==================================================
        // APPEND
        // ==================================================

        container.append(

            editor,

            mainStats,

            details,

            this.status,

            hint

        );


        this.overlay.setContent(
            container
        );


        this.bindEvents();


        this.hideClearButton();


        this.renderResult(
            WordCounterCore.empty()
        );

    }


    // ======================================================
    // CREATE MAIN STAT
    // ======================================================

    createMainStat(
        label,
        value
    ) {

        const element =
            document.createElement(
                "div"
            );

        element.className =
            "word-counter-main-stat";


        const labelElement =
            document.createElement(
                "span"
            );

        labelElement.textContent =
            label;


        const valueElement =
            document.createElement(
                "strong"
            );

        valueElement.textContent =
            value;


        element.append(

            labelElement,

            valueElement

        );


        return {

            element,

            value:
                valueElement

        };

    }


    // ======================================================
    // CREATE DETAIL
    // ======================================================

    createDetail(
        label,
        value
    ) {

        const element =
            document.createElement(
                "div"
            );

        element.className =
            "word-counter-detail";


        const labelElement =
            document.createElement(
                "span"
            );

        labelElement.textContent =
            label;


        const valueElement =
            document.createElement(
                "strong"
            );

        valueElement.textContent =
            value;


        element.append(

            labelElement,

            valueElement

        );


        return {

            element,

            value:
                valueElement

        };

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
        // REALTIME
        // ==================================================

        this.textarea.addEventListener(
            "input",
            () => {

                /*
                 * Vừa thay đổi nội dung thì kết quả cũ
                 * không còn được xem là hoàn tất.
                 */

                this.hideClearButton();

                this.update();

            }
        );


        // ==================================================
        // CLEAR
        // ==================================================

        this.clearButton?.addEventListener(
            "click",
            e => {

                e.preventDefault();

                e.stopPropagation();

                this.clearContent();

            }
        );


        // ==================================================
        // LONG PRESS
        // ==================================================

        this.textarea.addEventListener(
            "pointerdown",
            () => {

                this.longPressTriggered =
                    false;

                this.clearLongPress();


                this.longPressTimer =
                    setTimeout(() => {

                        this.longPressTriggered =
                            true;

                        this.enterFullscreen();

                    }, this.longPressDelay);

            }
        );


        this.textarea.addEventListener(
            "pointerup",
            () => {

                this.clearLongPress();

            }
        );


        this.textarea.addEventListener(
            "pointercancel",
            () => {

                this.clearLongPress();

            }
        );


        this.textarea.addEventListener(
            "pointerleave",
            () => {

                this.clearLongPress();

            }
        );


        // ==================================================
        // FULLSCREEN BACK
        // ==================================================

        const back =
            this.overlay.body?.querySelector(
                ".word-counter-fullscreen-back"
            );


        if (back) {

            back.addEventListener(
                "click",
                e => {

                    e.preventDefault();

                    e.stopPropagation();

                    this.exitFullscreen();

                }
            );

        }


        // ==================================================
        // ESC
        // ==================================================

        this.overlay.overlay.addEventListener(
            "keydown",
            e => {

                if (
                    e.key === "Escape" &&
                    this.isFullscreen()
                ) {

                    this.exitFullscreen();

                }

            }
        );

    }


    // ======================================================
    // CLEAR LONG PRESS
    // ======================================================

    clearLongPress() {

        if (
            this.longPressTimer
        ) {

            clearTimeout(
                this.longPressTimer
            );

            this.longPressTimer =
                null;

        }

    }


    // ======================================================
    // HIDE CLEAR BUTTON
    // ======================================================

    hideClearButton() {

        if (
            !this.clearButton
        ) {

            return;

        }


        this.clearButton.hidden =
            true;

        this.clearButton.classList.add(
            "is-hidden"
        );

        this.clearButton.disabled =
            true;

    }


    // ======================================================
    // SHOW CLEAR BUTTON
    // ======================================================

    showClearButton() {

        if (
            !this.clearButton
        ) {

            return;

        }


        /*
         * Chỉ được gọi khi:
         *
         * processing === false
         * và textarea có nội dung.
         */

        if (
            this.processing ||
            !this.textarea?.value
        ) {

            this.hideClearButton();

            return;

        }


        this.clearButton.hidden =
            false;

        this.clearButton.classList.remove(
            "is-hidden"
        );

        this.clearButton.disabled =
            false;

    }


    // ======================================================
    // CLEAR CONTENT
    // ======================================================

    clearContent() {

        if (
            !this.textarea
        ) {

            return;

        }


        /*
         * Không cho xóa trong lúc analyzer
         * vẫn đang xử lý.
         */

        if (
            this.processing
        ) {

            return;

        }


        /*
         * Hủy mọi job cũ.
         */

        this.analysisToken++;


        this.processing =
            false;


        /*
         * Ẩn nút ngay.
         */

        this.hideClearButton();


        /*
         * Xóa textarea.
         */

        this.textarea.value =
            "";


        /*
         * Reset thống kê.
         */

        this.renderResult(
            WordCounterCore.empty()
        );


        /*
         * Reset trạng thái.
         */

        this.status.textContent =
            "Sẵn sàng";


        /*
         * Đưa con trỏ trở lại textarea.
         */

        requestAnimationFrame(() => {

            this.textarea.focus();

        });

    }


    // ======================================================
    // UPDATE
    // ======================================================

    update() {

        const text =
            this.textarea?.value || "";


        /*
         * Hủy job trước.
         */

        this.analysisToken++;


        const token =
            this.analysisToken;


        /*
         * Khi bắt đầu một lượt mới,
         * nút Xóa phải biến mất.
         */

        this.hideClearButton();


        // ==================================================
        // EMPTY
        // ==================================================

        if (!text) {

            this.processing =
                false;


            this.status.textContent =
                "Sẵn sàng";


            this.renderResult(
                WordCounterCore.empty()
            );


            return;

        }


        // ==================================================
        // START PROCESSING
        // ==================================================

        this.processing =
            true;


        this.status.textContent =
            "Đang xử lý...";


        /*
         * Reset UI.
         */

        this.renderResult(
            WordCounterCore.empty()
        );


        // ==================================================
        // ANALYZER
        // ==================================================

        const analyzer =
            new WordCounterCore();


        let position =
            0;


        const total =
            text.length;


        // ==================================================
        // PROCESS CHUNK
        // ==================================================

        const processChunk =
            () => {

                /*
                 * Input mới → job cũ chết.
                 */

                if (
                    token !==
                    this.analysisToken
                ) {

                    return;

                }


                const end =
                    Math.min(

                        position +
                        this.chunkSize,

                        total

                    );


                const chunk =
                    text.slice(
                        position,
                        end
                    );


                analyzer.process(
                    chunk
                );


                position =
                    end;


                /*
                 * Cập nhật UI sau mỗi chunk.
                 */

                this.renderResult(
                    analyzer.result()
                );


                /*
                 * Còn dữ liệu?
                 */

                if (
                    position <
                    total
                ) {

                    setTimeout(
                        processChunk,
                        0
                    );

                    return;

                }


                // ==========================================
                // FINISH
                // ==========================================

                analyzer.finishSpaceRun();


                /*
                 * Kết quả cuối cùng.
                 */

                this.renderResult(
                    analyzer.result()
                );


                this.processing =
                    false;


                this.status.textContent =
                    `Đã xử lý ${total.toLocaleString("vi-VN")} ký tự`;


                /*
                 * ⭐ CHỈ TẠI ĐÂY
                 * mới cho phép hiện nút Xóa.
                 */

                this.showClearButton();

            };


        /*
         * Bắt đầu chunk đầu tiên.
         */

        processChunk();

    }


    // ======================================================
    // RENDER RESULT
    // ======================================================

    renderResult(result) {

        if (!result) {

            return;

        }


        this.stats.characters.value.textContent =
            result.characters.toLocaleString("vi-VN");


        this.stats.words.value.textContent =
            result.words.toLocaleString("vi-VN");


        this.stats.letters.value.textContent =
            result.letters.toLocaleString("vi-VN");


        this.stats.numbers.value.textContent =
            result.numbers.toLocaleString("vi-VN");


        this.stats.special.value.textContent =
            result.special.toLocaleString("vi-VN");


        this.stats.spaces.value.textContent =
            result.spaces.toLocaleString("vi-VN");


        this.stats.longSpaces.value.textContent =
            result.longSpaces.toLocaleString("vi-VN");


        this.stats.lines.value.textContent =
            result.lines.toLocaleString("vi-VN");

    }


    // ======================================================
    // ENTER FULLSCREEN
    // ======================================================

    enterFullscreen() {

        if (
            !this.overlay?.overlay
        ) {

            return;

        }


        this.clearLongPress();


        this.overlay.overlay.classList.add(
            "word-counter-fullscreen"
        );


        requestAnimationFrame(() => {

            this.textarea?.focus();

        });

    }


    // ======================================================
    // EXIT FULLSCREEN
    // ======================================================

    exitFullscreen() {

        if (
            !this.overlay?.overlay
        ) {

            return;

        }


        this.overlay.overlay.classList.remove(
            "word-counter-fullscreen"
        );


        this.textarea?.focus();

    }


    // ======================================================
    // IS FULLSCREEN
    // ======================================================

    isFullscreen() {

        return Boolean(

            this.overlay?.overlay?.classList.contains(
                "word-counter-fullscreen"
            )

        );

    }


    // ======================================================
    // CLOSE
    // ======================================================

    close() {

        this.clearLongPress();


        this.analysisToken++;


        this.processing =
            false;


        this.hideClearButton();


        this.exitFullscreen();


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


// ==========================================================
// 🧠 WORD COUNTER CORE
// V4 — Progressive / Streaming Analyzer
// ==========================================================

class WordCounterCore {

    constructor() {

        this.characters =
            0;

        this.words =
            0;

        this.letters =
            0;

        this.numbers =
            0;

        this.special =
            0;

        this.spaces =
            0;

        this.longSpaces =
            0;

        this.lines =
            0;


        // ==================================================
        // WORD STATE
        // ==================================================

        this.inWord =
            false;


        // ==================================================
        // SPACE RUN STATE
        // ==================================================

        this.spaceRun =
            0;

    }


    // ======================================================
    // PROCESS CHUNK
    // ======================================================

    process(text) {

        for (
            const char of text
        ) {

            this.characters++;


            // ==================================================
            // LINE BREAK
            // ==================================================

            if (
                char === "\n"
            ) {

                this.lines++;

                this.finishWord();

                this.finishSpaceRun();

                continue;

            }


            /*
             * CR trong CRLF không tính
             * thành ký tự đặc biệt.
             */

            if (
                char === "\r"
            ) {

                continue;

            }


            // ==================================================
            // SPACE
            // ==================================================

            if (
                char === " " ||
                char === "\t"
            ) {

                this.spaces++;

                this.finishWord();

                this.spaceRun++;

                continue;

            }


            /*
             * Kết thúc chuỗi khoảng trắng
             * khi gặp ký tự khác.
             */

            this.finishSpaceRun();


            // ==================================================
            // LETTER
            // ==================================================

            if (
                this.isLetter(char)
            ) {

                this.letters++;

                this.startWord();

                continue;

            }


            // ==================================================
            // NUMBER
            // ==================================================

            if (
                this.isNumber(char)
            ) {

                this.numbers++;

                this.startWord();

                continue;

            }


            // ==================================================
            // SPECIAL
            // ==================================================

            this.special++;

            this.finishWord();

        }

    }


    // ======================================================
    // START WORD
    // ======================================================

    startWord() {

        if (
            !this.inWord
        ) {

            this.words++;

            this.inWord =
                true;

        }

    }


    // ======================================================
    // FINISH WORD
    // ======================================================

    finishWord() {

        this.inWord =
            false;

    }


    // ======================================================
    // FINISH SPACE RUN
    // ======================================================

    finishSpaceRun() {

        if (
            this.spaceRun >= 3
        ) {

            this.longSpaces++;

        }


        this.spaceRun =
            0;

    }


    // ======================================================
    // IS LETTER
    // ======================================================

    isLetter(char) {

        return /\p{L}/u.test(
            char
        );

    }


    // ======================================================
    // IS NUMBER
    // ======================================================

    isNumber(char) {

        return /\p{N}/u.test(
            char
        );

    }


    // ======================================================
    // RESULT
    // ======================================================

    result() {

        return {

            characters:
                this.characters,

            words:
                this.words,

            letters:
                this.letters,

            numbers:
                this.numbers,

            special:
                this.special,

            spaces:
                this.spaces,

            longSpaces:
                this.longSpaces,

            lines:
                this.lines

        };

    }


    // ======================================================
    // EMPTY
    // ======================================================

    static empty() {

        return {

            characters: 0,

            words: 0,

            letters: 0,

            numbers: 0,

            special: 0,

            spaces: 0,

            longSpaces: 0,

            lines: 0

        };

    }


    // ======================================================
    // STATIC ANALYZE
    // ======================================================

    static analyze(text = "") {

        const analyzer =
            new WordCounterCore();


        analyzer.process(
            String(text)
        );


        analyzer.finishSpaceRun();


        return analyzer.result();

    }

}


// WordCounter.js
export {
    WordCounter,
    WordCounterCore
};