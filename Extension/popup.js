(async () => {
  document.addEventListener('DOMContentLoaded', async function () {
    const ifOffsetChecked = document.getElementById('ifOffset');
  
    // Get initial status of 'enabled' from storage
    const { enabled } = await chrome.storage.sync.get('enabled');
  
    // Set checkbox to the current status
    ifOffsetChecked.checked = enabled;
  
    // Listen for changes on the checkbox and update 'enabled' in storage
    ifOffsetChecked.addEventListener('change', async () => {
      const isChecked = ifOffsetChecked.checked;
  
      // Update 'enabled' status in storage
      await chrome.storage.sync.set({ enabled: isChecked });
    });
  });
})();
