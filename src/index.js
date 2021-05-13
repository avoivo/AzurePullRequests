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

class AzureDevopsConfig {
    organization;
    project;
    repository;
    username;
    password;
    constructor() {
        const storedConfig = JSON.parse(localStorage.getItem("AzureDevopsConfig")) || {};
        this.organization = storedConfig.organization || "";
        this.project = storedConfig.project || "";
        this.repository = storedConfig.repository || "";
        this.username = storedConfig.username || "";
        this.password = storedConfig.password || "";
    }

    save() {
        localStorage.setItem("AzureDevopsConfig", JSON.stringify(this));
    }
}

class JiraConfig {
    organization;
    constructor() {
        const storedConfig = JSON.parse(localStorage.getItem("JiraConfig")) || {};
        this.organization = storedConfig.organization || "";
    }
    save() {
        localStorage.setItem("JiraConfig", JSON.stringify(this));
    }
}


class App {
    constructor(appElement) {
        this.appElement = appElement;
        this.azureDevopsConfig = new AzureDevopsConfig();
        this.jiraConfig = new JiraConfig();
        this.pullRequeststemplate = new PullRequestsTemplate(this.azureDevopsConfig.organization, this.azureDevopsConfig.project, this.azureDevopsConfig.repository, this.jiraConfig.organization);
        this.missingItemsTemplate = new MissingItemsTemplate();
        this.spinnerTemplate = new SpinnerTemplate();
        this.helper = new Helper();
    }

    load() {
        let headers = new Headers();
        headers.append('Authorization', 'Basic' + btoa(this.azureDevopsConfig.username + ":" + this.azureDevopsConfig.password));

        const fetchData = (status, top, skip, totalLimit) => fetch(`https://dev.azure.com/${this.azureDevopsConfig.organization}/${this.azureDevopsConfig.project}/_apis/git/repositories/${this.azureDevopsConfig.repository}/pullrequests?searchCriteria.status=${status}&$top=${top}&$skip=${skip}&api-version=6.0`,
            {
                headers: headers
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
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
        const voteToDescription = (vote) => {
            switch (vote) {
                case 10:
                    return "approved";
                case 5:
                    return "approved with suggestions";
                case 0:
                    return "no vote";
                case -5:
                    return "waiting for author";
                case -10:
                    return "rejected";
                default:
                    return "unknown status";
            }
        }
        const appendSection = (status, tags) => {
            this.appElement.append(this.spinnerTemplate.create());
            return fetchData(status, 100, 0, 600)
                .then(data => data.filter(pr =>
                    /*tags.some(t => pr.title.includes(t))
                    ||*/ (pr.labels && pr.labels.some(l => tags.some(t => this.helper.ciEquals(t, l.name))))
                ))
                .then(data => data.map(pr => {
                    const selfPRequest = pr.reviewers.find(r => this.helper.ciEquals(r.uniqueName, this.azureDevopsConfig.username));
                    return {
                        ...pr,
                        ticket: tags.find(t => pr.labels.some(l => this.helper.ciEquals(l.name, t))),
                        approvedByMe: selfPRequest ? voteToDescription(selfPRequest.vote) : ""
                    };
                }))
                .then(data => {
                    this.appElement.replaceChild(
                        this.pullRequeststemplate.create(status, data),
                        this.appElement.lastElementChild
                    );
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

        const azureDevopsOrganizationInput = document.querySelector("input#azure-devops_organization");
        const azureDevopsProjectInput = document.querySelector("input#azure-devops_project");
        const azureDevopsRepositoryInput = document.querySelector("input#azure-devops_repository");
        const azureDevopsUsernameInput = document.querySelector("input#azure-devops_username");
        const azureDevopsPasswordInput = document.querySelector("input#azure-devops_password");
        const jiraOrganizationInput = document.querySelector("input#jira_organization");

        azureDevopsOrganizationInput.value = this.azureDevopsConfig.organization;
        azureDevopsProjectInput.value = this.azureDevopsConfig.project;
        azureDevopsRepositoryInput.value = this.azureDevopsConfig.repository;
        azureDevopsUsernameInput.value = this.azureDevopsConfig.username;
        azureDevopsPasswordInput.value = this.azureDevopsConfig.password;
        jiraOrganizationInput.value = this.jiraConfig.organization;

        const saveConfig = () => {
            this.azureDevopsConfig.organization = azureDevopsOrganizationInput.value;
            this.azureDevopsConfig.project = azureDevopsProjectInput.value;
            this.azureDevopsConfig.repository = azureDevopsRepositoryInput.value;
            this.azureDevopsConfig.username = azureDevopsUsernameInput.value;
            this.azureDevopsConfig.password = azureDevopsPasswordInput.value;
            this.azureDevopsConfig.save();
            this.jiraConfig.organization = jiraOrganizationInput.value;
            this.jiraConfig.save();
        }

        document
            .querySelector("form#configuration")
            .addEventListener("submit", e => {
                e.preventDefault();
                e.stopPropagation();
                saveConfig();
                this.load();
            });
    }




}

const appEl = document.getElementById("app");
const app = new App(appEl);
app.start();