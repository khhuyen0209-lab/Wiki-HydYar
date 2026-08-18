import { ToolOverlay } from "./ToolOverlay.js";
import WikiLog from "../js/WikiLog.js";

// ==========================================================
// 🧮 CALCULATOR
// Natural Calculator Tool
// ==========================================================

class Calculator {

    constructor(manager) {

        this.manager =
            manager;

        this.id =
            "calculator";

        this.overlay =
            null;

        this.display =
            null;

        this.expressionElement =
            null;

        this.resultElement =
            null;

        this.expression =
            "";

        this.displayExpression =
            "";

        this.result =
            "";

        this.justCalculated =
            false;

        this.history =
            [];


        // ==================================================
        // AC SMART CONTROL
        // ==================================================

        this.acClickTimer =
            null;

        this.acHoldTimer =
            null;

        this.acRepeatTimer =
            null;

        this.acClickPending =
            false;

        this.acHoldTriggered =
            false;

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

            this.display?.focus();

        });


        WikiLog.log(
            "[HydYar Wiki] Calculator opened"
        );

    }


    // ======================================================
    // CREATE
    // ======================================================

    create() {
    this.overlay = new ToolOverlay(this.manager);

    this.overlay.create({
        title: "Máy tính",
        icon: "solar:calculator-bold"
    });

    const container = document.createElement("div");
    container.className = "calculator";

    // ==================================================
    // DISPLAY
    // ==================================================
    const display = document.createElement("div");
    display.className = "calculator-display";
    display.tabIndex = 0;
    display.setAttribute("role", "textbox");
    display.setAttribute("aria-label", "Màn hình máy tính");

    this.expressionElement = document.createElement("div");
    this.expressionElement.className = "calculator-expression";

    this.resultElement = document.createElement("div");
    this.resultElement.className = "calculator-result";

    display.append(this.expressionElement, this.resultElement);
    this.display = display;

    // ==================================================
    // KEYPAD
    // ==================================================
    const keypad = document.createElement("div");
    keypad.className = "calculator-keypad";

    const buttons = [
        // ROW 1
        { value: "AC", action: "clear", className: "calculator-key-clear" },
        { value: "±", action: "sign" },
        { value: "%", action: "percent" },
        { value: "÷", action: "operator", operator: "/", className: "calculator-key-operator" },
        // ROW 2
        { value: "7", action: "number" },
        { value: "8", action: "number" },
        { value: "9", action: "number" },
        { value: "×", action: "operator", operator: "*", className: "calculator-key-operator" },
        // ROW 3
        { value: "4", action: "number" },
        { value: "5", action: "number" },
        { value: "6", action: "number" },
        { value: "−", action: "operator", operator: "-", className: "calculator-key-operator" },
        // ROW 4
        { value: "1", action: "number" },
        { value: "2", action: "number" },
        { value: "3", action: "number" },
        { value: "+", action: "operator", operator: "+", className: "calculator-key-operator" },
        // ROW 5
        { value: "0", action: "number", className: "calculator-key-zero" },
        { value: ".", action: "decimal" },
        { value: "=", action: "equals", className: "calculator-key-equals" }
    ];

    buttons.forEach(config => {
        const button = this.createButton(config);
        keypad.appendChild(button);
    });

    // ==================================================
    // 👉 THÊM CÂU NHẮC Ở ĐÂY
    // ==================================================
    const hintElement = document.createElement("div");
    hintElement.className = "calculator-hint";
    hintElement.textContent = "💡 Nhấn nhanh 2 lần AC để xóa 1 ký tự và giữ để xóa liên tục";

    // Gắn tất cả vào container
    container.append(
        display,
        keypad,
        hintElement // đặt dưới cùng
    );

    this.overlay.setContent(container);

    this.bindEvents();
    this.updateDisplay();
}



    // ======================================================
    // CREATE BUTTON
    // ======================================================

    createButton(config) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";

        button.className =
            "calculator-key";


        if (
            config.className
        ) {

            button.classList.add(
                config.className
            );

        }


        button.textContent =
            config.value;

        button.dataset.action =
            config.action;


        if (
            config.operator
        ) {

            button.dataset.operator =
                config.operator;

        }


        button.setAttribute(
            "aria-label",
            config.value
        );


        // ==================================================
        // SMART AC
        // ==================================================

        if (
            config.action === "clear"
        ) {

            button.classList.add(
                "calculator-ac"
            );


            button.addEventListener(
                "pointerdown",
                event => {

                    if (
                        event.pointerType === "mouse" &&
                        event.button !== 0
                    ) {

                        return;

                    }


                    try {

                        button.setPointerCapture(
                            event.pointerId
                        );

                    } catch {

                    }


                    this.startACHold();

                }
            );


            button.addEventListener(
                "pointerup",
                () => {

                    this.stopACHold();

                }
            );


            button.addEventListener(
                "pointercancel",
                () => {

                    this.stopACHold();

                }
            );


            button.addEventListener(
                "click",
                () => {

                    if (
                        this.acHoldTriggered
                    ) {

                        this.acHoldTriggered =
                            false;

                        return;

                    }


                    this.handleACPress();

                }
            );

        }


        return button;

    }


    // ======================================================
    // EVENTS
    // ======================================================

    bindEvents() {

        if (
            !this.display ||
            !this.overlay
        ) {

            return;

        }


        const keypad =
            this.overlay.body?.querySelector(
                ".calculator-keypad"
            );


        keypad?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".calculator-key"
                    );


                if (!button) {

                    return;

                }


                if (
                    button.dataset.action ===
                    "clear"
                ) {

                    return;

                }


                this.handleAction(

                    button.dataset.action,

                    button.dataset.operator,

                    button.textContent

                );

            }
        );


        this.display.addEventListener(
            "keydown",
            event => {

                this.handleKeyboard(
                    event
                );

            }
        );


        this.overlay.overlay?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    this.overlay.close();

                }

            }
        );

    }


    // ======================================================
    // AC SMART ACTION
    // ======================================================

    handleACPress() {

        if (
            this.acClickPending
        ) {

            clearTimeout(
                this.acClickTimer
            );

            this.acClickTimer =
                null;

            this.acClickPending =
                false;

            this.backspace();

            return;

        }


        this.acClickPending =
            true;


        this.acClickTimer =
            setTimeout(
                () => {

                    this.acClickPending =
                        false;

                    this.acClickTimer =
                        null;


                    if (
                        !this.acHoldTriggered
                    ) {

                        this.clear();

                    }

                },
                280
            );

    }


    // ======================================================
    // AC HOLD START
    // ======================================================

    startACHold() {

        this.acHoldTriggered =
            false;

        this.stopACHold();


        this.acHoldTimer =
            setTimeout(
                () => {

                    this.acHoldTriggered =
                        true;


                    if (
                        this.acClickTimer
                    ) {

                        clearTimeout(
                            this.acClickTimer
                        );

                        this.acClickTimer =
                            null;

                    }


                    this.acClickPending =
                        false;


                    if (
                        this.expression
                    ) {

                        this.backspace();

                    }


                    this.acRepeatTimer =
                        setInterval(
                            () => {

                                if (
                                    !this.expression
                                ) {

                                    this.stopACHold();

                                    return;

                                }


                                this.backspace();

                            },
                            70
                        );

                },
                450
            );

    }


    // ======================================================
    // AC HOLD STOP
    // ======================================================

    stopACHold() {

        if (
            this.acHoldTimer
        ) {

            clearTimeout(
                this.acHoldTimer
            );

            this.acHoldTimer =
                null;

        }


        if (
            this.acRepeatTimer
        ) {

            clearInterval(
                this.acRepeatTimer
            );

            this.acRepeatTimer =
                null;

        }

    }


    // ======================================================
    // HANDLE ACTION
    // ======================================================

    handleAction(
        action,
        operator = null,
        value = null
    ) {

        switch (action) {

            case "number":
                this.inputNumber(value);
                break;

            case "decimal":
                this.inputDecimal();
                break;

            case "operator":
                this.inputOperator(operator);
                break;

            case "clear":
                this.handleACPress();
                break;

            case "backspace":
                this.backspace();
                break;

            case "percent":
                this.percent();
                break;

            case "sign":
                this.toggleSign();
                break;

            case "equals":
                this.calculate();
                break;

        }

    }


    // ======================================================
    // KEYBOARD
    // ======================================================

    handleKeyboard(event) {

        const key =
            event.key;


        if (
            /^[0-9]$/.test(key)
        ) {

            event.preventDefault();
            this.inputNumber(key);
            return;

        }


        if (
            key === "." ||
            key === ","
        ) {

            event.preventDefault();
            this.inputDecimal();
            return;

        }


        if (
            ["+", "-", "*", "/"].includes(key)
        ) {

            event.preventDefault();
            this.inputOperator(key);
            return;

        }


        if (
            key === "%"
        ) {

            event.preventDefault();
            this.percent();
            return;

        }


        if (
            key === "Enter" ||
            key === "="
        ) {

            event.preventDefault();
            this.calculate();
            return;

        }


        if (
            key === "Backspace"
        ) {

            event.preventDefault();
            this.backspace();
            return;

        }


        if (
            key === "Escape"
        ) {

            event.preventDefault();
            this.clear();

        }

    }


    // ======================================================
    // INPUT NUMBER
    // ======================================================

    inputNumber(number) {

        if (
            !number ||
            !/^\d$/.test(number)
        ) {

            return;

        }


        if (
            this.justCalculated
        ) {

            // Sau khi bấm =, bấm số mới thì bắt đầu hoàn toàn mới
            this.expression =
                "";

            this.displayExpression =
                "";

            this.result =
                "";

            this.justCalculated =
                false;

        }


        this.expression +=
            number;


        this.updateDisplay();

    }


    // ======================================================
    // INPUT DECIMAL
    // ======================================================

    inputDecimal() {

        if (
            this.justCalculated
        ) {

            // Sau khi bấm =, bắt đầu số mới từ kết quả
            // Nếu bấm dấu . thì lấy kết quả làm số gốc
            this.displayExpression =
                "";

            this.result =
                "";

            this.justCalculated =
                false;

        }


        const match =
            this.expression.match(
                /(\d*\.?\d*)$/
            );


        const currentNumber =
            match?.[1] || "";


        if (
            currentNumber.includes(".")
        ) {

            return;

        }


        if (
            !this.expression ||
            /[+\-*/]$/.test(this.expression)
        ) {

            this.expression +=
                "0";

        }


        this.expression +=
            ".";


        this.updateDisplay();

    }


    // ======================================================
    // INPUT OPERATOR
    // ======================================================

    inputOperator(operator) {

        if (
            ![
                "+",
                "-",
                "*",
                "/"
            ].includes(operator)
        ) {

            return;

        }


        if (
            this.justCalculated
        ) {

            // ⭐ QUAN TRỌNG: Sau khi bấm =
            // expression đã là kết quả (ví dụ "5")
            // bấm operator → nối tiếp từ kết quả
            // xóa displayExpression để dòng trên hiển thị biểu thức mới
            this.displayExpression =
                "";

            this.result =
                "";

            this.justCalculated =
                false;

        }


        // Cho phép bắt đầu bằng -
        if (
            !this.expression
        ) {

            if (
                operator === "-"
            ) {

                this.expression =
                    "-";

                this.updateDisplay();

            }

            return;

        }


        // Nếu đang có operator cuối thì thay operator cũ
        if (
            /[+\-*/]$/.test(this.expression)
        ) {

            if (
                operator === "-" &&
                this.expression.endsWith("-") &&
                this.expression.length > 1
            ) {

                return;

            }


            this.expression =
                this.expression.slice(
                    0,
                    -1
                );

        }


        this.expression +=
            operator;


        this.result =
            "";


        this.updateDisplay();

    }


    // ======================================================
    // BACKSPACE
    // ======================================================

    backspace() {

        if (
            this.justCalculated
        ) {

            this.justCalculated =
                false;

        }


        this.expression =
            this.expression.slice(
                0,
                -1
            );


        this.displayExpression =
            "";

        this.result =
            "";


        this.updateDisplay();

    }


    // ======================================================
    // CLEAR
    // ======================================================

    clear() {

        this.expression =
            "";

        this.displayExpression =
            "";

        this.result =
            "";

        this.justCalculated =
            false;


        this.updateDisplay();

    }


    // ======================================================
    // PERCENT
    // ======================================================

    percent() {

        if (
            !this.expression
        ) {

            return;

        }


        const match =
            this.expression.match(
                /(\d+(?:\.\d+)?)$/
            );


        if (!match) {

            return;

        }


        const number =
            Number(match[1]);


        if (
            !Number.isFinite(number)
        ) {

            return;

        }


        const percent =
            number / 100;


        this.expression =
            this.expression.slice(
                0,
                -match[1].length
            ) +
            String(percent);


        this.updateDisplay();

    }


    // ======================================================
    // TOGGLE SIGN
    // ======================================================

    toggleSign() {

        if (
            !this.expression
        ) {

            this.expression =
                "-";

            this.updateDisplay();

            return;

        }


        const match =
            this.expression.match(
                /(\d+(?:\.\d+)?)$/
            );


        if (!match) {

            return;

        }


        const number =
            match[1];


        const start =
            this.expression.slice(
                0,
                -number.length
            );


        if (
            start.endsWith("-")
        ) {

            const beforeMinus =
                start.slice(
                    0,
                    -1
                );


            if (
                beforeMinus === "" ||
                /[+\-*/]$/.test(beforeMinus)
            ) {

                this.expression =
                    beforeMinus +
                    number;

                this.updateDisplay();

                return;

            }

        }


        this.expression =
            start +
            "-" +
            number;


        this.updateDisplay();

    }


    // ======================================================
    // CALCULATE
    // ======================================================

    calculate() {

        if (
            !this.expression
        ) {

            return;

        }


        try {

            const originalExpression =
                this.expression;


            const normalized =
                this.normalizeExpression(
                    this.expression
                );


            const value =
                this.evaluateExpression(
                    normalized
                );


            if (
                !Number.isFinite(value)
            ) {

                throw new Error(
                    "Invalid result"
                );

            }


            const formatted =
                this.formatNumber(
                    value
                );


            // Lưu lịch sử
            this.history.push({

                expression:
                    originalExpression,

                result:
                    formatted,

                time:
                    Date.now()

            });


            if (
                this.history.length > 50
            ) {

                this.history.shift();

            }


            // ⭐ QUAN TRỌNG:
            // Lưu phép tính gốc chỉ để HIỂN THỊ
            this.displayExpression =
                originalExpression;

            // expression trở thành KẾT QUẢ
            // để lần nhập tiếp theo nối từ đáp án
            this.expression =
                formatted;

            this.result =
                formatted;

            this.justCalculated =
                true;


            this.updateDisplay();

        } catch (error) {

            this.showError();

        }

    }


    // ======================================================
    // NORMALIZE EXPRESSION
    // ======================================================

    normalizeExpression(
        expression
    ) {

        const value =
            expression
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/−/g, "-");


        if (
            !/^[0-9+\-*/().\s]+$/.test(value)
        ) {

            throw new Error(
                "Invalid expression"
            );

        }


        return value;

    }


    // ======================================================
    // SAFE EXPRESSION EVALUATOR
    // ======================================================

    evaluateExpression(
        expression
    ) {

        const tokens =
            expression.match(
                /(\d+(?:\.\d+)?)|[+\-*/()]/g
            );


        if (
            !tokens
        ) {

            throw new Error(
                "Invalid expression"
            );

        }


        let position =
            0;


        const peek =
            () => tokens[position];


        const consume =
            () => tokens[position++];


        const parsePrimary =
            () => {

                const token =
                    peek();


                if (
                    token === "("
                ) {

                    consume();

                    const value =
                        parseAdditive();


                    if (
                        consume() !== ")"
                    ) {

                        throw new Error(
                            "Missing parenthesis"
                        );

                    }


                    return value;

                }


                if (
                    token === "+"
                ) {

                    consume();
                    return parsePrimary();

                }


                if (
                    token === "-"
                ) {

                    consume();
                    return -parsePrimary();

                }


                const numberToken =
                    consume();

                const number =
                    Number(numberToken);


                if (
                    !Number.isFinite(number)
                ) {

                    throw new Error(
                        "Invalid number"
                    );

                }


                return number;

            };


        const parseMultiplicative =
            () => {

                let value =
                    parsePrimary();


                while (
                    peek() === "*" ||
                    peek() === "/"
                ) {

                    const operator =
                        consume();

                    const right =
                        parsePrimary();


                    if (
                        operator === "*"
                    ) {

                        value *= right;

                    } else {

                        if (
                            right === 0
                        ) {

                            throw new Error(
                                "Division by zero"
                            );

                        }


                        value /= right;

                    }

                }


                return value;

            };


        const parseAdditive =
            () => {

                let value =
                    parseMultiplicative();


                while (
                    peek() === "+" ||
                    peek() === "-"
                ) {

                    const operator =
                        consume();

                    const right =
                        parseMultiplicative();


                    if (
                        operator === "+"
                    ) {

                        value += right;

                    } else {

                        value -= right;

                    }

                }


                return value;

            };


        const value =
            parseAdditive();


        if (
            position !== tokens.length
        ) {

            throw new Error(
                "Invalid expression"
            );

        }


        return value;

    }


    // ======================================================
    // FORMAT NUMBER
    // ======================================================

    formatNumber(
        number
    ) {

        if (
            Object.is(number, -0)
        ) {

            number =
                0;

        }


        const rounded =
            Number(
                number.toPrecision(12)
            );


        return String(rounded);

    }


    // ======================================================
    // PRETTY EXPRESSION
    // ======================================================

    prettyExpression(
        expression
    ) {

        if (
            !expression
        ) {

            return "";

        }


        return expression
            .replace(/\*/g, " × ")
            .replace(/\//g, " ÷ ")
            .replace(/\+/g, " + ")
            .replace(/-/g, " − ")
            .replace(/\s+/g, " ")
            .trim();

    }


    // ======================================================
    // ERROR
    // ======================================================

    showError() {

        if (
            !this.expressionElement ||
            !this.resultElement
        ) {

            return;

        }


        this.expressionElement.textContent =
            "Biểu thức không hợp lệ";

        this.resultElement.textContent =
            "Lỗi";


        this.expressionElement.classList.add(
            "is-error"
        );

        this.resultElement.classList.add(
            "is-error"
        );


        setTimeout(
            () => {

                this.expressionElement.classList.remove(
                    "is-error"
                );

                this.resultElement.classList.remove(
                    "is-error"
                );


                this.expression =
                    "";

                this.displayExpression =
                    "";

                this.result =
                    "";


                this.updateDisplay();

            },
            700
        );

    }


    // ======================================================
    // DISPLAY
    // ======================================================

    updateDisplay() {

        if (
            !this.expressionElement ||
            !this.resultElement
        ) {

            return;

        }


        // ==================================================
        // SAU KHI TÍNH
        // ==================================================

        if (
            this.justCalculated &&
            this.result
        ) {

            this.display.classList.add(
                "has-result"
            );


            // Dùng displayExpression (phép tính gốc) để hiển thị
            this.expressionElement.textContent =
                this.prettyExpression(
                    this.displayExpression
                );


            this.resultElement.textContent =
                this.result;


            return;

        }


        // ==================================================
        // ĐANG NHẬP
        // ==================================================

        this.display.classList.remove(
            "has-result"
        );


        this.expressionElement.textContent =
            this.prettyExpression(
                this.expression
            ) ||
            "0";


        this.resultElement.textContent =
            "";

    }


    // ======================================================
    // CLOSE
    // ======================================================

    close() {

        if (
            this.acClickTimer
        ) {

            clearTimeout(
                this.acClickTimer
            );

            this.acClickTimer =
                null;

        }


        this.stopACHold();


        if (
            !this.overlay
        ) {

            return;

        }


        this.overlay.close();

    }


    // ======================================================
    // TOGGLE
    // ======================================================

    toggle() {

        if (
            !this.overlay
        ) {

            this.open();

            return;

        }


        this.overlay.toggle();

    }

}


export {
    Calculator
};
