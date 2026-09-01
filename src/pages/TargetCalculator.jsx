import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { Target, Loader2, ArrowRight, Layers, Sparkles, GraduationCap, Award, Check, Save, Calculator, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import useStore from '../store/useStore';

gsap.registerPlugin(useGSAP);

const TARGET_GRADES = [
  { label: 'A (4.00)', value: 4.00, percent: 85 },
  { label: 'A- (3.66)', value: 3.66, percent: 80 },
  { label: 'B+ (3.33)', value: 3.33, percent: 75 },
  { label: 'B (3.00)', value: 3.00, percent: 70 },
  { label: 'B- (2.66)', value: 2.66, percent: 65 },
  { label: 'C+ (2.33)', value: 2.33, percent: 61 },
  { label: 'Pass (2.00)', value: 2.00, percent: 58 }
];

const VU_GRADE_THRESHOLDS = [
  { grade: 'A', gpa: 4.00, min: 85, max: 100, label: 'A (4.00) [85% - 100%]' },
  { grade: 'A-', gpa: 3.66, min: 80, max: 84.99, label: 'A- (3.66) [80% - 84.99%]' },
  { grade: 'B+', gpa: 3.33, min: 75, max: 79.99, label: 'B+ (3.33) [75% - 79.99%]' },
  { grade: 'B', gpa: 3.00, min: 70, max: 74.99, label: 'B (3.00) [70% - 74.99%]' },
  { grade: 'B-', gpa: 2.66, min: 65, max: 69.99, label: 'B- (2.66) [65% - 69.99%]' },
  { grade: 'C+', gpa: 2.33, min: 61, max: 64.99, label: 'C+ (2.33) [61% - 64.99%]' },
  { grade: 'C', gpa: 2.00, min: 58, max: 60.99, label: 'C (2.00) [58% - 60.99%]' },
  { grade: 'D', gpa: 1.00, min: 50, max: 57.99, label: 'D (1.00) [50% - 57.99%]' },
  { grade: 'F', gpa: 0.00, min: 0, max: 49.99, label: 'F (0.00) [Below 50%]' }
];

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

const getVUGrade = (percentage) => {
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 61) return 'C+';
  if (percentage >= 58) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

export default function TargetCalculator() {
  const { subjects, assessments, semesters, activeSemesterId, setActiveSemester, loading, addAssessment, updateAssessment } = useStore();
  
  const [globalMode, setGlobalMode] = useState('target'); // 'target' | 'predict' | 'finalMarks'
  const [targets, setTargets] = useState({});
  const [predictedScores, setPredictedScores] = useState({});
  
  // Final Term Reverse Calculator state per subject
  const [reverseInputs, setReverseInputs] = useState({}); // { [subId]: { type: 'percentage', percent: '75', grade: 'B+', paperTotal: 60 } }
  const [savingSubId, setSavingSubId] = useState(null);
  const [savedSubIds, setSavedSubIds] = useState({});

  const containerRef = useRef();

  const processedData = useMemo(() => {
    let totalQualityPointsAll = 0;
    let totalCreditHoursAll = 0;
    
    const parsedSubjects = subjects.map(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      const scheme = subject.gradingScheme || { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      let earnedPercentage = 0;
      let totalAttemptedWeight = 0;
      let preFinalEarnedPercentage = 0;
      let preFinalAttemptedWeight = 0;

      if (subjectAssessments.length > 0) {
        const categoryStats = {};
        subjectAssessments.forEach(a => {
          const type = a.type || "Other";
          if (!categoryStats[type]) categoryStats[type] = { earned: 0, total: 0 };
          categoryStats[type].earned += Number(a.scoreReceived);
          categoryStats[type].total += Number(a.totalPossibleScore);
        });

        Object.keys(scheme).forEach(type => {
          const weight = Number(scheme[type]) || 0;
          const stats = categoryStats[type];
          if (stats && stats.total > 0 && weight > 0) {
            totalAttemptedWeight += weight;
            const weightedPoints = (stats.earned / stats.total) * weight;
            earnedPercentage += weightedPoints;

            if (type !== 'Final') {
              preFinalAttemptedWeight += weight;
              preFinalEarnedPercentage += weightedPoints;
            }
          }
        });
      }

      const finalPercentage = totalAttemptedWeight > 0 ? (earnedPercentage / totalAttemptedWeight) * 100 : 0;
      const currentGPA = getVUGPA(finalPercentage);
      
      totalQualityPointsAll += (currentGPA * creditHours);
      totalCreditHoursAll += creditHours;

      const finalWeight = Number(scheme.Final) || Math.max(0, 100 - preFinalAttemptedWeight) || 50;

      return {
        ...subject,
        creditHours,
        earnedPercentage,
        totalAttemptedWeight,
        remainingWeight: Math.max(0, 100 - totalAttemptedWeight),
        currentGPA,
        currentPercentage: finalPercentage,
        preFinalEarnedPercentage,
        preFinalAttemptedWeight,
        finalWeight,
        scheme
      };
    });

    const isAll = activeSemesterId === 'all';
    const activeSem = semesters.find(s => s.id === activeSemesterId) || 
                      semesters.find(s => s.isCurrent) || 
                      semesters[0] || 
                      null;

    const scopedSubjects = isAll 
      ? parsedSubjects 
      : parsedSubjects.filter(s => s.semesterId === activeSem?.id || (!s.semesterId && activeSem?.isCurrent));

    // Sort chronologically by semester order then alphabetically
    scopedSubjects.sort((a, b) => {
      const semA = semesters.find(s => s.id === a.semesterId);
      const semB = semesters.find(s => s.id === b.semesterId);
      const orderA = semA ? Number(semA.order) || 0 : 0;
      const orderB = semB ? Number(semB.order) || 0 : 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    let scopedQualityPoints = 0;
    let scopedCreditHours = 0;
    scopedSubjects.forEach(s => {
      scopedQualityPoints += (s.currentGPA * s.creditHours);
      scopedCreditHours += s.creditHours;
    });

    const currentScopedGPA = scopedCreditHours > 0 ? (scopedQualityPoints / scopedCreditHours) : 0;
    const currentOverallCGPA = totalCreditHoursAll > 0 ? (totalQualityPointsAll / totalCreditHoursAll) : 0;

    return { 
      parsedSubjects, 
      scopedSubjects, 
      activeSem, 
      isAll, 
      currentScopedGPA, 
      currentOverallCGPA, 
      scopedCreditHours,
      totalCreditHoursAll
    };
  }, [subjects, assessments, semesters, activeSemesterId]);

  // GSAP Entrance Animation
  useGSAP(() => {
    if (loading || processedData.scopedSubjects.length === 0) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.2 });

    tl.fromTo(".calc-banner",
      { opacity: 0, scale: 0.97, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.6 }
    );

    tl.fromTo(".calc-item",
      { opacity: 0, x: -15 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 },
      "-=0.3"
    );
  }, { scope: containerRef, dependencies: [loading, processedData.scopedSubjects.length, activeSemesterId, globalMode] });

  // Init default targets, predicted scores, and reverse calculation states
  useEffect(() => {
    if (processedData.scopedSubjects.length > 0) {
      setTargets(prev => {
        const next = { ...prev };
        processedData.scopedSubjects.forEach(sub => {
          if (!next[sub.id]) {
            let matched = TARGET_GRADES.find(t => t.value <= sub.currentGPA) || TARGET_GRADES[TARGET_GRADES.length - 1];
            if (sub.currentGPA === 0 && sub.totalAttemptedWeight === 0) {
              matched = TARGET_GRADES.find(t => t.value === 3.00);
            }
            next[sub.id] = matched;
          }
        });
        return next;
      });

      setPredictedScores(prev => {
        const next = { ...prev };
        processedData.scopedSubjects.forEach(sub => {
          if (next[sub.id] === undefined) {
            next[sub.id] = 80;
          }
        });
        return next;
      });

      setReverseInputs(prev => {
        const next = { ...prev };
        processedData.scopedSubjects.forEach(sub => {
          if (!next[sub.id]) {
            next[sub.id] = {
              type: 'percentage',
              percent: '75',
              grade: 'B+',
              paperTotal: 60
            };
          }
        });
        return next;
      });
    }
  }, [processedData.scopedSubjects]);

  const handleTargetChange = (subId, targetVal) => {
    const matched = TARGET_GRADES.find(t => t.value === Number(targetVal));
    if (matched) {
      setTargets(prev => ({ ...prev, [subId]: matched }));
    }
  };

  const handlePredictChange = (subId, val) => {
    setPredictedScores(prev => ({ ...prev, [subId]: Number(val) }));
  };

  const handleReverseInputChange = (subId, field, val) => {
    setReverseInputs(prev => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || { type: 'percentage', percent: '75', grade: 'B+', paperTotal: 60 }),
        [field]: val
      }
    }));
  };

  // Save Final Exam Assessment directly from Target Calculator
  const handleSaveFinalFromCalculator = async (sub, reverseCalc) => {
    if (!sub?.id || !reverseCalc) return;
    setSavingSubId(sub.id);

    try {
      const calculatedScore = reverseCalc.type === 'percentage' 
        ? Math.round(reverseCalc.calculatedPaperMarks * 10) / 10 
        : Math.round(reverseCalc.avgMarks * 10) / 10;
      
      const totalMarks = reverseCalc.totalPaperMarks || 60;

      const existingFinal = assessments.find(a => a.type === 'Final' && a.subjectId === sub.id);

      if (existingFinal && updateAssessment) {
        await updateAssessment(existingFinal.id, {
          title: existingFinal.title || 'Final Term Exam',
          scoreReceived: calculatedScore,
          totalPossibleScore: totalMarks,
          type: 'Final'
        });
      } else if (addAssessment) {
        await addAssessment({
          subjectId: sub.id,
          title: 'Final Term Exam',
          type: 'Final',
          scoreReceived: calculatedScore,
          totalPossibleScore: totalMarks
        });
      }

      setSavedSubIds(prev => ({ ...prev, [sub.id]: true }));
      setTimeout(() => {
        setSavedSubIds(prev => ({ ...prev, [sub.id]: false }));
      }, 3000);
    } catch (err) {
      console.error("Error saving final exam:", err);
      alert("Failed to save final exam assessment.");
    } finally {
      setSavingSubId(null);
    }
  };

  // Projected SGPA Calculation
  const projectedGPA = useMemo(() => {
    if (processedData.scopedCreditHours === 0) return 0;
    
    let projectedQualityPoints = 0;

    processedData.scopedSubjects.forEach(sub => {
      let gpaToUse = sub.currentGPA;
      if (globalMode === 'target') {
        const target = targets[sub.id];
        gpaToUse = target ? target.value : sub.currentGPA;
      } else {
        const predictVal = predictedScores[sub.id] !== undefined ? predictedScores[sub.id] : 80;
        const projectedFinalPercentage = sub.earnedPercentage + (predictVal / 100) * sub.remainingWeight;
        gpaToUse = getVUGPA(projectedFinalPercentage);
      }

      projectedQualityPoints += (gpaToUse * sub.creditHours);
    });

    return projectedQualityPoints / processedData.scopedCreditHours;
  }, [processedData, targets, predictedScores, globalMode]);

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

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />
      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={containerRef}>
        <TopNav title="Sandbox & Final Calculator" />

        <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8">
          
          {/* Term Filter Pills */}
          {semesters.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setActiveSemester('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  processedData.isAll 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                <Layers size={15} /> All Terms (Degree Sandbox)
              </button>
              {semesters.map(sem => {
                const isSelected = activeSemesterId === sem.id;
                return (
                  <button
                    key={sem.id}
                    onClick={() => setActiveSemester(sem.id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    {sem.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Banner Projection Box */}
          <div className={`calc-banner opacity-0 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${
            globalMode === 'finalMarks' 
              ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700' 
              : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700'
          }`}>
            <div className="absolute top-0 right-0 p-8 opacity-10">
              {globalMode === 'finalMarks' ? <Sparkles size={120} /> : <Target size={120} />}
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              {globalMode === 'finalMarks' ? (
                <Sparkles size={22} className="text-amber-300" />
              ) : processedData.isAll ? (
                <GraduationCap size={22} className="text-indigo-300" />
              ) : (
                <Target size={22} className="text-indigo-300" />
              )}
              <h1 className="text-xl sm:text-2xl text-white font-bold">
                {globalMode === 'finalMarks' 
                  ? "VU Final Term Marks Reverse Generator" 
                  : processedData.isAll 
                    ? "Degree CGPA Projection Sandbox" 
                    : `${processedData.activeSem?.name || 'Term'} SGPA Sandbox`}
              </h1>
            </div>
            
            {globalMode === 'finalMarks' ? (
              <p className="text-amber-100/90 text-sm max-w-2xl leading-relaxed">
                VU only publishes your total course percentage / grade. Use this reverse calculator to reveal your <strong>exact marks, percentage, and weighted contribution</strong> on your Final Term paper.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-14">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
                    Current {processedData.isAll ? "Cumulative CGPA" : "Term SGPA"}
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-white">{processedData.currentScopedGPA.toFixed(2)}</p>
                  <span className="text-[11px] text-indigo-200 font-medium">{processedData.scopedCreditHours} Credits</span>
                </div>
                
                <div className="hidden sm:block text-indigo-300">
                  <ArrowRight size={28} />
                </div>
                
                <div>
                  <p className="text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">
                    Projected {processedData.isAll ? "Degree CGPA" : "Term SGPA"}
                  </p>
                  <p className="text-4xl sm:text-5xl font-extrabold text-amber-400">{projectedGPA.toFixed(2)}</p>
                  <span className="text-[11px] text-amber-200 font-medium">Based on your target sandbox</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls & Subject Target List */}
          <div className="space-y-4">
            <div className="calc-item opacity-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-200">
                  {globalMode === 'finalMarks'
                    ? "Generate Final Term Exam Marks"
                    : processedData.isAll 
                      ? "Course Projections (All Terms)" 
                      : `Course Projections (${processedData.activeSem?.name || 'Current'})`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {globalMode === 'finalMarks' 
                    ? "Enter your total subject result from VU LMS to calculate your Final Paper marks." 
                    : "Adjust desired grades or simulate remaining exam performance."}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
                <button 
                  onClick={() => setGlobalMode('target')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    globalMode === 'target' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Target Grade
                </button>
                <button 
                  onClick={() => setGlobalMode('predict')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    globalMode === 'predict' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Predict Final
                </button>
                <button 
                  onClick={() => setGlobalMode('finalMarks')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    globalMode === 'finalMarks' 
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' 
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <Sparkles size={14} /> Final Marks
                </button>
              </div>
            </div>
            
            {/* SUBJECT ROWS */}
            {processedData.scopedSubjects.map(sub => {
              
              // MODE 1: TARGET GRADE
              if (globalMode === 'target') {
                const target = targets[sub.id] || TARGET_GRADES[0];
                const pointsNeeded = target.percent - sub.earnedPercentage;
                
                let reqMessage = "";
                let reqStatus = "possible";
                let reqPercent = 0;

                if (pointsNeeded <= 0) {
                  reqStatus = "achieved";
                  reqMessage = "Target Already Secured!";
                } else if (sub.remainingWeight <= 0) {
                  reqStatus = "impossible";
                  reqMessage = "Course grading is finished.";
                } else {
                  reqPercent = (pointsNeeded / sub.remainingWeight) * 100;
                  if (reqPercent > 100) {
                    reqStatus = "impossible";
                    reqMessage = `Impossible (Needs ${reqPercent.toFixed(1)}% on remaining exams)`;
                  } else {
                    reqMessage = `Score ${reqPercent.toFixed(1)}% on remaining exams`;
                  }
                }

                return (
                  <div key={sub.id} className="calc-item opacity-0 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{sub.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">{sub.creditHours} Cr</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="text-slate-400">Current: <span className="font-bold text-emerald-400">{sub.currentGPA.toFixed(2)} GPA</span></span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">Remaining Weight: <span className="text-slate-200">{sub.remainingWeight.toFixed(0)}%</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <select 
                        value={target.value}
                        onChange={(e) => handleTargetChange(sub.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                      >
                        {TARGET_GRADES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      <div className={`px-4 py-2 rounded-xl min-w-[140px] text-center font-bold text-xs sm:text-sm ${
                        reqStatus === 'achieved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        reqStatus === 'impossible' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {reqMessage}
                      </div>
                    </div>
                  </div>
                );
              } 
              
              // MODE 2: PREDICT FINAL
              else if (globalMode === 'predict') {
                const predictVal = predictedScores[sub.id] !== undefined ? predictedScores[sub.id] : 80;
                const projectedFinalPercentage = sub.earnedPercentage + (predictVal / 100) * sub.remainingWeight;
                const projectedSubGPA = getVUGPA(projectedFinalPercentage);
                const isComplete = sub.remainingWeight <= 0;

                return (
                  <div key={sub.id} className="calc-item opacity-0 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{sub.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">{sub.creditHours} Cr</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="text-slate-400">Current: <span className="font-bold text-emerald-400">{sub.currentGPA.toFixed(2)} GPA</span></span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">Remaining Weight: <span className="text-slate-200">{sub.remainingWeight.toFixed(0)}%</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                      {!isComplete ? (
                        <>
                          <div className="flex flex-col w-full md:w-48">
                            <div className="flex justify-between text-xs text-slate-400 font-bold mb-1">
                              <span>Score on remaining:</span>
                              <span className="text-indigo-400">{predictVal}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" max="100" 
                              value={predictVal}
                              onChange={(e) => handlePredictChange(sub.id, e.target.value)}
                              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="px-4 py-2 rounded-xl min-w-[100px] text-center font-bold text-sm bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {projectedSubGPA.toFixed(2)} GPA
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-2 rounded-xl min-w-[180px] text-center font-bold text-xs bg-slate-800 text-slate-400">
                          Course Finished
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // MODE 3: FINAL TERM MARKS REVERSE GENERATOR
              else {
                const subConfig = reverseInputs[sub.id] || { type: 'percentage', percent: '75', grade: 'B+', paperTotal: 60 };
                const totalPaperMarks = Number(subConfig.paperTotal) || 60;
                const finalWeight = sub.finalWeight || 50;
                const preFinalEarned = sub.preFinalEarnedPercentage || 0;

                let calcResult = null;

                if (subConfig.type === 'percentage') {
                  const subjectTotalPercent = parseFloat(subConfig.percent);
                  if (!isNaN(subjectTotalPercent) && subjectTotalPercent >= 0 && subjectTotalPercent <= 100) {
                    const finalPointsNeeded = subjectTotalPercent - preFinalEarned;
                    const finalPaperPercentage = (finalPointsNeeded / finalWeight) * 100;
                    const calculatedPaperMarks = (finalPaperPercentage / 100) * totalPaperMarks;
                    const paperGrade = getVUGrade(finalPaperPercentage);
                    const paperGPA = getVUGPA(finalPaperPercentage);

                    calcResult = {
                      type: 'percentage',
                      subjectTotalPercent,
                      finalPointsNeeded,
                      finalPaperPercentage,
                      calculatedPaperMarks: Math.max(0, calculatedPaperMarks),
                      totalPaperMarks,
                      paperGrade,
                      paperGPA,
                      isImpossible: finalPaperPercentage > 100 || finalPaperPercentage < 0
                    };
                  }
                } else {
                  const threshold = VU_GRADE_THRESHOLDS.find(t => t.grade === subConfig.grade) || VU_GRADE_THRESHOLDS[2];
                  const minFinalPoints = threshold.min - preFinalEarned;
                  const maxFinalPoints = threshold.max - preFinalEarned;
                  const minPaperPercent = (minFinalPoints / finalWeight) * 100;
                  const maxPaperPercent = (maxFinalPoints / finalWeight) * 100;
                  const avgPaperPercent = (minPaperPercent + maxPaperPercent) / 2;
                  const avgMarks = (avgPaperPercent / 100) * totalPaperMarks;

                  calcResult = {
                    type: 'grade',
                    minMarks: Math.max(0, (minPaperPercent / 100) * totalPaperMarks),
                    maxMarks: Math.min(totalPaperMarks, (maxPaperPercent / 100) * totalPaperMarks),
                    avgMarks: Math.max(0, Math.min(totalPaperMarks, avgMarks)),
                    avgPaperPercent: Math.max(0, Math.min(100, avgPaperPercent)),
                    totalPaperMarks
                  };
                }

                const isSavingThis = savingSubId === sub.id;
                const isSavedThis = savedSubIds[sub.id];

                return (
                  <div key={sub.id} className="calc-item opacity-0 bg-white/5 border border-white/10 hover:border-amber-500/30 rounded-2xl p-5 shadow-lg transition-all space-y-4 backdrop-blur-sm">
                    
                    {/* Subject Header & Pre-final Points Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white">{sub.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">{sub.creditHours} Cr</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Final Weight: <strong className="text-amber-400">{finalWeight}%</strong> | Coursework Points: <strong className="text-emerald-400">{preFinalEarned.toFixed(1)} / {sub.preFinalAttemptedWeight}%</strong>
                        </p>
                      </div>

                      {/* Mode Toggle for this Subject */}
                      <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleReverseInputChange(sub.id, 'type', 'percentage')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            subConfig.type === 'percentage' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          By % Marks
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReverseInputChange(sub.id, 'type', 'grade')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            subConfig.type === 'grade' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          By Grade
                        </button>
                      </div>
                    </div>

                    {/* Inputs & Calculation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      
                      {/* Left: Input values */}
                      <div className="md:col-span-5 space-y-3">
                        {subConfig.type === 'percentage' ? (
                          <div>
                            <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                              VU Total Subject %
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="e.g. 78.5"
                              value={subConfig.percent}
                              onChange={(e) => handleReverseInputChange(sub.id, 'percent', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-bold focus:border-amber-500 outline-none"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                              Subject Letter Grade
                            </label>
                            <select
                              value={subConfig.grade}
                              onChange={(e) => handleReverseInputChange(sub.id, 'grade', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-medium focus:border-amber-500 outline-none"
                            >
                              {VU_GRADE_THRESHOLDS.map(t => (
                                <option key={t.grade} value={t.grade}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] uppercase font-bold text-slate-400">
                            Paper Total Marks:
                          </label>
                          <div className="flex items-center gap-1">
                            {[40, 60, 80, 100].map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleReverseInputChange(sub.id, 'paperTotal', m)}
                                className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer ${
                                  Number(subConfig.paperTotal) === m 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {m}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Calculated Output Card */}
                      <div className="md:col-span-7 bg-slate-900/60 border border-amber-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        {calcResult ? (
                          calcResult.type === 'percentage' ? (
                            <div className="flex-1">
                              <span className="text-[10px] text-amber-400 uppercase font-extrabold block">
                                Calculated Final Exam Paper
                              </span>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={`text-2xl font-extrabold ${
                                  calcResult.finalPaperPercentage >= 80 ? 'text-emerald-400' :
                                  calcResult.finalPaperPercentage >= 65 ? 'text-blue-400' :
                                  calcResult.finalPaperPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {calcResult.calculatedPaperMarks.toFixed(1)} / {calcResult.totalPaperMarks}
                                </span>
                                <span className="text-xs text-slate-300 font-semibold">
                                  ({calcResult.finalPaperPercentage.toFixed(1)}% - Grade {calcResult.paperGrade})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Contribution: <strong>{calcResult.finalPointsNeeded.toFixed(1)} / {finalWeight} pts</strong>
                              </span>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <span className="text-[10px] text-amber-400 uppercase font-extrabold block">
                                Estimated Final Paper Range
                              </span>
                              <div className="text-lg font-extrabold text-white mt-0.5">
                                {calcResult.minMarks.toFixed(1)} – {calcResult.maxMarks.toFixed(1)} / {calcResult.totalPaperMarks}
                              </div>
                              <span className="text-[11px] text-emerald-400 font-semibold block">
                                Avg: {calcResult.avgMarks.toFixed(1)} marks ({calcResult.avgPaperPercent.toFixed(1)}%)
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-slate-400">Enter result to calculate</div>
                        )}

                        {/* Save Assessment Action Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveFinalFromCalculator(sub, calcResult)}
                          disabled={isSavingThis || !calcResult || (calcResult.type === 'percentage' && calcResult.isImpossible)}
                          className={`w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                            isSavedThis 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                          } disabled:opacity-40`}
                          title="Save as Final Exam Assessment"
                        >
                          {isSavingThis ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isSavedThis ? (
                            <>
                              <Check size={14} /> Saved!
                            </>
                          ) : (
                            <>
                              <Save size={14} /> Save Final
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              }
            })}
            
            {processedData.scopedSubjects.length === 0 && (
              <div className="p-8 text-center bg-slate-800/20 border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-sm">No subjects available in this semester.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
