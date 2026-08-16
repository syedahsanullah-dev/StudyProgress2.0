import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2, Check, Loader2, Calendar, Star, Layers, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';

export default function ManageSemestersModal({ isOpen, onClose }) {
  const { semesters, subjects, addSemester, updateSemester, deleteSemester, setActiveSemester, activeSemesterId } = useStore();
  
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active'); // 'active' | 'completed' | 'upcoming'
  const [targetSGPA, setTargetSGPA] = useState('3.50');
  const [isCurrent, setIsCurrent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Deletion State
  const [deletingSemId, setDeletingSemId] = useState(null);
  const [deleteAction, setDeleteAction] = useState('delete_subjects'); // 'delete_subjects' | 'reassign' | 'unassign'
  const [reassignTo, setReassignTo] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setStatus('active');
    setTargetSGPA('3.50');
    setIsCurrent(false);
    setEditingId(null);
    setMode('list');
  };

  const handleStartAdd = () => {
    setName(`Semester ${semesters.length + 1}`);
    setStatus('active');
    setTargetSGPA('3.50');
    setIsCurrent(semesters.length === 0);
    setEditingId(null);
    setMode('add');
  };

  const handleStartEdit = (sem) => {
    setEditingId(sem.id);
    setName(sem.name);
    setStatus(sem.status || 'active');
    setTargetSGPA((sem.targetSGPA || 3.50).toString());
    setIsCurrent(sem.isCurrent || false);
    setMode('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      if (mode === 'add') {
        await addSemester({
          name: name.trim(),
          status,
          targetSGPA: Number(targetSGPA) || 3.50,
          isCurrent,
          order: semesters.length + 1
        });
      } else if (mode === 'edit' && editingId) {
        await updateSemester(editingId, {
          name: name.trim(),
          status,
          targetSGPA: Number(targetSGPA) || 3.50,
          isCurrent
        });
        if (isCurrent) {
          setActiveSemester(editingId);
        }
      }
      resetForm();
    } catch (err) {
      console.error("Error saving semester:", err);
      alert("Failed to save semester.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSemId) return;
    setIsLoading(true);
    try {
      await deleteSemester(deletingSemId, deleteAction, reassignTo || null);
      setDeletingSemId(null);
      setDeleteAction('delete_subjects');
      setReassignTo('');
    } catch (err) {
      console.error("Error deleting semester:", err);
      alert("Failed to delete semester.");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-[#0F172A] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'add' ? 'Add New Semester' : mode === 'edit' ? 'Edit Semester' : 'Manage Semesters'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure your academic terms & target GPAs</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto min-h-0 flex-1 space-y-4 overscroll-contain">
          
          {/* List View */}
          {mode === 'list' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configured Terms ({semesters.length})</span>
                <button
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus size={15} /> Add Semester
                </button>
              </div>

              {semesters.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/20 border border-slate-800 rounded-2xl">
                  <Calendar size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No semesters yet</p>
                  <p className="text-xs text-slate-500 mt-1">Create your first term to group subjects and track term GPA.</p>
                  <button
                    onClick={handleStartAdd}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Add Semester
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {semesters.map((sem) => {
                    const subCount = subjects.filter(s => s.semesterId === sem.id).length;
                    const isActive = activeSemesterId === sem.id;

                    return (
                      <div 
                        key={sem.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          sem.isCurrent
                            ? 'bg-indigo-950/30 border-indigo-500/40 shadow-sm'
                            : 'bg-slate-800/30 border-slate-700/40 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-100 text-sm truncate">{sem.name}</h3>
                            {sem.isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Current
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              sem.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              sem.status === 'upcoming' ? 'bg-slate-500/10 text-slate-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {sem.status || 'active'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span>{subCount} {subCount === 1 ? 'Subject' : 'Subjects'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400" /> Target: {Number(sem.targetSGPA || 3.5).toFixed(2)} SGPA
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!sem.isCurrent && (
                            <button
                              onClick={() => {
                                updateSemester(sem.id, { isCurrent: true });
                                setActiveSemester(sem.id);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                              title="Set as Current Term"
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(sem)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingSemId(sem.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Add / Edit Form View */}
          {(mode === 'add' || mode === 'edit') && (
            <form id="semester-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Semester Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Fall 2026 or Semester 4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:outline-none text-sm placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl py-2.5 px-3 focus:border-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="active">Active / In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Target SGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.00"
                    value={targetSGPA}
                    onChange={(e) => setTargetSGPA(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl py-2.5 px-3.5 focus:border-indigo-500 focus:outline-none text-sm text-center font-bold text-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <input
                  type="checkbox"
                  id="isCurrentCheck"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="isCurrentCheck" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Set as current default active semester
                </label>
              </div>
            </form>
          )}

          {/* Delete Confirmation Sub-modal */}
          {deletingSemId && (() => {
            const semToDelete = semesters.find(s => s.id === deletingSemId);
            const linkedSubs = subjects.filter(s => s.semesterId === deletingSemId);
            const otherSemesters = semesters.filter(s => s.id !== deletingSemId);

            return (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertCircle size={18} />
                  <span>Delete Semester: {semToDelete?.name}</span>
                </div>
                
                <p className="text-xs text-slate-300">
                  This term contains <span className="font-bold text-white">{linkedSubs.length} {linkedSubs.length === 1 ? 'subject' : 'subjects'}</span>. How would you like to handle them?
                </p>

                <div className="space-y-2 pt-1">
                  {/* Option 1: Cascade Delete all subjects */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    deleteAction === 'delete_subjects' 
                      ? 'bg-red-950/40 border-red-500/50 text-white' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="deleteChoice" 
                      value="delete_subjects" 
                      checked={deleteAction === 'delete_subjects'}
                      onChange={() => setDeleteAction('delete_subjects')}
                      className="mt-0.5 text-red-600 bg-slate-900 border-slate-700 focus:ring-red-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-red-300 block">Delete semester AND all its {linkedSubs.length} subjects</span>
                      <span className="text-[11px] text-slate-400">Permanently removes the term, its enrolled courses, and their assessment records.</span>
                    </div>
                  </label>

                  {/* Option 2: Reassign subjects */}
                  {otherSemesters.length > 0 && (
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      deleteAction === 'reassign' 
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-white' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="deleteChoice" 
                        value="reassign" 
                        checked={deleteAction === 'reassign'}
                        onChange={() => {
                          setDeleteAction('reassign');
                          if (!reassignTo && otherSemesters.length > 0) {
                            setReassignTo(otherSemesters[0].id);
                          }
                        }}
                        className="mt-0.5 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                      />
                      <div className="text-xs flex-1">
                        <span className="font-semibold text-slate-200 block">Move subjects to another semester</span>
                        {deleteAction === 'reassign' && (
                          <div className="mt-2">
                            <select
                              value={reassignTo}
                              onChange={(e) => setReassignTo(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-indigo-500"
                            >
                              {otherSemesters.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Option 3: Keep subjects unassigned */}
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    deleteAction === 'unassign' 
                      ? 'bg-slate-800/80 border-slate-600 text-white' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="deleteChoice" 
                      value="unassign" 
                      checked={deleteAction === 'unassign'}
                      onChange={() => setDeleteAction('unassign')}
                      className="mt-0.5 text-slate-500 bg-slate-900 border-slate-700 focus:ring-slate-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-300 block">Keep subjects (leave unassigned)</span>
                      <span className="text-[11px] text-slate-400">Subjects will stay in your dashboard without a semester tag.</span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-red-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingSemId(null);
                      setDeleteAction('delete_subjects');
                      setReassignTo('');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20"
                  >
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {deleteAction === 'delete_subjects' ? `Delete Semester & ${linkedSubs.length} Subjects` : 'Confirm Deletion'}
                  </button>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
          {mode === 'list' ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
              >
                Back to List
              </button>
              <button
                type="submit"
                form="semester-form"
                disabled={isLoading || !name.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {mode === 'add' ? 'Create Semester' : 'Save Changes'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

