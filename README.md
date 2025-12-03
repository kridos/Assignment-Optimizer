# Assignment Deadline Optimizer

A smart assignment scheduler that integrates with Canvas LMS, tracks actual time spent on assignments via manual timer, learns your work patterns, and generates optimal work schedules accounting for your available time and other commitments.

## Features

### Phase 1 & 2 - Core Functionality (Implemented)

✅ **Canvas Integration**
- Connect to Canvas LMS via API token
- Sync courses and assignments automatically
- Choose sync modes: Auto-sync, Hybrid (course info only), or Manual
- Support for both Canvas-synced and manually-added assignments

✅ **Manual Time Tracking**
- Start/Pause/Resume/Done timer functionality
- Timer state persists across page refreshes (localStorage)
- Keyboard shortcuts (Space = pause/resume, Enter = done)
- Session history with notes
- Warning for long sessions (>4 hours)
- Manual time adjustment before saving

✅ **Assignment Management**
- Create assignments manually for any course
- Create custom courses (e.g., personal projects)
- View assignments by status: Upcoming, Overdue, In Progress, All
- Update assignment status inline
- Delete manual assignments
- Visual indicators for Canvas vs manual entries

✅ **Data Storage**
- IndexedDB for local-first storage
- All data stored in browser (privacy-first)
- Tables: Courses, Assignments, Time Logs, User Settings
- CRUD operations for all entities

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Database**: IndexedDB (via Dexie)
- **Routing**: React Router v7
- **API Client**: Axios
- **Date Utilities**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kridos/Assignment-Optimizer.git
cd Assignment-Optimizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Getting a Canvas API Token

1. Log in to your Canvas instance
2. Go to Account → Settings
3. Scroll down to "Approved Integrations"
4. Click "+ New Access Token"
5. Enter a purpose (e.g., "Assignment Optimizer") and optional expiration date
6. Click "Generate Token"
7. Copy the token (you won't be able to see it again!)

### Using the App

1. **Sync with Canvas**:
   - Click "Sync with Canvas"
   - Enter your Canvas base URL (e.g., `https://canvas.uw.edu`)
   - Enter your API token
   - Select courses to sync and choose sync mode for each

2. **Add Manual Assignments**:
   - Click "+ Add Assignment"
   - Choose an existing course or create a new one
   - Fill in assignment details
   - Optionally estimate time to complete

3. **Track Time**:
   - Click "Start Timer" on any assignment
   - Use Space to pause/resume, Enter to mark done
   - Timer appears at bottom of screen
   - Add notes when completing a session
   - Adjust time if needed before saving

4. **Manage Assignments**:
   - Update status via dropdown (Not Started → In Progress → Completed)
   - View by filter: Upcoming, Overdue, In Progress, All
   - Delete manual assignments if needed

## Project Structure

```
src/
├── components/          # React components
│   ├── AssignmentList.tsx
│   ├── Timer.tsx
│   ├── AddAssignmentForm.tsx
│   └── CanvasSync.tsx
├── pages/              # Page components
│   └── Dashboard.tsx
├── services/           # API services
│   └── canvasApi.ts
├── db/                 # Database layer
│   ├── database.ts     # Dexie setup
│   └── operations.ts   # CRUD operations
├── hooks/              # Custom React hooks
│   └── useTimer.ts
├── types/              # TypeScript types
│   └── index.ts
└── utils/              # Utility functions

```

## Data Models

### Course
- Canvas ID (null for manual courses)
- Name, Code, Color
- Sync Mode: auto, hybrid, or manual
- Is Manual flag

### Assignment
- Canvas ID (null for manual assignments)
- Course ID, Title, Description
- Due Date, Points, Type
- Status: not_started, in_progress, blocked, completed
- Estimated Hours
- Is Manual flag

### Time Log
- Assignment ID
- Start/End Time
- Pause/Resume Events (arrays)
- Total Active Seconds
- Notes

### User Settings
- Canvas API Token & Base URL
- Available Hours (per day of week)
- Preferred Session Length
- Notification Preferences

## Upcoming Features (Phases 3-6)

### Phase 3: Time Estimation & Learning
- Auto-generate time estimates based on historical data
- Track estimation accuracy per course/type
- Learn user work patterns
- Predict assignment difficulty from description

### Phase 4: Smart Scheduling
- Define available study hours
- Generate optimal work schedules
- Real-time schedule adjustments
- Warn about unrealistic weeks

### Phase 5: Progress Tracking & Insights
- Weekly progress dashboard
- Smart insights (procrastination patterns, productivity times)
- Estimation accuracy trends
- Per-course analytics

### Phase 6: Advanced Features
- Google Calendar integration
- Mobile companion app
- Pomodoro mode
- Grade predictor

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Contributing

This is an educational project. Feel free to fork and customize for your own needs!

## License

MIT License - See LICENSE file for details

## Privacy

All data is stored locally in your browser's IndexedDB. No data is sent to external servers except:
- Canvas API calls (to fetch courses/assignments)
- Future: Google Calendar sync (optional)

Your Canvas API token is stored locally and never transmitted to any third-party services.
