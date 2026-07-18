import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import ProgressBar from '../components/ui/ProgressBar';
import AddLinkModal from '../components/forms/AddLinkModal';
import AddGradeModal from '../components/forms/AddGradeModal';
import EditSettingsModal from '../components/forms/EditSettingsModal';
import WhatIfCalculator from '../components/ui/WhatIfCalculator';
import { db } from '../../firebase';
import { doc, collection, query, where, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Terminal, BookOpen, Link as LinkIcon, 
  Plus, FileText, Video, Code, Loader2, Trash2, Settings,
  HelpCircle, MessageSquare, AlertCircle, Star
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