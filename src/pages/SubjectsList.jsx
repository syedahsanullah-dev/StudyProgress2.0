import { useState, useRef, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import SubjectCard from '../components/ui/SubjectCard';
import AddSubjectModal from '../components/forms/AddSubjectModal';
import ManageSemestersModal from '../components/forms/ManageSemestersModal';
import { Plus, Loader2, Library, Layers, Settings2, Award, Terminal, BookOpen } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import useStore from '../store/useStore';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function SubjectsList() {
  const { subjects, assessments, semesters, activeSemesterId, setActiveSemester, loading } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const containerRef = useRef();

  const GRADE_POINTS_MAP = {
    'A+': 4.00, 'A': 4.00, 'A-': 3.66,
    'B+': 3.33, 'B': 3.00, 'B-': 2.66,
    'C+': 2.33, 'C': 2.00, 'D': 1.00, 'F': 0.00,
    'P': null
  };

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

  const processedData = useMemo(() => {
    const subjectsWithGPA = subjects.map(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const scheme = subject.gradingScheme || defaultScheme;
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      let subjectFinalPercentage = 0;
      let subjectGPA = 0;
      let isGradedCourse = true;
      let finalCategoryStats = {};

      if (subjectAssessments.length > 0) {
        const categoryStats = {};
        subjectAssessments.forEach(a => {
          const type = a.type || "Other";
          if (!categoryStats[type]) categoryStats[type] = { earned: 0, total: 0 };
          categoryStats[type].earned += Number(a.scoreReceived);
          categoryStats[type].total += Number(a.totalPossibleScore);
        });

        let totalAttemptedWeight = 0;
        let earnedWeightedPercentage = 0;

        Object.keys(categoryStats).forEach(type => {
          const stats = categoryStats[type];
          const weight = Number(scheme[type]) || 0;
          if (stats.total > 0 && weight > 0) {
            totalAttemptedWeight += weight;
            const categoryRawPercentage = (stats.earned / stats.total);
            earnedWeightedPercentage += (categoryRawPercentage * weight);
          }
        });

        subjectFinalPercentage = totalAttemptedWeight > 0 
          ? (earnedWeightedPercentage / totalAttemptedWeight) * 100 
          : 0;

        subjectGPA = getVUGPA(subjectFinalPercentage);
        finalCategoryStats = categoryStats;
      } else if (subject.gradePoints !== undefined && subject.gradePoints !== null && !isNaN(Number(subject.gradePoints))) {
        subjectGPA = Number(subject.gradePoints);
        isGradedCourse = true;
      } else if (subject.grade && subject.grade !== 'N/A') {
        const gradeKey = subject.grade.toUpperCase().trim();
        if (gradeKey === 'P' || gradeKey === 'PASS' || gradeKey === 'NON-GRADED') {
          subjectGPA = 0;
          isGradedCourse = false;
        } else if (GRADE_POINTS_MAP[gradeKey] !== undefined) {
          subjectGPA = GRADE_POINTS_MAP[gradeKey];
          isGradedCourse = true;
        }
      }
      
      return { 
        ...subject, 
        calculatedPercentage: subjectFinalPercentage, 
        calculatedGPA: subjectGPA, 
        categoryStats: finalCategoryStats,
        creditHours,
        isGradedCourse
      };
    });

    const isAll = activeSemesterId === 'all';
    const activeSem = semesters.find(s => s.id === activeSemesterId) || 
                      semesters.find(s => s.isCurrent) || 
                      semesters[0] || 
                      null;

    const filteredSubjects = isAll 
      ? subjectsWithGPA 
      : subjectsWithGPA.filter(s => s.semesterId === activeSem?.id || (!s.semesterId && activeSem?.isCurrent));

    // Sort subjects by Semester Order (Time) then Alphabetically
    filteredSubjects.sort((a, b) => {
      const semA = semesters.find(s => s.id === a.semesterId);
      const semB = semesters.find(s => s.id === b.semesterId);
      const orderA = semA ? Number(semA.order) || 0 : 0;
      const orderB = semB ? Number(semB.order) || 0 : 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    let termQualityPoints = 0;
    let termCreditHours = 0;
    let theoryCount = 0;
    let codingCount = 0;

    filteredSubjects.forEach(s => {
      if (s.isGradedCourse) {
        termQualityPoints += (s.calculatedGPA * s.creditHours);
        termCreditHours += s.creditHours;
      }
      if (s.isCodingSubject) codingCount++;
      else theoryCount++;
    });

    const termSGPA = termCreditHours > 0 ? (termQualityPoints / termCreditHours) : 0;


    return {
      filteredSubjects,
      activeSem,
      isAll,
      termCreditHours,
      termSGPA,
      theoryCount,
      codingCount
    };
  }, [subjects, assessments, semesters, activeSemesterId]);

  // GSAP ScrollTrigger Animation for Subject Cards
  useGSAP(() => {
    if (loading || processedData.filteredSubjects.length === 0) return;

    setTimeout(() => {
      ScrollTrigger.refresh();
      const cards = gsap.utils.toArray(".subject-card-wrapper");
      
      gsap.fromTo(cards, 
        { 
          opacity: 0, 
          scale: 0.8,
          y: 40,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.4)"
        }
      );
    }, 50);

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: containerRef, dependencies: [loading, processedData.filteredSubjects.length, activeSemesterId] });

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={containerRef}>
        <TopNav title="My Subjects" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Top Bar: Semester Tabs & Add Subject Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Semester Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 max-w-full">
              <button
                onClick={() => setActiveSemester('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  processedData.isAll 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                <Layers size={16} /> All Terms ({subjects.length})
              </button>

              {semesters.map((sem) => {
                const count = subjects.filter(s => s.semesterId === sem.id).length;
                const isSelected = activeSemesterId === sem.id;
                return (
                  <button
                    key={sem.id}
                    onClick={() => setActiveSemester(sem.id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    <span>{sem.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsManageModalOpen(true)}
                className="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-700/50 transition-colors shrink-0"
                title="Manage Terms"
              >
                <Settings2 size={18} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-xs sm:text-sm"
              >
                <Plus size={18} />
                <span>Add Subject</span>
              </button>
            </div>

          </div>

          {/* Term Performance Summary Ribbon */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Award size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {processedData.isAll ? "Degree Overview" : (processedData.activeSem?.name || "Term Overview")}
                </h3>
                <p className="text-xs text-slate-400">
                  {processedData.filteredSubjects.length} enrolled {processedData.filteredSubjects.length === 1 ? 'subject' : 'subjects'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-8">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Credits</span>
                <span className="text-lg font-extrabold text-slate-100">{processedData.termCreditHours} Cr</span>
              </div>
              <div className="h-8 w-px bg-slate-700/60" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Term SGPA</span>
                <span className="text-lg font-extrabold text-emerald-400">{processedData.termSGPA.toFixed(2)}</span>
              </div>
              <div className="h-8 w-px bg-slate-700/60" />
              <div className="hidden sm:block">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Split</span>
                <span className="text-xs font-semibold text-slate-300">
                  {processedData.theoryCount} Theory • {processedData.codingCount} Coding
                </span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
          ) : processedData.filteredSubjects.length === 0 ? (
            /* Empty State */
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                <Library size={40} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Subjects In This Term</h3>
              <p className="text-slate-400 max-w-sm mb-6">
                You have no enrolled courses in {processedData.isAll ? "your dashboard" : (processedData.activeSem?.name || "this semester")}.
              </p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20"
              >
                Add Subject to This Term
              </button>
            </div>
          ) : (
            /* Responsive Grid of Subject Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {processedData.filteredSubjects.map((sub) => (
                <div key={sub.id} className="subject-card-wrapper opacity-0">
                  <SubjectCard 
                    {...sub}
                    customLabel={sub.isCodingSubject ? "Coding Exercises" : "Lectures & Handouts"}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      <AddSubjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <ManageSemestersModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </div>
  );
}