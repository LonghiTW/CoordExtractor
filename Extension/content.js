const api = typeof chrome !== 'undefined' ? chrome : browser;
const hostname = window.location.hostname;
const siteInfo = sites_config[hostname];
const copiedObserver = new MutationObserver(handleCopiedMutations);
const displayObserver = new MutationObserver(handleDisplayMutation);
let clipboardExecuted = false;

if (siteInfo) {
    initContentScript();
}

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
    const text = getCoordinatesText(siteInfo);
    if (!text) return;
    const cleanText = Array.isArray(text) ? text : text.replace(/[\u200E\u200F]/g, '');
    const coord = siteInfo.processCoordinates(cleanText);
    if (coord && coord.elev !== undefined && coord.elev !== null) {
        const groundInput = document.getElementById('ce-ground');
        if (groundInput) {
            groundInput.value = Math.round(coord.elev);
            console.log(`[CoordExtractor] Ground elevation set to ${groundInput.value}m`);
        }
    }
}

function handleKeyAction() {
    const text = getCoordinatesText(siteInfo);
    if (text) {
        processCoordinatesText(text);
    } else {
        console.error(`CoordExtractor: Coordinates not found for ${siteInfo.name}.`);
    }
}

async function handleCopiedMutations() {
    const offsetValue = await getOffsetValue();
    const element = document.querySelector(siteInfo.copier);

    if (element && offsetValue !== 'none') {
        copiedObserver.disconnect();
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

function processCoordinatesText(text) {
    if (!text) return;
    const cleanText = Array.isArray(text) ? text : text.replace(/[\u200E\u200F]/g, '');
    const parsed = siteInfo.processCoordinates(cleanText);
    if (parsed) {
        copyToClipboard(parsed);
    } else {
        console.error(`CoordExtractor: Failed to parse coordinates from "${text}"`);
    }
}

function getCoordinatesText(info) {
    let root = document;
    if (info.ifframe) {
        const [tag, idx] = info.ifframe;
        root = document.getElementsByTagName(tag)[idx]?.contentDocument || document;
    } else if (info.shadow) {
        root = document.querySelector(info.shadow)?.shadowRoot || document;
    }

    if (info.customExtractor) {
        return info.customExtractor(root);
    }

    const selectors = info.selector;
    if (!selectors) return null;

    const elements = root.querySelectorAll(selectors[0]);
    if (elements.length === 0) return null;

    if (selectors[1] !== undefined) {
        if (Array.isArray(selectors[1])) {
            return selectors[1].map(i => {
                const idx = i < 0 ? elements.length + i : i;
                return elements[idx]?.textContent.trim();
            }).join(' ');
        }
        const i = selectors[1];
        const idx = i < 0 ? elements.length + i : i;
        return elements[idx]?.textContent.trim();
    }

    if (info.ifinnerText) {
        return elements[0].innerText.trim();
    }

    return elements.length === 1
        ? elements[0].textContent.trim()
        : Array.from(elements).map(el => el.textContent.trim()).join(' ');
}

async function copyToClipboard(coord) {
    try {
        const data = await api.storage.sync.get([
            'offset', 'prefix', 'includeElev', 'applyDistortion'
        ]);
        const offsetType = data.offset || 'none';
        const prefixType = data.prefix || 'slash';
        const includeElev = !!data.includeElev;
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
                const ground = parseFloat(document.getElementById('ce-ground')?.value || 0);
                const distortion = window.BTE_PROJECTION.getDistortion(finalCoord).value;
                processedElev = (baseElev - ground) * distortion + ground;
                note += `(Distortion factor: ${distortion.toFixed(4)}, ground: ${ground}m) `;
            }

            // 最後才加上 Offset
            const uiOffset = parseFloat(document.getElementById('ce-offset')?.value || 0);
            const finalElev = Math.round(processedElev + uiOffset);

            if (applyDist) {
                note += `(Elevation with distortion: ${finalElev}m, offset: ${uiOffset}m) `;
            } else {
                note += `(Elevation: ${finalElev}m, offset: ${uiOffset}m) `;
            }
            outputParts.push(finalElev);
        }

        const text = outputParts.join(' ');
        await navigator.clipboard.writeText(text);
        alert(`Coordinates "${text}"\n${note}copied to clipboard!`);
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
(function () {
    // 初始化高度設定面板 (如果該網站有設定 height: true)
    function initHeightUI(config) {
        if (!config.height) return;

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
            input.value = (id === 'ce-ground') ? '0' : '0'; // 預設地面高度 0, Offset 0
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
        document.body.appendChild(outer);
    }

    async function init() {
        const host = window.location.hostname;
        const config = sites_config[host];
        if (config) {
            if (config.onLoad) {
                config.onLoad();
            }
            initHeightUI(config);
        }
    }

    init();
})();
