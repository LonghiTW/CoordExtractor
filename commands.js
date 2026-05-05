/**
 * CoordExtractor Console 指令
 * 功能：擷取當前頁面座標並複製到剪貼簿
 * 使用方式：直接將此檔案內容貼上瀏覽器 Console
 */
(function () {
    // --- 1. 核心轉換與配置 ---
    // --- 0. 測試環境設定 (模擬擴充功能 Popup 設定) ---
    const TEST_SETTINGS = {
        includeElev: true,      // 是否包含高度
        ground: 0,              // 基準地面高度 (Alt+G 會更新此值)
        offset: 0               // 額外偏移高度
    };

    // --- 0.1 注入 UI 樣式 ---
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ce-height-outer {
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 10000;
                width: auto;
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 6px;
            }
            .ce-height-inner { display: flex; flex-direction: column; gap: 3px; }
            .ce-height-title { font-size: 0.7rem; font-weight: bold; color: #0d6efd; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 3px; text-align: center; }
            .ce-height-fields { display: flex; gap: 5px; }
            .ce-height-row { display: flex; flex-direction: column; flex: 1; align-items: center; }
            .ce-height-label { font-size: 0.65rem; color: #666; margin-bottom: 1px; text-align: center; }
            .ce-height-input { width: 50px; padding: 2px 4px; font-size: 0.8rem; border: 1px solid #ddd; border-radius: 4px; outline: none; text-align: right; }
            .ce-height-input:focus { border-color: #0d6efd; }
        `;
        document.head.appendChild(style);
    }
    injectStyles();

    const geo_utils = {
        toRadians: (d) => d * Math.PI / 180,
        toDegrees: (r) => r * 180 / Math.PI,
        TWD97toWGS84(coord97) {
            let easting = coord97.x, northing = coord97.y;
            let relativeX = easting - 250000, long0 = this.toRadians(121), k0 = 0.9999;
            let Equatorial_Radius = 6378137, Flattening = 1 / 298.257222101;
            let e_abf = Math.sqrt(Flattening * (2 - Flattening)), e_2 = e_abf * e_abf;
            let Meridional_Arc = northing / k0;
            let mu = Meridional_Arc / Equatorial_Radius / (1 - e_2 / 4 - 3 * (e_2 ** 2) / 64 - 5 * (e_2 ** 3) / 256);
            let e1 = Flattening / (2 - Flattening);
            let J1 = (1.5 * e1 - 27 / 32 * e1 ** 3);
            let J2 = (21 / 16 * e1 ** 2 - 55 / 32 * e1 ** 4);
            let J3 = (151 / 96 * e1 ** 3);
            let J4 = (1097 / 512 * e1 ** 4);
            let fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);
            let ee2 = e_2 / (1 - e_2);
            let C1 = ee2 * Math.cos(fp) ** 2, T1 = Math.tan(fp) ** 2;
            let ess = Math.sqrt(1 - e_2 * Math.sin(fp) ** 2), N1 = Equatorial_Radius / ess, R1 = Equatorial_Radius * (1 - e_2) / ess ** 3;
            let D = relativeX / N1 / k0;
            let latR = fp - (N1 * Math.tan(fp) / R1) * (D ** 2 / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ee2) * D ** 4 / 24);
            let lonR = long0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ee2 + 24 * T1 ** 2) * D ** 5 / 120) / Math.cos(fp);
            return { lat: this.toDegrees(latR), lon: this.toDegrees(lonR) };
        }
    };

    // --- 2. 座標處理邏輯 (對應 config.js) ---
    function latlon(coordinatesText) {
        const regex = /(\d+(?:\.\d+)?)(?:N)?[\s,]+(\d+(?:\.\d+)?)(?:E)?/;
        const match = coordinatesText.match(regex);
        if (match) {
            return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
        }
        return null;
    }

    function lonlat(coordinatesText) {
        // 預處理：移除中文字標籤、括號、度符號(°)與多餘空白
        const clean = coordinatesText.replace(/[\[\]經緯度：:°\s]/g, ' ');
        // 尋找兩個數值（支援整數或浮點數），第一個視為 Lon，第二個視為 Lat
        const regex = /(-?\d+(?:\.\d+)?).*?(-?\d+(?:\.\d+)?)/;
        const match = clean.match(regex);
        if (match) {
            return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
        }
        return null;
    }

    function genericTWD97(coordinatesText) {
        // 預處理：將緊黏著數字的 X97, Y97, TWD97 替換為空白，強制把它們與真正的座標值隔開
        const preprocessed = coordinatesText.replace(/(TWD97|X97|Y97|X:|Y:)/gi, ' ');
        // TWD97 座標(公尺)至少為五位數(X通常十萬起跳，Y百萬起跳)
        // 加上 (?:^|[^\d.]) 邊界判斷，防止誤抓小數點後面的數字 (如 120.313112 的 313112)
        const regex = /(?:^|[^\d.])(-?\d{5,}(?:\.\d+)?).*?(?:^|[^\d.])(-?\d{5,}(?:\.\d+)?)/;
        const match = preprocessed.match(regex);
        if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            if (!isNaN(x) && !isNaN(y)) {
                return geo_utils.TWD97toWGS84({ x, y });
            }
        }
        return null;
    }

    function googleEarthOnLoad() {
        let attempts = 0;
        const interval = setInterval(() => {
            const btn = document.querySelector('flt-semantics-placeholder[aria-label="Enable accessibility"]');
            if (btn) {
                btn.click();
                clearInterval(interval);
            }
            if (++attempts > 10) clearInterval(interval);
        }, 500);
    }

    function googleEarthExtractor(root) {
        const nodes = root.querySelectorAll('flt-semantics');
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        const targetNodes = Array.from(nodes).filter(node => {
            const rect = node.getBoundingClientRect();
            return rect.bottom > screenHeight - 50 &&
                rect.right > screenWidth - 200 &&
                rect.width > 10 &&
                rect.height < 30 &&
                Array.from(node.querySelectorAll('span')).some(span => span.textContent.trim().length > 0) &&
                !node.querySelector('flt-semantics');
        });

        if (targetNodes.length > 0) {
            // 抓取座標文字與高度文字
            const latlonSpan = targetNodes[0].querySelector('span');
            const elevSpan = targetNodes.length > 1 ? targetNodes[1].querySelector('span') : null;

            const latlonText = latlonSpan ? latlonSpan.textContent.trim() : "";
            const elevText = elevSpan ? elevSpan.textContent.trim() : "";

            // 將兩者組合回傳，由 processCoordinates 進行拆解
            return latlonText + (elevText ? " | " + elevText : "");
        }
        return null;
    }

    function googleEarthCoordinates(text) {
        const parts = text.split(' | ');
        const latlonText = parts[0];
        const elevText = parts.length > 1 ? parts[1] : "";

        // 解析高度資訊
        let elev = null;
        if (elevText) {
            const elevMatch = elevText.match(/-?\d+(?:\.\d+)?/);
            if (elevMatch) {
                elev = parseFloat(elevMatch[0]);
            }
        }

        // 解析緯度 (N/S) 與經度 (E/W) 支援 十進位度數、度分、度分秒
        const latRegex = /(\d+(?:\.\d+)?)°\s*(?:(\d+(?:\.\d+)?)')?\s*(?:(\d+(?:\.\d+)?)[”"″])?\s*([NS])/i;
        const lonRegex = /(\d+(?:\.\d+)?)°\s*(?:(\d+(?:\.\d+)?)')?\s*(?:(\d+(?:\.\d+)?)[”"″])?\s*([EW])/i;

        const latMatch = latlonText.match(latRegex);
        const lonMatch = latlonText.match(lonRegex);

        if (latMatch && lonMatch) {
            const parseDMS = (m) => {
                let deg = parseFloat(m[1] || 0);
                let min = parseFloat(m[2] || 0);
                let sec = parseFloat(m[3] || 0);
                let dir = m[4].toUpperCase();
                let decimal = deg + (min / 60) + (sec / 3600);
                return (dir === 'S' || dir === 'W') ? -decimal : decimal;
            };
            return { lat: parseDMS(latMatch), lon: parseDMS(lonMatch), elev: elev };
        }

        // 若未符合 N/S/E/W 格式，退回純數字提取 (預設前緯後經)
        let latSign = latlonText.includes('S') ? -1 : 1;
        let lonSign = latlonText.includes('W') ? -1 : 1;
        const clean = latlonText.replace(/[^0-9.\-]/g, ' ').trim();
        const fallbackRegex = /(-?\d+(?:\.\d+)?).*?(-?\d+(?:\.\d+)?)/;
        const fallbackMatch = clean.match(fallbackRegex);
        if (fallbackMatch) {
            return { lat: parseFloat(fallbackMatch[1]) * latSign, lon: parseFloat(fallbackMatch[2]) * lonSign, elev: elev };
        }

        return null;
    }

    function gismap(coordinatesText) {
        const regex = /X:(-?\d+\.\d+)\s*Y:(-?\d+\.\d+)/;
        const match = coordinatesText.match(regex);
        if (!match) return null;

        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (isNaN(x) || isNaN(y)) return null;

        if (coordinatesText.includes('97AUTO:121分帶') || coordinatesText.includes('97二度121') || coordinatesText.includes('TWD97 二度分帶')) {
            return geo_utils.TWD97toWGS84({ x, y });
        } else if (coordinatesText.includes('WGS84經緯度')) {
            return { lon: x, lat: y };
        } else {
            console.warn('Unsupported coordinate format on this GIS map.');
        }
        return null;
    }

    // --- 3. 網站配置字典 ---
    const sites_config = {
        'earth.google.com': {
            name: 'Google Earth Web',
            onLoad: googleEarthOnLoad,
            customExtractor: googleEarthExtractor,
            processCoordinates: googleEarthCoordinates,
            height: true
        },
        'www.google.com': {
            name: 'Google Maps',
            copier: '.fxNQSd',
            processCoordinates: latlon
        },
        'www.bing.com': {
            name: 'Bing Maps',
            selector: ['span.alwaysLtr_CVy2G'],
            copier: '.secTextLink[data-tag="secTextLink"]',
            processCoordinates: latlon
        },
        'yandex.com': {
            name: 'Yandex Maps',
            selector: ['.toponym-card-title-view__coords-badge'],
            copier: '.clipboard__help',
            processCoordinates: latlon
        },
        'maps.nlsc.gov.tw': {
            name: 'Taiwan Map Service',
            selector: ['.ol-mouse-position'],
            ifinnerText: true,
            processCoordinates: lonlat
        },
        '3dmaps.nlsc.gov.tw': {
            name: 'Taiwan 3D Map Service',
            ifframe: ['frame', 0],
            selector: ['.pg-TableType1RightContent', [5, 4]],
            processCoordinates: genericTWD97
        },
        'gis.ardswc.gov.tw': {
            name: 'BigGIS',
            selector: ['#Cursor_Coord'],
            processCoordinates: latlon
        },
        'ysnp.3dgis.tw': {
            name: 'Yushan National Park',
            ifframe: ['iframe', 0],
            selector: ['#statusbar'],
            ifinnerText: true,
            processCoordinates: lonlat
        },
        '3dmap.ymsnp.gov.tw': {
            name: 'Yangmingshan National Park',
            selector: ['#coord'],
            ifinnerText: true,
            processCoordinates: lonlat
        },
        'urban.planning.ntpc.gov.tw': {
            name: 'Ntpc Urban and Rural Info',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: genericTWD97
        },
        'urplanning.tycg.gov.tw': {
            name: 'Taoyuan GIS Map',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: genericTWD97
        },
        'tymap.tycg.gov.tw': {
            name: 'Taoyuan Topomap',
            selector: ['.map-info-block.coord-twd97'],
            processCoordinates: genericTWD97
        },
        'gismap.taichung.gov.tw': {
            name: 'Taichung GIS Map',
            selector: ['td.omg-statusbar-footbar-btn.omg-statusbar-foot-mousePosition.ol-unselectable'],
            processCoordinates: gismap
        },
        'gisdawh.kcg.gov.tw': {
            name: (function () {
                const path = window.location.pathname;
                if (path.includes('kcmap')) return 'Kaohsiung City Government I-MAP';
                if (path.includes('landeasy')) return 'Kaohsiung LandEasy';
                return 'Kaohsiung GIS';
            })(),
            selector: (function () {
                const path = window.location.pathname;
                // 高雄地圖網(舊版)
                if (path.includes('kcmap2')) return ['td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable'];
                // 高雄地圖網
                if (path.includes('kcmap')) return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(12) > div.mousePosition > span > div'];
                // 高雄地籍圖資服務網(舊版)
                if (path.includes('landeasy/page.cfm')) return ['#mouseInfo'];
                // 高雄地籍圖資服務網
                if (path.includes('landeasy')) return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(37) > div.mousePosition > span > div'];
                return [];
            })(),
            ifinnerText: (function () {
                const path = window.location.pathname;
                // 高雄地圖網(舊版)
                if (path.includes('kcmap2')) return false;
                // 高雄地籍圖資服務網(舊版)
                if (path.includes('landeasy/page.cfm')) return false;
                return true;
            })(),
            processCoordinates: (function () {
                const path = window.location.pathname;
                // 高雄地圖網(舊版)
                if (path.includes('kcmap2')) return gismap;
                // 高雄地籍圖資服務網(舊版)
                if (path.includes('landeasy/page.cfm')) return genericTWD97;
                return latlon;
            })(),
        },
        'urbangis.kcg.gov.tw': {
            name: 'Kaohsiung Urban Planning MAP',
            selector: ['#txtX, #txtY'],
            processCoordinates: genericTWD97
        },
        'urbangis.hccg.gov.tw': {
            name: 'Hsinchu Urban Planning MAP',
            selector: ['small[data-v-79d61da6]', 1],
            processCoordinates: genericTWD97
        },
        '3dgis.hccg.gov.tw': {
            name: 'Hsinchu Urban Planning 3D MAP',
            selector: ['div[data-v-f2982cfb]', 1],
            processCoordinates: genericTWD97
        },
        'urbangis.chcg.gov.tw': {
            name: 'Changhua Urban Planning GIS MAP',
            selector: ['div.map-info-block.map-info-coord-block.coord-twd97'],
            processCoordinates: genericTWD97
        },
        'map.yunlin.gov.tw': {
            name: 'Yunlin GIS MAP',
            shadow: 'arcgis-coordinate-conversion',
            selector: ['div.result-accordion__row', -1],
            processCoordinates: genericTWD97
        },
        'nsp.tcd.gov.tw': {
            name: 'Pingtung GIS MAP',
            selector: ['#info'],
            processCoordinates: genericTWD97
        },
        'map.taitung.gov.tw': {
            name: 'Taitung Map',
            selector: ['td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable'],
            processCoordinates: gismap
        },
        'map.hl.gov.tw': {
            name: 'Hualien GIS Map',
            ifframe: ['iframe', 0],
            selector: ['#twd97'],
            ifinnerText: true,
            copier: '#twd97Status',
            processCoordinates: genericTWD97
        },
        'upgis.klcg.gov.tw': {
            name: 'Keelung Urban Planning GIS',
            ifframe: ['frame', 2],
            selector: ['#coordShow'],
            ifinnerText: true,
            processCoordinates: genericTWD97
        },
        'urban.kinmen.gov.tw': {
            name: 'Kinmen Map Service',
            selector: ['#info a:nth-of-type(2)'],
            processCoordinates: lonlat
        },
    };

    // --- 4. 測試執行邏輯 ---
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

    function handleSetGround() {
        const host = window.location.hostname;
        const config = sites_config[host];
        if (!config) return;

        const text = getCoordinatesText(config);
        if (!text) return;
        const cleanText = text.replace(/[\u200E\u200F]/g, '');
        const result = config.processCoordinates(cleanText);

        if (result && result.elev !== undefined && result.elev !== null) {
            const ground = Math.round(result.elev);
            TEST_SETTINGS.ground = ground;

            // 更新 UI
            const groundInput = document.getElementById('ce-ground');
            if (groundInput) groundInput.value = ground;

            console.log(`%c[CoordExtractor] 已更新基準地面高度 (Ground): ${ground}m`, 'color: #ff00ff; font-weight: bold;');
        }
    }

    function initHeightUI(config) {
        if (!config || !config.height) return;
        if (document.querySelector('.ce-height-outer')) return;

        const outer = document.createElement('div');
        outer.className = 'ce-height-outer';

        const inner = document.createElement('div');
        inner.className = 'ce-height-inner';

        const title = document.createElement('div');
        title.className = 'ce-height-title';
        title.innerText = 'Elevation Settings';

        const createRow = (labelStr, id, defaultVal) => {
            const row = document.createElement('div');
            row.className = 'ce-height-row';
            const label = document.createElement('label');
            label.className = 'ce-height-label';
            label.innerText = labelStr;
            const input = document.createElement('input');
            input.className = 'ce-height-input';
            input.type = 'number';
            input.id = id;
            input.value = defaultVal;
            row.appendChild(label);
            row.appendChild(input);
            return row;
        };

        const groundRow = createRow('Ground (m)', 'ce-ground', TEST_SETTINGS.ground);
        const offsetRow = createRow('Offset (m)', 'ce-offset', TEST_SETTINGS.offset);

        const fields = document.createElement('div');
        fields.className = 'ce-height-fields';
        fields.appendChild(groundRow);
        fields.appendChild(offsetRow);

        inner.appendChild(title);
        inner.appendChild(fields);
        outer.appendChild(inner);
        document.body.appendChild(outer);
    }

    function runTest() {
        const host = window.location.hostname;
        const config = sites_config[host];
        if (!config) {
            console.error(`[CoordExtractor] 此網站 (${host}) 尚未在腳本中定義。`);
            return;
        }

        const text = getCoordinatesText(config);
        if (!text) {
            console.error(`[CoordExtractor] 找不到元素或無法擷取文字。`);
            return;
        }

        // --- 強制輸出原始擷取到的文字，方便除錯 ---
        console.log(`%c[CoordExtractor Raw Text] 擷取到的原始文字:`, 'color: #ff9900; font-weight: bold;', text);

        const cleanText = text.replace(/[\u200E\u200F]/g, '');
        const result = config.processCoordinates(cleanText);

        if (result) {
            // 從 UI 讀取最新數值
            const uiGround = parseFloat(document.getElementById('ce-ground')?.value || TEST_SETTINGS.ground);
            const uiOffset = parseFloat(document.getElementById('ce-offset')?.value || TEST_SETTINGS.offset);

            let baseElev = result.elev || 0;
            let processedElev = baseElev;
            let finalElev = baseElev;
            let note = "";

            if (TEST_SETTINGS.includeElev && result.elev !== undefined) {
                finalElev = Math.round(baseElev + uiOffset);
                note = ` (高度: ${finalElev}m, Offset: ${uiOffset}m)`;
            }

            // 格式化輸出
            let outputParts = [];
            outputParts.push(result.lat);
            outputParts.push(result.lon);

            if (TEST_SETTINGS.includeElev && result.elev !== undefined) {
                outputParts.push(finalElev);
            }

            const output = outputParts.join(' ');
            console.log(`%c[CoordExtractor] 成功擷取 (${config.name}): ${output}${note}`, 'color: #00ff00; font-weight: bold;');

            // 使用標準 Clipboard API 寫入剪貼簿
            navigator.clipboard.writeText(output).then(() => {
                alert(`網站：${config.name}\n結果：${output}\n${note}\n已複製到剪貼簿。`);
            }).catch(err => {
                console.error('[CoordExtractor] 無法寫入剪貼簿:', err);
                alert(`網站：${config.name}\n結果：${output}\n(請手動複製，因剪貼簿權限受限)`);
            });
        } else {
            console.error(`[CoordExtractor] 座標解析失敗。擷取到的文字為:`, text);
        }
    }

    // 綁定鍵盤事件
    window.addEventListener('keydown', (e) => {
        if (e.altKey) {
            if (e.key.toLowerCase() === 'c') runTest();
            if (e.key.toLowerCase() === 'g') handleSetGround();
        }
    }, { capture: true });

    // 若有 iframe，也在 iframe 內綁定
    const host = window.location.hostname;
    const config = sites_config[host];
    if (config && config.ifframe) {
        const [tagName, index] = config.ifframe;
        const frame = document.getElementsByTagName(tagName)[index];
        if (frame) {
            const attachListener = () => {
                try {
                    const frameDoc = frame.contentDocument;
                    if (frameDoc) {
                        frameDoc.addEventListener('keydown', (e) => {
                            if (e.altKey) {
                                if (e.key.toLowerCase() === 'c') runTest();
                                if (e.key.toLowerCase() === 'g') handleSetGround();
                            }
                        }, { capture: true });
                    }
                } catch (e) { }
            };
            if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
                attachListener();
            } else {
                frame.onload = attachListener;
            }
        }
    }

    if (config && config.onLoad) {
        config.onLoad();
    }

    initHeightUI(config);

    console.log('%c[CoordExtractor] 指令腳本已載入。在頁面上按 Alt + C 擷取座標。', 'color: #00bfff; font-weight: bold;');
})();
