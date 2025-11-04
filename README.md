# 🎓 WorkBurst – Enhanced Task Manager

> **Live Demo:** https://mutahharbhutta.github.io/WorkBurst

A comprehensive task management system designed for students to track assignments, quizzes, and lab work with advanced features including weekly grouping, multiple themes, timetable integration, and notification support.

---

## 🚀 New Features (Enhanced Version)

### ✨ Core Enhancements

* **📅 Weekly Task Grouping** – Tasks are automatically organized by week (This Week, Next Week, etc.)
* **📆 Day of Week Display** – Shows the day of the week for each task's due date
* **🎨 Multiple Themes** – 7 beautiful themes: Dark, Light, Aesthetic, Cat, Space, Forest, Ocean
* **📋 Timetable Feature** – View and download your class schedule as PDF or Excel
* ** Last Updated Tracker** – Displays when tasks were last modified
* **📝 Multi-line Notes** – Notes field now supports multi-line text input
* **🔔 Notification System** – Browser notifications 12 hours before task deadlines
* **💡 Loading Tips** – Rotating productivity tips during app loading
* **🎯 Improved UI/UX** – Better spacing, readability, and visual hierarchy

---

## 📁 File Structure

```
WorkBurst/
├── index.html          # Main task manager page
├── app.js             # Enhanced task management logic
├── style.css          # Enhanced styles with multiple themes
├── timetable.html     # Class timetable viewer
├── timetable.css      # Timetable styling
├── timetable.js       # Download functionality (PDF/Excel)
└── README.md          # This file
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for backend)
- GitHub account (for hosting)

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable **Authentication** (Email/Password)
4. Enable **Firestore Database**
5. Copy your Firebase config and update in `app.js`

### 3. Firestore Rules
Set these security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Deploy to GitHub Pages
1. Create a new repository: `WorkBurst`
2. Upload all files
3. Go to Settings → Pages
4. Select main branch and root folder
5. Save and wait for deployment

---

## 🎨 Theme System

### Available Themes
- **🌙 Dark** – Default dark mode with purple accents
- **☀️ Light** – Clean light mode
- **✨ Aesthetic** – Pink and pastel colors
- **🐱 Cat** – Warm brown tones
- **🚀 Space** – Purple cosmic theme
- **🌲 Forest** – Green nature theme
- **🌊 Ocean** – Blue aquatic theme

### How to Use Themes
Click the 🎨 button in the navigation bar and select your preferred theme. Your choice is saved automatically.

---

## 📊 Timetable Feature

### How to Use
1. Click the **📅 Timetable** button in navigation
2. View your class schedule in a new tab
3. Download as PDF or Excel (CSV)

### Customizing Your Timetable
Edit the `timetable.html` file to update:
- Class names
- Time slots
- Room numbers
- Days and schedules

---

## 🔔 Notification System

### Setup
1. Log in as admin
2. Enable notifications in the Admin Panel
3. Grant browser permission when prompted
4. Notifications will appear 12 hours before due dates

### Requirements
- Modern browser with Notification API support
- Browser permissions granted
- Tasks must be added while notifications are enabled

---

## 📝 Using Multi-line Notes

The Notes field now supports multiple lines:
- Press **Enter** to create a new line
- Text wraps automatically in cards
- Preserves formatting when displayed

---

## 🔐 Admin Features

### Login
1. Click **🔐 Admin** button
2. Enter your Firebase email and password
3. Access admin panel for full CRUD operations

### Admin Capabilities
- ✏️ Create, edit, and delete tasks
- 📊 View all tasks in table format
- 🔔 Enable/disable notifications
- 📈 Track last update times

---

## 📱 Responsive Design

Fully optimized for:
- 🖥️ Desktop (1400px+ max width)
- 💻 Laptop (1024px - 1400px)
- 📱 Tablet (768px - 1024px)
- 📱 Mobile (320px - 768px)

---

## 🎯 Key Features

### Task Management
- Create tasks with type, course, title, due date/time
- Add optional links and multi-line notes
- Real-time sync across devices
- Optimistic UI updates for fast interactions

### Organization
- Weekly grouping (Overdue, This Week, Next Week, etc.)
- Filter by type (Assignment, Quiz, Lab)
- Search across all task fields
- Day of week display on cards

### Visual Feedback
- Color-coded countdown timers
- Overdue (red), Soon (orange), Safe (green)
- Task type badges with distinct colors
- Smooth animations and transitions

---

## 🔧 Technical Stack

### Frontend
- **HTML5** – Semantic markup
- **CSS3** – Custom properties, Grid, Flexbox
- **Vanilla JavaScript** – ES6+, async/await

### Backend
- **Firebase Authentication** – Secure login
- **Cloud Firestore** – Real-time database
- **Offline Persistence** – Works without internet

### Libraries
- **html2canvas** – Screenshot functionality for PDF
- **jsPDF** – PDF generation
- **Firebase SDK** – Version 12.3.0

---

## 📦 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🎓 Usage Tips

1. **Weekly Planning** – Review "This Week" section every Monday
2. **Color Coding** – Use different task types for better organization
3. **Notes** – Add submission links, requirements, or reminders
4. **Themes** – Switch themes based on time of day or mood
5. **Timetable** – Keep timetable open during class planning
6. **Notifications** – Enable for critical deadlines

---

## 🐛 Troubleshooting

### Tasks Not Loading
- Check internet connection
- Verify Firebase config in `app.js`
- Check browser console for errors

### Notifications Not Working
- Ensure browser permissions are granted
- Check if notifications are enabled in settings
- Verify browser supports Notification API

### PDF Download Issues
- Try a different browser
- Check if html2canvas loads properly
- Ensure popup blockers are disabled

### Theme Not Saving
- Check if localStorage is enabled
- Clear browser cache and try again

---

## 🔒 Security Notes

- Never commit Firebase config with sensitive data to public repos
- Use environment variables for production
- Keep Firebase rules restrictive
- Regularly update dependencies

---

## 🚀 Future Enhancements

- [ ] WhatsApp notification integration via API
- [ ] Calendar sync (Google Calendar, Outlook)
- [ ] Task completion tracking and statistics
- [ ] Collaborative features for study groups
- [ ] Mobile app (React Native)
- [ ] Task priority levels
- [ ] Recurring tasks
- [ ] File attachments

---

## 👨‍💻 Developer

**Mutahhar Bhutta**
- GitHub: [@mutahharbhutta](https://github.com/mutahharbhutta)
- Project: [WorkBurst](https://mutahharbhutta.github.io/WorkBurst)

---

## 📄 License

© 2025 Mutahhar Bhutta. All rights reserved.

This project is for educational and personal use. Feel free to fork and modify for your own needs.

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Inter font family for typography
- html2canvas and jsPDF for export functionality
- The student community for inspiration

---

## 📞 Support

For issues, questions, or suggestions:
1. Open an issue on GitHub
2. Contact via GitHub profile
3. Check documentation above

---

**Made with ❤️ for students everywhere**