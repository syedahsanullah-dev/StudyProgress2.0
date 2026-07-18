import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { Target, Loader2, ArrowRight } from 'lucide-react';
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

export default function TargetCalculator() {
  const { subjects, assessments, loading } = useStore();
  
  const [globalMode, setGlobalMode] = useState('target'); // 'target' | 'predict'
  const [targets, setTargets] = useState({});
  const [predictedScores, setPredictedScores] = useState({});
  const containerRef = useRef();

  const processedData = useMemo(() => {
    let totalQualityPoints = 0;
    let totalCreditHours = 0;
    
    const parsedSubjects = subjects.map(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      const scheme = subject.gradingScheme || { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      let earnedPercentage = 0;
      let totalAttemptedWeight = 0;

      if (subjectAssessments.length > 0) {
        const categoryStats = {};
        subjectAssessments.forEach(a => {
          const type = a.type || "Other";
          if (!categoryStats[type]) categoryStats[type] = { earned: 0, total: 0 };
          categoryStats[type].earned += Number(a.scoreReceived);
          categoryStats[type].total += Number(a.totalPossibleScore);
        });

        Object.keys(categoryStats).forEach(type => {
          const stats = categoryStats[type];
          const weight = Number(scheme[type]) || 0;
          if (stats.total > 0 && weight > 0) {
            totalAttemptedWeight += weight;
            earnedPercentage += (stats.earned / stats.total) * weight;
          }
        });
      }

      const finalPercentage = totalAttemptedWeight > 0 ? (earnedPercentage / totalAttemptedWeight) * 100 : 0;
      const currentGPA = getVUGPA(finalPercentage);
      
      totalQualityPoints += (currentGPA * creditHours);
      totalCreditHours += creditHours;

      return {
        ...subject,
        creditHours,
        earnedPercentage,
        totalAttemptedWeight,
        remainingWeight: 100 - totalAttemptedWeight,
        currentGPA,
        currentPercentage: finalPercentage
      };
    });

    const currentCGPA = totalCreditHours > 0 ? (totalQualityPoints / totalCreditHours) : 0;
    return { parsedSubjects, currentCGPA, totalCreditHours };
  }, [subjects, assessments]);

  // GSAP Entrance Animation
  useGSAP(() => {
    if (loading || processedData.parsedSubjects.length === 0) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 1.0 });

    // Animate the main header banner
    tl.fromTo(".calc-banner",
      { opacity: 0, scale: 0.95, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8 }
    );

    // Animate the list items
    tl.fromTo(".calc-item",
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 },
      "-=0.4"
    );
  }, { scope: containerRef, dependencies: [loading, processedData.parsedSubjects.length] });

  // Init default targets and predicted scores
  useEffect(() => {
    if (processedData.parsedSubjects.length > 0) {
      if (Object.keys(targets).length === 0) {
        const initialTargets = {};
        processedData.parsedSubjects.forEach(sub => {
          let matched = TARGET_GRADES.find(t => t.value <= sub.currentGPA) || TARGET_GRADES[TARGET_GRADES.length - 1];
          if (sub.currentGPA === 0 && sub.totalAttemptedWeight === 0) {
            matched = TARGET_GRADES.find(t => t.value === 3.00);
          }
          initialTargets[sub.id] = matched;
        });
        setTargets(initialTargets);
      }

      if (Object.keys(predictedScores).length === 0) {
        const initialPredicts = {};
        processedData.parsedSubjects.forEach(sub => {
          initialPredicts[sub.id] = 80; // 80% default
        });
        setPredictedScores(initialPredicts);
      }
    }
  }, [processedData.parsedSubjects, targets, predictedScores]);

  const handleTargetChange = (subjectId, valueStr) => {
    const val = Number(valueStr);
    const targetObj = TARGET_GRADES.find(t => t.value === val);
    setTargets(prev => ({ ...prev, [subjectId]: targetObj }));
  };

  const handlePredictChange = (subjectId, valueStr) => {
    setPredictedScores(prev => ({ ...prev, [subjectId]: Number(valueStr) }));
  };

  const projectedCGPA = useMemo(() => {
    if (!processedData.totalCreditHours) return 0;
    
    let projectedQualityPoints = 0;
    processedData.parsedSubjects.forEach(sub => {
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

    return projectedQualityPoints / processedData.totalCreditHours;
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
        <TopNav title="Sandbox Calculator" />

        <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8">
          
          <div className="calc-banner opacity-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Target size={120} />
            </div>
            
            <h1 className="text-2xl text-white font-bold mb-6">CGPA Projection Sandbox</h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-16">
              <div>
                <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Current CGPA</p>
                <p className="text-4xl font-extrabold text-white">{processedData.currentCGPA.toFixed(2)}</p>
              </div>
              
              <div className="hidden sm:block text-indigo-300">
                <ArrowRight size={32} />
              </div>
              
              <div>
                <p className="text-amber-200 text-sm font-semibold uppercase tracking-wider mb-1">Projected CGPA</p>
                <p className="text-5xl font-extrabold text-amber-400">{projectedCGPA.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="calc-item opacity-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-200">Set Individual Targets</h2>
              <div className="flex bg-slate-800/50 p-1 rounded-xl">
                <button 
                  onClick={() => setGlobalMode('target')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${globalMode === 'target' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Target Grade
                </button>
                <button 
                  onClick={() => setGlobalMode('predict')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${globalMode === 'predict' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Predict Final
                </button>
              </div>
            </div>
            
            {processedData.parsedSubjects.map(sub => {
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
                  <div key={sub.id} className="calc-item opacity-0 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{sub.name}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">Current: <span className="font-bold text-emerald-400">{sub.currentGPA.toFixed(2)}</span></span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">Remaining Weight: <span className="text-slate-200">{sub.remainingWeight.toFixed(0)}%</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <select 
                        value={target.value}
                        onChange={(e) => handleTargetChange(sub.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 font-bold focus:outline-none focus:border-indigo-500"
                      >
                        {TARGET_GRADES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      <div className={`px-4 py-2 rounded-xl min-w-[120px] text-center font-bold text-sm ${
                        reqStatus === 'achieved' ? 'bg-emerald-500/20 text-emerald-400' :
                        reqStatus === 'impossible' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {reqMessage}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Predict Mode
                const predictVal = predictedScores[sub.id] !== undefined ? predictedScores[sub.id] : 80;
                const projectedFinalPercentage = sub.earnedPercentage + (predictVal / 100) * sub.remainingWeight;
                const projectedSubGPA = getVUGPA(projectedFinalPercentage);
                const isComplete = sub.remainingWeight <= 0;

                return (
                  <div key={sub.id} className="calc-item opacity-0 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{sub.name}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">Current: <span className="font-bold text-emerald-400">{sub.currentGPA.toFixed(2)}</span></span>
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
                          <div className="px-4 py-2 rounded-xl min-w-[100px] text-center font-bold text-sm bg-indigo-500/20 text-indigo-300">
                            {projectedSubGPA.toFixed(2)} GPA
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-2 rounded-xl min-w-[200px] text-center font-bold text-sm bg-slate-800 text-slate-400">
                          Course Finished
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })}
            
            {processedData.parsedSubjects.length === 0 && (
              <p className="text-slate-500 text-center py-8">No subjects available.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
