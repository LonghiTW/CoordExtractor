// 監聽快捷鍵 Alt + C
document.addEventListener('keydown', function(event) {
    // 如果是 Alt + C
    if (event.altKey && event.key === 'c') {
        // 使用判斷網站的函數來獲取當前網站的元素選擇器和座標解析邏輯
        const siteInfo = getSiteInfo(window.location.hostname);
       
        if (siteInfo && typeof siteInfo.processCoordinates === 'function') {
            // 擷取 WGS84 經緯度文本並顯示
            const coordinatesText = getCoordinatesText(siteInfo.selector);
            
            // 嘗試解析座標並處理
            if (coordinatesText) {
                const parsedCoord = siteInfo.processCoordinates(coordinatesText);
                if (parsedCoord) {
                    copyCoordinates(parsedCoord);
                } else {
                    console.error(`Unable to parse coordinates from ${siteInfo.name}.`);
                }
            } else {
                console.error(`Coordinates element not found on ${siteInfo.name}.`);
            }
        } else {
            console.error(`No valid processCoordinates function found for ${window.location.hostname}.`);
        }
    }
}, true);

// 判斷當前網站並返回相關資訊的函數
function getSiteInfo(hostname) {
    const sites = {
        'www.google.com': {
            name: 'Google Maps',
            selector: '.fxNQSd',
            processCoordinates: latlon,
        },
        'www.bing.com': {
            name: 'Bing Maps',
            selector: '.actionText', // '.secTextLink[data-tag="secTextLink"]'
            processCoordinates: latlon,
        },
        'yandex.com': {
            name: 'Yandex Maps',
            selector: '.toponym-card-title-view__coords-badge', // '.clipboard__help'
            processCoordinates: latlon,
        },
        'maps.nlsc.gov.tw': {
            name: 'Taiwan Map Service',
            selector: '.ol-mouse-position',
            processCoordinates: lonlat,
        },
        '3dmaps.nlsc.gov.tw': {
            name: 'Taiwan 3D Map Service',
            selector: '.pg-TableType1RightContent',
            processCoordinates: latlon,
        },
        'gis.ardswc.gov.tw': {
            name: 'BigGIS',
            selector: '#Cursor_Coord',
            processCoordinates: latlon,
        },
        'ysnp.3dgis.tw': {
            name: 'Yushan National Park',
            selector: '#statusbar',
            processCoordinates: yushanCoordinates,
        },
        'urban.planning.ntpc.gov.tw': {
            name: 'Ntpc Urban and Rural Info',
            selector: '.map-info-block.coord-twd97',
            processCoordinates: urplanning,
        },
        'urplanning.tycg.gov.tw': {
            name: 'Taoyuan GIS Map',
            selector: '.map-info-block.coord-twd97',
            processCoordinates: urplanning,
        },
        'tymap.tycg.gov.tw': {
            name: 'Taoyuan Topomap',
            selector: '.map-info-block.coord-twd97',
            processCoordinates: urplanning,
        },
        'gismap.taichung.gov.tw': {
            name: 'Taichung GIS Map',
            selector: 'td.omg-statusbar-footbar-btn.omg-statusbar-foot-mousePosition.ol-unselectable',
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
                    return 'td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable';
                } else if (path.includes('landeasy')) {
                    // 高雄地籍圖資服務網
                    return '#mouseInfo';
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
            selector: '#txtX, #txtY',
            processCoordinates: TWD97XY,
        },
        'urbangis.hccg.gov.tw': {
            name: 'Hsinchu Urban Planning MAP',
            selector: 'small[data-v-79d61da6]',
            processCoordinates: urplanning,
        },
        'nsp.tcd.gov.tw': {
            name: 'Pingtung GIS MAP',
            selector: '#info',
            processCoordinates: pingtunggis,
        },
        'map.taitung.gov.tw': {
            name: 'Taitung Map',
            selector: 'td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable',
            processCoordinates: gismap,
        },
        'map.hl.gov.tw': {
            name: 'Hualien GIS Map',
            selector: '#twd97Status',
            processCoordinates: TWD97UTM,
        },
        'upgis.klcg.gov.tw': {
            name: 'Keelung Urban Planning GIS',
            selector: '#coordShow',
            processCoordinates: keelunggis,
        },
        'urban.kinmen.gov.tw': {
            name: 'Kinmen Map Service',
            selector: '#info a:nth-of-type(2)', // 查找包含 WGS84 經緯度的 <a> 標籤
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
function getCoordinatesText(selector) {
    // 使用 querySelectorAll 來選擇所有匹配的元素
    const elements = document.querySelectorAll(selector);
    // 如果找到元素
    if (elements.length > 0) {
        if (isSpecialSite(window.location.hostname)) {
            // 如果是特定網站，返回該元素的文本內容
            return elements[1].textContent.trim();
        } else if (elements.length === 1) {
            // 如果只有一個元素，返回該元素的文本內容
            return elements[0].textContent.trim();
        } else if (window.location.hostname === 'www.bing.com') {
            // 如果是 Bing Maps ，返回該元素的文本內容
            return Array.from(elements).map(el => el.textContent.trim())[8];
        } else {
            // 如果有多個元素，返回每個元素的文本內容組成的數組
            return Array.from(elements).map(el => el.textContent.trim());
        }
    } else {
        console.error(`No elements found for selector: ${selector}`);
        return null; // 如果找不到任何元素，返回 null
    }
}

// Helper to check if the site requires special handling
function isSpecialSite(hostname) {
    return hostname === 'urbangis.hccg.gov.tw' || hostname === '3dmaps.nlsc.gov.tw';
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
    const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)(?:\/度)?/;
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
