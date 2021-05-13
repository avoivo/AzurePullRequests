class Helper {
    ciEquals(a, b) {
        a = a.replace("-", "");
        a = a.replace("_", "");
        b = b.replace("-", "");
        b = b.replace("_", "");
        return typeof a === 'string' && typeof b === 'string'
            ? a.localeCompare(b, "en", { sensitivity: 'accent' }) === 0
            : a === b;
    }
}

class App {
    constructor(appElement, azureConfig, jiraConfig) {
        this.appElement = appElement;
        this.azureConfig = azureConfig;
        this.jiraConfig = jiraConfig;
        this.pullRequeststemplate = new PullRequestsTemplate(this.azureConfig.organization, this.azureConfig.project, this.azureConfig.repositoryId, this.jiraConfig.organization);
        this.missingItemsTemplate = new MissingItemsTemplate();
        this.helper = new Helper();
    }

    load(username, password) {
        let headers = new Headers();
        headers.append('Authorization', 'Basic' + btoa(username + ":" + password));

        const fetchData = (status, top, skip, totalLimit) => fetch(`https://dev.azure.com/${this.azureConfig.organization}/${this.azureConfig.project}/_apis/git/repositories/${this.azureConfig.repositoryId}/pullrequests?searchCriteria.status=${status}&$top=${top}&$skip=${skip}&api-version=6.0`,
            {
                headers: headers
            })
            .then(response => response.json())
            .then(jsonData => {
                if (jsonData.count < top || skip + jsonData.count > totalLimit) {
                    return jsonData.value;
                }
                else {
                    return fetchData(status, top, skip + top, totalLimit)
                        .then(data => [...jsonData.value, ...data]);
                }
            })
            ;

        const appendSection = (status, tags) => {
            return fetchData(status, 100, 0, 600)
                .then(data => data.filter(pr =>
                    /*tags.some(t => pr.title.includes(t))
                    ||*/ (pr.labels && pr.labels.some(l => tags.some(t => this.helper.ciEquals(t, l.name))))
                ))
                .then(data => data.map(pr => ({ ...pr, ticket: tags.filter(t => pr.labels.some(l => this.helper.ciEquals(l.name, t)))[0] })))
                .then(data => {
                    this.appElement.append(this.pullRequeststemplate.create(status, data));
                    const availableNames = data
                        .map(pr => pr.labels ?? [])
                        .reduce(
                            (prev, labels) => [...prev, ...labels],
                            []
                        )
                        .map(label => label.name);

                    return tags.filter(tag => availableNames.some(n => this.helper.ciEquals(n, tag)) === false);
                });
        }

        const urlParams = new URLSearchParams(window.location.search);
        let tags = urlParams.get('tag');

        tags = tags ? tags.split(",") : [];

        this.appElement.textContent = "";
        appendSection("active", tags)
            .then(remainingTags => appendSection("completed", remainingTags))
            .then(remainingTags => appendSection("abandoned", remainingTags))
            .then(remainingTags => this.appElement.append(this.missingItemsTemplate.create("Missing tags", remainingTags)))
            .catch(error => console.error(error));
    }

    start() {



        document
            .querySelector("form#user-login")
            .addEventListener("submit", e => {
                e.preventDefault();
                e.stopPropagation();
                const username = document.querySelector("input#username").value;
                const password = document.querySelector("input#password").value;
                this.load(username, password);
            });
    }




}

const appEl = document.getElementById("app");
const app = new App(appEl, config.azureDevops, config.jira);
app.start();