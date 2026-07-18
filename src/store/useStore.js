import { create } from 'zustand';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const useStore = create((set, get) => ({
  subjects: [],
  assessments: [],
  loading: true, // true until first fetch completes
  unsubscribers: [],

  initialize: (uid) => {
    // Prevent multiple subscriptions
    get().clearStore();

    if (!uid) return;

    // Listen to Subjects
    const qSubjects = query(collection(db, 'subjects'), where("userId", "==", uid));
    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      const subs = [];
      snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
      
      // Sort client-side to bypass Firebase composite index requirement
      subs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB; // Ascending
      });
      
      set({ subjects: subs });
    });

    // Listen to Assessments
    const qAssessments = query(collection(db, 'assessments'), where("userId", "==", uid));
    const unsubAssessments = onSnapshot(qAssessments, (snapshot) => {
      const asts = [];
      snapshot.forEach(doc => asts.push({ id: doc.id, ...doc.data() }));
      set({ assessments: asts, loading: false }); // Done loading when assessments come in
    });

    set({ unsubscribers: [unsubSubjects, unsubAssessments] });
  },

  clearStore: () => {
    const { unsubscribers } = get();
    unsubscribers.forEach(unsub => unsub()); // Detach all Firebase listeners
    set({ subjects: [], assessments: [], loading: true, unsubscribers: [] });
  }
}));

export default useStore;
