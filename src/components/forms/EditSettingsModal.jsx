import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Layers } from 'lucide-react';
import { db } from '../../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import useStore from '../../store/useStore';

export default function EditSettingsModal({ isOpen, onClose, subject }) {
  const { semesters } = useStore();
  const [subjectName, setSubjectName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [creditHours, setCreditHours] = useState(3);
  const [gradingScheme, setGradingScheme] = useState({
    Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subject) {
      setSubjectName(subject.name || '');
      setSemesterId(subject.semesterId || '');
      setCreditHours(subject.creditHours || 3);
      setGradingScheme(subject.gradingScheme || {
        Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0
      });
    }
  }, [subject]);

  if (!isOpen || !subject) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        name: subjectName.trim() || subject.name,
        semesterId: semesterId || null,
        creditHours: Number(creditHours),
        gradingScheme: {
          Quiz: Number(gradingScheme.Quiz || 0),
          Assignment: Number(gradingScheme.Assignment || 0),
          GDB: Number(gradingScheme.GDB || 0),
          Midterm: Number(gradingScheme.Midterm || 0),
          Final: Number(gradingScheme.Final || 0),
          Project: Number(gradingScheme.Project || 0)
        }
      });
      onClose();
    } catch (error) {
      console.error("Error updating settings: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalWeight = Object.values(gradingScheme).reduce((a, b) => Number(a) + Number(b), 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-[#1E293B] border border-slate-700 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Edit Subject & Grading Scheme</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 flex-1 overscroll-contain">
          <form id="edit-settings-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {semesters.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Layers size={15} className="text-indigo-400" /> Semester / Term
                </label>
                <select
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Unassigned</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} {sem.isCurrent ? '(Current Term)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
              
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Credit Hours</label>
              <input
                type="number"
                min="1"
                max="6"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Grading Scheme Weightage</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(gradingScheme).map(key => (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1">{key} %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={gradingScheme[key]}
                      onChange={(e) => setGradingScheme({...gradingScheme, [key]: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={`text-sm font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Total Weight: {totalWeight}% {totalWeight !== 100 && '(Must equal 100%)'}
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-slate-700/50 bg-slate-800/20">
          <button
            type="submit"
            form="edit-settings-form"
            disabled={isLoading || totalWeight !== 100}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


