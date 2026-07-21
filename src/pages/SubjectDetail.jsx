import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import ProgressBar from '../components/ui/ProgressBar';
import AddLinkModal from '../components/forms/AddLinkModal';
import AddGradeModal from '../components/forms/AddGradeModal';
import EditSettingsModal from '../components/forms/EditSettingsModal';
import WhatIfCalculator from '../components/ui/WhatIfCalculator';
import DOMPurify from 'dompurify';
import { db } from '../../firebase';
import { doc, collection, query, where, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Terminal, BookOpen, Link as LinkIcon, 
  Plus, FileText, Video, Code, Loader2, Trash2, Settings,
  HelpCircle, MessageSquare, AlertCircle, Star, Save, FileEdit, Check
} from 'lucide-react';
import useStore from '../store/useStore';

import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

const getVUGPA = (percentage) => {
  if (percentage >= 85) return 4.00;
  if (percentage >= 80) return 3.66;
  if (percentage >= 75) return 3.33;
  if (percentage >= 70) return 3.00;
  if (percentage >= 65) return 2.66;
  if (percentage >= 61) return 2.33;
  if (percentage >= 58) return 2.00;
  if (percentage >= 50) return 1.00;
  return 0.00;
};

export default function SubjectDetail() {
  const { id } = useParams();
  const transitionNavigate = useTransitionNavigate();

  const { subjects, assessments: allAssessments, loading } = useStore();
  const subject = subjects.find(s => s.id === id);
  const assessments = useMemo(() => {
    return allAssessments
      .filter(a => a.subjectId === id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allAssessments, id]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');

  // Custom Requirements State
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomTotal, setNewCustomTotal] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const customRequirements = subject?.customRequirements || [];

  const notesArray = useMemo(() => {
    return Array.isArray(subject?.notes) 
      ? subject.notes 
      : (typeof subject?.notes === 'string' && subject.notes.trim() !== '')
        ? [{ id: 'legacy-note', title: 'Imported Note', content: subject.notes, createdAt: new Date().toISOString() }]
        : [];
  }, [subject]);

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      const updatedNotes = notesArray.filter(n => n.id !== noteId);
      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, { notes: updatedNotes });
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note.");
    }
  };

  const handleAddInlineNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const sanitizedTitle = DOMPurify.sanitize(newNoteTitle);
      const sanitizedContent = DOMPurify.sanitize(newNoteContent);
      const newNote = {
        id: Date.now().toString(),
        title: sanitizedTitle,
        content: sanitizedContent,
        createdAt: new Date().toISOString()
      };
      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, { notes: [...notesArray, newNote] });
      setNewNoteTitle('');
      setNewNoteContent('');
    } catch (error) {
      console.error(error);
      alert("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editNoteTitle.trim() || !editNoteContent.trim() || !editingNoteId || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const sanitizedTitle = DOMPurify.sanitize(editNoteTitle);
      const sanitizedContent = DOMPurify.sanitize(editNoteContent);
      
      const updatedNotes = notesArray.map(n => 
        n.id === editingNoteId 
          ? { ...n, title: sanitizedTitle, content: sanitizedContent } 
          : n
      );
      
      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, { notes: updatedNotes });
      setEditingNoteId(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // GPA and Stats Calculation
  const stats = useMemo(() => {
    if (!subject) return null;
    const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
    const scheme = subject.gradingScheme || defaultScheme;
    
    const categoryStats = {};
    assessments.forEach(a => {
      const type = a.type || "Other";
      if (!categoryStats[type]) categoryStats[type] = { earned: 0, total: 0 };
      categoryStats[type].earned += Number(a.scoreReceived);
      categoryStats[type].total += Number(a.totalPossibleScore);
    });

    let totalAttemptedWeight = 0;
    let earnedPercentage = 0; 

    Object.keys(categoryStats).forEach(type => {
      const stat = categoryStats[type];
      const weight = Number(scheme[type]) || 0;
      if (stat.total > 0 && weight > 0) {
        totalAttemptedWeight += weight;
        earnedPercentage += (stat.earned / stat.total) * weight;
      }
    });

    const finalPercentage = totalAttemptedWeight > 0 ? (earnedPercentage / totalAttemptedWeight) * 100 : 0;
    const currentGPA = getVUGPA(finalPercentage);

    return { categoryStats, currentGPA, finalPercentage, totalAttemptedWeight };
  }, [subject, assessments]);

  // --- Delete Subject Logic ---
  const handleDeleteSubject = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this subject? All progress will be lost.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      const qAssessments = query(collection(db, 'assessments'), where('subjectId', '==', id));
      const assessmentsSnap = await getDocs(qAssessments);
      assessmentsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      batch.delete(doc(db, 'subjects', id));
      await batch.commit();
      navigate('/subjects'); 
    } catch (error) {
      console.error("Error deleting subject:", error);
      setIsDeleting(false);
      alert("Failed to delete the subject.");
    }
  };

  const handleProgressUpdate = async (field, change) => {
    if (!subject || isUpdating) return;
    const currentVal = subject[field] || 0;
    const totalField = field.replace('Current', 'Total');
    const defaultMax = field === 'understandingCurrent' ? 10 : 45;
    const totalVal = subject[totalField] || defaultMax; 
    
    const newVal = currentVal + change;
    if (newVal < 0 || newVal > totalVal) return; 

    setIsUpdating(true);
    try {
      const subjectRef = doc(db, 'subjects', id);
      const newCurrentProgress = (subject.currentProgress || 0) + change;
      await updateDoc(subjectRef, {
        [field]: newVal,
        [totalField]: totalVal, 
        currentProgress: newCurrentProgress
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCustomRequirement = async () => {
    if (!newCustomLabel.trim() || !newCustomTotal || isAddingCustom) return;
    const total = parseInt(newCustomTotal);
    if (isNaN(total) || total <= 0) return;

    setIsAddingCustom(true);
    try {
      const newReq = {
        id: Date.now().toString(),
        label: newCustomLabel.trim(),
        current: 0,
        total: total
      };
      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, {
        customRequirements: [...customRequirements, newReq]
      });
      setNewCustomLabel('');
      setNewCustomTotal('');
    } catch (error) {
      console.error("Failed to add custom requirement:", error);
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleCustomProgressUpdate = async (reqId, change) => {
    if (isUpdating) return;
    
    const reqIndex = customRequirements.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    const req = customRequirements[reqIndex];
    const newVal = req.current + change;
    
    if (newVal < 0 || newVal > req.total) return;

    setIsUpdating(true);
    try {
      const updatedReqs = [...customRequirements];
      updatedReqs[reqIndex] = { ...req, current: newVal };

      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, { customRequirements: updatedReqs });
    } catch (error) {
      console.error("Failed to update custom requirement:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCustomRequirement = async (reqId) => {
    if (!window.confirm("Are you sure you want to delete this custom requirement?")) return;
    try {
      const updatedReqs = customRequirements.filter(r => r.id !== reqId);
      const subjectRef = doc(db, 'subjects', id);
      await updateDoc(subjectRef, { customRequirements: updatedReqs });
    } catch (error) {
      console.error("Failed to delete custom requirement:", error);
    }
  };

  const getLinkIcon = (type) => {
    if (type === 'youtube') return <Video size={18} className="text-red-400" />;
    if (type === 'github') return <Code size={18} className="text-slate-200" />;
    return <FileText size={18} className="text-blue-400" />;
  };

  const getAssessmentIcon = (type) => {
    switch (type) {
      case 'Quiz': return <HelpCircle size={18} className="text-blue-400" />;
      case 'Assignment': return <FileText size={18} className="text-emerald-400" />;
      case 'GDB': return <MessageSquare size={18} className="text-purple-400" />;
      case 'Midterm': return <AlertCircle size={18} className="text-amber-400" />;
      case 'Final': return <Star size={18} className="text-red-400" />;
      default: return <FileText size={18} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      </div>
    );
  }

  const isCodingSubject = subject?.isCodingSubject || false;
  const links = subject?.links || [];

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen">
        <TopNav title="Subject Details" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => transitionNavigate(-1)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className={`p-3 rounded-xl ${isCodingSubject ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {isCodingSubject ? <Terminal size={24} /> : <BookOpen size={24} />}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{subject?.name}</h1>
                {subject?.grade && subject.grade !== 'N/A' && (
                  <p className="text-slate-400 text-sm font-medium mt-1">
                    Target Setup: <span className="text-emerald-400 font-bold text-base ml-1">{subject.grade}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditSettingsOpen(true)}
                className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-colors border border-indigo-500/20"
                title="Edit Grading Scheme"
              >
                <Settings size={20} />
              </button>

              <button 
                onClick={handleDeleteSubject}
                disabled={isDeleting}
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 disabled:opacity-50"
                title="Delete Subject"
              >
                {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
              </button>
            </div>
          </div>

          {/* New Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="col-span-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-indigo-400 mb-1">Calculated GPA</p>
                  <p className="text-3xl font-extrabold text-white">{stats.currentGPA.toFixed(2)} <span className="text-base font-medium text-slate-400 ml-1">({stats.finalPercentage.toFixed(1)}%)</span></p>
                </div>
              </div>
              
              {['Quiz', 'Assignment', 'Midterm', 'Final'].map(type => {
                const stat = stats.categoryStats[type];
                if (!stat && type !== 'Final') return null;
                return (
                  <div key={type} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">{type}s</p>
                    <p className="text-xl font-bold text-slate-200">{stat?.earned || 0}<span className="text-sm text-slate-500">/{stat?.total || 0}</span></p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Course Requirements</h2>
                  {isUpdating && <Loader2 size={16} className="text-indigo-500 animate-spin" />}
                </div>
                
                <div className="space-y-7">
                  <ProgressBar 
                    current={subject?.lecturesCurrent || 0} 
                    total={subject?.lecturesTotal || 45} 
                    label="Video Lectures" 
                    onIncrement={() => handleProgressUpdate('lecturesCurrent', 1)}
                    onDecrement={() => handleProgressUpdate('lecturesCurrent', -1)}
                    isUpdating={isUpdating}
                  />
                  <ProgressBar 
                    current={subject?.handoutsCurrent || 0} 
                    total={subject?.handoutsTotal || 45} 
                    label="Handouts Reading" 
                    onIncrement={() => handleProgressUpdate('handoutsCurrent', 1)}
                    onDecrement={() => handleProgressUpdate('handoutsCurrent', -1)}
                    isUpdating={isUpdating}
                  />
                  <ProgressBar 
                    current={subject?.understandingCurrent || 0} 
                    total={subject?.understandingTotal || 10} 
                    label="Understanding & Practice" 
                    onIncrement={() => handleProgressUpdate('understandingCurrent', 1)}
                    onDecrement={() => handleProgressUpdate('understandingCurrent', -1)}
                    isUpdating={isUpdating}
                  />

                  {customRequirements.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-7">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Personal Goals</h3>
                      {customRequirements.map((req) => (
                        <div key={req.id} className="flex items-center gap-4 group">
                          <div className="flex-1 min-w-0">
                            <ProgressBar 
                              current={req.current} 
                              total={req.total} 
                              label={req.label} 
                              onIncrement={() => handleCustomProgressUpdate(req.id, 1)}
                              onDecrement={() => handleCustomProgressUpdate(req.id, -1)}
                              isUpdating={isUpdating}
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteCustomRequirement(req.id)}
                            className="flex-shrink-0 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded-xl opacity-0 group-hover:opacity-100 transition-all mt-1"
                            title="Delete custom goal"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Custom Requirement Form */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-3">Add a personal tracking goal (e.g., MCQs, Past Papers). These do not affect your overall progress.</p>
                  <div className="flex gap-2">
                    <input 
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      placeholder="Goal Label"
                      className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input 
                      type="number"
                      value={newCustomTotal}
                      onChange={(e) => setNewCustomTotal(e.target.value)}
                      placeholder="Total"
                      min="1"
                      className="w-20 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleAddCustomRequirement}
                      disabled={!newCustomLabel.trim() || !newCustomTotal || isAddingCustom}
                      className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[40px]"
                    >
                      {isAddingCustom ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <LinkIcon size={20} className="text-indigo-400" /> Resources
                  </h2>
                  <button 
                    onClick={() => setIsLinkModalOpen(true)}
                    className="p-2 bg-indigo-500/20 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                {links.length === 0 ? (
                  <p className="text-slate-500 text-sm">No resources added yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {links.map(link => (
                      <a 
                        key={link.id} 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group"
                      >
                        <div className="p-2 bg-slate-900 rounded-lg group-hover:scale-110 transition-transform">
                          {getLinkIcon(link.type)}
                        </div>
                        <span className="text-sm font-semibold text-slate-200 truncate">{link.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileEdit size={20} className="text-emerald-400" /> Personal Notes
                  </h2>
                </div>
                
                {/* Inline Add Note Form */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-6">
                  <input 
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Note Title"
                    className="w-full bg-transparent text-slate-200 font-bold mb-2 focus:outline-none placeholder:text-slate-500"
                  />
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write or paste your notes here..."
                    className="w-full bg-transparent text-slate-300 text-sm focus:outline-none resize-y placeholder:text-slate-600 min-h-[60px]"
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={handleAddInlineNote}
                      disabled={isSavingNote || !newNoteTitle.trim() || !newNoteContent.trim()}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Note
                    </button>
                  </div>
                </div>

                {(!notesArray || notesArray.length === 0) ? (
                  <p className="text-slate-500 text-sm text-center py-4 bg-slate-800/30 rounded-xl border border-slate-700/30">No personal notes added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {notesArray.map(note => {
                      if (editingNoteId === note.id) {
                        return (
                          <div key={note.id} className="bg-slate-800 border border-emerald-500/50 rounded-xl p-4 shadow-lg shadow-emerald-500/5 animate-in fade-in zoom-in-95 duration-200">
                            <input 
                              value={editNoteTitle}
                              onChange={(e) => setEditNoteTitle(e.target.value)}
                              placeholder="Title"
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-bold mb-3 focus:outline-none focus:border-emerald-500"
                            />
                            <textarea
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              placeholder="Content"
                              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-emerald-500 resize-y min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2 mt-3">
                              <button 
                                onClick={() => setEditingNoteId(null)}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleUpdateNote}
                                disabled={isSavingNote || !editNoteTitle.trim() || !editNoteContent.trim()}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Update
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={note.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 group hover:bg-slate-800 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="text-md font-bold text-slate-200 flex items-center gap-3">
                                {note.title}
                                <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </h3>
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteTitle(note.title);
                                  setEditNoteContent(note.content);
                                }}
                                className="p-1.5 text-slate-400 hover:bg-slate-700 hover:text-emerald-400 rounded-lg transition-colors"
                                title="Edit note"
                              >
                                <FileEdit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400 rounded-lg transition-colors"
                                title="Delete note"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap mt-2 leading-relaxed">{note.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="space-y-6 h-fit">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Assessments</h2>
                  <button 
                    onClick={() => setIsGradeModalOpen(true)}
                    className="p-2 bg-indigo-500/20 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {assessments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No grades recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {assessments.map(item => {
                      const percentage = (item.scoreReceived / item.totalPossibleScore) * 100;
                      const isGood = percentage >= 80;
                      
                      return (
                        <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-between gap-3">
                          <div className="p-2 bg-slate-900/50 rounded-xl border border-slate-700/30">
                            {getAssessmentIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-slate-200 font-semibold text-sm truncate">{item.title}</h4>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-0.5 block">{item.type}</span>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className={`text-lg font-extrabold ${isGood ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {item.scoreReceived}<span className="text-sm text-slate-500 font-medium">/{item.totalPossibleScore}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <WhatIfCalculator subject={subject} assessments={assessments} />
            </div>

          </div>
        </div>
      </div>

      <AddLinkModal 
        isOpen={isLinkModalOpen} 
        onClose={() => setIsLinkModalOpen(false)} 
        subjectId={id} 
      />
      <AddGradeModal 
        isOpen={isGradeModalOpen} 
        onClose={() => setIsGradeModalOpen(false)} 
        subjectId={id} 
      />
      <EditSettingsModal
        isOpen={isEditSettingsOpen}
        onClose={() => setIsEditSettingsOpen(false)}
        subject={subject}
      />
    </div>
  );
}