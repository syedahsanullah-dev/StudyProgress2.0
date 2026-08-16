import { useState, useMemo } from 'react';
import { Target, Calculator } from 'lucide-react';

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

export default function WhatIfCalculator({ subject, assessments }) {
  const [mode, setMode] = useState('target'); // 'target' | 'predict'
  const [targetGrade, setTargetGrade] = useState(85); // Default to A (85%)
  const [predictedScore, setPredictedScore] = useState(80); // Default 80%

  const targets = [
    { label: 'A (4.00)', value: 85 },
    { label: 'A- (3.66)', value: 80 },
    { label: 'B+ (3.33)', value: 75 },
    { label: 'B (3.00)', value: 70 },
    { label: 'B- (2.66)', value: 65 },
    { label: 'C+ (2.33)', value: 61 },
    { label: 'Pass (2.00)', value: 58 }
  ];

  const baseData = useMemo(() => {
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
    let earnedWeightedPercentage = 0; 

    Object.keys(categoryStats).forEach(type => {
      const stats = categoryStats[type];
      const weight = Number(scheme[type]) || 0;
      if (stats.total > 0 && weight > 0) {
        totalAttemptedWeight += weight;
        earnedWeightedPercentage += (stats.earned / stats.total) * weight;
      }
    });

    return { 
      earnedWeightedPercentage, 
      remainingWeight: 100 - totalAttemptedWeight 
    };
  }, [subject, assessments]);

  const targetResult = useMemo(() => {
    if (!baseData) return null;
    const { earnedWeightedPercentage, remainingWeight } = baseData;
    
    const pointsNeeded = targetGrade - earnedWeightedPercentage;
    if (pointsNeeded <= 0) {
      return { status: 'achieved', message: 'You have already secured enough points for this grade!' };
    }
    if (remainingWeight <= 0) {
      return { status: 'impossible', message: 'Course grading is complete. Grade cannot be changed.' };
    }
    
    const requiredPercentageOnRemaining = (pointsNeeded / remainingWeight) * 100;
    if (requiredPercentageOnRemaining > 100) {
      return { 
        status: 'impossible', 
        message: `Mathematically Impossible. You'd need ${requiredPercentageOnRemaining.toFixed(1)}% on your remaining assessments.`,
        required: requiredPercentageOnRemaining
      };
    }
    return {
      status: 'possible',
      message: `You need to score an average of ${requiredPercentageOnRemaining.toFixed(1)}% on your remaining un-graded assessments (which make up ${remainingWeight}% of the course).`,
      required: requiredPercentageOnRemaining,
      remainingWeight
    };
  }, [baseData, targetGrade]);

  const predictResult = useMemo(() => {
    if (!baseData) return null;
    const { earnedWeightedPercentage, remainingWeight } = baseData;
    
    const projectedFinalPercentage = earnedWeightedPercentage + (predictedScore / 100) * remainingWeight;
    const projectedGPA = getVUGPA(projectedFinalPercentage);
    const projectedGrade = getVUGrade(projectedFinalPercentage);
    
    return {
      finalPercentage: projectedFinalPercentage,
      gpa: projectedGPA,
      grade: projectedGrade,
      remainingWeight
    };
  }, [baseData, predictedScore]);

  if (!subject) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl h-fit">
      {/* Mode Tabs */}
      <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setMode('target')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'target' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Target size={16} /> Target Grade
        </button>
        <button 
          onClick={() => setMode('predict')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'predict' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Calculator size={16} /> Predict Final
        </button>
      </div>

      {mode === 'target' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Desired Grade</label>
            <select 
              value={targetGrade}
              onChange={(e) => setTargetGrade(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {targets.map(t => (
                <option key={t.value} value={t.value}>{t.label} (Needs {t.value}%+)</option>
              ))}
            </select>
          </div>

          <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner">
            {targetResult?.status === 'achieved' && (
              <div className="text-emerald-400 font-bold text-center text-sm flex items-center justify-center gap-2">
                <span>🎉</span> {targetResult.message}
              </div>
            )}
            {targetResult?.status === 'impossible' && (
              <div className="text-red-400 font-bold text-center text-sm flex items-center justify-center gap-2">
                <span>❌</span> {targetResult.message}
              </div>
            )}
            {targetResult?.status === 'possible' && (
              <div className="flex flex-col items-center justify-center">
                <div className="text-4xl font-extrabold text-amber-400 text-center mb-1 tracking-tight">
                  {targetResult.required.toFixed(1)}<span className="text-2xl text-amber-500/80">%</span>
                </div>
                <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold mb-3">
                  Required Average
                </div>
                <p className="text-sm text-slate-300 text-center font-medium leading-relaxed">
                  {targetResult.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'predict' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-400">
                Score on remaining {predictResult?.remainingWeight}%
              </label>
              <span className="text-lg font-bold text-indigo-400">{predictedScore}%</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={predictedScore}
              onChange={(e) => setPredictedScore(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner flex flex-col items-center justify-center">
            <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold mb-2">
              Projected Final Grade
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="text-5xl font-extrabold text-white">
                {predictResult?.grade}
              </div>
              <div className="h-10 w-px bg-slate-700"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-emerald-400">{predictResult?.gpa.toFixed(2)} GPA</span>
                <span className="text-sm text-slate-400 font-medium">{predictResult?.finalPercentage.toFixed(1)}% Overall</span>
              </div>
            </div>
            {predictResult?.remainingWeight <= 0 && (
              <p className="text-xs text-red-400 text-center mt-3 font-medium">
                Note: Your course grading is already complete.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
