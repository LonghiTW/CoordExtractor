console.log('CoordExtractor enabled!');

// Define coordinate object and initialize MutationObserver
let coord = { lat: null, lon: null }; // WGS84
const hostname = window.location.hostname;
const siteInfo = getSiteInfo(hostname);
const copiedObserver = new MutationObserver(handleCopiedMutations);
const displayObserver = new MutationObserver(handleDisplayMutation);
let clipboardExecuted = false; // 建立一個旗標來確保 clipboard 操作只執行一次

(async () => {
    // Listen for keyboard events
	if (siteInfo.ifframe) {
        // 確保 frame 元素存在
        const frameElement = document.getElementsByTagName(siteInfo.ifframe[0])[0];
    
        if (frameElement) {
            // 等待 frame 內容加載完成後才添加事件監聽
            frameElement.onload = function() {
                try {
                    // 訪問 frame 的 contentDocument
                    const frameDoc = frameElement.contentDocument;
          
                    // 確保 frame 內部文檔存在
                    if (frameDoc) {
                        console.log('Frame loaded, starting MutationObserver.');

                        // 使用 MutationObserver 監控 frame 內部的變動
                        const frameObserver = new MutationObserver((mutationsList) => {
                            mutationsList.forEach(mutation => {
                                // 檢查是否有新元素添加到 frame 內部
                                if (mutation.type === 'childList') {
                                    const displayStatus = frameDoc.querySelector(siteInfo.copier);
                                    if (displayStatus) {
                                        // 找到 #twd97Status 元素，開始監控它
                                        frameObserver.disconnect(); // 停止監控 DOM 結構
                                        displayObserver.observe(displayStatus, { attributes: true, subtree: false });
                                        console.log('#twd97Status 已經出現，開始監控屬性變動');
                                    }
                                }
                            });
                        });

                        // 配置 MutationObserver，監控新增的子節點
                        frameObserver.observe(frameDoc.body, { childList: true, subtree: true });
                    }
                } catch (e) {
                    console.error('Cannot access frame content:', e);
                }
            };
        }
    }
	
	// 使用 chrome.runtime 訊息監聽鍵盤事件
	chrome.runtime.onMessage.addListener(({ action }) => {
		if (action === "keydown-copy") {
			handleKeydown(siteInfo);
		}
	});

    // Observe DOM mutations for other sites if needed
    if (hostname === 'www.google.com' && window.location.pathname.includes("maps")) {
        copiedObserver.observe(document.body, { childList: true, subtree: true });
    }
})();

// Handle keyboard event for Alt + C
function handleKeydown(siteInfo) {
    const coordinatesText = getCoordinatesText(siteInfo.ifframe, siteInfo.shadow, siteInfo.selector, siteInfo.ifinnerText);
    // 嘗試解析座標並處理
    if (coordinatesText) {
        processClipboardText(coordinatesText, siteInfo);  // 使用 processClipboardText 處理座標
    } else {
        console.error(`Coordinates element not found for ${siteInfo.name}.`);
    }
}

// MutationObserver callback
async function handleCopiedMutations(mutationsList) {
    // 透過函數讀取 offset 設定
    const offsetValue = await getOffsetValue();
    // 檢查是否找到特定元素
    const element = document.querySelector(siteInfo.copier);

    if (element && offsetValue !== 'none') {
        // 找到目標元素就停止監聽
        copiedObserver.disconnect();
        // 綁定點擊事件，無論選項是否已選中，點擊都會進行處理
        element.addEventListener('click', () => handleElementClick(siteInfo, offsetValue));
    }
}

// Handle element click event for coordinates
function handleElementClick(siteInfo, offsetValue) {
    // 延時執行 clipboard 操作
    setTimeout(() => {
        // 等待複製座標完成後再執行 clipboard 操作
        navigator.clipboard.readText()
            .then(text => processClipboardText(text, siteInfo))
            .catch(err => console.error('Failed to read clipboard contents: ', err));
    }, 10); // 延遲 0.01 秒
    // 重新開始監聽，等元素再次出現
    copiedObserver.observe(document.body, { childList: true, subtree: true });
}

