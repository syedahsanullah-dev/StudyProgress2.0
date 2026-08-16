import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Settings2, Sparkles, Layers } from 'lucide-react';
import useStore from '../../store/useStore';
import ManageSemestersModal from '../forms/ManageSemestersModal';

export default function SemesterSelector() {
  const { semesters, activeSemesterId, setActiveSemester } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSemester = semesters.find(s => s.id === activeSemesterId);
  const isAllSelected = activeSemesterId === 'all';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Done</span>;
      case 'upcoming':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Upcoming</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Active</span>;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all shadow-sm group focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
      >
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
          {isAllSelected 
            ? "All Semesters (Degree)" 
            : currentSemester?.name || (semesters.length > 0 ? semesters[0].name : "Select Term")}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-slate-200'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-[#0F172A]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Academic Terms</span>
            <span className="text-[10px] font-normal text-indigo-400">{semesters.length} Terms</span>
          </div>

          {/* Semesters List */}
          <div className="max-h-56 overflow-y-auto py-1 overscroll-contain">
            {/* Option: All Semesters (Degree Overview) */}
            <button
              onClick={() => {
                setActiveSemester('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs sm:text-sm transition-colors ${
                isAllSelected 
                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers size={15} className={isAllSelected ? "text-indigo-400" : "text-slate-400"} />
                <span>All Terms (Degree View)</span>
              </div>
              {isAllSelected && <Check size={14} className="text-indigo-400" />}
            </button>

            {semesters.map((sem) => {
              const isSelected = activeSemesterId === sem.id;
              return (
                <button
                  key={sem.id}
                  onClick={() => {
                    setActiveSemester(sem.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs sm:text-sm transition-colors ${
                    isSelected 
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{sem.name}</span>
                    {getStatusBadge(sem.status)}
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-400 shrink-0" />}
                </button>
              );
            })}

            {semesters.length === 0 && (
              <div className="px-3 py-3 text-center text-xs text-slate-500">
                No semesters configured yet.
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-slate-800 pt-1 mt-1 px-1 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsManageModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
            >
              <Plus size={14} /> Add New Semester
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsManageModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <Settings2 size={14} /> Manage Semesters
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <ManageSemestersModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </div>
  );
}
