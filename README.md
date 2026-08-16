# 🎓 StudyProgress 2.0 — Modern Student Academic Dashboard

<div align="center">

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Zustand](https://img.shields.io/badge/Zustand-4338CA?style=for-the-badge&logo=react&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP_3-88CE02?style=for-the-badge&logo=greensock&logoColor=white)

<p align="center">
  A sleek, ultra-responsive, and animated academic tracking platform built for high school and university students to manage semesters, monitor assessment weightages, simulate target grades, and organize exam datesheets.
</p>

</div>

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack & Libraries](#️-tech-stack--libraries)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Development & Build Commands](#development--build-commands)
- [📂 Project Architecture](#-project-architecture)
- [🗄️ Firestore Database Schema](#️-firestore-database-schema)
- [🔒 Security & Firestore Rules](#-security--firestore-rules)
- [🌐 Deployment (Vercel)](#-deployment-vercel)
- [📄 Software Requirements Specification (SRS)](#-software-requirements-specification-srs)
- [👨‍💻 Developer & Contributing Guidelines](#-developer--contributing-guidelines)
- [📝 License](#-license)

---

## ✨ Key Features

### 🎓 Multi-Semester Management
- **Switch Between Semesters**: Organize subjects and grades by semester (e.g., Fall 2025, Spring 2026).
- **Default & Active Semester**: Set active semester contexts that dynamically scope your dashboard and subject list.
- **Semester Modals**: Create, edit, activate, or archive semesters seamlessly.

### 📊 Comprehensive Performance Dashboard
- **Academic Summary**: Quick metrics on overall average, total credits, assessments completed, and target pacing.
- **Circular Gauges & Progress Bars**: Real-time visual representation of progress toward academic goals.
- **Upcoming Assessment Radar**: At-a-glance cards showing impending deadlines.

### 📚 Subject & Resource Tracking
- **Course Metadata**: Track course code, instructor, credit hours, custom accent colors, and target percentages.
- **Resource Bookmarks**: Add useful study URLs, drive folders, textbooks, and syllabus links directly into subject profiles.
- **Subject Detail Breakdown**: Granular view of all assessments, weight distributions, and score history.

### 📝 Dynamic Grade Tracking & Bulk Entry
- **Category Support**: Log Assignments, Quizzes, Midterms, Final Exams, Projects, and Lab work.
- **Weightage Calculation**: Real-time weighted percentage calculations with score clamping and validation.
- **⚡ Bulk Grade Entry**: High-speed spreadsheet-like entry interface to input multiple assessment grades simultaneously.

### 🎯 Target & "What-If" Grade Simulator
- **Grade Prediction**: Calculate the exact scores required on remaining assessments to attain a target grade (e.g., A, 85%, 90%).
- **Scenario Simulation**: Adjust prospective scores with interactive sliders and immediately observe the overall impact.

### 📅 Datesheet & Exam Timetable
- **Exam Countdown**: Automatic real-time countdown to upcoming test dates.
- **Room & Timing Details**: Keep venue, timing, and syllabus coverage handy.

### ✨ Immersive UI/UX & Micro-Interactions
- **Smooth Momentum Scrolling**: Integrated with [Lenis](https://lenis.darkroom.engineering/) for natural scroll physics.
- **GSAP Animations**: Page transitions, text scrambler effects (`ScrambleText`), typewriter effects, 3D card tilts (`Hover3D`), and magnetic cursor pull (`Magnetic`).
- **Custom Cursor & Parallax Ambient Background**: Glowing interactive cursor with ambient background floating effects.
- **Dark Mode Aesthetic**: Modern glassmorphism UI with vibrant neon accents and Tailwind CSS v4 styling.

---

## 🛠️ Tech Stack & Libraries

| Category | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Component architecture with modern hooks |
| **Bundler & Tooling** | [Vite 6](https://vitejs.dev/) | Ultra-fast HMR and bundling |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Next-generation utility-first styling |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) | Minimalist reactive state store |
| **Backend & Auth** | [Firebase 12](https://firebase.google.com/) | Authentication & Firestore NoSQL real-time database |
| **Animation Engine** | [GSAP 3](https://gsap.com/) & [@gsap/react](https://www.npmjs.com/package/@gsap/react) | High-performance timeline and element animations |
| **Smooth Scrolling** | [Lenis](https://lenis.darkroom.engineering/) | Smooth scroll orchestration |
| **Data Visualization**| [Recharts](https://recharts.org/) | Responsive SVG charts and progress gauges |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, scalable icon library |
| **Sanitization** | [DOMPurify](https://github.com/cure53/DOMPurify) | XSS protection for custom input fields |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** / **yarn** / **pnpm**
- **Firebase Account**: A Firebase project with **Authentication** (Email/Password) and **Cloud Firestore** enabled.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/student-dashboard.git
   cd student-dashboard
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your Firebase project credentials in `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Development & Build Commands

```bash
# Start local development server (with Vite HMR)
npm run dev

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview

# Run ESLint validation
npm run lint
```

---

## 📂 Project Architecture

```
StudyProgress2.0/
├── public/                     # Static public assets
├── src/
│   ├── assets/                 # SVGs, images, and brand assets
│   ├── components/
│   │   ├── forms/              # Data mutation modals & forms
│   │   │   ├── AddGradeModal.jsx
│   │   │   ├── AddLinkModal.jsx
│   │   │   ├── AddSubjectModal.jsx
│   │   │   ├── EditSettingsModal.jsx
│   │   │   └── ManageSemestersModal.jsx
│   │   ├── layout/             # Layout navigation and wrapper shells
│   │   │   ├── SemesterSelector.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopNav.jsx
│   │   └── ui/                 # Animated, reusable UI primitives
│   │       ├── BackgroundParallax.jsx
│   │       ├── CircularGauge.jsx
│   │       ├── CustomCursor.jsx
│   │       ├── Hover3D.jsx
│   │       ├── InitialLoader.jsx
│   │       ├── Magnetic.jsx
│   │       ├── PageTransition.jsx
│   │       ├── ProgressBar.jsx
│   │       ├── ScrambleText.jsx
│   │       ├── SubjectCard.jsx
│   │       ├── TypewriterText.jsx
│   │       └── WhatIfCalculator.jsx
│   ├── hooks/                  # Custom React hooks (e.g. navigation transitions)
│   ├── pages/                  # Page-level route views
│   │   ├── BulkEntry.jsx       # Multi-row fast grade entry
│   │   ├── Dashboard.jsx       # Academic summary & performance gauges
│   │   ├── Datesheet.jsx       # Exam schedule & countdowns
│   │   ├── Login.jsx           # User authentication screen
│   │   ├── Settings.jsx        # Account & semester configuration
│   │   ├── SubjectDetail.jsx   # Deep dive into individual course metrics
│   │   ├── SubjectsList.jsx    # Card grid of all enrolled subjects
│   │   └── TargetCalculator.jsx# Grade goal & what-if simulator
│   ├── store/
│   │   └── useStore.js         # Zustand centralized store & Firestore sync
│   ├── App.css                 # Custom root scrollbar and animation styling
│   ├── App.jsx                 # Route declarations and protected route guards
│   ├── firebase.js             # Firebase client SDK initialization
│   ├── index.css               # Tailwind CSS 4 directives & global variables
│   └── main.jsx                # React root mount point
├── firestore.rules             # Cloud Firestore security rules
├── vercel.json                 # Vercel deployment routing & HTTP security headers
├── vite.config.js              # Vite configuration
└── package.json                # Project dependencies & scripts
```

---

## 🗄️ Firestore Database Schema

The database relies on user-isolated root collections filtered by `userId`:

| Collection | Key Fields | Description |
| :--- | :--- | :--- |
| `semesters` | `name`, `startDate`, `endDate`, `isDefault`, `userId`, `createdAt` | Semesters defined by the user |
| `subjects` | `name`, `code`, `color`, `creditHours`, `targetScore`, `semesterId`, `links`, `userId` | Courses enrolled within a semester |
| `assessments` | `title`, `type`, `subjectId`, `semesterId`, `obtainedMarks`, `totalMarks`, `weightage`, `date`, `userId` | Individual exams, assignments, quizzes |
| `datesheet` | `subjectId`, `title`, `date`, `startTime`, `endTime`, `room`, `syllabus`, `semesterId`, `userId` | Scheduled exams with timestamps |

---

## 🔒 Security & Firestore Rules

User data isolation is strictly enforced via Firestore Security Rules. Ensure your rules in the Firebase Console match `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Secure semesters
    match /semesters/{document} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // Secure subjects
    match /subjects/{document} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Secure assessments
    match /assessments/{document} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // Secure datesheet
    match /datesheet/{document} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🌐 Deployment (Vercel)

The repository includes a ready-to-use [`vercel.json`](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/vercel.json) configured for Single-Page Application (SPA) rewrites and essential security headers (`HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `CSP`).

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. Set the **Framework Preset** to `Vite`.
4. Add all `VITE_FIREBASE_*` environment variables in the Vercel Project Settings.
5. Click **Deploy**!

---

## 📄 Software Requirements Specification (SRS)

### 1. Purpose & Scope
StudyProgress 2.0 is designed to alleviate student anxiety surrounding grade calculations by automating weighted score computation, tracking multiple semesters, planning datesheets, and providing proactive target simulations.

### 2. Functional Requirements
- **User Authentication**: Secure signup, login, session persistence, and logout.
- **Semester Segregation**: Ability to compartmentalize academic records by distinct semesters.
- **Course & Weight Management**: Set custom weights for assignments, midterms, and finals per subject.
- **Bulk Entry Matrix**: Rapid entry modal allowing simultaneous grade updates across courses.
- **Goal Forecasting**: Algorithmic calculation determining the minimal scores needed on future assessments.
- **Datesheet Management**: Chronological exam planning with real-time countdown timers.

### 3. Non-Functional Requirements
- **Performance**: High FPS animations using GPU acceleration and requestAnimationFrame loops.
- **Data Freshness**: Instantaneous synchronization via Firestore `onSnapshot` real-time listeners.
- **Security**: Client-side input sanitization via DOMPurify and strict backend authorization per UID.

---

## 👨‍💻 Developer & Contributing Guidelines

1. **State Management**:
   - Access and mutate global data through `src/store/useStore.js`.
   - Keep Firestore snapshot subscriptions clean and detach on logout.
2. **Animation Cleanups**:
   - When writing GSAP animations inside React components, always use `useGSAP()` with proper scoping and cleanup to prevent memory leaks.
3. **Styling**:
   - Write clean Tailwind CSS utility classes. Avoid arbitrary CSS files unless setting up global CSS custom properties or third-party library overrides.
4. **Code Quality**:
   - Run `npm run lint` before committing any changes.

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