// 創建 MutationObserver 來監聽元素的屬性變化
function handleDisplayMutation(mutationsList) {
    mutationsList.forEach(mutation => {
        // 檢查是否是 style 屬性變動
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const frameElement = document.getElementsByTagName(siteInfo.ifframe[0])[0];
            const frameDoc = frameElement.contentDocument;
            const displayStatus = frameDoc.querySelector(siteInfo.copier);

            if (displayStatus) {
                // 獲取元素的 display 屬性值
                const displayStyle = window.getComputedStyle(displayStatus).display;

                if (displayStyle === 'block') {
                    // 如果 display 是 'block'，表示元素顯示
                    console.log('#twd97Status 顯示了！');
                    // 找到目標元素就停止監聽
                    copiedObserver.disconnect();
                    // 只有在 clipboard 尚未執行過的情況下，才執行 clipboard 操作
                    if (!clipboardExecuted) {
                        clipboardExecuted = true; // 設置為 true，防止重複執行
                        
                        // 延時執行 clipboard 操作
                        setTimeout(() => {
                            navigator.clipboard.readText()
                                .then(text => processClipboardText(text, siteInfo))
                                .catch(err => console.error('Failed to read clipboard contents: ', err));
                        }, 10); // 延遲 0.01 秒
                    }
                } else if (displayStyle === 'none') {
                    // 如果 display 是 'none'，表示元素被隱藏
                    console.log('#twd97Status 隱藏了！');
                    // 當元素隱藏時，將 clipboardExecuted 重新設置為 false，以便下一次元素顯示時可以再次執行 clipboard 操作
                    clipboardExecuted = false;
                    // 重新開始監聽，等元素再次出現
                    copiedObserver.observe(document.body, { childList: true, subtree: true });
                }
            }
        }
    });
}

// Process clipboard text and handle coordinates
function processClipboardText(text, siteInfo) {
    const parsedCoord = Array.isArray(text)
	    ? siteInfo.processCoordinates(text)
	    : siteInfo.processCoordinates(text.replace(/[\u200E\u200F]/g, ''));
    
	if (parsedCoord) {
        copyCoordinates(parsedCoord);
    } else {
        console.error(`Unable to parse coordinates from ${siteInfo.name}.`);
    }
}

// Get offset value from chrome storage
function getOffsetValue() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('offset', function (result) {
            resolve(result.offset || 'none');
        });
    });
}

