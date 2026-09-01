import { useState, useEffect } from 'react';
import { X, Trophy, Loader2, Trash2, Check, AlertCircle, Sparkles, HelpCircle, FileText, MessageSquare, Star } from 'lucide-react';
import { db, auth } from '../../../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import useStore from '../../store/useStore';

const ASSESSMENT_TYPES = [
  { id: 'Quiz', label: 'Quiz', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'Assignment', label: 'Assignment', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'GDB', label: 'GDB', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'Midterm', label: 'Midterm Exam', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'Final', label: 'Final Exam', icon: Star, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'Project', label: 'Project / Lab', icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { id: 'Other', label: 'Other', icon: FileText, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' }
];

const getVUGPA = (percentage) => {
  if (percentage >= 85) return { gpa: '4.00', grade: 'A' };
  if (percentage >= 80) return { gpa: '3.66', grade: 'A-' };
  if (percentage >= 75) return { gpa: '3.33', grade: 'B+' };
  if (percentage >= 70) return { gpa: '3.00', grade: 'B' };
  if (percentage >= 65) return { gpa: '2.66', grade: 'B-' };
  if (percentage >= 61) return { gpa: '2.33', grade: 'C+' };
  if (percentage >= 58) return { gpa: '2.00', grade: 'C' };
  if (percentage >= 50) return { gpa: '1.00', grade: 'D' };
  return { gpa: '0.00', grade: 'F' };
};

export default function AddGradeModal({ 
  isOpen, 
  onClose, 
  subjectId, 
  assessmentToEdit = null, 
  onGradeAdded,
  onGradeUpdated,
  onGradeDeleted
}) {
  const isEditing = Boolean(assessmentToEdit && assessmentToEdit.id);
  const { subjects, semesters, addAssessment, updateAssessment, deleteAssessment } = useStore();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Quiz');
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('100');
  const [targetSubjectId, setTargetSubjectId] = useState(subjectId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Prepopulate state when opening or when assessmentToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (assessmentToEdit) {
        setTitle(assessmentToEdit.title || '');
        setType(assessmentToEdit.type || 'Quiz');
        setScore(assessmentToEdit.scoreReceived !== undefined ? String(assessmentToEdit.scoreReceived) : '');
        setTotal(assessmentToEdit.totalPossibleScore !== undefined ? String(assessmentToEdit.totalPossibleScore) : '100');
        setTargetSubjectId(assessmentToEdit.subjectId || subjectId || '');
      } else {
        setTitle('');
        setType('Quiz');
        setScore('');
        setTotal('100');
        setTargetSubjectId(subjectId || (subjects[0]?.id || ''));
      }
      setShowDeleteConfirm(false);
      setErrorMsg('');
    }
  }, [isOpen, assessmentToEdit, subjectId, subjects]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numScore = parseFloat(score);
  const numTotal = parseFloat(total);
  const hasValidNumbers = !isNaN(numScore) && !isNaN(numTotal) && numTotal > 0;
  const percentage = hasValidNumbers ? (numScore / numTotal) * 100 : null;
  const gpaInfo = percentage !== null ? getVUGPA(percentage) : null;
  const isExceeding = hasValidNumbers && numScore > numTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter an assessment title.');
      return;
    }

    if (isNaN(numScore) || numScore < 0) {
      setErrorMsg('Score earned must be a valid positive number.');
      return;
    }

    if (isNaN(numTotal) || numTotal <= 0) {
      setErrorMsg('Total possible score must be greater than 0.');
      return;
    }

    const currentSubId = targetSubjectId || subjectId;
    if (!currentSubId) {
      setErrorMsg('Please select a subject.');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing) {
        const updates = {
          title: title.trim(),
          type,
          scoreReceived: numScore,
          totalPossibleScore: numTotal,
          subjectId: currentSubId
        };

        if (updateAssessment) {
          await updateAssessment(assessmentToEdit.id, updates);
        } else {
          const astRef = doc(db, 'assessments', assessmentToEdit.id);
          await updateDoc(astRef, { ...updates, updatedAt: serverTimestamp() });
        }

        if (onGradeUpdated) onGradeUpdated();
      } else {
        const newRecord = {
          subjectId: currentSubId,
          userId: auth.currentUser?.uid,
          title: title.trim(),
          type,
          scoreReceived: numScore,
          totalPossibleScore: numTotal
        };

        if (addAssessment) {
          await addAssessment(newRecord);
        } else {
          await addDoc(collection(db, 'assessments'), {
            ...newRecord,
            createdAt: serverTimestamp()
          });
        }

        if (onGradeAdded) onGradeAdded();
      }

      onClose();
    } catch (err) {
      console.error("Error saving assessment:", err);
      setErrorMsg('Failed to save assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!assessmentToEdit?.id) return;
    setIsDeleting(true);

    try {
      if (deleteAssessment) {
        await deleteAssessment(assessmentToEdit.id);
      } else {
        await deleteDoc(doc(db, 'assessments', assessmentToEdit.id));
      }

      if (onGradeDeleted) onGradeDeleted();
      onClose();
    } catch (err) {
      console.error("Error deleting assessment:", err);
      setErrorMsg('Failed to delete assessment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const quickPresets = [
    'Quiz 1', 'Quiz 2', 'Quiz 3',
    'Assignment 1', 'Assignment 2',
    'Midterm Exam', 'Final Exam', 'GDB 1'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        className="relative bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isEditing ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
              <Trophy size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditing ? 'Edit Assessment' : 'Add Assessment'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditing ? 'Update your score, type, or title' : 'Record a new quiz, assignment, or exam score'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in duration-200">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="mb-5 p-4 bg-red-950/40 border border-red-500/40 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-300 font-semibold text-sm mb-2">
              <AlertCircle size={16} /> Confirm Assessment Deletion
            </div>
            <p className="text-xs text-red-400/80 mb-3">
              Are you sure you want to delete <strong className="text-white">"{title || 'this assessment'}"</strong>? This will recalculate your subject GPA and progress.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Subject Selector (if multiple subjects exist or modal opened without fixed subject) */}
          {subjects.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={targetSubjectId}
                onChange={(e) => setTargetSubjectId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors"
                required
              >
                {subjects.map((sub) => {
                  const sem = semesters.find(s => s.id === sub.semesterId);
                  return (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sem ? `(${sem.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Assessment Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assessment Title
            </label>
            <input 
              type="text" 
              placeholder="e.g. Quiz 1, Assignment 2, Midterm Exam" 
              className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors"
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
              autoFocus
            />

            {/* Quick Preset Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    title === preset 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                      : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          {/* Assessment Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assessment Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ASSESSMENT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected 
                        ? `${t.bg} ${t.color} font-semibold ring-1 ring-indigo-500/50` 
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? t.color : 'text-slate-400'} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scores Input */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Score Earned
              </label>
              <input 
                type="number" 
                step="any"
                min="0"
                placeholder="e.g. 18.5" 
                className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors"
                value={score} 
                onChange={(e) => setScore(e.target.value)} 
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Total Possible
              </label>
              <input 
                type="number" 
                step="any"
                min="0.1"
                placeholder="e.g. 20" 
                className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-colors"
                value={total} 
                onChange={(e) => setTotal(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* Live Score Preview Card */}
          {hasValidNumbers && (
            <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Performance Preview</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${
                    percentage >= 80 ? 'text-emerald-400' :
                    percentage >= 65 ? 'text-blue-400' :
                    percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {percentage.toFixed(1)}%
                  </span>
                  {gpaInfo && (
                    <span className="bg-slate-700/80 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {gpaInfo.grade} ({gpaInfo.gpa})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    percentage >= 80 ? 'bg-emerald-500' :
                    percentage >= 65 ? 'bg-blue-500' :
                    percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>

              {isExceeding && (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 mt-1">
                  <AlertCircle size={13} />
                  <span>Bonus / Score earned exceeds total marks ({numScore} &gt; {numTotal})</span>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800 mt-5">
            {isEditing ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || isDeleting}
                className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5"
                title="Delete this assessment"
              >
                <Trash2 size={15} /> Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}

              <button 
                type="submit" 
                disabled={isLoading || isDeleting}
                className={`px-5 py-2.5 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                  isEditing 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                } disabled:opacity-50`}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <Check size={16} />
                    {isEditing ? 'Update Assessment' : 'Save Assessment'}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}