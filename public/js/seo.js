export default class Seo {
    constructor(app) {
        this.app = app;
    }

    getMeta(name) {
        const attr =
            name.startsWith("og:") ||
            name.startsWith("twitter:")
                ? "property"
                : "name";

        let meta = document.querySelector(
            `meta[${attr}="${name}"]`
        );

        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute(attr, name);
            document.head.appendChild(meta);
        }

        return meta;
    }

    getCanonical() {
        let link = document.querySelector(
            'link[rel="canonical"]'
        );

        if (!link) {
            link = document.createElement("link");
            link.rel = "canonical";
            document.head.appendChild(link);
        }

        return link;
    }

    updateHome() {
        const d = this.app.state.seoDefault;

        document.title = d.title;

        this.getMeta("description").content = d.description;
        this.getMeta("keywords").content = d.keywords;

        this.getCanonical().href = d.canonical;

        this.getMeta("og:title").content = d.ogTitle;
        this.getMeta("og:description").content = d.ogDesc;
        this.getMeta("og:url").content = d.canonical;
        this.getMeta("og:image").content = d.ogImage;
        this.getMeta("og:type").content = d.ogType;

        this.getMeta("twitter:card").content =
            d.twitterCard;
    }

    updateArticle(article) {

        if (!article) return;

        const url =
            `${location.origin}/${
                article.categoryId || "khac"
            }/${article.id}`;

        document.title =
            `${article.title} | HydYar Wiki`;

        this.getMeta("description").content =
            article.desc ||
            this.app.state.seoDefault.description;

        this.getMeta("keywords").content =
            article.keywords ||
            this.app.state.seoDefault.keywords;

        this.getCanonical().href = url;

        this.getMeta("og:title").content =
            article.title;

        this.getMeta("og:description").content =
            article.desc ||
            this.app.state.seoDefault.description;

        this.getMeta("og:url").content = url;

        this.getMeta("og:image").content =
            article.cover ||
            this.app.state.seoDefault.ogImage;

        this.getMeta("og:type").content =
            "article";
    }

    updateCategory(category) {

        if (!category) return;

        const url =
            `${location.origin}/danh-muc/${
                this.app.ui.slugify(category.name)
            }`;

        document.title =
            `${category.name} | HydYar Wiki`;

        this.getMeta("description").content =
            `Danh mục ${category.name}`;

        this.getCanonical().href = url;

        this.getMeta("og:title").content =
            category.name;

        this.getMeta("og:description").content =
            `Danh mục ${category.name}`;

        this.getMeta("og:url").content = url;
    }

    updatePolicy(policy) {

        if (!policy) return;

        document.title =
            `${policy.title} | HydYar Wiki`;

        this.getMeta("description").content =
            policy.desc || "Chính sách";

        this.getCanonical().href = location.href;

        this.getMeta("og:title").content =
            policy.title;

        this.getMeta("og:description").content =
            policy.desc || "Chính sách";
    }

    reset() {
        this.updateHome();
    }
}