// Get site information for the current hostname
function getSiteInfo(hostname) {
    const sites = {
        'www.google.com': {
            name: 'Google Maps',
            copier: '.fxNQSd',
            processCoordinates: latlon,
        },
        'www.bing.com': {
            name: 'Bing Maps',
            selector: ['span.alwaysLtr_CVy2G'],
            copier: '.secTextLink[data-tag="secTextLink"]',
            processCoordinates: latlon,
        },
        'yandex.com': {
            name: 'Yandex Maps',
            selector: ['.toponym-card-title-view__coords-badge'],
            copier: '.clipboard__help',
            processCoordinates: latlon,
        },
        'maps.nlsc.gov.tw': {
            name: 'Taiwan Map Service',
            selector: ['.ol-mouse-position'],
            ifinnerText: true,
            processCoordinates: lonlat,
        },
        '3dmaps.nlsc.gov.tw': {
            name: 'Taiwan 3D Map Service',
			ifframe: ['frame', 0],
            selector: ['.pg-TableType1RightContent', [5, 4]],
            processCoordinates: TWD97XY,
        },
        'gis.ardswc.gov.tw': {
            name: 'BigGIS',
            selector: ['#Cursor_Coord'],
            processCoordinates: latlon,
        },
        'ysnp.3dgis.tw': {
            name: 'Yushan National Park',
            ifframe: ['iframe', 0],
            selector: ['#statusbar'],
            ifinnerText: true,
            processCoordinates: yushanCoordinates,
        },
        '3dmap.ymsnp.gov.tw': {
            name: 'Yangmingshan National Park',
            selector: ['#coord'],
            ifinnerText: true,
            processCoordinates: lonlat,
        },
        'urban.planning.ntpc.gov.tw': {
            name: 'Ntpc Urban and Rural Info',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: urplanning,
        },
        'urplanning.tycg.gov.tw': {
            name: 'Taoyuan GIS Map',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: urplanning,
        },
        'tymap.tycg.gov.tw': {
            name: 'Taoyuan Topomap',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: urplanning,
        },
        'gismap.taichung.gov.tw': {
            name: 'Taichung GIS Map',
            selector: ['td.omg-statusbar-footbar-btn.omg-statusbar-foot-mousePosition.ol-unselectable'],
            processCoordinates: gismap,
        },
        'gisdawh.kcg.gov.tw': {
            name: (function () {
                const path = window.location.pathname;
                if (path.includes('kcmap')) {
                    // 高雄地圖網
                    return 'Kaohsiung City Government I-MAP';
                } else if (path.includes('landeasy')) {
                    // 高雄地籍圖資服務網
                    return 'Kaohsiung LandEasy';
                }
            })(),
            selector: (function () {
                const path = window.location.pathname;
                if (path.includes('kcmap2')) {
					// 高雄地圖網(新)
					return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(12) > div.mousePosition > span > div'];
				} else if (path.includes('kcmap')) {
                    // 高雄地圖網
                    return ['td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable'];
                } else if (path.includes('landeasy2')) {
                    // 高雄地籍圖資服務網(新)
                    return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(37) > div.mousePosition > span > div'];
                }else if (path.includes('landeasy')) {
                    // 高雄地籍圖資服務網
                    return ['#mouseInfo'];
                }
            })(),
            ifinnerText: (function () {
				const path = window.location.pathname;
				if (path.includes('kcmap2')) {
				    return true;
				} else if (path.includes('landeasy2')) {
				    return true;
				}
            })(),
            processCoordinates: (function () {
                const path = window.location.pathname;
                if (path.includes('kcmap2')) {
					// 高雄地圖網(新)
                    return latlon;
				} else if (path.includes('kcmap')) {
                    // 高雄地圖網
                    return gismap;
                } else if (path.includes('landeasy2')) {
                    // 高雄地籍圖資服務網(新)
                    return latlon;
                } else if (path.includes('landeasy')) {
                    // 高雄地籍圖資服務網
                    return landeasy;
                }
            })(),
        },
        'urbangis.kcg.gov.tw': {
            name: 'Kaohsiung Urban Planning MAP',
            selector: ['#txtX, #txtY'],
            processCoordinates: TWD97XY,
        },
        'urbangis.hccg.gov.tw': {
            name: 'Hsinchu Urban Planning MAP',
            selector: ['small[data-v-79d61da6]', 1],
            processCoordinates: urplanning,
        },
		'3dgis.hccg.gov.tw': {
            name: 'Hsinchu Urban Planning 3D MAP',
            selector: ['div[data-v-f2982cfb]', 1],
            processCoordinates: urplanning,
        },
		'urbangis.chcg.gov.tw': {
            name: 'Changhua Urban Planning GIS MAP',
            selector: ['div.map-info-block.map-info-coord-block.coord-twd97'],
            processCoordinates: urplanning,
        },
		'map.yunlin.gov.tw': {
            name: 'Yunlin GIS MAP',
			shadow: 'arcgis-coordinate-conversion',
            selector: ['#arcgis-coordinate-conversion-list-item-0 > div'],
			ifinnerText: true,
            processCoordinates: lonlat,
        },
        'nsp.tcd.gov.tw': {
            name: 'Pingtung GIS MAP',
            selector: ['#info'],
            processCoordinates: pingtunggis,
        },
        'map.taitung.gov.tw': {
            name: 'Taitung Map',
            selector: ['td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable'],
            processCoordinates: gismap,
        },
        'map.hl.gov.tw': {
            name: 'Hualien GIS Map',
            ifframe: ['iframe', 0],
            selector: ['#twd97'],
            ifinnerText: true,
            copier: '#twd97Status',
            processCoordinates: TWD97UTM,
        },
        'upgis.klcg.gov.tw': {
            name: 'Keelung Urban Planning GIS',
			ifframe: ['frame', 2],
            selector: ['#coordShow'],
            ifinnerText: true,
            processCoordinates: keelunggis,
        },
        'urban.kinmen.gov.tw': {
            name: 'Kinmen Map Service',
            selector: ['#info a:nth-of-type(2)'], // 查找包含 WGS84 經緯度的 <a> 標籤
            processCoordinates: lonlat,
        },
    };

    const siteInfo = sites[hostname];
    if (!siteInfo) {
        console.error('This website is not supported. Please check the site name.');
    }
    return siteInfo || null; // 如果網站不存在於列表中，返回 null
}

