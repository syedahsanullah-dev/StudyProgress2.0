# Multi-Semester System Architecture & Migration Plan

Transform the StudyProgress 2.0 application from a single-semester tracking tool into a comprehensive, multi-semester academic platform capable of tracking individual term performance (SGPA), cumulative degree performance (CGPA), semester progression trends, and historical academic records.

---

## User Review Required

> [!IMPORTANT]
> **Data Migration & Backward Compatibility**:
> Existing subjects currently in Firestore do not possess a `semesterId`. We will implement a zero-downtime auto-migration strategy: upon user login, if no semesters exist or subjects are unassigned, an initial default semester (e.g., *"Fall 2026"* or *"Semester 1"*) will be provisioned, and all legacy subjects will be seamlessly associated with it.

> [!IMPORTANT]
> **Firestore Security Rules Update**:
> A new collection `semesters` will be added to Firestore. Updated rules must be deployed to secure this collection per user (`userId == request.auth.uid`).

---

## Architecture & Data Model

### 1. Database Schema (`Firestore`)

#### `semesters` (New Collection)
```typescript
interface Semester {
  id: string;              // Firestore Document ID
  userId: string;          // User ID (Auth UID)
  name: string;            // e.g., "Fall 2026", "Semester 4", "Spring 2025"
  termCode?: string;       // Optional short code (e.g., "FA26")
  isCurrent: boolean;      // Whether this is the active semester
  order: number;           // Sequential order for sorting (1, 2, 3, ...)
  status: 'active' | 'completed' | 'upcoming'; // Academic status
  startDate?: string;      // ISO date string (optional)
  endDate?: string;        // ISO date string (optional)
  targetSGPA?: number;     // Optional semester target GPA (e.g., 3.80)
  createdAt: Timestamp;    // Server timestamp
}
```

#### `subjects` (Updated Schema)
```typescript
interface Subject {
  id: string;
  userId: string;
  semesterId: string;      // [NEW] Foreign Key referencing `semesters.id`
  name: string;
  isCodingSubject: boolean;
  creditHours: number;
  gradingScheme: {
    Quiz: number;
    Assignment: number;
    GDB: number;
    Midterm: number;
    Final: number;
    Project: number;
  };
  // Progress metrics
  lecturesCurrent: number;
  lecturesTotal: number;
  handoutsCurrent: number;
  handoutsTotal: number;
  understandingCurrent: number;
  understandingTotal: number;
  currentProgress: number;
  totalProgress: number;
  grade: string;
  links: Array<{ id: string; title: string; url: string; type: string }>;
  notes: Array<{ id: string; title: string; content: string; createdAt: string }>;
  customRequirements?: Array<{ id: string; label: string; current: number; total: number }>;
  createdAt: Timestamp;
}
```

#### `datesheet` (Dynamic Firestore Collection Migration)
```typescript
interface DatesheetItem {
  id: string;
  userId: string;
  semesterId: string;      // [NEW] Ties exams to a specific semester
  course: string;
  date: string;            // e.g., "Tuesday, July 28, 2026"
  time: string;            // e.g., "Start Time: 12:00 pm"
  status: 'CONFIRMED' | 'TENTATIVE';
  createdAt: Timestamp;
}
```

---

## Core Calculations & Metric Engine

```mermaid
graph TD
    A[Firestore DB: Subjects & Assessments] --> B[Zustand Store: useStore]
    B --> C[Active Semester Selector]
    C -->|Filter by active semesterId| D[Active Term View: SGPA & Active Subjects]
    B -->|All Semesters aggregation| E[Cumulative Degree View: CGPA & Trend History]
    
    subgraph Semester GPA (SGPA) Calculation
        D --> F["Sum(Subject GPA * Subject Credit Hours) / Sum(Term Credit Hours)"]
    end
    
    subgraph Cumulative GPA (CGPA) Calculation
        E --> G["Sum(All Subjects GPA * Credit Hours) / Sum(All Completed Credit Hours)"]
    end
```

1. **Semester GPA (SGPA)**:
   $$\text{SGPA} = \frac{\sum_{i \in \text{Semester Subjects}} (\text{GPA}_i \times \text{CreditHours}_i)}{\sum_{i \in \text{Semester Subjects}} \text{CreditHours}_i}$$

2. **Cumulative GPA (CGPA)**:
   $$\text{CGPA} = \frac{\sum_{j \in \text{All Completed/Active Subjects}} (\text{GPA}_j \times \text{CreditHours}_j)}{\sum_{j \in \text{All Completed/Active Subjects}} \text{CreditHours}_j}$$

3. **Academic Standing & Progression**:
   - Track total degree credits completed vs credits in progress.
   - Semester-by-semester SGPA progression graph with CGPA benchmark line.

---

## Proposed Changes

### Global State & Data Layer

#### [MODIFY] [useStore.js](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/store/useStore.js)
- Add `semesters: []` to the global state.
- Add `activeSemesterId: string | null` with persistence in `localStorage`.
- Add listener for `semesters` Firestore collection (`where("userId", "==", uid)` ordered by `order`).
- Add auto-migration logic: if user has subjects but 0 semesters, generate default semester and bulk-assign subjects.
- Add store actions:
  - `setActiveSemester(semesterId)`
  - `addSemester(semesterData)`
  - `updateSemester(semesterId, data)`
  - `deleteSemester(semesterId)` (with cascade option or re-assignment)
  - `getSemesterStats(semesterId)`
  - `getCumulativeStats()`

