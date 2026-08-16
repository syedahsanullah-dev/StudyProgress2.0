import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { db, auth } from '../../firebase';
import { collection, getDocs, writeBatch, doc, serverTimestamp, query, where, addDoc } from 'firebase/firestore';
import { Plus, Trash2, Save, Loader2, CheckCircle, BookOpen, Trophy, FileJson, Info, Layers, Sparkles, Calendar } from 'lucide-react';
import useStore from '../store/useStore';

export default function BulkEntry() {
  const { semesters, subjects: storeSubjects, activeSemesterId } = useStore();
  const [activeTab, setActiveTab] = useState('semesters'); // 'semesters', 'subjects', 'assessments', or 'json'
  const [subjects, setSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultSemId = (activeSemesterId && activeSemesterId !== 'all') 
    ? activeSemesterId 
    : (semesters[0]?.id || '');

  // Semester Rows
  const [semesterRows, setSemesterRows] = useState([
    { id: Date.now(), name: '', status: 'active', targetSGPA: '3.50', order: semesters.length + 1, isCurrent: false }
  ]);
  
  // Assessment Rows
  const [assessmentRows, setAssessmentRows] = useState([
    { id: Date.now(), subjectId: '', title: '', type: 'Assignment', scoreReceived: '', totalPossibleScore: '100' }
  ]);

  // Subject Rows
  const [subjectRows, setSubjectRows] = useState([
    { id: Date.now(), name: '', semesterId: defaultSemId, isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }
  ]);

  // JSON Input State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showExample, setShowExample] = useState(false);

  const exampleJson = `// Option 1: Combined Semesters & Subjects
{
  "semesters": [
    { "name": "Fall 2022", "status": "completed", "targetSGPA": 3.50, "order": 1 },
    { "name": "Spring 2023", "status": "completed", "targetSGPA": 3.50, "order": 2 }
  ],
  "subjects": [
    {
      "name": "CS101 - Introduction to Computing",
      "semester": "Fall 2022",
      "creditHours": 3,
      "isCodingSubject": true,
      "grade": "A-",
      "gradePoints": 3.87
    }
  ]
}

// Option 2: Array of Subjects
[
  {
    "name": "CS201 - Introduction to Programming",
    "semester": "Spring 2023",
    "creditHours": 3,
    "grade": "A-",
    "gradePoints": 3.73
  }
]

// Option 3: Array of Semesters
[
  { "name": "Fall 2022", "status": "completed", "targetSGPA": 3.50, "order": 1 },
  { "name": "Spring 2023", "status": "completed", "targetSGPA": 3.50, "order": 2 }
]`;

  // Fetch subjects once so we can populate dropdowns
  useEffect(() => {
    if (storeSubjects && storeSubjects.length > 0) {
      setSubjects(storeSubjects);
    } else {
      const fetchSubjects = async () => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'subjects'), where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const subs = [];
        querySnapshot.forEach((doc) => {
          subs.push({ id: doc.id, ...doc.data() });
        });
        setSubjects(subs);
      };
      if (auth.currentUser) fetchSubjects();
    }
  }, [storeSubjects]);

  // Semester Row Handlers
  const addSemesterRow = () => {
    const nextOrder = semesterRows.length > 0 
      ? Math.max(...semesterRows.map(r => Number(r.order) || 0)) + 1 
      : semesters.length + 1;

    setSemesterRows([
      ...semesterRows, 
      { id: Date.now(), name: '', status: 'active', targetSGPA: '3.50', order: nextOrder, isCurrent: false }
    ]);
  };

  const removeSemesterRow = (id) => {
    if (semesterRows.length === 1) return;
    setSemesterRows(semesterRows.filter(r => r.id !== id));
  };

  const handleSemesterChange = (id, field, value) => {
    setSemesterRows(semesterRows.map(row => {
      if (row.id === id) {
        if (field === 'isCurrent' && value === true) {
          return { ...row, isCurrent: true };
        }
        return { ...row, [field]: value };
      }
      if (field === 'isCurrent' && value === true) {
        return { ...row, isCurrent: false };
      }
      return row;
    }));
  };

  // Quick 8 Semesters Template Generator
  const generate8Semesters = (startYear = 2022) => {
    const generated = [];
    let year = Number(startYear) || 2022;
    let isFall = true;

    for (let i = 1; i <= 8; i++) {
      const termName = isFall ? `Fall ${year}` : `Spring ${year}`;
      generated.push({
        id: Date.now() + i,
        name: termName,
        status: i <= 6 ? 'completed' : i === 7 ? 'active' : 'upcoming',
        targetSGPA: '3.50',
        order: i,
        isCurrent: i === 7
      });

      if (!isFall) {
        year += 1;
      }
      isFall = !isFall;
    }

    setSemesterRows(generated);
  };

  const addAssessmentRow = () => {
    setAssessmentRows([...assessmentRows, { id: Date.now(), subjectId: '', title: '', type: 'Assignment', scoreReceived: '', totalPossibleScore: '100' }]);
  };

  const removeAssessmentRow = (id) => {
    if (assessmentRows.length === 1) return;
    setAssessmentRows(assessmentRows.filter(row => row.id !== id));
  };

  const handleAssessmentChange = (id, field, value) => {
    setAssessmentRows(assessmentRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addSubjectRow = () => {
    setSubjectRows([...subjectRows, { id: Date.now(), name: '', semesterId: defaultSemId, isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }]);
  };

  const removeSubjectRow = (id) => {
    if (subjectRows.length === 1) return;
    setSubjectRows(subjectRows.filter(row => row.id !== id));
  };

  const handleSubjectChange = (id, field, value) => {
    setSubjectRows(subjectRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async () => {
    setJsonError('');
    let parsedJson = null;

    if (activeTab === 'semesters') {
      const isFilled = semesterRows.every(r => r.name.trim() !== '');
      if (!isFilled) {
        alert('Please provide a name for all semesters.');
        return;
      }
    } else if (activeTab === 'assessments') {
      const isFilled = assessmentRows.every(r => r.subjectId && r.title && r.scoreReceived !== '' && r.totalPossibleScore !== '');
      if (!isFilled) {
        alert('Please fill out all fields in all rows.');
        return;
      }
    } else if (activeTab === 'subjects') {
      const isFilled = subjectRows.every(r => r.name.trim() !== '' && r.lecturesTotal && r.handoutsTotal && r.understandingTotal);
      if (!isFilled) {
        alert('Please provide a name and targets for all subjects.');
        return;
      }
    } else if (activeTab === 'json') {
      if (!jsonInput.trim()) {
        setJsonError("JSON input cannot be empty.");
        return;
      }
      try {
        parsedJson = JSON.parse(jsonInput);
        if (!Array.isArray(parsedJson) && typeof parsedJson !== 'object') {
          setJsonError('JSON must be an array or an object containing "semesters" / "subjects".');
          return;
        }
      } catch (err) {
        setJsonError('Invalid JSON format: ' + err.message);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      if (activeTab === 'semesters') {
        semesterRows.forEach((row) => {
          const newDocRef = doc(collection(db, 'semesters'));
          batch.set(newDocRef, {
            name: row.name.trim(),
            userId: auth.currentUser.uid,
            status: row.status || 'active',
            targetSGPA: Number(row.targetSGPA) || 3.50,
            order: Number(row.order) || 1,
            isCurrent: !!row.isCurrent,
            createdAt: serverTimestamp()
          });
        });
      } else if (activeTab === 'assessments') {
        assessmentRows.forEach((row) => {
          const newDocRef = doc(collection(db, 'assessments'));
          batch.set(newDocRef, {
            subjectId: row.subjectId,
            userId: auth.currentUser.uid,
            title: row.title,
            type: row.type,
            scoreReceived: Number(row.scoreReceived),
            totalPossibleScore: Number(row.totalPossibleScore),
            createdAt: serverTimestamp()
          });
        });
      } else if (activeTab === 'subjects') {
        subjectRows.forEach((row) => {
          const newDocRef = doc(collection(db, 'subjects'));
          batch.set(newDocRef, {
            name: row.name.trim(),
            userId: auth.currentUser.uid,
            semesterId: row.semesterId || (semesters[0]?.id || null),
            isCodingSubject: row.isCodingSubject,
            creditHours: 3,
            gradingScheme: { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 },
            lecturesCurrent: 0,
            lecturesTotal: Number(row.lecturesTotal),
            handoutsCurrent: 0,
            handoutsTotal: Number(row.handoutsTotal),
            understandingCurrent: 0,
            understandingTotal: Number(row.understandingTotal),
            currentProgress: 0,
            totalProgress: Number(row.lecturesTotal) + Number(row.handoutsTotal) + Number(row.understandingTotal),
            grade: 'N/A',
            links: [],
            createdAt: serverTimestamp()
          });
        });
      } else if (activeTab === 'json') {
        let jsonSemesters = [];
        let jsonSubjects = [];

        if (Array.isArray(parsedJson)) {
          const isSemesterArray = parsedJson.length > 0 && parsedJson.every(item => 
            item.name && (item.targetSGPA !== undefined || item.order !== undefined || item.status !== undefined) && !item.creditHours && !item.isCodingSubject
          );

          if (isSemesterArray) {
            jsonSemesters = parsedJson;
          } else {
            jsonSubjects = parsedJson;
          }
        } else if (typeof parsedJson === 'object' && parsedJson !== null) {
          jsonSemesters = Array.isArray(parsedJson.semesters) ? parsedJson.semesters : [];
          jsonSubjects = Array.isArray(parsedJson.subjects) ? parsedJson.subjects : [];
        }

        const semMap = {};
        semesters.forEach(s => {
          if (s.name) semMap[s.name.toLowerCase().trim()] = s.id;
          if (s.id) semMap[s.id] = s.id;
        });

        let currentOrder = semesters.length;
        for (const semItem of jsonSemesters) {
          if (!semItem.name) continue;
          const key = semItem.name.toLowerCase().trim();
          currentOrder += 1;
          const newSemDoc = await addDoc(collection(db, 'semesters'), {
            name: semItem.name.trim(),
            userId: auth.currentUser.uid,
            isCurrent: !!semItem.isCurrent,
            order: semItem.order !== undefined ? Number(semItem.order) : currentOrder,
            status: semItem.status || 'completed',
            targetSGPA: Number(semItem.targetSGPA) || 3.50,
            createdAt: serverTimestamp()
          });
          semMap[key] = newSemDoc.id;
        }

        const uniqueSubSemNames = [];
        jsonSubjects.forEach(item => {
          if (item.semester && typeof item.semester === 'string') {
            const trimmed = item.semester.trim();
            if (!uniqueSubSemNames.includes(trimmed)) {
              uniqueSubSemNames.push(trimmed);
            }
          }
        });

        for (const semName of uniqueSubSemNames) {
          const key = semName.toLowerCase().trim();
          if (!semMap[key]) {
            currentOrder += 1;
            const newSemDoc = await addDoc(collection(db, 'semesters'), {
              name: semName,
              userId: auth.currentUser.uid,
              isCurrent: false,
              order: currentOrder,
              status: 'completed',
              targetSGPA: 3.50,
              createdAt: serverTimestamp()
            });
            semMap[key] = newSemDoc.id;
          }
        }

        jsonSubjects.forEach((subject) => {
          const newSubjectRef = doc(collection(db, 'subjects'));
          const lecTotal = subject.lecturesTotal ? Number(subject.lecturesTotal) : 45;
          const handTotal = subject.handoutsTotal ? Number(subject.handoutsTotal) : 45;
          const undTotal = subject.understandingTotal ? Number(subject.understandingTotal) : 10;
          const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
          const scheme = subject.gradingScheme || defaultScheme;
          const creds = subject.creditHours !== undefined ? Number(subject.creditHours) : 3;
          let targetSemId = semesters[0]?.id || null;
          if (subject.semesterId && semMap[subject.semesterId]) {
            targetSemId = semMap[subject.semesterId];
          } else if (subject.semester && semMap[subject.semester.toLowerCase().trim()]) {
            targetSemId = semMap[subject.semester.toLowerCase().trim()];
          }
          batch.set(newSubjectRef, {
            name: subject.name ? subject.name.trim() : 'Unnamed Subject',
            userId: auth.currentUser.uid,
            semesterId: targetSemId,
            isCodingSubject: !!subject.isCodingSubject,
            creditHours: creds,
            gradingScheme: {
              Quiz: Number(scheme.Quiz || 0),
              Assignment: Number(scheme.Assignment || 0),
              GDB: Number(scheme.GDB || 0),
              Midterm: Number(scheme.Midterm || 0),
              Final: Number(scheme.Final || 0),
              Project: Number(scheme.Project || 0)
            },
            lecturesCurrent: 0,
            lecturesTotal: lecTotal,
            handoutsCurrent: 0,
            handoutsTotal: handTotal,
            understandingCurrent: 0,
            understandingTotal: undTotal,
            currentProgress: 0,
            totalProgress: lecTotal + handTotal + undTotal,
            grade: subject.grade || 'N/A',
            gradePoints: (subject.gradePoints !== undefined && subject.gradePoints !== null) ? Number(subject.gradePoints) : null,
            links: [],
            createdAt: serverTimestamp()
          });
          if (subject.assessments && Array.isArray(subject.assessments)) {
            subject.assessments.forEach((assessment) => {
              const newAssessmentRef = doc(collection(db, 'assessments'));
              batch.set(newAssessmentRef, {
                subjectId: newSubjectRef.id,
                userId: auth.currentUser.uid,
                title: assessment.title || 'Untitled',
                type: assessment.type || 'Assignment',
                scoreReceived: Number(assessment.scoreReceived || 0),
                totalPossibleScore: Number(assessment.totalPossibleScore || 100),
                createdAt: serverTimestamp()
              });
            });
          }
        });
      }

      await batch.commit();
      setIsSubmitting(false);
      setSuccess(true);

      if (activeTab === 'subjects' || activeTab === 'json') {
        const q = query(collection(db, 'subjects'), where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const subs = [];
        querySnapshot.forEach((doc) => {
          subs.push({ id: doc.id, ...doc.data() });
        });
        setSubjects(subs);
      }

      setTimeout(() => {
        setSuccess(false);
        if (activeTab === 'semesters') {
          setSemesterRows([{ id: Date.now(), name: '', status: 'active', targetSGPA: '3.50', order: semesters.length + 1, isCurrent: false }]);
        } else if (activeTab === 'assessments') {
          setAssessmentRows([{ id: Date.now(), subjectId: '', title: '', type: 'Assignment', scoreReceived: '', totalPossibleScore: '100' }]);
        } else if (activeTab === 'subjects') {
          setSubjectRows([{ id: Date.now(), name: '', semesterId: defaultSemId, isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }]);
        } else if (activeTab === 'json') {
          setJsonInput('');
        }
      }, 2000);

    } catch (error) {
      console.error("Error saving bulk data:", error);
      alert("An error occurred while saving: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />
      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen">
        <TopNav title="Bulk Data Entry" />
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Rapid Entry Hub</h1>
              <p className="text-slate-400 text-sm mt-1">Bulk create semesters, subjects, assessments, or import full JSON packages.</p>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || success}
              className={`px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg w-full sm:w-auto ${
                success 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
              }`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 
               success ? <CheckCircle size={20} /> : <Save size={20} />}
              {success ? 'Saved!' : `Save ${activeTab === 'semesters' ? 'Semesters' : activeTab === 'assessments' ? 'Assessments' : activeTab === 'subjects' ? 'Subjects' : 'JSON'}`}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 w-full md:max-w-3xl">
            <button
              onClick={() => setActiveTab('semesters')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'semesters' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Layers size={16} /> Semesters
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'subjects' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BookOpen size={16} /> Subjects
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'assessments' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Trophy size={16} /> Assessments
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'json' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileJson size={16} /> JSON Import
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl">
            <div className="w-full">
              {activeTab === 'semesters' && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Bulk create academic semesters with status, sequence order, and target GPAs.
                    </p>
                    <button
                      onClick={() => generate8Semesters(2022)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      Auto-Fill 8 Semesters (Fall 2022 – Spring 2026)
                    </button>
                  </div>
                  <div className="hidden md:grid grid-cols-12 gap-3 mb-3 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Semester Name</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-center">Target SGPA</div>
                    <div className="col-span-1 text-center">Order</div>
                    <div className="col-span-2 text-center">Default Active</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                  <div className="space-y-3">
                    {semesterRows.map((row) => (
                      <div key={row.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-3 items-start md:items-center bg-slate-800/40 p-4 md:p-2.5 rounded-xl border border-slate-700/50 relative">
                        <div className="md:hidden absolute top-4 right-4">
                          <button 
                            onClick={() => removeSemesterRow(row.id)}
                            disabled={semesterRows.length === 1}
                            className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-md transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="w-full md:col-span-4 pr-8 md:pr-0">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Semester Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Fall 2022 or Semester 1"
                            value={row.name}
                            onChange={(e) => handleSemesterChange(row.id, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                          />
                        </div>
                        <div className="w-full md:col-span-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Status</label>
                          <select 
                            value={row.status}
                            onChange={(e) => handleSemesterChange(row.id, 'status', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-2.5 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                          >
                            <option value="completed">Completed</option>
                            <option value="active">Active</option>
                            <option value="upcoming">Upcoming</option>
                          </select>
                        </div>
                        <div className="w-full md:col-span-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Target SGPA</label>
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            max="4.00"
                            value={row.targetSGPA}
                            onChange={(e) => handleSemesterChange(row.id, 'targetSGPA', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold rounded-lg py-2 px-2 text-center focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div className="w-full md:col-span-1">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Sequence Order</label>
                          <input 
                            type="number"
                            min="1"
                            value={row.order}
                            onChange={(e) => handleSemesterChange(row.id, 'order', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg py-2 px-1 text-center focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div className="w-full md:col-span-2 flex items-center justify-start md:justify-center gap-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400">Current Default Term</label>
                          <input 
                            type="checkbox"
                            checked={row.isCurrent}
                            onChange={(e) => handleSemesterChange(row.id, 'isCurrent', e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div className="hidden md:flex col-span-1 justify-center">
                          <button 
                            onClick={() => removeSemesterRow(row.id)}
                            disabled={semesterRows.length === 1}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addSemesterRow}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium rounded-xl transition-colors border border-slate-700 text-xs sm:text-sm"
                  >
                    <Plus size={16} /> Add Another Semester Row
                  </button>
                </>
              )}
              {activeTab === 'assessments' && (
                <>
                  <div className="hidden md:grid grid-cols-12 gap-4 mb-4 px-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-3">Subject</div>
                    <div className="col-span-3">Title (e.g. Quiz 1)</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Score Earned</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                  <div className="space-y-4 md:space-y-3">
                    {assessmentRows.map((row) => (
                      <div key={row.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center bg-slate-800/40 p-4 md:p-2 rounded-xl border border-slate-700/50 relative">
                        <div className="md:hidden absolute top-4 right-4">
                          <button 
                            onClick={() => removeAssessmentRow(row.id)}
                            disabled={assessmentRows.length === 1}
                            className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-md transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="w-full md:col-span-3 pr-8 md:pr-0">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Subject</label>
                          <select 
                            value={row.subjectId} 
                            onChange={(e) => handleAssessmentChange(row.id, 'subjectId', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            <option value="" disabled>Select Subject...</option>
                            {subjects.map(sub => {
                              const sem = semesters.find(s => s.id === sub.semesterId);
                              return (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} {sem ? `(${sem.name})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="w-full md:col-span-3">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Title</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Midterm Exam"
                            value={row.title}
                            onChange={(e) => handleAssessmentChange(row.id, 'title', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div className="w-full md:col-span-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Type</label>
                          <select 
                            value={row.type}
                            onChange={(e) => handleAssessmentChange(row.id, 'type', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            <option value="Assignment">Assignment</option>
                            <option value="Quiz">Quiz</option>
                            <option value="Midterm">Midterm</option>
                            <option value="Final">Final</option>
                            <option value="GDB">GDB</option>
                            <option value="Project">Project</option>
                          </select>
                        </div>
                        <div className="flex w-full gap-2 md:contents">
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Score</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              min="0"
                              placeholder="e.g. 18.5"
                              value={row.scoreReceived}
                              onChange={(e) => handleAssessmentChange(row.id, 'scoreReceived', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                            />
                          </div>
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Total</label>
                            <input 
                              type="number" 
                              min="1"
                              placeholder="Total"
                              value={row.totalPossibleScore}
                              onChange={(e) => handleAssessmentChange(row.id, 'totalPossibleScore', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-2 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                        </div>
                        <div className="hidden md:flex col-span-1 justify-center">
                          <button 
                            onClick={() => removeAssessmentRow(row.id)}
                            disabled={assessmentRows.length === 1}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addAssessmentRow}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium rounded-xl transition-colors border border-slate-700 text-xs sm:text-sm"
                  >
                    <Plus size={16} /> Add Row
                  </button>
                </>
              )}
              {activeTab === 'subjects' && (
                <>
                  <div className="hidden md:grid grid-cols-12 gap-3 mb-4 px-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-3">Subject Name</div>
                    <div className="col-span-2">Semester</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-1 text-center">Lectures</div>
                    <div className="col-span-1 text-center">Handouts</div>
                    <div className="col-span-2 text-center">Practice</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                  <div className="space-y-4 md:space-y-3">
                    {subjectRows.map((row) => (
                      <div key={row.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-3 items-start md:items-center bg-slate-800/40 p-4 md:p-2 rounded-xl border border-slate-700/50 relative">
                        <div className="md:hidden absolute top-4 right-4">
                          <button 
                            onClick={() => removeSubjectRow(row.id)}
                            disabled={subjectRows.length === 1}
                            className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-md transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="w-full md:col-span-3 pr-8 md:pr-0">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Subject Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Data Structures"
                            value={row.name}
                            onChange={(e) => handleSubjectChange(row.id, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div className="w-full md:col-span-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Semester</label>
                          <select 
                            value={row.semesterId}
                            onChange={(e) => handleSubjectChange(row.id, 'semesterId', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            {semesters.map(sem => (
                              <option key={sem.id} value={sem.id}>{sem.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full md:col-span-2">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Type</label>
                          <select 
                            value={row.isCodingSubject ? "true" : "false"}
                            onChange={(e) => handleSubjectChange(row.id, 'isCodingSubject', e.target.value === "true")}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          >
                            <option value="false">Theory</option>
                            <option value="true">Coding</option>
                          </select>
                        </div>
                        <div className="flex w-full gap-2 md:contents">
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Lectures</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.lecturesTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'lecturesTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-1.5 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Handouts</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.handoutsTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'handoutsTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-1.5 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Practice</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.understandingTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'understandingTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-1.5 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                        </div>
                        <div className="hidden md:flex col-span-1 justify-center">
                          <button 
                            onClick={() => removeSubjectRow(row.id)}
                            disabled={subjectRows.length === 1}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addSubjectRow}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium rounded-xl transition-colors border border-slate-700 text-xs sm:text-sm"
                  >
                    <Plus size={16} /> Add Subject
                  </button>
                </>
              )}
              {activeTab === 'json' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Paste structured JSON (semesters, subjects, or complete degree package) to create records instantly.
                    </p>
                    <button 
                      onClick={() => setShowExample(!showExample)}
                      className="flex items-center gap-1 sm:gap-2 text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm font-medium transition-colors"
                    >
                      <Info size={16} /> <span className="hidden sm:inline">{showExample ? 'Hide Formats' : 'Show Formats'}</span>
                    </button>
                  </div>
                  {showExample && (
                    <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 text-slate-300 text-xs sm:text-sm font-mono whitespace-pre overflow-x-auto">
                      {exampleJson}
                    </div>
                  )}
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="Paste JSON here (e.g. bulk_import.json contents)..."
                    className="w-full h-80 bg-slate-900 border border-slate-700 rounded-xl p-4 text-emerald-400 font-mono text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                    spellCheck="false"
                  />
                  {jsonError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                      {jsonError}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}