import { useState, useMemo } from 'react';
import { Target, Calculator, Sparkles, Check, AlertCircle, Save, Loader2, Award, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../../store/useStore';

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

export default function WhatIfCalculator({ subject, assessments }) {
  const { addAssessment, updateAssessment } = useStore();

  const [mode, setMode] = useState('target'); // 'target' | 'predict' | 'reverse'
  const [targetGrade, setTargetGrade] = useState(85); // Default to A (85%)
  const [predictedScore, setPredictedScore] = useState(80); // Default 80%

  // Reverse Final Exam Calculator State
  const [reverseType, setReverseType] = useState('percentage'); // 'percentage' | 'grade'
  const [subjectTotalInput, setSubjectTotalInput] = useState('75');
  const [selectedGradeKey, setSelectedGradeKey] = useState('B+');
  const [paperTotalMarks, setPaperTotalMarks] = useState(60);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const targets = [
    { label: 'A (4.00)', value: 85 },
    { label: 'A- (3.66)', value: 80 },
    { label: 'B+ (3.33)', value: 75 },
    { label: 'B (3.00)', value: 70 },
    { label: 'B- (2.66)', value: 65 },
    { label: 'C+ (2.33)', value: 61 },
    { label: 'Pass (2.00)', value: 58 }
  ];

  // Base Data Calculation (Excluding Final if calculating reverse)
  const baseData = useMemo(() => {
    if (!subject) return null;
    const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
    const scheme = subject.gradingScheme || defaultScheme;
    
    const categoryStats = {};
    const preFinalStats = {};
    
    assessments.forEach(a => {
      const type = a.type || "Other";
      if (!categoryStats[type]) categoryStats[type] = { earned: 0, total: 0, count: 0 };
      categoryStats[type].earned += Number(a.scoreReceived);
      categoryStats[type].total += Number(a.totalPossibleScore);
      categoryStats[type].count += 1;

      if (type !== 'Final') {
        if (!preFinalStats[type]) preFinalStats[type] = { earned: 0, total: 0, count: 0 };
        preFinalStats[type].earned += Number(a.scoreReceived);
        preFinalStats[type].total += Number(a.totalPossibleScore);
        preFinalStats[type].count += 1;
      }
    });

    let totalAttemptedWeight = 0;
    let earnedWeightedPercentage = 0; 
    let preFinalAttemptedWeight = 0;
    let preFinalEarnedPercentage = 0;
    const componentBreakdown = [];

    Object.keys(scheme).forEach(type => {
      const weight = Number(scheme[type]) || 0;
      if (weight > 0) {
        const stat = categoryStats[type];
        const hasScore = stat && stat.total > 0;
        const rawPercent = hasScore ? (stat.earned / stat.total) * 100 : 0;
        const weightedPoints = hasScore ? (rawPercent / 100) * weight : 0;

        if (hasScore) {
          totalAttemptedWeight += weight;
          earnedWeightedPercentage += weightedPoints;

          if (type !== 'Final') {
            preFinalAttemptedWeight += weight;
            preFinalEarnedPercentage += weightedPoints;
          }
        }

        componentBreakdown.push({
          type,
          weight,
          hasScore,
          earned: stat ? stat.earned : 0,
          total: stat ? stat.total : 0,
          rawPercent,
          weightedPoints
        });
      }
    });

    const finalWeight = Number(scheme.Final) || Math.max(0, 100 - preFinalAttemptedWeight) || 50;

    return { 
      scheme,
      categoryStats,
      preFinalStats,
      componentBreakdown,
      earnedWeightedPercentage, 
      remainingWeight: Math.max(0, 100 - totalAttemptedWeight),
      preFinalEarnedPercentage,
      preFinalAttemptedWeight,
      finalWeight
    };
  }, [subject, assessments]);

  // Target Result
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

  // Predict Result
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

  // Reverse Final Term Marks Result
  const reverseResult = useMemo(() => {
    if (!baseData) return null;
    const { preFinalEarnedPercentage, finalWeight, componentBreakdown } = baseData;

    if (finalWeight <= 0) {
      return { error: 'Final exam weightage is 0% in grading scheme.' };
    }

    const totalPaperMarks = Number(paperTotalMarks) || 60;

    if (reverseType === 'percentage') {
      const subjectTotalPercent = parseFloat(subjectTotalInput);
      if (isNaN(subjectTotalPercent) || subjectTotalPercent < 0 || subjectTotalPercent > 100) {
        return { error: 'Please enter a valid total subject percentage between 0 and 100.' };
      }

      const finalPointsNeeded = subjectTotalPercent - preFinalEarnedPercentage;
      const finalPaperPercentage = (finalPointsNeeded / finalWeight) * 100;
      const calculatedPaperMarks = (finalPaperPercentage / 100) * totalPaperMarks;
      const finalGrade = getVUGrade(finalPaperPercentage);
      const finalGPA = getVUGPA(finalPaperPercentage);
      const overallGrade = getVUGrade(subjectTotalPercent);
      const overallGPA = getVUGPA(subjectTotalPercent);

      return {
        type: 'percentage',
        subjectTotalPercent,
        preFinalEarnedPercentage,
        finalPointsNeeded,
        finalWeight,
        finalPaperPercentage,
        calculatedPaperMarks: Math.max(0, calculatedPaperMarks),
        totalPaperMarks,
        finalGrade,
        finalGPA,
        overallGrade,
        overallGPA,
        isImpossible: finalPaperPercentage > 100 || finalPaperPercentage < 0,
        componentBreakdown
      };
    } else {
      // By Grade Key
      const threshold = VU_GRADE_THRESHOLDS.find(t => t.grade === selectedGradeKey) || VU_GRADE_THRESHOLDS[2];
      
      const minFinalPoints = threshold.min - preFinalEarnedPercentage;
      const maxFinalPoints = threshold.max - preFinalEarnedPercentage;
      
      const minPaperPercent = (minFinalPoints / finalWeight) * 100;
      const maxPaperPercent = (maxFinalPoints / finalWeight) * 100;
      const avgPaperPercent = (minPaperPercent + maxPaperPercent) / 2;

      const minMarks = (minPaperPercent / 100) * totalPaperMarks;
      const maxMarks = (maxPaperPercent / 100) * totalPaperMarks;
      const avgMarks = (avgPaperPercent / 100) * totalPaperMarks;

      return {
        type: 'grade',
        gradeKey: threshold.grade,
        gradeGPA: threshold.gpa,
        gradeRange: `${threshold.min}% - ${threshold.max}%`,
        preFinalEarnedPercentage,
        finalWeight,
        minPaperPercent: Math.max(0, minPaperPercent),
        maxPaperPercent: Math.min(100, maxPaperPercent),
        avgPaperPercent: Math.max(0, Math.min(100, avgPaperPercent)),
        minMarks: Math.max(0, minMarks),
        maxMarks: Math.min(totalPaperMarks, maxMarks),
        avgMarks: Math.max(0, Math.min(totalPaperMarks, avgMarks)),
        totalPaperMarks,
        componentBreakdown
      };
    }
  }, [baseData, reverseType, subjectTotalInput, selectedGradeKey, paperTotalMarks]);

  // Save as Final Exam Assessment
  const handleSaveFinalAssessment = async () => {
    if (!subject?.id || !reverseResult) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const calculatedScore = reverseType === 'percentage' 
        ? Math.round(reverseResult.calculatedPaperMarks * 10) / 10 
        : Math.round(reverseResult.avgMarks * 10) / 10;
      
      const totalMarks = reverseResult.totalPaperMarks || 60;

      // Check if existing Final assessment exists
      const existingFinal = assessments.find(a => a.type === 'Final' && a.subjectId === subject.id);

      if (existingFinal && updateAssessment) {
        await updateAssessment(existingFinal.id, {
          title: existingFinal.title || 'Final Term Exam',
          scoreReceived: calculatedScore,
          totalPossibleScore: totalMarks,
          type: 'Final'
        });
      } else if (addAssessment) {
        await addAssessment({
          subjectId: subject.id,
          title: 'Final Term Exam',
          type: 'Final',
          scoreReceived: calculatedScore,
          totalPossibleScore: totalMarks
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving final exam assessment:", err);
      alert("Failed to save final exam assessment.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!subject) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl h-fit backdrop-blur-sm">
      
      {/* Mode Navigation Tabs */}
      <div className="flex bg-slate-800/60 p-1 rounded-2xl mb-6 border border-slate-700/50">
        <button 
          onClick={() => setMode('target')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'target' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target size={15} /> 
          <span className="truncate">Target</span>
        </button>
        <button 
          onClick={() => setMode('predict')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'predict' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator size={15} /> 
          <span className="truncate">Predict</span>
        </button>
        <button 
          onClick={() => setMode('reverse')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'reverse' 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
              : 'text-amber-400/80 hover:text-amber-300'
          }`}
        >
          <Sparkles size={15} /> 
          <span className="truncate">Final Marks</span>
        </button>
      </div>

      {/* MODE 1: TARGET GRADE */}
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

      {/* MODE 2: PREDICT FINAL */}
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

      {/* MODE 3: REVERSE FINAL TERM MARKS GENERATOR */}
      {mode === 'reverse' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          
          {/* Header Info */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Award size={14} /> Coursework Points Secured:
              </span>
              <span className="font-extrabold text-amber-400">
                {baseData?.preFinalEarnedPercentage.toFixed(1)} / {baseData?.preFinalAttemptedWeight}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              VU does not publish raw Final Paper marks. Enter your total result to reveal your exact Final Exam performance.
            </p>
          </div>

          {/* Input Method Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-1 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => setReverseType('percentage')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                reverseType === 'percentage'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Total Marks / %
            </button>
            <button
              type="button"
              onClick={() => setReverseType('grade')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                reverseType === 'grade'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Final Grade / GPA
            </button>
          </div>

          {/* Form Inputs */}
          {reverseType === 'percentage' ? (
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-1.5">
                Total Subject % Announced by VU
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 78.5"
                  value={subjectTotalInput}
                  onChange={(e) => setSubjectTotalInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white font-bold text-base focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  %
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-1.5">
                Subject Grade in Result Card
              </label>
              <select
                value={selectedGradeKey}
                onChange={(e) => setSelectedGradeKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white font-medium focus:border-amber-500 outline-none text-sm transition-all"
              >
                {VU_GRADE_THRESHOLDS.map((t) => (
                  <option key={t.grade} value={t.grade}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Final Paper Total Marks Setting */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Final Paper Total Marks
              </label>
              <div className="flex gap-1">
                {[40, 60, 80, 100].map((marks) => (
                  <button
                    key={marks}
                    type="button"
                    onClick={() => setPaperTotalMarks(marks)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      Number(paperTotalMarks) === marks 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {marks}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="200"
              value={paperTotalMarks}
              onChange={(e) => setPaperTotalMarks(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:border-amber-500 outline-none"
            />
          </div>

          {/* Output Results Card */}
          {reverseResult && !reverseResult.error && (
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-amber-500/30 shadow-xl space-y-3 animate-in fade-in duration-200">
              
              <div className="text-[10px] text-amber-400 uppercase tracking-widest font-extrabold text-center">
                Calculated Final Term Exam Result
              </div>

              {reverseResult.type === 'percentage' ? (
                <div>
                  <div className="flex items-center justify-center gap-3 my-1">
                    <div className="text-center">
                      <div className={`text-4xl font-extrabold ${
                        reverseResult.finalPaperPercentage >= 80 ? 'text-emerald-400' :
                        reverseResult.finalPaperPercentage >= 65 ? 'text-blue-400' :
                        reverseResult.finalPaperPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {reverseResult.calculatedPaperMarks.toFixed(1)}
                        <span className="text-xl text-slate-400 font-semibold">/{reverseResult.totalPaperMarks}</span>
                      </div>
                      <div className="text-xs text-slate-300 font-semibold mt-0.5">
                        Paper Marks ({reverseResult.finalPaperPercentage.toFixed(1)}%)
                      </div>
                    </div>

                    <div className="h-10 w-px bg-slate-700"></div>

                    <div className="text-center">
                      <div className="text-2xl font-extrabold text-white">
                        {reverseResult.finalGrade}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Paper GPA {reverseResult.finalGPA.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs text-slate-300 flex justify-between">
                    <span className="text-slate-400">Final Weight Contribution:</span>
                    <span className="font-bold text-amber-400">
                      {reverseResult.finalPointsNeeded.toFixed(1)} / {reverseResult.finalWeight} pts
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Marks Range:</span>
                    <span className="font-extrabold text-amber-400">
                      {reverseResult.minMarks.toFixed(1)} – {reverseResult.maxMarks.toFixed(1)} / {reverseResult.totalPaperMarks}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Paper %:</span>
                    <span className="font-bold text-white">
                      {reverseResult.minPaperPercent.toFixed(1)}% – {reverseResult.maxPaperPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/40 text-center">
                    <span className="text-[11px] text-slate-400 block">Average Estimate</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {reverseResult.avgMarks.toFixed(1)} / {reverseResult.totalPaperMarks}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5">
                      ({reverseResult.avgPaperPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Toggle Coursework Breakdown */}
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full text-center text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 pt-1 cursor-pointer"
              >
                {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showBreakdown ? 'Hide Grading Breakdown' : 'View Coursework Breakdown'}
              </button>

              {showBreakdown && (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/40 space-y-1.5 text-xs animate-in fade-in duration-200">
                  {baseData?.componentBreakdown.map((item) => (
                    <div key={item.type} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">
                        {item.type} ({item.weight}%):
                      </span>
                      <span className={item.hasScore ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                        {item.hasScore 
                          ? `${item.weightedPoints.toFixed(1)} pts (${item.rawPercent.toFixed(0)}%)` 
                          : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button: Save as Final Exam Assessment */}
              <button
                type="button"
                onClick={handleSaveFinalAssessment}
                disabled={isSaving || (reverseResult.type === 'percentage' && reverseResult.isImpossible)}
                className={`w-full mt-2 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/20'
                } disabled:opacity-50`}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <Check size={16} /> Saved to Assessments!
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save as Final Exam Assessment
                  </>
                )}
              </button>
            </div>
          )}

          {reverseResult?.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{reverseResult.error}</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
