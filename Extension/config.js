const sites_config = {
    'earth.google.com': {
        name: 'Google Earth Web',
        onLoad: googleEarthOnLoad,
        customExtractor: googleEarthExtractor,
        processCoordinates: googleEarthCoordinates,
        height: true,
        processElevation: genericElevation
    },
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
        height: 'div.alwaysLtr_CVy2G',
        processElevation: genericElevation
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
        customExtractor: nlsc3DExtractor,
        processCoordinates: genericTWD97,
        processElevation: genericElevation,
        height: true
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
        processCoordinates: lonlat,
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
        processCoordinates: genericTWD97,
    },
    'urplanning.tycg.gov.tw': {
        name: 'Taoyuan GIS Map',
        selector: ['.map-info-block.coord-twd97'],
        processCoordinates: genericTWD97,
    },
    'tymap.tycg.gov.tw': {
        name: 'Taoyuan Topomap',
        selector: ['.map-info-block.coord-twd97'],
        processCoordinates: genericTWD97,
    },
    'gismap.taichung.gov.tw': {
        name: 'Taichung GIS Map',
        selector: ['td.omg-statusbar-footbar-btn.omg-statusbar-foot-mousePosition.ol-unselectable'],
        processCoordinates: gismap,
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
            if (path.includes('kcmap')) return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(13) > div.mousePosition > span > div'];
            // 高雄地籍圖資服務網(舊版)
            if (path.includes('landeasy/page.cfm')) return ['#mouseInfo'];
            // 高雄地籍圖資服務網
            if (path.includes('landeasy')) return ['#app_div > div > div.v-layout.fill-height > main > div > div:nth-child(38) > div.mousePosition > span > div'];
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
        processCoordinates: genericTWD97,
    },
    'urbangis.hccg.gov.tw': {
        name: 'Hsinchu Urban Planning MAP',
        selector: ['small[data-v-79d61da6]', 1],
        processCoordinates: genericTWD97,
    },
    '3dgis.hccg.gov.tw': {
        name: 'Hsinchu Urban Planning 3D MAP',
        selector: ['div[data-v-f2982cfb]', 1],
        processCoordinates: genericTWD97,
    },
    'urbangis.chcg.gov.tw': {
        name: 'Changhua Urban Planning GIS MAP',
        selector: ['div.map-info-block.map-info-coord-block.coord-twd97'],
        processCoordinates: genericTWD97,
    },
    'map.yunlin.gov.tw': {
        name: 'Yunlin GIS MAP',
        shadow: 'arcgis-coordinate-conversion',
        selector: ['div.result-accordion__row', -1],
        processCoordinates: genericTWD97,
    },
    'nsp.tcd.gov.tw': {
        name: 'Pingtung GIS MAP',
        selector: ['#info'],
        processCoordinates: genericTWD97,
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
        processCoordinates: genericTWD97,
    },
    'upgis.klcg.gov.tw': {
        name: 'Keelung Urban Planning GIS',
        ifframe: ['frame', 2],
        selector: ['#coordShow'],
        ifinnerText: true,
        processCoordinates: genericTWD97,
    },
    'urban.kinmen.gov.tw': {
        name: 'Kinmen Map Service',
        selector: ['#info a:nth-of-type(2)'],
        processCoordinates: lonlat,
    },
};

// --- Coordinate Processing Functions ---

function latlon(text) {
    const coordRegex = /([-+]?\d+\.\d+)\s*([NS])?\s*[,/\s]\s*([-+]?\d+\.\d+)\s*([EW])?/i;
    const match = text.match(coordRegex);

    if (match) {
        let lat = parseFloat(match[1]);
        let lon = parseFloat(match[3]);

        const ns = match[2]?.toUpperCase();
        const ew = match[4]?.toUpperCase();

        if (ns === 'S') lat = -lat;
        if (ew === 'W') lon = -lon;

        return { lat, lon };
    }
    return null;
}

function genericElevation(text) {
    if (!text) return null;
    // 優先匹配帶有公尺或m單位的數字
    const unitRegex = /(-?\d+(?:\.\d+)?)\s*(?:公尺|m)/;
    const unitMatch = text.match(unitRegex);
    if (unitMatch) return parseFloat(unitMatch[1]);

    // 若無單位，嘗試抓取純數字 (支援負數與小數)
    const pureRegex = /(-?\d+(?:\.\d+)?)/;
    const pureMatch = text.match(pureRegex);
    return pureMatch ? parseFloat(pureMatch[0]) : null;
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
    // 優先匹配 TWD97 標籤後的座標
    const twd97Regex = /\(TWD97\)\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i;
    const twd97Match = coordinatesText.match(twd97Regex);
    if (twd97Match) {
        const x = parseFloat(twd97Match[1]);
        const y = parseFloat(twd97Match[2]);
        if (!isNaN(x) && !isNaN(y)) {
            return geo.TWD97toWGS84({ x, y });
        }
    }

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
            return geo.TWD97toWGS84({ x, y });
        }
    }
    return null;
}

