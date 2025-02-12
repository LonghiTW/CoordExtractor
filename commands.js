const hostname = window.location.hostname;
const siteInfo = getSiteInfo(hostname);

if (siteInfo.ifframe) {
    // 確保 frame 元素存在
    const frameElement = document.getElementsByTagName(siteInfo.ifframe[0])[0];

    if (frameElement) {
        try {
            // 直接訪問 frame 的 contentDocument
            const frameDoc = frameElement.contentDocument;

            // 確保 frame 內部文檔存在
            if (frameDoc) {
                // 先綁定 keydown 事件
                frameDoc.addEventListener('keydown', (event) => handleKeydown(event, siteInfo));
                console.log('Keydown event listener added to frame.');
            }
        } catch (e) {
            console.error('Cannot access frame content:', e);
        }
    }
} else {
    document.addEventListener('keydown', (event) => handleKeydown(event, siteInfo), true);
}

// Handle keyboard event for Alt + C
function handleKeydown(event, siteInfo) {
    if (event.altKey && event.key === 'c') {
        // 使用判斷網站的函數來獲取當前網站的元素選擇器和座標解析邏輯
        if (siteInfo && typeof siteInfo.processCoordinates === 'function') {
            // 擷取 WGS84 經緯度文本並顯示
            const coordinatesText = getCoordinatesText(siteInfo.ifframe, siteInfo.selector, siteInfo.ifinnerText);
            // 嘗試解析座標並處理
            if (coordinatesText) {
                processClipboardText(coordinatesText, siteInfo);  // 使用 processClipboardText 處理座標
            } else {
                console.error(`Coordinates element not found for ${siteInfo.name}.`);
            }
        } else {
            console.error(`No valid processCoordinates function found for ${hostname}.`);
        }
    }
}

// Process clipboard text and handle coordinates
function processClipboardText(text, siteInfo) {
    const parsedCoord = siteInfo.processCoordinates(text);
    if (parsedCoord) {
        copyCoordinates(parsedCoord);
    } else {
        console.error(`Unable to parse coordinates from ${siteInfo.name}.`);
    }
}

