(async () => {
  document.addEventListener('DOMContentLoaded', async function () {
    const ifOffsetChecked = document.getElementById('ifOffset');
  
    // Get initial status
    const { enabled } = await chrome.storage.sync.get('enabled');
  
    // Set checkbox status
    ifOffsetChecked.checked = enabled;
  
    // Listen change of checkbox status
    ifOffsetChecked.addEventListener('change', async () => {
      const isChecked = ifOffsetChecked.checked;
  
      // Update status
      await chrome.storage.sync.set({
        enabled: isChecked,
        opentab: (await chrome.storage.sync.get('opentab')).opentab,
      });
    });
  });
})();
