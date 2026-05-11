(function () {
    const api = typeof chrome !== "undefined" ? chrome : browser;
    const hostname = window.location.hostname;

    let siteInfo = null;  // 延遲初始化，直到 config 加載
    let copiedObserver = null;  // 延遲初始化
    let displayObserver = null;  // 延遲初始化
    let clipboardExecuted = false;

    // 延遲初始化 observers
    function initObservers() {
        if (!copiedObserver) copiedObserver = new MutationObserver(handleCopiedMutations);
        if (!displayObserver) displayObserver = new MutationObserver(handleDisplayMutation);
    }

    // ========== 立即註冊 Message Listener ==========
    // 這不依賴任何初始化，確保 background 能立即接收 ping 和指令
    api.runtime.onMessage.addListener(({ action }, sender, sendResponse) => {
        try {
            if (action === "ping") {
                sendResponse({ status: "ready" });
                return true;
            }

            // 其他指令需要等待 siteInfo 初始化
            if (!siteInfo) {
                console.warn(`[CoordExtractor] Message ${action} received but siteInfo not ready yet`);
                sendResponse({ status: "not_ready", message: "siteInfo not initialized" });
                return true;
            }

            if (action === "keydown-copy") {
                handleKeyAction();
                sendResponse({ status: "executed" });
            } else if (action === "set-ground") {
                handleSetGroundAction();
                sendResponse({ status: "executed" });
            }
        } catch (error) {
            console.error(`[CoordExtractor] Error handling action ${action}:`, error.message);
            sendResponse({ status: "error", message: error.message });
        }

        return true; // 允許非同步回應
    });

    try {
        api.runtime.sendMessage({ action: "content-script-ready" }).catch(() => {
            // Background 可能還沒準備好，忽略這個錯誤
        });
    } catch (error) {
        // 忽略錯誤，background 會通過 ping 來檢查
    }

    async function initContentScript() {
        // 檢查 siteInfo 是否已設置
        if (!siteInfo) {
            console.error("[CoordExtractor] siteInfo is not initialized. sites_config may not be loaded.");
            return;
        }

        console.log(`[CoordExtractor] Enabled for ${siteInfo.name}!`);

        // Handle iframe specifics
        if (siteInfo.ifframe) {
            setupIframeListener();
        } else {
            // Direct keydown listener as fallback/alternative to chrome.commands
            document.addEventListener('keydown', (e) => {
                if (e.altKey) {
                    if (e.key.toLowerCase() === 'c') handleKeyAction();
                    if (e.key.toLowerCase() === 'g') handleSetGroundAction();
                }
            }, true);
        }

        // Site-specific observers
        if (hostname === 'www.google.com' && window.location.pathname.includes("maps")) {
            initObservers();
            copiedObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function setupIframeListener() {
        const [tagName, index] = siteInfo.ifframe;
        const frame = document.getElementsByTagName(tagName)[index];
        if (!frame) return;

        const attachListener = () => {
            try {
                const frameDoc = frame.contentDocument;
                if (!frameDoc) return;

                // Keydown listener inside iframe
                frameDoc.addEventListener('keydown', (e) => {
                    if (e.altKey) {
                        if (e.key.toLowerCase() === 'c') handleKeyAction();
                        if (e.key.toLowerCase() === 'g') handleSetGroundAction();
                    }
                }, true);

                // MutationObserver for specific elements inside iframe
                if (siteInfo.copier && hostname === 'map.hl.gov.tw') {
                    const frameObserver = new MutationObserver(() => {
                        const statusElem = frameDoc.querySelector(siteInfo.copier);
                        if (statusElem) {
                            frameObserver.disconnect();
                            initObservers();
                            displayObserver.observe(statusElem, { attributes: true });
                        }
                    });
                    frameObserver.observe(frameDoc.body, { childList: true, subtree: true });
                }
            } catch (e) {
                console.error('CoordExtractor: Cannot access iframe content:', e);
            }
        };

        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
            attachListener();
        } else {
            frame.onload = attachListener;
        }
    }

    async function handleSetGroundAction() {
        const { coordText, elevText } = await getCoordinatesText(siteInfo);
        if (!coordText) return;

        const parsed = siteInfo.processCoordinates(coordText);
        // 優先從座標文字解析高度，如果沒有，再從專屬高度文字解析
        let elev = parsed?.elev;
        
        if ((elev === undefined || elev === null) && elevText) {
            const processor = siteInfo.processElevation || (typeof genericElevation !== 'undefined' ? genericElevation : null);
            if (processor) elev = processor(elevText);
        }

        if (elev !== undefined && elev !== null) {
            const shadowHost = document.querySelector('#ce-height-shadow-host');
            const groundInput = shadowHost?.shadowRoot?.getElementById('ce-ground');
            if (groundInput) {
                groundInput.value = Math.round(elev);
                console.log(`[CoordExtractor] Ground elevation set to ${groundInput.value}m`);
            }
        }
    }

    async function handleKeyAction() {
        const data = await getCoordinatesText(siteInfo);
        if (data.coordText) {
            processCoordinatesText(data);
        } else {
            console.error(`CoordExtractor: Coordinates not found for ${siteInfo.name}.`);
        }
    }

    async function handleCopiedMutations() {
        const data = await api.storage.sync.get([
            'offset', 'prefix', 'includeElev', 'applyDistortion'
        ]);

        const hasHeightSupport = !!siteInfo.height;

        const shouldIntervene =
            (data.offset && data.offset !== 'none') ||
            (data.prefix && data.prefix !== 'none') ||
            (data.includeElev && hasHeightSupport) ||
            (data.applyDistortion && hasHeightSupport);

        const element = document.querySelector(siteInfo.copier);

        if (element && shouldIntervene && !element.dataset.ceHandled) {
            element.dataset.ceHandled = "true";
            element.addEventListener('click', () => {
                setTimeout(async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        processCoordinatesText(text);
                    } catch (err) {
                        console.error('CoordExtractor: Failed to read clipboard:', err);
                    }
                }, 100);
            });
        }
    }

    function handleDisplayMutation(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const displayStyle = window.getComputedStyle(mutation.target).display;
                if (displayStyle === 'block' && !clipboardExecuted) {
                    clipboardExecuted = true;
                    setTimeout(async () => {
                        try {
                            const text = await navigator.clipboard.readText();
                            processCoordinatesText(text);
                        } catch (err) {
                            console.error('CoordExtractor: Failed to read clipboard:', err);
                        }
                    }, 100);
                } else if (displayStyle === 'none') {
                    clipboardExecuted = false;
                }
            }
        }
    }

    function processCoordinatesText(data) {
        if (!data) return;

        // 相容性處理：判斷傳入的是純字串還是物件
        const coordText = typeof data === 'string' ? data : data.coordText;
        const elevText = typeof data === 'string' ? "" : (data.elevText || "");

        if (!coordText) return;

        const cleanText = Array.isArray(coordText) ? coordText : coordText.replace(/[\u200E\u200F]/g, '');
        const parsed = siteInfo.processCoordinates(cleanText);

        if (parsed) {
            // 如果座標解析器沒抓到高度，且有獨立的高度文字與解析器，則補上高度
            if ((parsed.elev === undefined || parsed.elev === null) && elevText) {
                const processor = siteInfo.processElevation || (typeof genericElevation !== 'undefined' ? genericElevation : null);
                if (processor) parsed.elev = processor(elevText);
            }
            copyToClipboard(parsed);
        } else {
            const displayLabel = typeof data === 'string' ? data : coordText;
            console.error(`CoordExtractor: Failed to parse coordinates from "${displayLabel}"`);
        }
    }

    async function getCoordinatesText(info) {
        let root = document;
        if (info.ifframe) {
            const [tag, idx] = info.ifframe;
            root = document.getElementsByTagName(tag)[idx]?.contentDocument || document;
        } else if (info.shadow) {
            root = document.querySelector(info.shadow)?.shadowRoot || document;
        }

        if (info.customExtractor) {
            // customExtractor 現在可以是 async
            const res = await info.customExtractor(root);
            return res;
        }

        const selectors = info.selector;
        if (!selectors) return { coordText: null, elevText: null };

        const elements = root.querySelectorAll(selectors[0]);
        if (elements.length === 0) return { coordText: null, elevText: null };

        let coordText = "";
        if (selectors[1] !== undefined) {
            if (Array.isArray(selectors[1])) {
                coordText = selectors[1].map(i => {
                    const idx = i < 0 ? elements.length + i : i;
                    return elements[idx]?.textContent.trim();
                }).join(' ');
            } else {
                const i = selectors[1];
                const idx = i < 0 ? elements.length + i : i;
                coordText = elements[idx]?.textContent.trim();
            }
        } else {
            coordText = elements.length === 1
                ? elements[0].textContent.trim()
                : Array.from(elements).map(el => el.textContent.trim()).join(' ');
        }

        let elevText = "";
        if (typeof info.height === 'string') {
            const elevElem = root.querySelector(info.height);
            if (elevElem) {
                elevText = elevElem.textContent.trim();
            }
        }

        return { coordText, elevText };
    }

    async function copyToClipboard(coord) {
        try {
            // 正確地包裝 storage API
            const data = await new Promise(res => {
                api.storage.sync.get([
                    'offset', 'prefix', 'includeElev', 'applyDistortion'
                ], res);
            });

            const offsetType = data.offset || 'none';
            const prefixType = data.prefix || 'none';
            // 預設為 true (除非明確設為 false)
            const includeElev = data.includeElev !== false;
            const applyDist = !!data.applyDistortion;

            let finalCoord = coord;
            let note = "";

            if (offsetType === 'latlon') {
                finalCoord = await applyLatLonOffset(coord);
                note = "(Lat/Lon offset applied) ";
            } else if (offsetType === 'btexz') {
                finalCoord = await applyBTEOffset(coord);
                note = "(BTE offset applied) ";
            }

            // 格式化輸出字串
            let outputParts = [];

            // 處理 Prefix
            if (prefixType === 'tpll') outputParts.push("/tpll");
            else if (prefixType === 'upll') outputParts.push("/upll");

            // 座標 (緯, 經)
            outputParts.push(`${finalCoord.lat}, ${finalCoord.lon}`);

            // 處理高度
            if (includeElev && finalCoord.elev !== undefined && finalCoord.elev !== null) {
                let baseElev = finalCoord.elev;
                let processedElev = baseElev;

                if (applyDist) {
                    const shadowHost = document.querySelector('#ce-height-shadow-host');
                    const groundInput = shadowHost?.shadowRoot?.getElementById('ce-ground');
                    const ground = parseFloat(groundInput?.value || 0);
                    const distortion = window.BTE_PROJECTION.getDistortion(finalCoord).value;
                    processedElev = (baseElev - ground) * distortion + ground;
                    note += `Distortion: ${distortion.toFixed(3)}, ground: ${ground}m\n`;
                }

                // 最後才加上 Offset
                const shadowHost = document.querySelector('#ce-height-shadow-host');
                const offsetInput = shadowHost?.shadowRoot?.getElementById('ce-offset');
                const uiOffset = parseFloat(offsetInput?.value || 0);
                const finalElev = Math.round(processedElev + uiOffset);

                if (applyDist) {
                    note += `Elevation with distortion: ${finalElev}m, offset: ${uiOffset}m`;
                } else {
                    note += `Elevation: ${finalElev}m, offset: ${uiOffset}m`;
                }
                outputParts.push(finalElev);
            }

            const text = outputParts.join(' ');
            await navigator.clipboard.writeText(text);

            console.log(`[CoordExtractor] Copied: ${text}`);
            if (note) console.log(`[CoordExtractor] Details:\n${note}`);

            showToast("Copied!");
        } catch (err) {
            console.error('CoordExtractor: Failed to copy:', err);
        }
    }

    function showToast(message) {
        let toast = document.getElementById('ce-toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ce-toast-notification';
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'rgba(40, 167, 69, 0.9)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                fontSize: '15px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: '2147483647',
                transition: 'opacity 0.3s ease-in-out',
                pointerEvents: 'none',
                opacity: '0'
            });
            document.documentElement.appendChild(toast);
        }

        toast.textContent = message;

        // Trigger reflow for transition
        void toast.offsetWidth;
        toast.style.opacity = '1';

        if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    }

    function getOffsetValue() {
        return new Promise(res => api.storage.sync.get('offset', data => res(data.offset || 'none')));
    }

    async function applyLatLonOffset(coord) {
        const data = await new Promise(res => api.storage.sync.get(['fromInput', 'toInput'], res));
        const from = (data.fromInput?.length === 2) ? data.fromInput : [0, 0];
        const to = (data.toInput?.length === 2) ? data.toInput : [0, 0];
        return {
            lat: coord.lat - from[0] + to[0],
            lon: coord.lon - from[1] + to[1],
            elev: coord.elev
        };
    }

    async function applyBTEOffset(coord) {
        const data = await new Promise(res => api.storage.sync.get(['xInput', 'zInput'], res));
        const xOff = data.xInput || 0;
        const zOff = data.zInput || 0;
        const mccoord = BTE_PROJECTION.fromGeo(coord);
        const offset = { x: mccoord.x - xOff, y: mccoord.y - zOff };
        return BTE_PROJECTION.toGeo(offset);
    }

    // --- 初始化 ---
    // 初始化高度設定面板 (如果該網站有設定 height: true)
    function initHeightUI(config) {
        if (!config.height) return;
        if (document.querySelector('#ce-height-shadow-host')) return;

        const host = document.createElement('div');
        host.id = 'ce-height-shadow-host';
        const shadow = host.attachShadow({ mode: 'open' });

        // 定義樣式 (Inline)
        const style = document.createElement('style');
        style.textContent = `
            .ce-height-outer {
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 2147483647;
                width: auto;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 6px;
                color: #333;
                pointer-events: auto;
            }
            .ce-height-inner { display: flex; flex-direction: column; gap: 3px; }
            .ce-height-title { font-size: 0.7rem; font-weight: bold; color: #0d6efd; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 3px; text-align: center; }
            .ce-height-fields { display: flex; gap: 5px; }
            .ce-height-row { display: flex; flex-direction: column; flex: 1; align-items: center; }
            .ce-height-label { font-size: 0.65rem; color: #666; margin-bottom: 1px; text-align: center; }
            .ce-height-input { width: 45px; padding: 2px 4px; font-size: 0.8rem; border: 1px solid #ddd; border-radius: 4px; outline: none; text-align: right; }
            .ce-height-input:focus { border-color: #0d6efd; }
        `;

        const outer = document.createElement('div');
        outer.className = 'ce-height-outer';

        const inner = document.createElement('div');
        inner.className = 'ce-height-inner';

        const title = document.createElement('div');
        title.className = 'ce-height-title';
        title.innerText = 'Elevation Settings';

        const createRow = (labelStr, id) => {
            const row = document.createElement('div');
            row.className = 'ce-height-row';
            const label = document.createElement('label');
            label.className = 'ce-height-label';
            label.innerText = labelStr;
            const input = document.createElement('input');
            input.className = 'ce-height-input';
            input.type = 'number';
            input.id = id;
            input.value = '0';
            row.appendChild(label);
            row.appendChild(input);
            return row;
        };

        const groundRow = createRow('Ground (m)', 'ce-ground');
        const offsetRow = createRow('Offset (m)', 'ce-offset');

        const fields = document.createElement('div');
        fields.className = 'ce-height-fields';
        fields.appendChild(groundRow);
        fields.appendChild(offsetRow);

        inner.appendChild(title);
        inner.appendChild(fields);
        outer.appendChild(inner);

        shadow.appendChild(style);
        shadow.appendChild(outer);

        document.documentElement.appendChild(host);
    }

    async function init() {
        // 檢查 sites_config 是否已加載
        if (typeof sites_config === 'undefined') {
            console.error("[CoordExtractor] sites_config is not defined. config.js may not have loaded properly.");
            console.log("[CoordExtractor] Current hostname:", hostname);
            return;
        }

        const config = sites_config[hostname];

        if (!config) {
            console.warn(`[CoordExtractor] No configuration found for hostname: ${hostname}`);
            console.log("[CoordExtractor] Available hostnames:", Object.keys(sites_config));
            return;
        }

        console.log(`[CoordExtractor] Configuration found for ${hostname}`);
        siteInfo = config; // 確保全域變數已賦值

        try {
            initContentScript(); // 啟動監聽器與事件綁定
        } catch (error) {
            console.error("[CoordExtractor] Error in initContentScript:", error.message);
            return;
        }

        if (config.onLoad) {
            config.onLoad();
        }

        // 由於 Google Earth 等網站是動態載入的，使用 MutationObserver 確保 UI 存在
        if (config.height) {
            const observer = new MutationObserver(() => {
                if (!document.querySelector('#ce-height-shadow-host') && (document.body || document.documentElement)) {
                    initHeightUI(config);
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // 立即嘗試初始化一次
            initHeightUI(config);
        }
    }

    // 確保 DOM 準備就緒
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
