export default class Markdown {
    constructor(app){
        this.app = app;
    }
      escapeHTML(s){return s?s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):"";}
      parseCode(h){return h.replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`).replace(/`([^`]+)`/g,"<code>$1</code>");}
      parseTable(h){
return h.replace(
/(^\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)+)/gm,
(t)=>{
    const rows = t.trim().split("\n");

    const headers = rows[0]
        .split("|")
        .map(c=>c.trim())
        .filter(Boolean);

    const body = rows
        .slice(2)
        .map(row=>{
            const cols = row
                .split("|")
                .map(c=>c.trim())
                .filter(Boolean);

            return `<tr>${cols.map(c=>`<td>${c}</td>`).join("")}</tr>`;
        })
        .join("");

    return `
<div class="table-wrapper">
<table class="md-table">
<thead>
<tr>
${headers.map(h=>`<th>${h}</th>`).join("")}
</tr>
</thead>
<tbody>
${body}
</tbody>
</table>
</div>`;
});
}
      parseImage(h){
    const imageRegex = /!\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+)\s*(?:"([^"]*)")?\)/g;

    const render = (alt, url, caption="") => `
<div class="img-wrapper">
    <img
        src="${encodeURI(url)}"
        alt="${this.escapeHTML(alt)}"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        onerror="this.parentElement.innerHTML='<p class=&quot;img-error&quot;>Không tải được ảnh</p>'">
    ${caption ? `<div class="img-caption">${this.escapeHTML(caption)}</div>` : ""}
</div>`;

    const makeGroup = (content, extraClass="") => {
        const images = [];
        content.replace(imageRegex, (_, alt, url, cap) => {
            images.push(render(alt, url, cap));
        });

        let cls = "img-group";
        if(images.length === 2) cls += " two-images";
        else if(images.length === 3) cls += " three-images";
        else if(images.length === 4) cls += " four-images";
        else if(images.length >= 5) cls += " many-images";

        if(extraClass) cls += " " + extraClass;
        return `<div class="${cls}">${images.join("")}</div>`;
    };

    // 1. XỬ LÝ ÉP CHỦ ĐỘNG TRƯỚC - KHÔNG ĐỂ BỊ CHẶN
    h = h.replace(/<<row>>([\s\S]*?)<\/row>>/g, (_, c) => makeGroup(c, "force-row"));
    h = h.replace(/<<col>>([\s\S]*?)<\/col>>/g, (_, c) => makeGroup(c, "two-landscape"));

    // 2. TỰ GOM NHÓM - CHỈ BẮT ẢNH KHÔNG Ở TRONG THẺ ÉP
    h = h.replace(
        /(?<!<<row>>)(?<!<<col>>)(?:!\[[^\]]*]\(\s*https?:\/\/[^\s)]+(?:\s+"[^"]*")?\)\s*\n?){2,}/g,
        g => makeGroup(g)
    );

    // 3. XỬ LÝ ẢNH ĐƠN
    return h.replace(imageRegex, (_, alt, url, cap) => render(alt, url, cap));
}

      parseLink(h) {
    const t = this;

    h = h.replace(
        /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)/g,
        (_, text, url) => {
            const attrs = url.startsWith("http")
                ? ' target="_blank" rel="noopener noreferrer"'
                : "";

            return `<a href="${encodeURI(url)}"${attrs} class="md-link">${t.escapeHTML(text)}</a>`;
        }
    );

    h = h.replace(
        /\[([^\]|]+)\|([^\]]+)\]/g,
        (_, id, text) =>
            `<a href="#" class="wiki-link" data-id="${t.escapeHTML(id.trim())}">${t.escapeHTML(text.trim())}</a>`
    );

    return h;
}
  
      parseHeading(h){return h.replace(/^###### (.*)$/gm,"<h6>$1</h6>").replace(/^##### (.*)$/gm,"<h5>$1</h5>").replace(/^#### (.*)$/gm,"<h4>$1</h4>").replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>").replace(/^(\d+\.\d+(?:\.\d+)?)\s+(.*)$/gm,'<h4 class="md-sub-heading">$1 $2</h4>');}
      parseList(h){return h.replace(/^- \[ \] (.*)$/gm,'<div class="md-check"><input type="checkbox" disabled> $1</div>').replace(/^- \[x\] (.*)$/gmi,'<div class="md-check"><input type="checkbox" checked disabled> $1</div>').replace(/(?:^([-*]|\d+\.) .*(?:\r?\n|$))+/gm,m=>{const i=m.trim().split("\n").map(x=>x.replace(/^([-*]|\d+\.)\s*/,"").trim()).filter(Boolean);return`<ul>${i.map(x=>`<li>${x}</li>`).join("")}</ul>`;});}
      generateTOC(text){

    const list = [];

    text.replace(
        /^(\d+(?:\.\d+)*)\s+(.+)$/gm,
        (_, number, title) => {

            list.push({
                id: `toc-${number.replace(/\./g,"-")}`,
                number,
                title
            });

        }
    );

    return list;

}
parseInline(h){
    return h
        .replace(/\*\*\*(.*?)\*\*\*/g,"<strong><em>$1</em></strong>")
        .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
        .replace(/\*(.*?)\*/g,"<em>$1</em>")
        .replace(/__(.*?)__/g,"<strong>$1</strong>")

        // Chỉ in nghiêng khi _..._ đứng độc lập, không nằm trong URL/tên file
        .replace(/(^|[\s(])_([^_\n]+)_($|[\s).,!?:;])/gm,"$1<em>$2</em>$3")

        .replace(/~~(.*?)~~/g,"<del>$1</del>")
        .replace(/\^([^^]+)\^/g,"<sup>$1</sup>")
        .replace(/~([^~]+)~/g,"<sub>$1</sub>")
        .replace(/:warning:/g,"⚠️")
        .replace(/:white_check_mark:/g,"✅")
        .replace(/:x:/g,"❌")
        .replace(/:bulb:/g,"💡")
        .replace(/:rocket:/g,"🚀")
        .replace(/:book:/g,"📖");
} 
    parseParagraph(h){return h.split(/\n{2,}/).map(p=>/^\s*<(h\d|blockquote|ul|ol|table|pre|hr|div|img)/i.test(p)?p:`<p>${p.replace(/\n/g,"<br>")}</p>`).join("");}
      parse(t){
    if(!t) return "";

    let h = t;

    h = this.parseCode(h);
h = this.parseTable(h);
h = this.parseHeading(h);

h = h
    .replace(/^\s*>\s?(.*)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^(---|\*\*\*|___)$/gm,"<hr>");

h = this.parseList(h);
h = this.parseInline(h);

// 👇 Để parseImage xuống cuối
h = this.parseImage(h);
h = this.parseLink(h);
h = this.parseParagraph(h);

    return h;
}
      buildPages(article){

    let h1 = 0;
    let h2 = 0;
    let h3 = 0;

    return article.pages.map(page=>{

        let number = page.number || "";

        if(!number && page.level){

            if(page.level===1){

                h1++;
                h2=0;
                h3=0;

                number=`${h1}.`;

            }
            else if(page.level===2){

                h2++;
                h3=0;

                number=`${h1}.${h2}.`;

            }
            else if(page.level===3){

                h3++;

                number=`${h1}.${h2}.${h3}.`;

            }
        }

        return {
            ...page,
            number
        };

    });
}
}