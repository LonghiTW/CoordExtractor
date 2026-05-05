const api = typeof chrome !== 'undefined' ? chrome : browser;

api.commands.onCommand.addListener((command) => {
    api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            if (command === "copy-coordinates") {
                api.tabs.sendMessage(tabs[0].id, { action: "keydown-copy" });
            } else if (command === "set-ground-elevation") {
                api.tabs.sendMessage(tabs[0].id, { action: "set-ground" });
            }
        }
    });
});
