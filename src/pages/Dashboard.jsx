import { useState, useEffect, useRef, useMemo } from 'react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import CircularGauge from '../components/ui/CircularGauge';
import ProgressBar from '../components/ui/ProgressBar';
import { BookOpen, Terminal, TrendingUp, Loader2, Award, GraduationCap, BarChart2, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Draggable } from 'gsap/Draggable';
import useStore from '../store/useStore';

gsap.registerPlugin(useGSAP, Draggable);

export default function Dashboard() {
  const { subjects, assessments, semesters, activeSemesterId, setActiveSemester, loading } = useStore();
  const transitionNavigate = useTransitionNavigate();
  const dashboardRef = useRef();
  const [chartView, setChartView] = useState('progress'); // 'progress' | 'trends'

  // GSAP Master Timeline for Dashboard Entrance
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ 
      defaults: { ease: "power3.out" }, 
      delay: 0.8,
      onComplete: () => {
        Draggable.create(".dashboard-card", {
          type: "x,y",
          edgeResistance: 0.65,
          onRelease: function() {
            gsap.to(this.target, { 
              x: 0, 
              y: 0, 
              delay: 1.5,
              duration: 0.8, 
              ease: "elastic.out(1, 0.4)" 
            });
          }
        });
      }
    });

    tl.fromTo(".dashboard-card", 
      { opacity: 0, rotationX: 90, y: 50, transformPerspective: 1000, transformOrigin: "bottom center" }, 
      { opacity: 1, rotationX: 0, y: 0, duration: 1.0, stagger: 0.15, ease: "back.out(1.5)" }
    );

    tl.fromTo(".active-subjects-title",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.6"
    );

    tl.fromTo(".active-subject-item",
      { opacity: 0, rotationX: -90, transformPerspective: 1000, transformOrigin: "top center" },
      { opacity: 1, rotationX: 0, duration: 0.8, stagger: 0.08, ease: "back.out(1.5)" },
      "-=0.5"
    );
  }, { scope: dashboardRef, dependencies: [loading] });

  // Helper for VU Grading Scale (Percentage to 4.0 scale)
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

  // Process subject stats and calculate SGPA & Cumulative CGPA
  const calculatedData = useMemo(() => {
    let totalQualityPointsAll = 0;
    let totalCreditHoursAll = 0;

    const subjectsWithCalculations = subjects.map(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const scheme = subject.gradingScheme || defaultScheme;
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      let subjectFinalPercentage = 0;
      let subjectGPA = 0;
      let isGradedCourse = true;
      let categoryStats = {};

      if (subjectAssessments.length > 0) {
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

      if (isGradedCourse) {
        totalQualityPointsAll += (subjectGPA * creditHours);
        totalCreditHoursAll += creditHours;
      }

      return {
        ...subject,
        calculatedPercentage: subjectFinalPercentage,
        calculatedGPA: subjectGPA,
        categoryStats,
        creditHours,
        isGradedCourse
      };
    });

    const cumulativeCGPA = totalCreditHoursAll > 0 ? (totalQualityPointsAll / totalCreditHoursAll) : 0;

    // Active semester determination
    const activeSem = semesters.find(s => s.id === activeSemesterId) || 
                      semesters.find(s => s.isCurrent) || 
                      semesters[0] || 
                      null;

    // Filter subjects for the active view
    const isAll = activeSemesterId === 'all';
    const displayedSubjects = isAll 
      ? subjectsWithCalculations 
      : subjectsWithCalculations.filter(s => s.semesterId === activeSem?.id || (!s.semesterId && activeSem?.isCurrent));

    // Sort chronologically by semester order then alphabetically
    displayedSubjects.sort((a, b) => {
      const semA = semesters.find(s => s.id === a.semesterId);
      const semB = semesters.find(s => s.id === b.semesterId);
      const orderA = semA ? Number(semA.order) || 0 : 0;
      const orderB = semB ? Number(semB.order) || 0 : 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Active Term SGPA calculation
    let termQualityPoints = 0;
    let termCreditHours = 0;

    displayedSubjects.forEach(s => {
      if (s.isGradedCourse) {
        termQualityPoints += (s.calculatedGPA * s.creditHours);
        termCreditHours += s.creditHours;
      }
    });

    const currentSGPA = termCreditHours > 0 ? (termQualityPoints / termCreditHours) : 0;

    // Semester Trends Calculation for Chart
    const semesterTrends = semesters.map(sem => {
      const semSubjects = subjectsWithCalculations.filter(s => s.semesterId === sem.id);
      let sQp = 0;
      let sCh = 0;
      semSubjects.forEach(s => {
        if (s.isGradedCourse) {
          sQp += (s.calculatedGPA * s.creditHours);
          sCh += s.creditHours;
        }
      });
      const sgpa = sCh > 0 ? Number((sQp / sCh).toFixed(2)) : 0;
      return {
        name: sem.name,
        SGPA: sgpa,
        Target: Number(sem.targetSGPA || 3.50),
        Credits: sCh
      };
    });

    return {
      subjectsWithCalculations,
      displayedSubjects,
      activeSem,
      currentSGPA,
      cumulativeCGPA,
      termCreditHours,
      totalCreditHoursAll,
      semesterTrends,
      isAll
    };
  }, [subjects, assessments, semesters, activeSemesterId]);

  // Bar Chart Data for current subjects
  const subjectProgressChartData = calculatedData.displayedSubjects.map(sub => ({
    name: sub.name.length > 12 ? sub.name.substring(0, 12) + '...' : sub.name,
    Progress: sub.totalProgress > 0 ? Math.round((sub.currentProgress / sub.totalProgress) * 100) : 0
  }));

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

  const isGoodStanding = calculatedData.currentSGPA >= 2.0;

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={dashboardRef}>
        <TopNav title="Dashboard" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            
            {/* 1. Active Term SGPA Gauge */}
            <div className="dashboard-card opacity-0 col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
              <div className="text-center mb-1">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  {calculatedData.isAll ? "All Terms Average" : (calculatedData.activeSem?.name || "Active Term")}
                </span>
              </div>

              <CircularGauge value={calculatedData.currentSGPA} max={4.0} title="Term SGPA" />
              
              <div className={`mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
                isGoodStanding 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <TrendingUp size={14} />
                <span>{isGoodStanding ? 'On Track' : 'Needs Improvement'}</span>
              </div>
            </div>

            {/* 2. Degree Cumulative CGPA & Credits */}
            <div className="dashboard-card opacity-0 col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <GraduationCap size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Degree CGPA</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Overall
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">
                    {calculatedData.cumulativeCGPA.toFixed(2)}
                  </span>
                  <span className="text-slate-500 font-semibold text-sm">/ 4.00</span>
                </div>
                <p className="text-xs text-slate-400">Weighted across all enrolled terms.</p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Term Credits</span>
                  <span className="text-slate-200 font-bold text-sm">{calculatedData.termCreditHours} Cr</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Degree</span>
                  <span className="text-slate-200 font-bold text-sm">{calculatedData.totalCreditHoursAll} Cr</span>
                </div>
              </div>
            </div>

            {/* 3. Analytics Chart (Subject Progress OR Semester Trends) */}
            <div className="dashboard-card opacity-0 col-span-1 md:col-span-1 lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-indigo-400" />
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    {chartView === 'progress' ? 'Subject Completion (%)' : 'Multi-Semester SGPA Progression'}
                  </h2>
                </div>

                {/* Switch between chart views */}
                {calculatedData.semesterTrends.length > 1 && (
                  <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                    <button
                      onClick={() => setChartView('progress')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${chartView === 'progress' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Subjects
                    </button>
                    <button
                      onClick={() => setChartView('trends')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${chartView === 'trends' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      Terms
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 w-full min-h-[160px] max-h-[200px]">
                {chartView === 'progress' ? (
                  calculatedData.displayedSubjects.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      No subjects in this semester.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectProgressChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip 
                          cursor={{ fill: '#334155', opacity: 0.4 }}
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                        />
                        <Bar dataKey="Progress" fill="#6366F1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={calculatedData.semesterTrends} margin={{ top: 5, right: 15, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 4.0]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="SGPA" stroke="#818CF8" strokeWidth={3} dot={{ fill: '#818CF8', r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Active Subjects Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <h2 className="active-subjects-title opacity-0 text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <BookOpen size={18} className="text-indigo-400" />
                  <span>Subjects</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({calculatedData.isAll ? "All Terms" : calculatedData.activeSem?.name || "Current Term"})
                  </span>
                </h2>
              </div>

              {/* Quick Semester Filter Buttons */}
              {semesters.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setActiveSemester('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      calculatedData.isAll 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({subjects.length})
                  </button>
                  {semesters.map(sem => {
                    const count = subjects.filter(s => s.semesterId === sem.id).length;
                    const isSelected = activeSemesterId === sem.id;
                    return (
                      <button
                        key={sem.id}
                        onClick={() => setActiveSemester(sem.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sem.name} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {calculatedData.displayedSubjects.length === 0 ? (
              <div className="active-subject-item opacity-0 p-8 bg-white/5 border border-white/10 rounded-3xl text-center">
                <p className="text-slate-400 text-sm">No subjects found for this term.</p>
                <button
                  onClick={() => transitionNavigate('/subjects')}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Go to Subjects Page
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculatedData.displayedSubjects.map((sub) => (
                  <div 
                    key={sub.id}
                    onClick={() => transitionNavigate(`/subjects/${sub.id}`)}
                    className="active-subject-item opacity-0 bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`shrink-0 p-2.5 rounded-xl transition-colors ${
                          sub.isCodingSubject 
                            ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white' 
                            : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                        }`}>
                          {sub.isCodingSubject ? <Terminal size={18} /> : <BookOpen size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="text-slate-200 font-bold truncate text-sm" title={sub.name}>{sub.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>{sub.creditHours} Cr</span>
                            {sub.categoryStats && Object.keys(sub.categoryStats).length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate text-slate-500 font-medium">
                                  {Object.entries(sub.categoryStats).map(([key, stats]) => `${key}: ${stats.earned}/${stats.total}`).join(' | ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-800 text-emerald-400 rounded-md border border-emerald-500/20">
                          {sub.calculatedGPA !== undefined ? `${sub.calculatedGPA.toFixed(2)} GPA` : (sub.grade || 'N/A')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {sub.calculatedPercentage !== undefined && sub.calculatedPercentage > 0 ? `${sub.calculatedPercentage.toFixed(1)}%` : ''}
                        </span>
                      </div>
                    </div>
                    <ProgressBar 
                      current={sub.currentProgress || 0} 
                      total={sub.totalProgress || 1} 
                      label={sub.isCodingSubject ? "Milestones" : "Lectures"} 
                      showFraction={true} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}