// 判斷當前網站並返回相關資訊的函數
function getSiteInfo(hostname) {
    const sites = {
        'www.google.com': {
            name: 'Google Maps',
            copier: '.fxNQSd',
            processCoordinates: latlon,
        },
        'www.bing.com': {
            name: 'Bing Maps',
            selector: ['.actionText', 8],
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
                if (path.includes('kcmap')) {
                    // 高雄地圖網
                    return ['td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable'];
                } else if (path.includes('landeasy')) {
                    // 高雄地籍圖資服務網
                    return ['#mouseInfo'];
                }
            })(),    
            processCoordinates: (function () {
                const path = window.location.pathname;
                if (path.includes('kcmap')) {
                    // 高雄地圖網
                    return gismap;
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

// 根據選擇器獲取座標文本的函數
function getCoordinatesText(ifframe, selector, ifinnerText) {
    // 根據是否有 ifframe，選擇適當的元素
    const elements = ifframe 
        ? document.getElementsByTagName(ifframe[0])[ifframe[1]].contentDocument.querySelectorAll(selector[0])
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
    return coordText ? TWD97toWGS84(coordText) : null;
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
    const regex = /(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)(?:\/度)?/;
    const match = coordinatesText.match(regex);

    if (match) {
        return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    return null;
}

function lonlat(coordinatesText) {
    const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
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
        return TWD97toWGS84(coordText);
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
    const regex = /X97[:\s]*(-?\d+\.\d+)[,\s]+Y97[:\s]*(-?\d+\.\d+)/;
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
        return TWD97toWGS84(coordText);
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

// 處理複製座標的邏輯
function copyCoordinates(coord) {
    let text = `${coord.lat}, ${coord.lon}`;
    console.log("Current Coordinates (WGS84):", text);

    // 將座標複製到剪貼簿
    navigator.clipboard.writeText(text)
        .then(() => {
            alert(`Coordinates "${text}" copied to clipboard!`);
        })
        .catch(err => {
            console.error('Failed to copy coordinates: ', err);
        });
};

// Mathematical calculations
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
    return (radians * 180) / Math.PI;
}

// TWD97 UTM to WGS84 Latitude and Longitude
    /**
     * CONVERTING UTM TO LATITUDE AND LONGITUDE (OR VICE VERSA)
     * https://fypandroid.wordpress.com/2011/09/03/converting-utm-to-latitude-and-longitude-or-vice-versa/
     *
     * 測繪資訊成果供應管理系統(原內政部地政司衛星測量中心)
     * https://gps.moi.gov.tw/sscenter/introduce/IntroducePage.aspx?Page=GPS9
     */
function TWD97toWGS84(coord97) {
    // Symbols
    let easting = coord97.x;
    let relativeX = easting - 250000; // x (relative to the central meridian)
    let northing = coord97.y;
    let long0 = toRadians(121); // central meridian of zone
    let k0 = 0.9999; // scale along long_0
    let Equatorial_Radius = 6378137; // in meters
    let Flattening = 1 / 298.257222101;
    let e_abf = Math.sqrt(Flattening * (2 - Flattening));
    let e_2 = e_abf * e_abf;
    let e_4 = e_abf * e_abf * e_abf * e_abf;
    let e_6 = e_abf * e_abf * e_abf * e_abf * e_abf * e_abf;
    // Calculate the Meridional Arc
    let Meridional_Arc = northing / k0;
    // Calculate Footprint Latitude
    let mu = Meridional_Arc / Equatorial_Radius / (1 - e_2 / 4 - 3 * e_4 / 64 - 5 * e_6 / 256);
    let e1 = Flattening / (2 - Flattening);
    let e1_2 = e1 * e1;
    let e1_3 = e1 * e1 * e1;
    let e1_4 = e1 * e1 * e1 * e1;
    let J1 = (1.5 * e1 - 27 / 32 * e1_3);
    let J2 = (21 / 16 * e1_2 - 55 / 32 * e1_4);
    let J3 = (151 / 96 *e1_3);
    let J4 = (1097 / 512 *e1_4);
    let fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);
    // Calculate Latitude and Longitude
    let ee2 = e_2 / (1 - e_2);
    let C1 = ee2 * Math.cos(fp) * ee2 * Math.cos(fp);
    let C1_2 = C1 * C1;
    let T1 = Math.tan(fp) * Math.tan(fp)
    let T1_2 = T1 * T1;
    let ess = Math.sqrt(1 - e_2 * Math.sin(fp) * Math.sin(fp));
    let R1 = Equatorial_Radius * (1 - e_2) / ess / ess / ess;
    let N1 = Equatorial_Radius / ess
    let D = relativeX / N1 / k0;
    let D_3 = D * D * D;
    let D_4 = D * D * D * D;
    let D_5 = D * D * D * D * D;
    let D_6 = D * D * D * D * D * D;
    let Q1 = N1 * Math.tan(fp) / R1;
    let Q2 = D * D / 2;
    let Q3 = (5 + 3 * T1 + 10 * C1 - 4 * C1_2 - 9 * ee2) * D_4 / 24;
    let Q4 = (61 + 90 * T1 + 298 * C1 + 45 * T1_2 - 3 * C1_2 - 252 * ee2) * D_6 / 720;
    let Q6 = (1 + 2 * T1 + C1) * D_3 / 6;
    let Q7 = (5 - 2 * C1 + 28 * T1 - 3 * C1_2 + 8 * ee2 + 24 * T1_2) * D_5 / 120;
    let latR = fp - Q1 * (Q2 - Q3 + Q4);
    let lonR = long0 + (D - Q6 + Q7) / Math.cos(fp);
    
    return { lat: toDegrees(latR), lon: toDegrees(lonR) };
}
