(function () {
    const api = typeof chrome !== "undefined" ? chrome : browser;
    const hostname = window.location.hostname;
    let siteInfo = sites_config[hostname];
    const copiedObserver = new MutationObserver(handleCopiedMutations);
    const displayObserver = new MutationObserver(handleDisplayMutation);
    let clipboardExecuted = false;

async function initContentScript() {
    console.log(`CoordExtractor enabled for ${siteInfo.name}!`);

    // Listen for messages from background (standard chrome.commands)
    api.runtime.onMessage.addListener(({ action }) => {
        if (action === "keydown-copy") {
            handleKeyAction();
        } else if (action === "set-ground") {
            handleSetGroundAction();
        }
    });

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
    if ((elev === undefined || elev === null) && elevText && siteInfo.processElevation) {
        elev = siteInfo.processElevation(elevText);
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
    console.log('[CoordExtractor] Raw Data:', data);
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

    const shouldIntervene =
        (data.offset && data.offset !== 'none') ||
        (data.prefix && data.prefix !== 'none') ||
        data.includeElev ||
        data.applyDistortion;

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
        if ((parsed.elev === undefined || parsed.elev === null) && elevText && siteInfo.processElevation) {
            parsed.elev = siteInfo.processElevation(elevText);
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
        console.log('[CoordExtractor] Custom Extractor Result:', res);
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
        const data = await api.storage.sync.get([
            'offset', 'prefix', 'includeElev', 'applyDistortion'
        ]);
        const offsetType = data.offset || 'none';
        const prefixType = data.prefix || 'slash';
        // 預設為 true (除非明確設為 false)
        const includeElev = data.includeElev !== false;
        const applyDist = !!data.applyDistortion;

        console.log('[CoordExtractor] Final Coord for Clipboard:', coord, 'IncludeElev Setting:', includeElev);

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
        if (prefixType === 'slash') outputParts.push("/tpll");
        else if (prefixType === 'tpll') outputParts.push("tpll");

        // 座標 (緯 經)
        outputParts.push(finalCoord.lat);
        outputParts.push(finalCoord.lon);

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
        alert(`Coordinates "${text}"\ncopied to clipboard!\n${note}`);
    } catch (err) {
        console.error('CoordExtractor: Failed to copy:', err);
    }
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
        const hostName = window.location.hostname;
        const config = sites_config[hostName];

        if (config) {
            siteInfo = config; // 確保全域變數已賦值
            initContentScript(); // 啟動監聽器與事件綁定
            
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
    }

    // 確保 DOM 準備就緒
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
