export default function Chat(appStatus){

    return {

        ws: null,
        messages: [],
        isScrolledInit: false,

        init(){
            this.bind();
        },

        connect(){

            if(this.ws) return;

            const url = "wss://wiki-hydyar.onrender.com/ws/chat";

            console.log("WS URL:", url);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {

                console.log("✅ WebSocket Connected");

                this.ws.send(JSON.stringify({
                    type: "auth",
                    user: window.currentUser
                }));

                this.isScrolledInit = false;

            };

            this.ws.onmessage = e => {

                const data = JSON.parse(e.data);

                if(data.type === "history"){
                    this.messages = data.data;
                    this.render(true);
                }

                if(data.type === "message"){
                    this.messages.push(data.data);
                    this.appendMessage(data.data);
                }

            };

            this.ws.onerror = e=>{
                console.error("WS lỗi:", e);
            };

            this.ws.onclose = ()=>{

                console.log("❌ WebSocket Closed");

                this.ws = null;

            };

        },

        scrollToBottom(isFirstLoad=false){

            const box =
                document.getElementById(
                    "countryChatMessages"
                );

            if(!box) return;

            if(isFirstLoad){

                let checkCount = 0;

                const waitBox = setInterval(()=>{

                    checkCount++;

                    if(
                        box.scrollHeight > 0 ||
                        checkCount > 40
                    ){

                        clearInterval(waitBox);

                        requestAnimationFrame(()=>{

                            requestAnimationFrame(()=>{

                                box.scrollTop =
                                    box.scrollHeight - 12;

                                this.isScrolledInit = true;

                            });

                        });

                    }

                },10);

                return;

            }

            requestAnimationFrame(()=>{

                box.scrollTop =
                    box.scrollHeight - 12;

            });

        },

        render(isFirstLoad=false){

            const box =
                document.getElementById(
                    "countryChatMessages"
                );

            if(!box) return;

            box.innerHTML =
                this.messages.map(m=>{

                    const self =
                        m.uid ===
                        appStatus.auth.user?.uid;

                    const time =
                        new Date(m.time)
                        .toLocaleTimeString(
                            "vi-VN",
                            {
                                hour:"2-digit",
                                minute:"2-digit"
                            }
                        );

                    return `
                        <div class="chat-message ${self?"self":"other"}">
                            <b>${m.name}</b>
                            <p>${m.text}</p>
                            <span class="chat-time">
                                ${time}
                            </span>
                        </div>
                    `;

                }).join("");

            if(isFirstLoad){
                this.scrollToBottom(true);
            }

        },

        appendMessage(msg){

            const box =
                document.getElementById(
                    "countryChatMessages"
                );

            if(!box) return;

            const self =
                msg.uid ===
                appStatus.auth.user?.uid;

            const time =
                new Date(msg.time)
                .toLocaleTimeString(
                    "vi-VN",
                    {
                        hour:"2-digit",
                        minute:"2-digit"
                    }
                );

            const el =
                document.createElement("div");

            el.className =
                `chat-message ${self?"self":"other"}`;

            el.innerHTML = `
                <b>${msg.name}</b>
                <p>${msg.text}</p>
                <span class="chat-time">
                    ${time}
                </span>
            `;

            box.appendChild(el);

            this.scrollToBottom(false);

        },

        send(){
          

            const input =
                document.getElementById(
                    "countryChatInput"
                );

            const text =
                input.value.trim();

            if(!text) return;

            if(!this.ws){

                this.connect();

                return;

            }

            if(
                this.ws.readyState !==
                WebSocket.OPEN
            ){

                console.warn(
                    "WebSocket chưa sẵn sàng"
                );

                return;

            }

            this.ws.send(JSON.stringify({

                type:"message",
                text

            }));

            input.value = "";

        },

        bind(){

            document
            .getElementById(
                "countryChatSend"
            )
            ?.addEventListener(
                "click",
                ()=>this.send()
            );

        }

    };

}