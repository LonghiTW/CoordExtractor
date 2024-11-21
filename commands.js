// 定義 coord 物件，初始化 lat 和 lon 為 null
let coord = { lat: null, lon: null };

// 監聽快捷鍵 Alt + C
document.addEventListener('keydown', function(event) {
    // 如果是 Alt + C
    if (event.altKey && event.key === 'c') {
        // 查找包含 WGS84 經緯度的 <a> 標籤
        const wgs84CoordinatesElement = document.querySelector("#info a:nth-of-type(2)");
        
        if (wgs84CoordinatesElement) {
            // 擷取 WGS84 經緯度文本並顯示
            const coordinatesText = wgs84CoordinatesElement.textContent.trim();
			
			// 使用正則表達式來解析經緯度
			const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
			const match = coordinatesText.match(regex);
			
			if (match) {
				// 提取經度和緯度，並儲存到 coord 物件
				coord.lon = parseFloat(match[1]); // 經度
				coord.lat = parseFloat(match[2]); // 緯度
				
				const text = `${coord.lat}, ${coord.lon}`;
                console.log("Current Coordinates (WGS84):", text);
				
				navigator.clipboard.writeText(text)
				    .then(() => {
						alert(`Coordinates "${text}" copied to clipboard!`);
					})
					.catch(err => {
                        console.error('Failed to copy coordinates: ', err);
                    });
			} else {
				console.log("Unable to parse coordinates.");
			}
        } else {
            console.log("WGS84 Coordinates element not found.");
        }
    }
});
