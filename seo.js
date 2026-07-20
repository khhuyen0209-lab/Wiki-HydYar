class SEOManager {
    static updateMeta(data = {}) {
        document.title = data.title || 'Wiki - Tri thức mở rộng';
        this.setMeta('description', data.desc || 'Cộng đồng tri thức mở, đáng tin cậy');
        this.setMeta('keywords', data.keywords || 'wiki, tri thức, kiến thức');
        this.setMeta('og:title', data.title);
        this.setMeta('og:description', data.desc);
        this.setMeta('og:type', 'website');
        this.setMeta('twitter:title', data.title);
        this.setMeta('twitter:description', data.desc);
        this.setCanonical(data.url || window.location.href);
    }

    static setMeta(name, content) {
        let tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
            document.head.appendChild(tag);
        }
        tag.content = content;
    }

    static setCanonical(url) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = url;
    }

    static setJSONLD(data) {
        let script = document.querySelector('#jsonld');
        if (!script) {
            script = document.createElement('script');
            script.id = 'jsonld';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }
}

window.SEO = SEOManager;
