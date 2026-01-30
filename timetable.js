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

// Download as PDF
document.getElementById('downloadPDF').addEventListener('click', async () => {
  const button = document.getElementById('downloadPDF');
  const originalText = button.innerHTML;
  button.innerHTML = '⏳ Generating PDF...';
  button.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const content = document.getElementById('timetableContent');

    // Use html2canvas to capture the timetable
    const canvas = await html2canvas(content, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

    // Add footer to PDF
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Developed by Mutahhar Bhutta | TaskLog - Student Task Diary', 10, pageHeight - 10);
    pdf.text('GitHub: github.com/mutahharbhutta', 10, pageHeight - 5);

    pdf.save('TaskLog-Timetable-Spring2026.pdf');

    button.innerHTML = '✓ Downloaded!';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Failed to generate PDF. Please try again.');
    button.innerHTML = originalText;
    button.disabled = false;
  }
});

// Download as Excel (CSV format)
document.getElementById('downloadExcel').addEventListener('click', () => {
  const button = document.getElementById('downloadExcel');
  const originalText = button.innerHTML;
  button.innerHTML = '⏳ Generating Excel...';
  button.disabled = true;

  try {
    const timetableData = [
      ['FACULTY OF COMPUTING & INFORMATION TECHNOLOGY New Campus', '', '', '', ''],
      ['University of the Punjab - BS (DS) Spring 2026', '', '', '', ''],
      [''],
      ['Day/Time', '08:30-09:55', '9:55-11:20', '11:20-12:45', '12:45-02:10'],
      ['Monday', 'Analysis of Algorithms (Dr. Idrees)', 'Database Systems (Dr. Khurram)', 'Multivariable Calculus (Dr. Malik)', ''],
      ['Tuesday', 'Computer Networks (08:30-10:30)', 'Artificial Intelligence (10:30-12:00)', 'Data Visualization (12:45-02:30)', ''],
      ['Wednesday', 'Analysis of Algorithms', 'Database Systems', 'Multivariable Calculus', 'Database Systems Lab (02:00-05:00, LAB-B)'],
      ['Thursday', 'Computer Networks LAB (08:30-10:30)', 'Artificial Intelligence (10:30-12:00)', 'Data Visualization LAB (12:30-02:30)', ''],
      [''],
      [''],
      ['Developed by Mutahhar Bhutta'],
      ['ClassSync - Task Management System'],
      ['GitHub: github.com/mutahharbhutta']
    ];

    // Convert to CSV
    const csv = timetableData.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'TaskLog-Timetable.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    button.innerHTML = '✓ Downloaded!';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Excel generation error:', error);
    alert('Failed to generate Excel file. Please try again.');
    button.innerHTML = originalText;
    button.disabled = false;
  }
});

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  renderTable();
});

// Print functionality (alternative to PDF)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    window.print();
  }
});