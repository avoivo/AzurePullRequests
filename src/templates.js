class Template {
    constructor(templateId) {
        this.templateId = templateId;
        this.clear();
    }

    clear() {
        this.template = document.getElementById(this.templateId).cloneNode(true);
    }

    setText(selector, text) {
        const el = this.template.content.querySelector(selector);
        el && (el.textContent = text);
    }

    setImage(selector, src, title) {
        const el = this.template.content.querySelector(selector);
        if (el) {
            el.src = src;
            el.title = title;
        }
    }

    setContainerId(selector, id) {
        const el = this.template.content.querySelector(selector);
        el && (el.dataset.id = id);
    }

    setInput(selector, id, type) {
        const inputElement = this.template.content.querySelector(selector);
        if (inputElement) {
            inputElement.id = id;
            inputElement.type = type;
            inputElement.name = type === "radio" ? "answer" : id;
            inputElement.value = id;
        }
    }

    setLabel(selector, id, text) {
        const labelElement = this.template.content.querySelector(selector);
        if (labelElement) {
            labelElement.htmlFor = id;
            labelElement.textContent = text;
        }
    }

    setAnchor(selector, url, text) {
        const anchorElement = this.template.content.querySelector(selector);
        if (anchorElement) {
            anchorElement.href = url;
            anchorElement.textContent = text;
        }
    }

    getElement(selector) {
        return this.template.content.querySelector(selector);
    }

    clone() {
        return this.template.content.cloneNode(true);
    }
}

class PullRequestsTemplate {
    constructor(organization, project, repository) {
        this.organization = organization;
        this.repository = repository;
        this.project = project;
        this.template = new Template("pull-requests");
        this.itemTemplate = new PullRequestItemTemplate();
    }

    create(title, pullRequests) {
        this.template.clear();
        this.template.setText(".title", title);

        const container = this.template.getElement(".pull-requests");
        container.textContent = "";

        pullRequests.forEach(element => {
            const link = `https://${this.organization}.visualstudio.com/${this.project}/_git/${this.repository}/pullrequest/${element.codeReviewId}`;
            container.appendChild(this.itemTemplate.create(element.codeReviewId, element.title, link));
        });

        return this.template.clone();
    }
}

class PullRequestItemTemplate {
    constructor() {
        this.template = new Template("pull-request-item");
    }

    create(id, description, link) {
        this.template.clear();
        this.template.setAnchor(".id", link, id);
        this.template.setText(".description", description);
        return this.template.clone();
    }
}

class MissingItemsTemplate {
    constructor() {
        this.template = new Template("missing-items");
    }

    create(title, items) {
        this.template.clear();
        this.template.setText(".title", title);
        this.template.setText(".items", items.join(", "));
        return this.template.clone();
    }
}