class App {
    constructor(appElement, organization, project, repositoryId, username, password) {
        this.appElement = appElement;
        this.organization = organization;
        this.project = project;
        this.repositoryId = repositoryId;
        this.username = username;
        this.password = password;
        this.pullRequeststemplate = new PullRequestsTemplate(this.organization, this.project, this.repositoryId);
        this.missingItemsTemplate = new MissingItemsTemplate();
    }

    start() {

        const ciEquals = (a, b) => {
            a = a.replace("-", "");
            a = a.replace("_", "");
            b = b.replace("-", "");
            b = b.replace("_", "");
            return typeof a === 'string' && typeof b === 'string'
                ? a.localeCompare(b, "en", { sensitivity: 'accent' }) === 0
                : a === b;
        }

        let headers = new Headers();
        headers.append('Authorization', 'Basic' + btoa(this.username + ":" + this.password));

        const fetchData = (status, top, skip, totalLimit) => fetch(`https://dev.azure.com/${this.organization}/${this.project}/_apis/git/repositories/${this.repositoryId}/pullrequests?searchCriteria.status=${status}&$top=${top}&$skip=${skip}&api-version=6.0`,
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
                    ||*/ (pr.labels && pr.labels.some(l => tags.some(t => ciEquals(t, l.name))))
                ))
                .then(data => {
                    this.appElement.append(this.pullRequeststemplate.create(status, data));
                    const availableNames = data
                        .map(pr => pr.labels ?? [])
                        .reduce(
                            (prev, labels) => [...prev, ...labels],
                            []
                        )
                        .map(label => label.name);

                    return tags.filter(tag => availableNames.some(n => ciEquals(n, tag)) === false);
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

}

const appEl = document.getElementById("app");
const app = new App(appEl, config.organization, config.project, config.repositoryId, config.username, config.password);
app.start();