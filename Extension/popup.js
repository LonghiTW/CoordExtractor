const api = typeof chrome !== 'undefined' ? chrome : browser;

document.addEventListener('DOMContentLoaded', function () {
    const el = (id) => document.getElementById(id);
    const controls = {
        offset: el('offset'),
        fromInput: el('fromInput'), toInput: el('toInput'),
        xInput: el('xInput'), zInput: el('zInput'),
        fromOffset: el('fromOffset'), toOffset: el('toOffset'),
        xOffset: el('xOffset'), zOffset: el('zOffset'),
        prefixTpll: el('prefixTpll'), prefixUpll: el('prefixUpll'), prefixNone: el('prefixNone'),
        includeElev: el('includeElev'), applyDistortion: el('applyDistortion'),
        distortionWrap: el('distortionWrap')
    };

    // 載入儲存的資料並初始化介面
    async function load() {
        const data = await api.storage.sync.get([
            'xInput', 'zInput', 'offset', 'fromInput', 'toInput', 'prefix', 'includeElev', 'applyDistortion'
        ]);

        controls.xOffset.value = data.xInput || '';
        controls.zOffset.value = data.zInput || '';
        controls.offset.value = data.offset || 'none';

        const fIn = data.fromInput || '';
        controls.fromOffset.value = Array.isArray(fIn) ? fIn.join(',') : '';
        
        const tIn = data.toInput || '';
        controls.toOffset.value = Array.isArray(tIn) ? tIn.join(',') : '';

        if (data.prefix === 'none') controls.prefixNone.checked = true;
        else if (data.prefix === 'upll') controls.prefixUpll.checked = true;
        else controls.prefixTpll.checked = true;

        controls.includeElev.checked = !!data.includeElev;
        controls.applyDistortion.checked = !!data.applyDistortion;

        updateElevUI();
        toggleInputs();
        updatePreview();
    }

    // 控制輸入框顯示邏輯
    function toggleInputs() {
        const val = controls.offset.value;
        controls.fromInput.style.display = (val === 'latlon') ? 'flex' : 'none';
        controls.toInput.style.display = (val === 'latlon') ? 'flex' : 'none';
        controls.xInput.style.display = (val === 'btexz') ? 'flex' : 'none';
        controls.zInput.style.display = (val === 'btexz') ? 'flex' : 'none';
    }

    // 控制高度相依 UI
    function updateElevUI() {
        const enabled = controls.includeElev.checked;
        controls.distortionWrap.style.opacity = enabled ? "1" : "0.4";
        controls.distortionWrap.style.pointerEvents = enabled ? "auto" : "none";
        if (!enabled) {
            controls.applyDistortion.checked = false;
            api.storage.sync.set({ applyDistortion: false });
        }
    }

    // 更新預覽文字
    function updatePreview() {
        const prefixEl = document.querySelector('input[name="prefix"]:checked');
        const prefix = prefixEl ? prefixEl.value : 'slash';
        const includeElev = controls.includeElev.checked;
        const applyDist = controls.applyDistortion.checked;

        // 預覽用的模擬數值
        let lat = 25.033668, lon = 121.564816, elev = 516, ground = 8;

        let res = "";
        if (prefix === 'tpll') res += "/tpll ";
        else if (prefix === 'upll') res += "/upll ";

        res += `${lat}, ${lon}`;

        if (includeElev) {
            let finalElev = elev;
            if (applyDist) finalElev = Math.round((elev - ground) * 1.087 + ground);
            res += ` ${finalElev}`;
        }

        document.getElementById('livePreview').textContent = res;
    }

    // 監聽各項變動並儲存
    controls.offset.addEventListener('change', () => {
        api.storage.sync.set({ offset: controls.offset.value });
        toggleInputs();
        updatePreview();
    });

    document.querySelectorAll('input[name="prefix"]').forEach(r => {
        r.addEventListener('change', (e) => {
            api.storage.sync.set({ prefix: e.target.value });
            updatePreview();
        });
    });

    controls.includeElev.addEventListener('change', (e) => {
        api.storage.sync.set({ includeElev: e.target.checked });
        updateElevUI();
        updatePreview();
    });

    controls.applyDistortion.addEventListener('change', (e) => {
        api.storage.sync.set({ applyDistortion: e.target.checked });
        updatePreview();
    });

    // 座標偏移輸入監聽
    ['xOffset', 'zOffset', 'fromOffset', 'toOffset'].forEach(id => {
        const input = el(id);
        input.addEventListener('input', (e) => {
            const key = id.replace('Offset', 'Input');
            let val = e.target.value;
            if (id.startsWith('x') || id.startsWith('z')) {
                val = Number(val);
            } else {
                val = val.split(',').map(Number);
            }
            api.storage.sync.set({ [key]: val });
            updatePreview();
        });
    });

    // 清除按鈕邏輯
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-clear');
            const input = el(id);
            input.value = '';
            const key = id.replace('Offset', 'Input');
            api.storage.sync.set({ [key]: '' });
            updatePreview();
        });
    });

    load();
});
