/* ============================
   Timetable Download Functionality
   Theme synchronization with main app
============================ */

console.log("Timetable script starting...");

// Apply theme from localStorage on page load
(function applyTheme() {
  try {
    const savedTheme = localStorage.getItem('theme') || 'darkest';
    document.documentElement.className = savedTheme;
    document.body.className = savedTheme;
    console.log("Theme applied:", savedTheme);
  } catch (e) {
    console.warn("Could not apply theme from localStorage:", e);
  }
})();

// Initialize functionalities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed. Initializing download listener...");

  const downloadBtn = document.getElementById('downloadBtn');
  if (!downloadBtn) {
    console.error("Critical: 'downloadBtn' not found in DOM.");
    return;
  }

  downloadBtn.addEventListener('click', async () => {
    console.log("Download button clicked.");

    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      console.error("html2canvas library is not loaded.");
      alert("Error: html2canvas library is missing. Please check your internet connection and reload.");
      return;
    }

    const container = document.getElementById('timetableContent');
    if (!container) {
      console.error("Critical: 'timetableContent' not found.");
      return;
    }

    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '🕒 Processing...';
    downloadBtn.disabled = true;

    try {
      console.log("Creating clone for capture...");
      // Create a temporary clone for 16:9 formatting
      const clone = container.cloneNode(true);
      clone.classList.add('screenshot-mode');

      // Ensure the clone is visible but off-screen to avoid layout shifts
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.zIndex = '-9999';
      clone.style.visibility = 'visible';
      clone.style.pointerEvents = 'none';

      document.body.appendChild(clone);
      console.log("Clone appended to body. Starting html2canvas...");

      const canvas = await html2canvas(clone, {
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg') || '#09090b',
        scale: 3, // Higher resolution for readability
        logging: true,
        useCORS: false
      });

      console.log("Canvas generated successfully. Removing clone...");
      document.body.removeChild(clone);

      const link = document.createElement('a');
      const dateString = new Date().toLocaleDateString().replace(/\//g, '-');
      link.download = `TaskLog_Timetable_${dateString}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);

      console.log("Triggering download...");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      downloadBtn.innerHTML = '✅ Downloaded!';
      console.log("Download flow completed.");
    } catch (error) {
      console.error('Download failed with error:', error);
      alert('Failed to generate image. Error: ' + error.message);
      downloadBtn.innerHTML = '❌ Error';
    } finally {
      setTimeout(() => {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
      }, 3000);
    }
  });

  console.log("Timetable script initialization complete.");
});
