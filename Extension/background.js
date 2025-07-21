chrome.commands.onCommand.addListener((command) => {
  if (command === "copy-coordinates") {
    // 向當前活動標籤頁發送訊息，通知 content.js 執行操作
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "keydown-copy" });
    });
  }
});