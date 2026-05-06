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
        processCoordinates: genericTWD97,
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
            return geo.TWD97toWGS84({ x, y });
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

// Google Earth Web 座標提取實作 (Original implementation by Reysun)
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
        return geo.TWD97toWGS84({ x, y });
    } else if (coordinatesText.includes('WGS84經緯度')) {
        return { lon: x, lat: y };
    } else {
        console.warn('Unsupported coordinate format on this GIS map.');
    }
    return null;
}
