/* ============================
   Timetable Download Functionality
   Theme synchronization with main app
============================ */

// Apply theme from localStorage on page load
(function applyTheme() {
  const savedTheme = localStorage.getItem('theme') || 'darkest';
  document.documentElement.className = savedTheme;
  document.body.className = savedTheme;
})();

// Download 16:9 Image
document.getElementById('downloadBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('downloadBtn');
  const container = document.getElementById('timetableContainer');
  const originalText = btn.innerHTML;

  btn.innerHTML = '🕒 Processing...';
  btn.disabled = true;

  try {
    // Create a temporary clone for 16:9 formatting
    const clone = container.cloneNode(true);
    clone.classList.add('screenshot-mode');
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg') || '#09090b',
      scale: 2, // High resolution
      logging: false,
      useCORS: true,
      width: 1920,
      height: 1080
    });

    document.body.removeChild(clone);

    const link = document.createElement('a');
    link.download = `TaskLog_Timetable_${new Date().toLocaleDateString().replace(/\//g, '-')}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

    btn.innerHTML = '✅ Downloaded!';
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to generate image. Please try again.');
    btn.innerHTML = '❌ Error';
  } finally {
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 3000);
  }
});
