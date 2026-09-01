import { create } from 'zustand';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';

const useStore = create((set, get) => ({
  semesters: [],
  subjects: [],
  assessments: [],
  activeSemesterId: localStorage.getItem('activeSemesterId') || null,
  loading: true,
  unsubscribers: [],

  // Set the currently focused semester (or null / 'all' for degree overview)
  setActiveSemester: (semesterId) => {
    if (semesterId) {
      localStorage.setItem('activeSemesterId', semesterId);
    } else {
      localStorage.removeItem('activeSemesterId');
    }
    set({ activeSemesterId: semesterId });
  },

  initialize: (uid) => {
    get().clearStore();
    if (!uid) return;

    // 1. Listen to Semesters
    const qSemesters = query(collection(db, 'semesters'), where("userId", "==", uid));
    const unsubSemesters = onSnapshot(qSemesters, async (snapshot) => {
      const sems = [];
      snapshot.forEach(docSnap => sems.push({ id: docSnap.id, ...docSnap.data() }));

      // Client-side sort by order or creation time
      sems.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      // Auto-set active semester if not set or invalid
      const currentActive = get().activeSemesterId;
      if (sems.length > 0) {
        const isValid = sems.some(s => s.id === currentActive) || currentActive === 'all';
        if (!isValid) {
          const defaultSem = sems.find(s => s.isCurrent) || sems[0];
          const newActiveId = defaultSem ? defaultSem.id : sems[0].id;
          localStorage.setItem('activeSemesterId', newActiveId);
          set({ activeSemesterId: newActiveId });
        }
      }

      set({ semesters: sems });
    });

    // 2. Listen to Subjects
    const qSubjects = query(collection(db, 'subjects'), where("userId", "==", uid));
    const unsubSubjects = onSnapshot(qSubjects, async (snapshot) => {
      const subs = [];
      snapshot.forEach(docSnap => subs.push({ id: docSnap.id, ...docSnap.data() }));

      // Sort client-side by creation time
      subs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });

      // Auto-Migration Check: If user has subjects but no semesters or unassigned subjects
      const currentSemesters = get().semesters;
      if (subs.length > 0) {
        // If 0 semesters exist, auto-create a default semester and assign subjects
        if (currentSemesters.length === 0) {
          try {
            const semRef = await addDoc(collection(db, 'semesters'), {
              name: 'Fall 2026',
              userId: uid,
              isCurrent: true,
              order: 1,
              status: 'active',
              targetSGPA: 3.50,
              createdAt: serverTimestamp()
            });

            // Batch update existing subjects to belong to this new semester
            const batch = writeBatch(db);
            subs.forEach(s => {
              if (!s.semesterId) {
                const subRef = doc(db, 'subjects', s.id);
                batch.update(subRef, { semesterId: semRef.id });
              }
            });
            await batch.commit();
            localStorage.setItem('activeSemesterId', semRef.id);
            set({ activeSemesterId: semRef.id });
          } catch (err) {
            console.error("Auto-migration error creating initial semester:", err);
          }
        } else {
          // If semesters exist but some subjects lack semesterId, assign them to the current or first semester
          const defaultSemId = currentSemesters.find(s => s.isCurrent)?.id || currentSemesters[0]?.id;
          if (defaultSemId) {
            const unassigned = subs.filter(s => !s.semesterId);
            if (unassigned.length > 0) {
              const batch = writeBatch(db);
              unassigned.forEach(s => {
                const subRef = doc(db, 'subjects', s.id);
                batch.update(subRef, { semesterId: defaultSemId });
              });
              batch.commit().catch(e => console.error("Auto-assigning unassigned subjects error:", e));
            }
          }
        }
      }

      set({ subjects: subs });
    });

    // 3. Listen to Assessments
    const qAssessments = query(collection(db, 'assessments'), where("userId", "==", uid));
    const unsubAssessments = onSnapshot(qAssessments, (snapshot) => {
      const asts = [];
      snapshot.forEach(docSnap => asts.push({ id: docSnap.id, ...docSnap.data() }));
      set({ assessments: asts, loading: false });
    });

    set({ unsubscribers: [unsubSemesters, unsubSubjects, unsubAssessments] });
  },

  // Add a new semester
  addSemester: async (semesterData) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const newSem = {
      name: semesterData.name || 'New Semester',
      userId: uid,
      isCurrent: !!semesterData.isCurrent,
      order: Number(semesterData.order) || (get().semesters.length + 1),
      status: semesterData.status || 'active', // 'active' | 'completed' | 'upcoming'
      targetSGPA: Number(semesterData.targetSGPA) || 3.50,
      createdAt: serverTimestamp()
    };

    if (newSem.isCurrent) {
      // Unset isCurrent on other semesters
      const batch = writeBatch(db);
      get().semesters.forEach(s => {
        if (s.isCurrent) {
          batch.update(doc(db, 'semesters', s.id), { isCurrent: false });
        }
      });
      await batch.commit();
    }

    const docRef = await addDoc(collection(db, 'semesters'), newSem);
    if (newSem.isCurrent || get().semesters.length === 0) {
      get().setActiveSemester(docRef.id);
    }
    return docRef.id;
  },

  // Update a semester
  updateSemester: async (semesterId, updates) => {
    if (!semesterId) return;
    const batch = writeBatch(db);
    
    if (updates.isCurrent) {
      get().semesters.forEach(s => {
        if (s.id !== semesterId && s.isCurrent) {
          batch.update(doc(db, 'semesters', s.id), { isCurrent: false });
        }
      });
    }

    const semRef = doc(db, 'semesters', semesterId);
    batch.update(semRef, updates);
    await batch.commit();
  },

  // Delete a semester with options: delete_subjects (cascade), reassign, or unassign
  deleteSemester: async (semesterId, deleteOption = 'delete_subjects', reassignToSemesterId = null) => {
    if (!semesterId) return;
    const batch = writeBatch(db);

    const linkedSubjects = get().subjects.filter(s => s.semesterId === semesterId);
    const linkedSubjectIds = linkedSubjects.map(s => s.id);
    const linkedAssessments = get().assessments.filter(a => linkedSubjectIds.includes(a.subjectId));

    if (deleteOption === 'delete_subjects') {
      // Cascade delete: delete all assessments belonging to these subjects
      linkedAssessments.forEach(a => {
        batch.delete(doc(db, 'assessments', a.id));
      });
      // Delete all subjects
      linkedSubjects.forEach(s => {
        batch.delete(doc(db, 'subjects', s.id));
      });
    } else if (deleteOption === 'reassign' && reassignToSemesterId) {
      linkedSubjects.forEach(s => {
        batch.update(doc(db, 'subjects', s.id), { semesterId: reassignToSemesterId });
      });
    } else {
      // 'unassign' - keep subjects but unassign them from any semester
      linkedSubjects.forEach(s => {
        batch.update(doc(db, 'subjects', s.id), { semesterId: null });
      });
    }

    batch.delete(doc(db, 'semesters', semesterId));
    await batch.commit();

    if (get().activeSemesterId === semesterId) {
      const remaining = get().semesters.filter(s => s.id !== semesterId);
      const nextSem = remaining.find(s => s.isCurrent) || remaining[0];
      get().setActiveSemester(nextSem ? nextSem.id : null);
    }
  },

  // Add an assessment
  addAssessment: async (assessmentData) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const newAssessment = {
      subjectId: assessmentData.subjectId,
      userId: uid,
      title: assessmentData.title?.trim() || 'Untitled Assessment',
      type: assessmentData.type || 'Quiz',
      scoreReceived: Number(assessmentData.scoreReceived) || 0,
      totalPossibleScore: Number(assessmentData.totalPossibleScore) || 100,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'assessments'), newAssessment);
    return docRef.id;
  },

  // Update an existing assessment
  updateAssessment: async (assessmentId, updates) => {
    if (!assessmentId) return;
    const cleanedUpdates = {};
    if (updates.title !== undefined) cleanedUpdates.title = updates.title.trim();
    if (updates.type !== undefined) cleanedUpdates.type = updates.type;
    if (updates.scoreReceived !== undefined) cleanedUpdates.scoreReceived = Number(updates.scoreReceived);
    if (updates.totalPossibleScore !== undefined) cleanedUpdates.totalPossibleScore = Number(updates.totalPossibleScore);
    if (updates.subjectId !== undefined) cleanedUpdates.subjectId = updates.subjectId;
    cleanedUpdates.updatedAt = serverTimestamp();

    const astRef = doc(db, 'assessments', assessmentId);
    await updateDoc(astRef, cleanedUpdates);
  },

  // Delete an assessment
  deleteAssessment: async (assessmentId) => {
    if (!assessmentId) return;
    await deleteDoc(doc(db, 'assessments', assessmentId));
  },

  // Full Firestore Data Backup & Download Function
  downloadAllData: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("You must be logged in to download data.");
      return;
    }

    try {
      // Direct fresh queries from Firestore to ensure 100% data integrity
      const [semSnap, subSnap, astSnap] = await Promise.all([
        getDocs(query(collection(db, 'semesters'), where("userId", "==", uid))),
        getDocs(query(collection(db, 'subjects'), where("userId", "==", uid))),
        getDocs(query(collection(db, 'assessments'), where("userId", "==", uid)))
      ]);

      const semesters = [];
      semSnap.forEach(d => semesters.push({ id: d.id, ...d.data() }));

      const subjects = [];
      subSnap.forEach(d => subjects.push({ id: d.id, ...d.data() }));

      const assessments = [];
      astSnap.forEach(d => assessments.push({ id: d.id, ...d.data() }));

      const exportPayload = {
        app: "StudyProgress 2.0 - Student Dashboard",
        version: "2.0-multi-semester",
        exportTimestamp: new Date().toISOString(),
        exportedBy: {
          uid: uid,
          email: auth.currentUser?.email || null,
          displayName: auth.currentUser?.displayName || null
        },
        stats: {
          totalSemesters: semesters.length,
          totalSubjects: subjects.length,
          totalAssessments: assessments.length
        },
        data: {
          semesters,
          subjects,
          assessments
        }
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const fileName = `StudyProgress_FullBackup_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error("Error downloading complete Firestore backup:", err);
      alert("Failed to export Firestore data: " + err.message);
      return false;
    }
  },

  clearStore: () => {
    const { unsubscribers } = get();
    unsubscribers.forEach(unsub => unsub());
    set({ 
      semesters: [], 
      subjects: [], 
      assessments: [], 
      loading: true, 
      unsubscribers: [] 
    });
  }
}));

export default useStore;

