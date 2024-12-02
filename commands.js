// 定義 coord 物件，初始化 lat 和 lon 為 null
let coords = { lat: null, lon: null };

// 監聽快捷鍵 Alt + C
document.addEventListener('keydown', function(event) {
    // 如果是 Alt + C
    if (event.altKey && event.key === 'c') {
        // 使用判斷網站的函數來獲取當前網站的元素選擇器和座標解析邏輯
        const siteInfo = getSiteInfo(window.location.hostname);
        console.log(window.location.hostname);
       
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
});

// 判斷當前網站並返回相關資訊的函數
function getSiteInfo(hostname) {
    const sites = {
        'maps.nlsc.gov.tw': {
            name: 'Taiwan Map Service',
            selector: '.ol-mouse-position',
            processCoordinates: lonlat
        },
		'gisdawh.kcg.gov.tw': {
			name: 'Kaohsiung City Government I-MAP',
			selector: 'td.g4o-statusbar-footbar-btn.g4o-statusbar-foot-mousePosition.ol-unselectable',
			processCoordinates: KaohsiungIMAP
		},
        'urban.kinmen.gov.tw': {
            name: 'Kinmen Map Service',
            selector: '#info a:nth-of-type(2)', // 查找包含 WGS84 經緯度的 <a> 標籤
            processCoordinates: lonlat
        }
    };

    const siteInfo = sites[hostname];
    if (!siteInfo) {
        console.error("This website is not supported. Please check the site name.");
        return null;  // 如果網站不存在於列表中，返回 null
    }
    return siteInfo;
}

// 根據選擇器獲取座標文本的函數
function getCoordinatesText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : null;
}

// 解析經緯座標格式的函數
function lonlat(coordinatesText) {
    const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match = coordinatesText.match(regex);

    if (match) {
        return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
    return null;
}

// 解析高雄市政府 I-MAP 座標格式的函數
function KaohsiungIMAP(coordinatesText) {
    // 檢查文本是否包含 "WGS84經緯度"
    if (coordinatesText.includes("WGS84經緯度")) {
        // 使用正則表達式解析 WGS84 經緯度
        const regex = /X:(-?\d+\.\d+)\s*Y:(-?\d+\.\d+)/;
        const match = coordinatesText.match(regex);

        if (match) {
            return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
        }
    } else {
		alert("The selected coordinates are not in WGS84 format. Please change the settings in the lower left corner.");
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