#### [MODIFY] [firestore.rules](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/firestore.rules)
- Add security rules for `/semesters/{document}` and `/datesheet/{document}` allowing CRUD only when `request.auth.uid == resource.data.userId` / `request.resource.data.userId`.

---

### Layout & Global Components

#### [NEW] [SemesterSelector.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/layout/SemesterSelector.jsx)
- Interactive dropdown placed in the `TopNav` and accessible on mobile.
- Shows current semester name, status badge (*Active*, *Completed*), and quick switch.
- Includes quick actions: `+ Add New Semester` and `Manage Semesters`.
- Includes an "All Semesters (Degree Overview)" option.

#### [MODIFY] [TopNav.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/layout/TopNav.jsx)
- Replace static "Fall 2026 Term" text with the new `<SemesterSelector />` component.
- Display current active semester with term status indicator.

#### [MODIFY] [Sidebar.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/layout/Sidebar.jsx)
- Add quick semester badge/indicator or tooltip.
- Add navigation item or sub-link for Semester Management.

---

### UI & Modal Components

#### [NEW] [ManageSemestersModal.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/forms/ManageSemestersModal.jsx)
- Full semester lifecycle management:
  - Add new semesters (name, term, order, target SGPA, status).
  - Edit existing semester details.
  - Set active/current semester.
  - Mark semesters as *Completed*, *Active*, or *Upcoming*.
  - Delete semester with warning and handling of linked subjects.

#### [MODIFY] [AddSubjectModal.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/forms/AddSubjectModal.jsx)
- Add **Semester Picker** dropdown (defaults to currently active semester).
- Add inline quick-add button for creating a new semester without leaving the modal.
- Save `semesterId` with the subject payload.

#### [MODIFY] [EditSettingsModal.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/components/forms/EditSettingsModal.jsx)
- Allow transferring/reassigning a subject to a different semester.

---

### Pages & Views

#### [MODIFY] [Dashboard.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/Dashboard.jsx)
- **Dual Gauge / Summary**:
  - Show **Active Semester SGPA** alongside **Overall Cumulative CGPA**.
  - Show Term Credits vs Total Degree Credits.
- **Semester Progression Analytics**:
  - Add Recharts multi-semester bar/line chart displaying SGPA progression across all terms.
- **Filtered Subject Grid**:
  - Display subjects belonging to the currently selected semester with an option to view all.

#### [MODIFY] [SubjectsList.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/SubjectsList.jsx)
- Add **Semester Tabs Header** allowing smooth switching between terms (`All`, `Semester 1`, `Semester 2`, ...).
- Display semester summary bar above subject cards: Total Credit Hours, Attempted Weight, and Term SGPA.
- Filter cards seamlessly with GSAP animations on tab change.

#### [MODIFY] [TargetCalculator.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/TargetCalculator.jsx)
- Add **Calculation Scope Switcher**:
  1. *Semester Mode*: Calculate target grades needed for current semester courses to achieve target SGPA.
  2. *Degree Mode*: Calculate what SGPA is needed in current & future semesters to achieve a target graduation CGPA (e.g., target 3.50+ CGPA for honors).

#### [MODIFY] [BulkEntry.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/BulkEntry.jsx)
- Group subject dropdowns by semester in Assessment Entry.
- Add Semester selection column in Subject Entry.
- Update JSON import format to accept `semester` / `semesterId` properties.

#### [MODIFY] [Datesheet.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/Datesheet.jsx)
- Filter exam schedules by semester.
- Enable dynamic creation and editing of datesheet entries stored in Firestore.

#### [MODIFY] [Settings.jsx](file:///d:/MyGithubRepos/Backups/StudyProgress2.0/src/pages/Settings.jsx)
- Add dedicated **Academic & Semester Management** section.
- Update Data Export to include `semesters` in the JSON backup.
- Update Factory Reset to purge `semesters` collection.

---

## Verification Plan

### Automated & Manual Test Scenarios

1. **Auto-Migration Test**:
   - Open app with existing user data (subjects without `semesterId`).
   - Verify that an initial default semester is generated in Firestore.
   - Verify all legacy subjects are assigned to this semester without data loss.

2. **Semester CRUD Verification**:
   - Create 3 semesters (e.g., "Fall 2025", "Spring 2026", "Fall 2026").
   - Switch active semester using `TopNav` selector; confirm state updates across all pages.
   - Add subjects to different semesters and verify proper filtering on `SubjectsList` and `Dashboard`.

3. **SGPA vs CGPA Math Validation**:
   - Populate subjects with known credit hours and grades across 2 distinct semesters.
   - Validate that the Term SGPA matches manual calculation for Semester 1.
   - Validate that the Cumulative CGPA matches total quality points / total credit hours across both semesters.

4. **Target Calculator Modes**:
   - Test current semester target mode vs degree CGPA target projection mode.

5. **JSON Bulk Import & Export**:
   - Export full JSON backup, inspect schema for `semesters` and `semesterId`.
   - Test importing a multi-semester JSON array in `BulkEntry.jsx`.
