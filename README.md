# CoordExtractor 🌏
[中文](#中文) | [English](#english)

---

## 中文

**CoordExtractor** 是一款強大的瀏覽器擴充功能，旨在簡化從各種地圖服務（如 Google Maps、Google Earth 及台灣各縣市 GIS 系統）中擷取座標的過程，並支援 BTE (Build The Earth) 所需功能。

### ✨ 核心功能
*   **快捷擷取**：使用 `Alt` + `C` 即可將座標與高度複製到剪貼簿。
*   **BTE 專用支援**：
    *   支援 `/tpll` 與 `/upll` 格式。
    *   支援 BTE X/Z 座標偏移設定。
    *   支援 BTE 投影的高度變形計算。

### ⌨️ 快捷鍵設定
| 快捷鍵 | 功能描述 |
| :--- | :--- |
| `Alt` + `C` | **擷取座標**：複製當前位置的座標（含高度與偏移）。 |
| `Alt` + `G` | **設定地面高度**：將目前位置的高度設定為「基準地面高度」（計算高度變形用）。 |

> [!TIP]
> **自定義快捷鍵**：您可以在瀏覽器的擴充功能設定中（`chrome://extensions/shortcuts`或`about:addons`->設定圖示）自行更改這些組合鍵。

### 🚀 安裝方式
#### Chrome
1. 下載最新發布的[ZIP壓縮檔](https://github.com/LonghiTW/CoordExtractor/releases)並解壓縮。
2. 在Google Chrome新分頁輸入網址`chrome://extensions`進入擴充功能介面。
3. 點擊右上角開關啟用**開發人員模式**。
4. 點擊**載入未封裝項目**按鈕並選擇剛剛解壓縮後檔案所在的目錄即可。

#### Firefox
* 透過 [Firefox Add-ons 商店](https://addons.mozilla.org/addon/coordextractor/) 直接安裝。

## 支援平台
* [Google Maps](https://www.google.com/maps)
* [Google Earth](https://earth.google.com/web)
* [Bing Maps](https://www.bing.com/maps)
* [Yandex Maps](https://yandex.com/maps/)
* [國土測繪圖資服務雲](https://maps.nlsc.gov.tw/T09/mapshow.action)
* [多維度國家空間資訊服務平臺](https://3dmaps.nlsc.gov.tw/)
* [BigGIS巨量空間資訊系統](https://gis.ardswc.gov.tw/)
* [玉山國家公園管理處3D整合圖台](https://ysnp.3dgis.tw/)
* [陽明山國家公園3D導覽](https://3dmap.ymsnp.gov.tw/map/TE4W/index.html)
* [新北市城鄉資訊查詢平台](https://urban.planning.ntpc.gov.tw/)
* [桃園市政府都市計畫地理資訊服務網](https://urplanning.tycg.gov.tw/gisMap/Map.aspx)
* [高雄地圖網](https://gisdawh.kcg.gov.tw/)
* [高雄市都市計畫地理資訊系統](https://urbangis.kcg.gov.tw/UBA/web_page/UBA010100.jsp)
* [高雄地籍圖資服務網](https://gisdawh.kcg.gov.tw/landeasy/)
* [新竹市都市發展資訊整合圖台](https://urbangis.hccg.gov.tw/HcUrbanMap/)
* [新竹市都市發展3D資訊圖台](https://3dgis.hccg.gov.tw/Hccg3dMap/guest)
* [彰化縣都市計畫地理資訊服務網](https://urbangis.chcg.gov.tw/map/)
* [雲林縣圖資整合平台](https://map.yunlin.gov.tw/map)
* [屏東縣地理圖資整合系統](https://nsp.tcd.gov.tw/tcd_pingtung/)
* [花蓮縣地理資訊整合應用平台](https://map.hl.gov.tw/HLGIS)
* [臺東縣圖資雲端分享平臺](https://map.taitung.gov.tw/)
* [基隆市都市計畫書圖查詢](https://upgis.klcg.gov.tw/kl_land/MapQuery/index.asp)
* [金門縣圖資雲系統](https://urban.kinmen.gov.tw/kmgisweb/)

## 常見問題
### 複製到的座標與網頁顯示的不同
 1. 確認有沒有啟用座標偏移
 2. 若該網站提供精度更高TDW97二度分帶座標，則本擴充功能會採用TDW97座標再將其轉為WGS84的經緯座標，因此會有一些差異
 3. 儲存小數時受二進制與十進制轉換的影響，因此會產生些微誤差，這是JavaScript的特性

---

## English

**CoordExtractor** is a high-performance browser extension designed to simplify coordinate extraction from various map services, with specialized support for the Build The Earth (BTE) project.

### ✨ Key Features
*   **One-Click Extraction**: Press `Alt` + `C` to copy coordinates and elevation.
*   **BTE Specialized Support**:
    *   Compatible with `/tpll` and `/upll` command formats.
    *   Custom coordinate offsets (Lat/Lon or BTE X/Z).
    *   BTE projection height distortion calculation.

### ⌨️ Shortcuts
| Shortcut | Action |
| :--- | :--- |
| `Alt` + `C` | **Copy Coordinates**: Copy coordinates with current offset and elevation. |
| `Alt` + `G` | **Set Ground Level**: Set the current elevation as the base ground level (used for calculating elevation distortion). |

> [!TIP]
> **Custom Shortcuts:** Both Chrome and Firefox users can customize these keys in the browser's extension shortcut settings (`chrome://extensions/shortcuts` or `about:addons` -> Settings icon).

### 🚀 Installation
#### Chrome
1. Download the [Latest Release](https://github.com/LonghiTW/CoordExtractor/releases) and unzip it.
2. Go to `chrome://extensions` in Chrome.
3. Enable "**Developer mode**" in the top right.
4. Click "**Load unpacked**" and select the unzipped folder.

#### Firefox
1. Install directly via the [Firefox Add-ons Store](https://addons.mozilla.org/addon/coordextractor/).

### 🛠️ Supported Platforms
* [Google Maps](https://www.google.com/maps)
* [Google Earth](https://earth.google.com/web)
* [Bing Maps](https://www.bing.com/maps)
* [Yandex Maps](https://yandex.com/maps/)

---

## FAQ

**Q: Why are the copied coordinates slightly different from the website?**
*   **Offset**: Check if "Coordinate Offset" is enabled in settings.
*   **Precision**: If the site provides high-precision TWD97 coordinates, this tool uses them for conversion, which might be more accurate than the website's display.
*   **Float precision**: Due to JavaScript's floating-point handling, there may be tiny rounding differences at very high precision.

---
