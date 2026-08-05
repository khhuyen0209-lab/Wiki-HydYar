const Boot = {

    timeout:5000,
    offlineResolve:null,

    async wait(){

    const screen = document.getElementById("bootScreen");
    const text = document.getElementById("bootText");
    const bar = document.getElementById("bootBar");
    const btn = document.getElementById("bootContinue");


    if(!screen) return {
        close:()=>{},
        offline:Promise.resolve()
    };


    // Giữ lại ready
    setTimeout(()=>{
        screen.classList.add("ready");
    },1000);



    let done = false;
    let progress = 0;


    const interval = setInterval(()=>{

        if(progress < 90){

            progress++;

            if(bar)
                bar.style.width = progress + "%";

        }

    },50);



    const offline = new Promise(resolve=>{

        this.offlineResolve = resolve;

    });



    const timer = setTimeout(()=>{


        if(done) return;


        if(text)
            text.textContent =
            "⚠️ Máy chủ phản hồi chậm hoặc mất kết nối.";


        if(btn)
            btn.style.display="block";


    },5000);




    if(btn){

        btn.onclick=()=>{


            done=true;


            clearTimeout(timer);
            clearInterval(interval);


            if(text)
                text.textContent =
                "Đang chạy ngoại tuyến.";


            if(this.offlineResolve)
                this.offlineResolve(true);



            if(screen.parentNode)
                screen.remove();


        };

    }



    return {
    close:()=>{

        if(done) return;

        done=true;

        clearTimeout(timer);
        clearInterval(interval);

        if(bar)
            bar.style.width="100%";

        setTimeout(()=>{

            if(screen.parentNode)
                screen.remove();

        },200);

    },


    offline,

    success(){

        if(done) return;

        done=true;

        clearTimeout(timer);
        clearInterval(interval);

        if(text)
            text.textContent="Đã kết nối máy chủ ✓";


        if(bar)
            bar.style.width="100%";


        setTimeout(()=>{

            if(screen.parentNode)
                screen.remove();

        },300);

    }

};

}
};


export default Boot;