import { useState } from 'react';
import { X, BookOpen, Terminal, Loader2, Target } from 'lucide-react';
import { db, auth } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddSubjectModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [isCodingSubject, setIsCodingSubject] = useState(false);
  
  // New VU specific fields for setting course targets
  const [lecturesTotal, setLecturesTotal] = useState(45);
  const [handoutsTotal, setHandoutsTotal] = useState(45);
  const [understandingTotal, setUnderstandingTotal] = useState(10);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creditHours, setCreditHours] = useState(3);
  const [gradingScheme, setGradingScheme] = useState({
    Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    
    try {
      await addDoc(collection(db, 'subjects'), {
        name: name.trim(),
        userId: auth.currentUser.uid,
        isCodingSubject,
        creditHours: Number(creditHours),
        gradingScheme: {
          Quiz: Number(gradingScheme.Quiz || 0),
          Assignment: Number(gradingScheme.Assignment || 0),
          GDB: Number(gradingScheme.GDB || 0),
          Midterm: Number(gradingScheme.Midterm || 0),
          Final: Number(gradingScheme.Final || 0),
          Project: Number(gradingScheme.Project || 0)
        },
        
        // Initialize the new detailed progress metrics
        lecturesCurrent: 0,
        lecturesTotal: Number(lecturesTotal),
        handoutsCurrent: 0,
        handoutsTotal: Number(handoutsTotal),
        understandingCurrent: 0,
        understandingTotal: Number(understandingTotal),
        
        // Overall metrics for the Dashboard cards
        currentProgress: 0,
        totalProgress: Number(lecturesTotal) + Number(handoutsTotal) + Number(understandingTotal),
        
        grade: 'N/A',
        links: [],
        createdAt: serverTimestamp()
      });
      
      // Reset form and close
      setName('');
      setIsCodingSubject(false);
      setLecturesTotal(45);
      setHandoutsTotal(45);
      setUnderstandingTotal(10);
      onClose();
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Add New Subject</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - scrollable if it gets too tall on mobile */}
        <div className="p-6 overflow-y-auto">
          <form id="add-subject-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Subject Name Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Subject Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Data Structures"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>

            {/* Subject Type Toggle */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Subject Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsCodingSubject(false)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    !isCodingSubject 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen size={18} />
                  <span className="font-medium text-sm">Theory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCodingSubject(true)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    isCodingSubject 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Terminal size={18} />
                  <span className="font-medium text-sm">Coding</span>
                </button>
              </div>
            </div>

            {/* Course Requirements Configuration */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-4">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <Target size={18} className="text-indigo-400" />
                <h3 className="font-semibold text-sm">Course Targets (Totals)</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Lectures Field */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lectures</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lecturesTotal}
                    onChange={(e) => setLecturesTotal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-center text-sm"
                  />
                </div>
                
                {/* Handouts Field */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Handouts</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={handoutsTotal}
                    onChange={(e) => setHandoutsTotal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-center text-sm"
                  />
                </div>

                {/* Understanding Field */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Practice</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={understandingTotal}
                    onChange={(e) => setUnderstandingTotal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-center text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
              >
                {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Grading Scheme)"}
              </button>

              {showAdvanced && (
                <div className="mt-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Credit Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={creditHours}
                      onChange={(e) => setCreditHours(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

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
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-700/50 bg-slate-800/20">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-subject-form"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Create Subject'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}