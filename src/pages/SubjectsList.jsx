import { useState, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import SubjectCard from '../components/ui/SubjectCard';
import AddSubjectModal from '../components/forms/AddSubjectModal';
import { Plus, Loader2, Library } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import useStore from '../store/useStore';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function SubjectsList() {
  const { subjects, assessments, loading } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const containerRef = useRef();

  // GSAP ScrollTrigger Animation for Subject Cards
  useGSAP(() => {
    if (loading || subjects.length === 0) return;

    // Refresh ScrollTrigger after DOM changes
    setTimeout(() => {
      ScrollTrigger.refresh();

      const cards = gsap.utils.toArray(".subject-card-wrapper");
      
      gsap.fromTo(cards, 
        { 
          opacity: 0, 
          scale: 0.5,
          rotation: () => gsap.utils.random(-20, 20),
          y: 200,
        },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          y: 0,
          duration: 0.8,
          delay: 1.0,
          stagger: 0.15,
          ease: "back.out(1.5)"
        }
      );
    }, 100);

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: containerRef, dependencies: [loading, subjects.length] });


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

  const subjectsWithGPA = subjects.map(subject => {
    const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
    const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
    const scheme = subject.gradingScheme || defaultScheme;
    
    let subjectFinalPercentage = 0;
    let subjectGPA = undefined;
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
    }
    
    return { ...subject, calculatedPercentage: subjectFinalPercentage, calculatedGPA: subjectGPA, categoryStats: finalCategoryStats };
  });

  return (
    <div className="min-h-screen bg-transparent flex">
      
      {/* Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={containerRef}>
        <TopNav title="My Subjects" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-8 px-1">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Current Term: <span className="text-indigo-400">Fall 2026</span>
            </h2>
            
            {/* Add Subject Button */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Subject</span>
            </button>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
          ) : subjects.length === 0 ? (
            /* Empty State */
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                <Library size={40} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Subjects Yet</h3>
              <p className="text-slate-400 max-w-sm mb-6">You haven't enrolled in any classes for this term. Click the button above to add your first subject.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all border border-slate-700"
              >
                Add Your First Subject
              </button>
            </div>
          ) : (
            /* Responsive Grid of Subject Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {subjectsWithGPA.map((sub) => (
                <div key={sub.id} className="subject-card-wrapper opacity-0">
                  <SubjectCard 
                    {...sub} /* Passes all the new detailed VU fields down to the card */
                    customLabel={sub.isCodingSubject ? "Coding Exercises" : "Lectures & Handouts"}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* The Add Subject Modal */}
      <AddSubjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}