// Get coordinates text from DOM based on the selector
function getCoordinatesText(ifframe, shadow, selector, ifinnerText) {
    // 根據是否有 ifframe 或 shadow，選擇適當的元素
    const elements = ifframe 
        ? document.getElementsByTagName(ifframe[0])[ifframe[1]].contentDocument.querySelectorAll(selector[0])
        : shadow
		    ? document.querySelector(shadow).shadowRoot.querySelectorAll(selector[0])
			: document.querySelectorAll(selector[0]);
    
    if (elements.length === 0) {
        console.error(`No elements found for selector: ${selector}`);
        return null;
    }

    // 如果 selector[1] 存在，處理多選擇器的情況
    if (selector[1]) {
        if (Array.isArray(selector[1])) {
            // 如果 selector[1] 是一個陣列，選取對應的多個元素
            return selector[1].map(index => elements[index].textContent.trim());
        }
        // 否則返回單個指定索引的元素
        return elements[selector[1]].textContent;
    }

    // 根據 ifinnerText 標識選擇不同的文本處理
    if (ifinnerText) {
        return elements[0].innerText;
    }

    // 返回單一或多個元素的文本內容
    return elements.length === 1
        ? elements[0].textContent.trim()  // 單個元素
        : Array.from(elements).map(el => el.textContent.trim());  // 多個元素
}

// 解析 TWD97 XY 座標獨立格式的函數
function TWD97XY(coordinatesText) {
    const coordText = { x: parseFloat(coordinatesText[0]), y: parseFloat(coordinatesText[1]) };
    return coordText ? geo.TWD97toWGS84(coordText) : null;
}

