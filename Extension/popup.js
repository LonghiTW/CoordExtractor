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
		console.log(await chrome.storage.sync.get());
		xOffset.value = (await chrome.storage.sync.get('xInput')).xInput || '';
		zOffset.value = (await chrome.storage.sync.get('zInput')).zInput || '';
		offsetSelect.value =
			(await chrome.storage.sync.get('offset')).offset || 'none';
		const fromInputTemp =
			(await chrome.storage.sync.get('fromInput')).fromInput || '';
		fromOffset.value = Array.isArray(fromInputTemp)
			? fromInputTemp.join(',')
			: fromInputTemp;
		const toInputTemp =
			(await chrome.storage.sync.get('toInput')).toInput || '';
		toOffset.value = Array.isArray(toInputTemp)
			? toInputTemp.join(',')
			: toInputTemp;

		// Function to toggle the visibility of From and To inputs
		function toggleInputs() {
			const offsetValue = offsetSelect.value;
			if (offsetSelect.value === 'none') {
				fromInput.style.display = 'none';
				toInput.style.display = 'none';
				xInput.style.display = 'none';
				zInput.style.display = 'none';
				body.style.height = '190px'; // Set body height when inputs are hidden
			} else if (offsetValue === 'latlon') {
				fromInput.style.display = 'flex';
				toInput.style.display = 'flex';
				xInput.style.display = 'none';
				zInput.style.display = 'none';
				body.style.height = '300px'; // Adjust body height when inputs are shown
			} else if (offsetValue === 'btexz') {
				fromInput.style.display = 'none';
				toInput.style.display = 'none';
				xInput.style.display = 'flex';
				zInput.style.display = 'flex';
				body.style.height = '300px'; // Adjust body height when inputs are shown
			}
		}

		// Read and set the offset selection from chrome storage
		chrome.storage.sync.get('offset', function (result) {
			if (result.offset) {
				offsetSelect.value = result.offset;
			}
			toggleInputs(); // Update visibility based on the stored offset value
		});

		// Listen for changes on the offset select and save it to storage
		offsetSelect.addEventListener('change', async function () {
			const selectedOffset = offsetSelect.value;
			chrome.storage.sync.set(
				Object.assign(await chrome.storage.sync.get(), {
					offset: selectedOffset,
				}),
			);
			toggleInputs(); // Update visibility based on the selected offset
		});

		// 監聽 X 和 Z 的輸入變化，並將它們的值儲存到 chrome.storage.sync
		xOffset.addEventListener('input', async function (e) {
			chrome.storage.sync.set(
				Object.assign(await chrome.storage.sync.get(), {
					xInput: Number(e.target.value),
				}),
			);
		});

		zOffset.addEventListener('input', async function (e) {
			chrome.storage.sync.set(
				Object.assign(await chrome.storage.sync.get(), {
					zInput: Number(e.target.value),
				}),
			);
		});

		fromOffset.addEventListener('input', async function (e) {
			chrome.storage.sync.set(
				Object.assign(await chrome.storage.sync.get(), {
					fromInput: e.target.value.split(',').map(Number),
				}),
			);
		});

		toOffset.addEventListener('input', async function (e) {
			chrome.storage.sync.set(
				Object.assign(await chrome.storage.sync.get(), {
					toInput: e.target.value.split(',').map(Number),
				}),
			);
		});

		// Initial call to set the state based on the default selection
		toggleInputs();
	});
})();
