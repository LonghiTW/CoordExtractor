(async () => {
    document.addEventListener('DOMContentLoaded', async function () {
        const offsetSelect = document.getElementById('offset');
        const fromInput = document.getElementById('fromInput');
        const toInput = document.getElementById('toInput');
        const xInput = document.getElementById('xInput');
        const zInput = document.getElementById('zInput');
        let fromOffset = document.getElementById('fromOffset');
        let toOffset = document.getElementById('toOffset');
        let xOffset = document.getElementById('xOffset');
        let zOffset = document.getElementById('zOffset');
        const body = document.body;

        // 載入並設定儲存的資料
        async function loadStoredData() {
            const storageData = await chrome.storage.sync.get([
                'xInput', 'zInput', 'offset', 'fromInput', 'toInput'
            ]);

            // 設定頁面顯示的初始值
            xOffset.value = storageData.xInput || '';
            zOffset.value = storageData.zInput || '';
            offsetSelect.value = storageData.offset || 'none';

            const fromInputTemp = storageData.fromInput || '';
            fromOffset.value = Array.isArray(fromInputTemp) ? fromInputTemp.join(',') : '';

            const toInputTemp = storageData.toInput || '';
            toOffset.value = Array.isArray(toInputTemp) ? toInputTemp.join(',') : '';
        }

        // 載入儲存的資料並更新頁面
        await loadStoredData();

        // 控制顯示輸入框的顯示邏輯
        function toggleInputs() {
            const offsetValue = offsetSelect.value;
            if (offsetValue === 'none') {
                fromInput.style.display = 'none';
                toInput.style.display = 'none';
                xInput.style.display = 'none';
                zInput.style.display = 'none';
                body.style.height = '190px'; // 隱藏時縮小頁面高度
            } else if (offsetValue === 'latlon') {
                fromInput.style.display = 'flex';
                toInput.style.display = 'flex';
                xInput.style.display = 'none';
                zInput.style.display = 'none';
                body.style.height = '300px'; // 顯示時擴大頁面高度
            } else if (offsetValue === 'btexz') {
                fromInput.style.display = 'none';
                toInput.style.display = 'none';
                xInput.style.display = 'flex';
                zInput.style.display = 'flex';
                body.style.height = '300px'; // 顯示時擴大頁面高度
            }
        }

        // 儲存 offset 設定
        offsetSelect.addEventListener('change', async function () {
            const selectedOffset = offsetSelect.value;
            chrome.storage.sync.set({ offset: selectedOffset });
            toggleInputs(); // 更新輸入框顯示邏輯
        });

        // 儲存 X 和 Z 的輸入值
        xOffset.addEventListener('input', async function (e) {
            chrome.storage.sync.set({ xInput: Number(e.target.value) });
        });

        zOffset.addEventListener('input', async function (e) {
            chrome.storage.sync.set({ zInput: Number(e.target.value) });
        });

        // 儲存 from 和 to 的座標值
        fromOffset.addEventListener('input', async function (e) {
            chrome.storage.sync.set({ fromInput: e.target.value.split(',').map(Number) });
        });

        toOffset.addEventListener('input', async function (e) {
            chrome.storage.sync.set({ toInput: e.target.value.split(',').map(Number) });
        });

        // 清除資料的邏輯
        function clearData(inputElement, storageKey) {
            // 清除輸入框的資料
            inputElement.value = '';

            // 更新存儲中的值為空
            chrome.storage.sync.set({ [storageKey]: '' });
        }

        // 綁定清除按鈕
        const clearButtons = document.querySelectorAll('.clear-btn');
        clearButtons.forEach(button => {
            button.addEventListener('click', function () {
                const inputId = this.getAttribute('data-clear');
                const inputElement = document.getElementById(inputId);

                // 根據 data-clear 屬性選擇清除的資料
                if (inputElement === fromOffset) {
                    clearData(fromOffset, 'fromInput');
                } else if (inputElement === toOffset) {
                    clearData(toOffset, 'toInput');
                } else if (inputElement === xOffset) {
                    clearData(xOffset, 'xInput');
                } else if (inputElement === zOffset) {
                    clearData(zOffset, 'zInput');
                }
            });
        });

        // 初始設置，根據存儲的選項來設定顯示
        toggleInputs();
    });
})();