// LonLat 通用解析經緯度座標的函數
function parseLonLat(coordinatesText, regex) {
    const match = coordinatesText.match(regex);
    if (match) {
        return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
    return null;
}

// 解析經緯座標格式的函數
function latlon(coordinatesText) {
    const regex = /(\d+(?:\.\d+)?)(?:N)?[\s,]+(\d+(?:\.\d+)?)(?:E)?/;
    const match = coordinatesText.match(regex);

    if (match) {
        return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    return null;
}

function lonlat(coordinatesText) {
    const regex = /(-?\d+\.\d+)\s*°?\s*,\s*(-?\d+\.\d+)\s*°?/;
    return parseLonLat(coordinatesText, regex);
}

// 玉山國家公園的座標解析函數
function yushanCoordinates(coordinatesText) {
    const regex = /\[經度\]：\s*(-?\d+\.\d+)\s+\[緯度\]：\s*(-?\d+\.\d+)/;
    return parseLonLat(coordinatesText, regex);
}

// TWD97 通用解析座標函數
function parseTWD97Coordinates(coordinatesText, regex) {
    const match = coordinatesText.match(regex);
    if (match) {
        const coordText = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        return geo.TWD97toWGS84(coordText);
    }
    return null;
}

// 解析 TWD97 座標格式的函數
function TWD97UTM(coordinatesText) {
    const regex = /(\d+\.\d+)\s*,\s*(\d+\.\d+)/;
    return parseTWD97Coordinates(coordinatesText, regex);
}

// 解析高雄地籍圖資服務網座標格式的函數
function landeasy(coordinatesText) {
    const regex = /\((\d+\.\d+)\s*,\s*(\d+\.\d+)\)/;
    return parseTWD97Coordinates(coordinatesText, regex);
}

// 解析城鄉資訊相關平台座標格式的函數
function urplanning(coordinatesText) {
    const regex = /X97[:\s]*([0-9.]+)\s*[, ]*\s*Y97[:\s]*([0-9.]+)/;
    return parseTWD97Coordinates(coordinatesText, regex);
}

// 解析屏東縣地理圖資整合系統座標格式的函數
function pingtunggis(coordinatesText) {
    const regex = /TWD97[:\s]*(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    return parseTWD97Coordinates(coordinatesText, regex);
}

// 解析基隆市都市計畫書圖查詢座標格式的函數
function keelunggis(coordinatesText) {
    const regex = /\(TWD97\)[\s]*(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    return parseTWD97Coordinates(coordinatesText, regex);
}

// 解析 GIS 相關平台座標格式的函數
function gismap(coordinatesText) {
    const regex = /X:(-?\d+\.\d+)\s*Y:(-?\d+\.\d+)/;
    const match = coordinatesText.match(regex);
    const coordText = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    // 檢查文本是否包含 "97二度121分帶"
    if (coordinatesText.includes('97AUTO:121分帶') || coordinatesText.includes('97二度121') || coordinatesText.includes('TWD97 二度分帶')) {
        return geo.TWD97toWGS84(coordText);
    // 檢查文本是否包含 "WGS84經緯度"
    } else if (coordinatesText.includes('WGS84經緯度')) {
        return { lon: coordText.x, lat: coordText.y };
    // 不支援的格式
    } else {
        alert(
            'The selected coordinates format are not supported. Please change the settings in the lower left corner.',
        );
    }
    return null;
}

// Copy coordinates to clipboard
async function copyCoordinates(coord) {
    try {
        // 透過函數讀取 offset 的狀態
        const offsetValue = await getOffsetValue();
        // 根據 offsetValue 進行不同的處理
        let text = await processOffset(coord, offsetValue);
        // 將座標複製到剪貼簿
        await navigator.clipboard.writeText(text);
		
		let note = ``;
		if (offsetValue === 'latlon') {
			note = `(Lat/Lon offset applied) `;
		} else if (offsetValue === 'btexz') {
			note = `(BTE offset applied) `;
		}
		
		alert(`Coordinates "${text}"\n${note}copied to clipboard!`);
    } catch (err) {
        console.error('Failed to copy coordinates: ', err);
    }
}

// 根據 offsetValue 進行不同的處理
async function processOffset(coord, offsetValue) {
    if (offsetValue === 'latlon') {
		console.log(`Original coordinates (WGS84): ${coord.lat}, ${coord.lon}`);
        const offsetCoord = await applyLatLonOffset(coord);
		const text = `${offsetCoord.lat}, ${offsetCoord.lon}`
        console.log('Lat/Lon offset:', text);
        return text;
    } else if (offsetValue === 'btexz') {
		console.log(`Original coordinates (WGS84): ${coord.lat}, ${coord.lon}`);
        const offsetCoord = await applyBTEOffset(coord);
		const text = `${offsetCoord.lat}, ${offsetCoord.lon}`
        console.log('BTE Taiwan offset:', text);
        return text;
    }
	const text = `${coord.lat}, ${coord.lon}`
    console.log('Current Coordinates (WGS84):', text);
    return text;  // 無偏移
}

// 應用 Lat/Lon 偏移的邏輯
function applyLatLonOffset(coord) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['fromInput', 'toInput'], function (result) {
            const fromOffset = (result.fromInput.length === 1)
                ? [0, 0]
                : result.fromInput;
            const toOffset = (result.toInput.length === 1)
                ? [0, 0]
                : result.toInput;

            let offset = { lat: coord.lat - fromOffset[0] + toOffset[0], lon: coord.lon - fromOffset[1] + toOffset[1] };
            resolve(offset); // 非同步完成後將結果傳回
        });
    });
}

// 應用 BTE 偏移的邏輯
function applyBTEOffset(coord) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['xInput', 'zInput'], function (result) {
            const xOffset = result.xInput || 0;
            const zOffset = result.zInput || 0;

            let mccoord = BTE_PROJECTION.fromGeo(coord);
            let offset = { x: mccoord.x - xOffset, y: mccoord.y - zOffset };
            resolve(BTE_PROJECTION.toGeo(offset)); // 非同步完成後將結果傳回
        });
    });
}
