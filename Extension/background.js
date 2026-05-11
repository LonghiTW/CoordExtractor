const api = typeof chrome !== 'undefined' ? chrome : browser;
const isChrome = typeof chrome !== 'undefined' && !navigator.userAgent.includes('Firefox');
const isFirefox = navigator.userAgent.includes('Firefox') || typeof browser !== 'undefined';

// 追蹤哪些tab的content script已經準備好了
const readyTabs = new Set();

api.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "content-script-ready" && sender.tab) {
        readyTabs.add(sender.tab.id);
    }
});

// 清理關閉的tabs
api.tabs.onRemoved.addListener((tabId) => {
    readyTabs.delete(tabId);
});

// 清理重新加載的tabs
api.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
        readyTabs.delete(tabId);
    }
    
    // 當網頁載入完成時，進行跨瀏覽器智慧檢查，確保腳本有被注入 (主要為 Firefox 準備)
    if (changeInfo.status === "complete" && !readyTabs.has(tabId)) {
        injectContentScriptIfNeeded(tabId);
    }
});

async function sendMessageWithCheck(tabId, message, retries = 3) {
    // 首先檢查這個tab是否已經報告準備好了
    if (readyTabs.has(tabId)) {
        console.log(`[CoordExtractor] Tab ${tabId} already marked as ready, sending message directly`);
        try {
            return await api.tabs.sendMessage(tabId, message);
        } catch (error) {
            console.warn(`[CoordExtractor] Direct send failed, removing from ready tabs: ${error.message}`);
            readyTabs.delete(tabId);
            // 繼續到正常的檢查流程
        }
    }
    
    // 第一次嘗試：立即檢查，如果失敗就嘗試注入
    try {
        const response = await api.tabs.sendMessage(tabId, { action: "ping" });
        if (response && response.status === "ready") {
            readyTabs.add(tabId); // 記住這個tab已經準備好了
            return await api.tabs.sendMessage(tabId, message);
        }
    } catch (error) {
        console.log(`[CoordExtractor] Content script not ready, attempting injection...`);
        
        try {
            await injectContentScriptIfNeeded(tabId);
            
            // 注入後立即嘗試發送訊息
            const response = await api.tabs.sendMessage(tabId, message);
            readyTabs.add(tabId); // 記住這個tab已經準備好了
            return response;
        } catch (injectError) {
            console.warn(`[CoordExtractor] Injection failed: ${injectError.message}`);
        }
    }
    
    // 如果注入失敗，使用重試機制
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await api.tabs.sendMessage(tabId, { action: "ping" });
            if (response && response.status === "ready") {
                return await api.tabs.sendMessage(tabId, message);
            }
        } catch (error) {
            if (attempt < retries) {
                const waitTime = 500 * attempt;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                console.error(`[CoordExtractor] All attempts failed: ${error.message}`);
                throw error;
            }
        }
    }
}

async function injectContentScriptIfNeeded(tabId) {
    try {
        // 檢查這個tab是否已經準備好了
        if (readyTabs.has(tabId)) {
            return; // 已經準備好了
        }
        
        // 檢查tab的URL是否匹配我們的目標網站
        const tab = await api.tabs.get(tabId);
        const url = tab.url || '';
        
        const targetPatterns = [
            /earth\.google\.com\/web/,
            /\.google\.com\/maps/,
            /\.bing\.com/,
            /yandex\.com/,
            /\.nlsc\.gov\.tw/,
            /\.3dgis\.tw/,
            /\.planning\.ntpc\.gov\.tw/,
            /\.tycg\.gov\.tw/,
            /\.taichung\.gov\.tw/,
            /\.kcg\.gov\.tw/,
            /\.hccg\.gov\.tw/,
            /\.chcg\.gov\.tw/,
            /\.yunlin\.gov\.tw/,
            /\.tcd\.gov\.tw/,
            /\.taitung\.gov\.tw/,
            /\.hl\.gov\.tw/,
            /\.klcg\.gov\.tw/,
            /\.kinmen\.gov\.tw/
        ];
        
        const shouldInject = targetPatterns.some(pattern => pattern.test(url));
        if (!shouldInject) return;
        
        // 跨瀏覽器智慧檢查：使用 executeScript 詢問該網頁「是否已經存在 sites_config」
        // 如果已經存在，代表 manifest.json (Chrome) 已經成功注入過了
        const checkResult = await api.scripting.executeScript({
            target: { tabId: tabId },
            func: () => typeof sites_config !== 'undefined'
        }).catch(() => null);
        
        const isInjected = checkResult && checkResult[0] && checkResult[0].result === true;
        
        if (isInjected) {
            readyTabs.add(tabId); // 標記為已準備好，不再重複注入
        } else {
            await injectContentScript(tabId);
        }
    } catch (error) {
        // 忽略錯誤，tab可能已經關閉
    }
}

async function injectContentScript(tabId) {
    try {
        const scripts = [
            "utils.js",
            "config.js",
            "bte_projection.js",
            "content.js"
        ];

        // MV3 注入方法
        for (const script of scripts) {
            await api.scripting.executeScript({
                target: { tabId: tabId },
                files: [script]
            });
        }

        console.log("[CoordExtractor] Content scripts injected successfully");
    } catch (error) {
        console.error("[CoordExtractor] Failed to inject content script:", error.message);
        throw error;
    }
}

api.commands.onCommand.addListener((command) => {
    api.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
            console.log(`[CoordExtractor] Command triggered: ${command} (Tab ID: ${tabs[0].id}, URL: ${tabs[0].url})`);
            try {
                if (command === "copy-coordinates") {
                    await sendMessageWithCheck(tabs[0].id, { action: "keydown-copy" });
                } else if (command === "set-ground-elevation") {
                    await sendMessageWithCheck(tabs[0].id, { action: "set-ground" });
                }
            } catch (error) {
                console.error("[CoordExtractor] Command execution failed:", error.message);
            }
        }
    });
});
