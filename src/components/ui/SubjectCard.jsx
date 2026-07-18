import { Terminal, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar';

export default function SubjectCard({ 
  id = "1", 
  name = "Subject Name", 
  isCodingSubject = false, 
  grade = "N/A", 
  calculatedGPA,
  calculatedPercentage,
  categoryStats,
  // Fallbacks for older data
  currentProgress = 0, 
  totalProgress = 0,
  // New VU Detailed fields
  lecturesCurrent = 0, lecturesTotal = 45,
  handoutsCurrent = 0, handoutsTotal = 45,
  understandingCurrent = 0, understandingTotal = 10,
  customLabel
}) {
  const navigate = useNavigate();

  // Dynamic styling based on grade standing
  const getGradeStyle = (g) => {
    if (g.startsWith('A')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (g.startsWith('B')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    if (g.startsWith('C')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (g === 'N/A') return 'bg-slate-800 text-slate-400 border-slate-700';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  // Safely aggregate the old standard progress and the new split progress metrics
  const displayCurrent = (lecturesCurrent || 0) + (handoutsCurrent || 0) + (understandingCurrent || 0) + (currentProgress || 0);
  const displayTotal = (lecturesTotal || 0) + (handoutsTotal || 0) + (understandingTotal || 0) + (totalProgress || 0) || 100;

  const defaultLabel = isCodingSubject ? "Coding Milestones" : "Overall Course Progress";
  const progressLabel = customLabel || defaultLabel;

  return (
    <div 
      onClick={() => navigate(`/subjects/${id}`)}
      className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/10 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group shadow-lg flex flex-col justify-between min-h-[160px]"
    >
      {/* Top Row: Icon, Title, and Grade Badge */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`shrink-0 p-3 rounded-2xl transition-colors ${
            isCodingSubject 
              ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white' 
              : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
          }`}>
            {isCodingSubject ? <Terminal size={24} /> : <BookOpen size={24} />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-xl font-bold text-slate-100 leading-tight truncate">
              {name}
            </h3>
            {categoryStats && Object.keys(categoryStats).length > 0 && (
              <span className="text-xs text-slate-400 font-medium tracking-wide mt-1 truncate">
                {Object.entries(categoryStats).map(([key, stats]) => `${key}: ${stats.earned}/${stats.total}`).join(' | ')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className={`px-3 py-1 rounded-lg border font-extrabold text-sm shadow-sm bg-slate-800 text-emerald-400 border-emerald-500/30`}>
            {calculatedGPA !== undefined ? `${calculatedGPA.toFixed(2)} GPA` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {calculatedPercentage !== undefined && calculatedPercentage > 0 ? `${calculatedPercentage.toFixed(1)}%` : ''}
          </span>
        </div>
      </div>

      {/* Bottom Row: Progress Bar & Arrow */}
      <div className="mt-auto flex items-end gap-4">
        <div className="flex-1">
          <ProgressBar 
            current={displayCurrent} 
            total={displayTotal} 
            label={progressLabel} 
          />
        </div>
        <div className="p-2 text-slate-500 group-hover:text-white transition-colors bg-slate-800/50 rounded-full group-hover:bg-indigo-500">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
}