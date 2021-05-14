class AlertManager {
    constructor(alertContainer) {
        this.alertContainer = alertContainer;
    }

    alert(message, classname) {
        const alert = document.createElement("div");

        const btn = document.createElement("span");
        btn.classList.add("closebtn");
        btn.textContent = "×";
        btn.onclick = (e) => {
            alert.style.opacity = "0";
            setTimeout(() => this.alertContainer.removeChild(alert), 600);

        };

        var textContent = document.createTextNode(message);

        alert.classList.add("alert");
        alert.classList.add(classname);

        alert.append(btn);
        alert.append(textContent);

        this.alertContainer.append(alert);

        setTimeout(() => btn.click(), 5000);
    }

    success(message) {
        this.alert(message, "success");
    }
    info(message) {
        this.alert(message, "info");
    }
    warning(message) {
        this.alert(message, "warning");
    }
}