async function nlsc3DExtractor(root) {
    // 確保選取 TWD97 (雙重保險)
    const radio = root.getElementById('CoorDisplay-TWD97');

    if (radio && !radio.checked) {
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.dispatchEvent(new Event('input', { bubbles: true }));
        alert('已自動切換為 TWD97 座標格式，請再執行一次操作。');
        return;
    }

    const x = root.getElementById('CoorDisplay-X')?.textContent.trim() || "";
    const y = root.getElementById('CoorDisplay-Y')?.textContent.trim() || "";
    const z = root.getElementById('CoorDisplay-Z')?.textContent.trim() || "";

    return {
        coordText: `${x} ${y}`,
        elevText: z
    };
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

// Google Earth Web 座標提取實作 (Original implementation by Reysun)
function googleEarthExtractor(root) {
    const nodes = Array.from(root.querySelectorAll('flt-semantics'));
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    const targetNodes = nodes.filter(node => {
        const rect = node.getBoundingClientRect();
        const hasRealText = Array.from(node.querySelectorAll('span')).some(span => span.textContent.trim().length > 0);
        const hasChildSemantics = node.querySelector('flt-semantics');
        return rect.bottom > screenHeight - 50 &&
            rect.right > screenWidth - 200 &&
            rect.width > 10 &&
            rect.height < 30 &&
            hasRealText &&
            !hasChildSemantics;
    });

    if (targetNodes.length >= 2) {
        const coordText = targetNodes[0].querySelector('span')?.textContent.trim() || null;
        const elevText = targetNodes[1].querySelector('span')?.textContent.trim() || null;
        return { coordText, elevText };
    }

    const allText = nodes.map(node => node.textContent.trim()).join('\n');

    const coordText = allText.match(/(?:游標經緯度|Cursor latitude and longitude)[\s\S]*?(\d{1,3}\.\d+°?\s*[NS].*?\d{1,3}\.\d+°?\s*[EW])/i)?.[1] ||
        allText.match(/(\d{1,3}\.\d+°?\s*[NS].*?\d{1,3}\.\d+°?\s*[EW])/i)?.[1] ||
        allText.match(/(\d{1,3}\.\d+)\s*[NS].*?(\d{1,3}\.\d+)\s*[EW]/i)?.[0] ||
        null;

    const elevMatch = allText.match(/(?:游標相對於海平面的高度|Cursor elevation relative to sea level)[\s\S]*?(\d+(?:\.\d+)?)\s*(?:公尺|m)/i);
    const elevText = elevMatch ? `${elevMatch[1]} 公尺` :
        allText.match(/(\d+(?:\.\d+)?)\s*(?:公尺|m)/i)?.[0] ||
        null;

    return { coordText, elevText };
}

function googleEarthCoordinates(text) {
    const clean = text.replace(/[\u200E\u200F]/g, '').replaceAll('\\', '');

    const dmsRegex = /(\d{1,3})°\s*(\d+(?:\.\d+)?)'\s*(?:(\d+(?:\.\d+)?)")?\s*([NS])/i;
    const dmsLonRegex = /(\d{1,3})°\s*(\d+(?:\.\d+)?)'\s*(?:(\d+(?:\.\d+)?)")?\s*([EW])/i;
    const latDms = clean.match(dmsRegex);
    const lonDms = clean.match(dmsLonRegex);

    if (latDms && lonDms) {
        const parseDms = (m) => {
            const deg = parseFloat(m[1] || 0);
            const min = parseFloat(m[2] || 0);
            const sec = parseFloat(m[3] || 0);
            const dir = m[4].toUpperCase();
            const decimal = deg + (min / 60) + (sec / 3600);
            return (dir === 'S' || dir === 'W') ? -decimal : decimal;
        };
        return {
            lat: parseDms(latDms),
            lon: parseDms(lonDms)
        };
    }

    const decimalRegex = /([-+]?\d+\.\d+)°?\s*[NS]?[^\d\n]+([-+]?\d+\.\d+)°?\s*[EW]?/i;
    const decimalMatch = clean.match(decimalRegex);
    if (decimalMatch) {
        return {
            lat: parseFloat(decimalMatch[1]),
            lon: parseFloat(decimalMatch[2])
        };
    }

    const fallbackRegex = /(-?\d+(?:\.\d+)?).*?(-?\d+(?:\.\d+)?)/;
    const fallbackMatch = clean.match(fallbackRegex);
    if (fallbackMatch) {
        const latSign = clean.includes('S') ? -1 : 1;
        const lonSign = clean.includes('W') ? -1 : 1;
        return {
            lat: parseFloat(fallbackMatch[1]) * latSign,
            lon: parseFloat(fallbackMatch[2]) * lonSign
        };
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
        return geo.TWD97toWGS84({ x, y });
    } else if (coordinatesText.includes('WGS84經緯度')) {
        return { lon: x, lat: y };
    } else {
        console.warn('Unsupported coordinate format on this GIS map.');
    }
    return null;
}
