import { useState } from 'react';
import { X, Trophy, Loader2 } from 'lucide-react';
import { db, auth } from '../../../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function AddGradeModal({ isOpen, onClose, subjectId, onGradeAdded }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Quiz');
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Add assessment record to Firestore
      await addDoc(collection(db, 'assessments'), {
        subjectId,
        userId: auth.currentUser.uid,
        title,
        type,
        scoreReceived: Number(score),
        totalPossibleScore: Number(total),
        createdAt: new Date()
      });

      // 2. Cleanup and notify
      if (onGradeAdded) onGradeAdded();
      onClose();
    } catch (err) {
      console.error("Error saving grade:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" /> Add Assessment
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="Title (e.g., Quiz 2)" 
            className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:border-indigo-500 outline-none"
            value={title} onChange={(e) => setTitle(e.target.value)} required
          />
          
          <select 
            className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:border-indigo-500 outline-none"
            value={type} onChange={(e) => setType(e.target.value)}
          >
            <option>Quiz</option>
            <option>Assignment</option>
            <option>Midterm</option>
            <option>Final</option>
          </select>

          <div className="flex gap-4">
            <input 
              type="number" placeholder="Score" 
              className="w-1/2 bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:border-indigo-500 outline-none"
              value={score} onChange={(e) => setScore(e.target.value)} required
            />
            <input 
              type="number" placeholder="Total" 
              className="w-1/2 bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:border-indigo-500 outline-none"
              value={total} onChange={(e) => setTotal(e.target.value)} required
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Save Grade'}
          </button>
        </form>
      </div>
    </div>
  );
}