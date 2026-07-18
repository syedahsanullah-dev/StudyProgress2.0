import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { db, auth } from '../../firebase';
import { collection, getDocs, writeBatch, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { Plus, Trash2, Save, Loader2, CheckCircle, BookOpen, Trophy, FileJson, Info } from 'lucide-react';

export default function BulkEntry() {
  const [activeTab, setActiveTab] = useState('assessments'); // 'assessments', 'subjects', or 'json'
  const [subjects, setSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Assessment Rows
  const [assessmentRows, setAssessmentRows] = useState([
    { id: Date.now(), subjectId: '', title: '', type: 'Assignment', scoreReceived: '', totalPossibleScore: '100' }
  ]);

  // Subject Rows
  const [subjectRows, setSubjectRows] = useState([
    { id: Date.now(), name: '', isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }
  ]);

  // JSON Input State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showExample, setShowExample] = useState(false);

  const exampleJson = `[
  {
    "name": "Advanced Programming",
    "isCodingSubject": true,
    "lecturesTotal": 45,
    "handoutsTotal": 45,
    "understandingTotal": 10,
    "assessments": [
      {
        "title": "Assignment 1",
        "type": "Assignment",
        "scoreReceived": 18,
        "totalPossibleScore": 20
      },
      {
        "title": "Midterm Exam",
        "type": "Midterm",
        "scoreReceived": 45,
        "totalPossibleScore": 50
      }
    ]
  }
]`;

  // Fetch subjects once so we can populate the dropdowns
  useEffect(() => {
    const fetchSubjects = async () => {
      const q = query(collection(db, 'subjects'), where("userId", "==", auth.currentUser?.uid));
      const querySnapshot = await getDocs(q);
      const subs = [];
      querySnapshot.forEach((doc) => {
        subs.push({ id: doc.id, name: doc.data().name });
      });
      setSubjects(subs);
    };
    if (auth.currentUser) fetchSubjects();
  }, []);

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
    setSubjectRows([...subjectRows, { id: Date.now(), name: '', isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }]);
  };

  const removeSubjectRow = (id) => {
    if (subjectRows.length === 1) return;
    setSubjectRows(subjectRows.filter(row => row.id !== id));
  };

  const handleSubjectChange = (id, field, value) => {
    setSubjectRows(subjectRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async () => {
    // Validation
    setJsonError('');
    let parsedJson = null;

    if (activeTab === 'assessments') {
      const isFilled = assessmentRows.every(r => r.subjectId && r.title && r.scoreReceived !== '' && r.totalPossibleScore !== '');
      if (!isFilled) {
        alert("Please fill out all fields in every row before saving.");
        return;
      }
      const isPositive = assessmentRows.every(r => Number(r.scoreReceived) >= 0 && Number(r.totalPossibleScore) > 0);
      if (!isPositive) {
        alert("Scores cannot be negative, and total possible score must be greater than zero.");
        return;
      }
      const isLogical = assessmentRows.every(r => Number(r.scoreReceived) <= Number(r.totalPossibleScore));
      if (!isLogical) {
        alert("Received score cannot be greater than the total possible score.");
        return;
      }
    } else if (activeTab === 'subjects') {
      const isFilled = subjectRows.every(r => r.name.trim() && r.lecturesTotal !== '' && r.handoutsTotal !== '' && r.understandingTotal !== '');
      if (!isFilled) {
        alert("Please fill out all fields in every row before saving.");
        return;
      }
      const isPositive = subjectRows.every(r => Number(r.lecturesTotal) >= 0 && Number(r.handoutsTotal) >= 0 && Number(r.understandingTotal) >= 0);
      if (!isPositive) {
        alert("Subject totals cannot be negative.");
        return;
      }
    } else if (activeTab === 'json') {
      if (!jsonInput.trim()) {
        setJsonError("JSON input cannot be empty.");
        return;
      }
      try {
        parsedJson = JSON.parse(jsonInput);
        if (!Array.isArray(parsedJson)) {
          setJsonError("JSON must be an array of subject objects.");
          return;
        }
      } catch (err) {
        setJsonError("Invalid JSON format. Please check syntax.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      if (activeTab === 'assessments') {
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
        parsedJson.forEach((subject) => {
          const newSubjectRef = doc(collection(db, 'subjects'));
          
          const lecTotal = subject.lecturesTotal ? Number(subject.lecturesTotal) : 45;
          const handTotal = subject.handoutsTotal ? Number(subject.handoutsTotal) : 45;
          const undTotal = subject.understandingTotal ? Number(subject.understandingTotal) : 10;
          
          const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
          const scheme = subject.gradingScheme || defaultScheme;
          const creds = subject.creditHours !== undefined ? Number(subject.creditHours) : 3;

          batch.set(newSubjectRef, {
            name: subject.name ? subject.name.trim() : 'Unnamed Subject',
            userId: auth.currentUser.uid,
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
            grade: 'N/A',
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
      
      setSuccess(true);

      if (activeTab === 'subjects' || activeTab === 'json') {
        const q = query(collection(db, 'subjects'), where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const subs = [];
        querySnapshot.forEach((doc) => {
          subs.push({ id: doc.id, name: doc.data().name });
        });
        setSubjects(subs);
      }

      setTimeout(() => {
        setSuccess(false);
        if (activeTab === 'assessments') {
          setAssessmentRows([{ id: Date.now(), subjectId: '', title: '', type: 'Assignment', scoreReceived: '', totalPossibleScore: '100' }]);
        } else if (activeTab === 'subjects') {
          setSubjectRows([{ id: Date.now(), name: '', isCodingSubject: false, lecturesTotal: '45', handoutsTotal: '45', understandingTotal: '10' }]);
        } else if (activeTab === 'json') {
          setJsonInput('');
        }
      }, 2000);

    } catch (error) {
      console.error("Error saving bulk data:", error);
      alert("An error occurred while saving.");
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
              <p className="text-slate-400 text-sm mt-1">Add multiple records at once to save time.</p>
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
              {success ? 'Saved!' : `Save ${activeTab === 'assessments' ? 'Assessments' : activeTab === 'subjects' ? 'Subjects' : 'JSON'}`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 w-full md:max-w-2xl">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'assessments' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Trophy size={16} /> <span className="hidden sm:inline">Assessments</span><span className="sm:hidden">Grades</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'subjects' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BookOpen size={16} /> Subjects
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'json' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileJson size={16} /> <span className="hidden sm:inline">JSON Import</span><span className="sm:hidden">JSON</span>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl">
            <div className="w-full">
              
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
                        
                        {/* Mobile Delete Button */}
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
                            {subjects.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
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
                            <option value="Project">Project</option>
                          </select>
                        </div>
                        
                        <div className="flex w-full gap-3 md:contents">
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Score Earned</label>
                            <input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={row.scoreReceived}
                              onChange={(e) => handleAssessmentChange(row.id, 'scoreReceived', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm text-center font-bold text-emerald-400"
                            />
                          </div>
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Total Points</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.totalPossibleScore}
                              onChange={(e) => handleAssessmentChange(row.id, 'totalPossibleScore', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm text-center"
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
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium rounded-xl transition-colors border border-slate-700"
                  >
                    <Plus size={16} /> Add Assessment
                  </button>
                </>
              )}

              {activeTab === 'subjects' && (
                <>
                  <div className="hidden md:grid grid-cols-12 gap-4 mb-4 px-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Subject Name</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-1 text-center">Lectures</div>
                    <div className="col-span-1 text-center">Handouts</div>
                    <div className="col-span-2 text-center">Practice</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  <div className="space-y-4 md:space-y-3">
                    {subjectRows.map((row) => (
                      <div key={row.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center bg-slate-800/40 p-4 md:p-2 rounded-xl border border-slate-700/50 relative">
                        
                        {/* Mobile Delete Button */}
                        <div className="md:hidden absolute top-4 right-4">
                          <button 
                            onClick={() => removeSubjectRow(row.id)}
                            disabled={subjectRows.length === 1}
                            className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-md transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="w-full md:col-span-4 pr-8 md:pr-0">
                          <label className="md:hidden block text-xs font-bold text-slate-400 mb-1">Subject Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Data Structures"
                            value={row.name}
                            onChange={(e) => handleSubjectChange(row.id, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div className="w-full md:col-span-3">
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
                        
                        <div className="flex w-full gap-3 md:contents">
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Lectures</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.lecturesTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'lecturesTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-2 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                          <div className="flex-1 md:col-span-1">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Handouts</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.handoutsTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'handoutsTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-2 focus:outline-none focus:border-indigo-500 text-sm text-center"
                            />
                          </div>
                          <div className="flex-1 md:col-span-2">
                            <label className="md:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">Practice</label>
                            <input 
                              type="number" 
                              min="1"
                              value={row.understandingTotal}
                              onChange={(e) => handleSubjectChange(row.id, 'understandingTotal', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-2 focus:outline-none focus:border-indigo-500 text-sm text-center"
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
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium rounded-xl transition-colors border border-slate-700"
                  >
                    <Plus size={16} /> Add Subject
                  </button>
                </>
              )}

              {activeTab === 'json' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm hidden sm:block">Paste your structured JSON array here to instantly create subjects and their assessments.</p>
                    <p className="text-slate-400 text-sm sm:hidden">Paste JSON to create subjects.</p>
                    <button 
                      onClick={() => setShowExample(!showExample)}
                      className="flex items-center gap-1 sm:gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                    >
                      <Info size={16} /> <span className="hidden sm:inline">{showExample ? 'Hide Example' : 'Show Example'}</span>
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
                    placeholder="[\n  {\n    'name': 'Data Structures',\n    'assessments': []\n  }\n]"
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