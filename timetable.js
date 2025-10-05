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
    pdf.text('Developed by Mutahhar Bhutta | WorkBurst - Task Management System', 10, pageHeight - 10);
    pdf.text('GitHub: github.com/mutahharbhutta', 10, pageHeight - 5);
    
    pdf.save('My-Timetable-WorkBurst.pdf');
    
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
      ['My Class Timetable', '', '', '', ''],
      [''],
      ['Day/Time', '08:30-09:55', '09:55-11:20', '11:20-12:45', '12:45-02:10'],
      ['Monday', 'Linear Algebra', 'Data Structures', 'Calculus & Analytic Geometry', 'Discrete Structures (B-6)'],
      ['Tuesday', '', '', '', ''],
      ['Wednesday', 'COAL LAB (08:30-10:30)', 'Data Structures (10:30-12:00)', 'Introduction to Data Science LAB (12:00-02:00, LAB A)', 'Discrete Structures (02:00-03:35, B-4)'],
      ['Thursday', 'COAL (08:30-10:30)', '', 'Linear Algebra (12:00-01:30)', ''],
      ['Friday', 'Calculus & Analytic Geometry (08:30-09:55, B-7)', 'Introduction to Data Science (11:00-01:00, B-10)', '', 'Data Structures LAB (02:00-05:00, LAB-A)'],
      [''],
      [''],
      ['Developed by Mutahhar Bhutta'],
      ['WorkBurst - Task Management System'],
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
    link.setAttribute('download', 'My-Timetable-WorkBurst.csv');
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

// Print functionality (alternative to PDF)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    window.print();
  }
});