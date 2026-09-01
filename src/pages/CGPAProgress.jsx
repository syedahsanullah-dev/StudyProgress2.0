import { useState, useRef, useMemo } from 'react';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { 
  TrendingUp, 
  Award, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Calendar, 
  Sparkles, 
  Calculator, 
  BarChart2, 
  LineChart as LineChartIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  CheckCircle2, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Download, 
  Sliders, 
  Star, 
  FileText,
  AlertCircle,
  Check,
  ChevronRight,
  Info,
  Terminal
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import useStore from '../store/useStore';
import { auth } from '../../firebase';

gsap.registerPlugin(useGSAP);

export default function CGPAProgress() {
  const { subjects, assessments, semesters, activeSemesterId, setActiveSemester, loading } = useStore();
  const transitionNavigate = useTransitionNavigate();
  const pageRef = useRef();

  // Active chart view tab
  const [chartTab, setChartTab] = useState('progression'); // 'progression' | 'workload' | 'distribution'
  
  // Expanded semester cards state
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'completed' | 'active' | 'upcoming'
  
  // Goal Simulator State
  const [targetDegreeCGPA, setTargetDegreeCGPA] = useState(3.50);
  const [totalDegreeCredits, setTotalDegreeCredits] = useState(132);
  const [customRemainingCredits, setCustomRemainingCredits] = useState('');
  const [remainingTermsCount, setRemainingTermsCount] = useState(4);
  
  // Transcript Modal State
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Grade points mapping
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

  const getAcademicStanding = (cgpa) => {
    if (cgpa >= 3.80) {
      return { 
        title: "Summa Cum Laude / Outstanding", 
        badge: "A+ Distinction", 
        color: "text-amber-300 bg-amber-500/15 border-amber-500/30",
        description: "Highest academic distinction, Dean's List candidate."
      };
    }
    if (cgpa >= 3.50) {
      return { 
        title: "Magna Cum Laude / Dean's Honor", 
        badge: "Dean's Honors", 
        color: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
        description: "Excellent academic standing with high honors."
      };
    }
    if (cgpa >= 3.00) {
      return { 
        title: "First Division / High Merit", 
        badge: "Very Good Standing", 
        color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
        description: "Strong academic record meeting top professional standards."
      };
    }
    if (cgpa >= 2.50) {
      return { 
        title: "Good Standing", 
        badge: "Good Standing", 
        color: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
        description: "Satisfactory performance on track for graduation."
      };
    }
    if (cgpa >= 2.00) {
      return { 
        title: "Satisfactory / Passing", 
        badge: "Passing", 
        color: "text-yellow-300 bg-yellow-500/15 border-yellow-500/30",
        description: "Meets minimum graduation GPA requirement (2.00)."
      };
    }
    return { 
      title: "Academic Warning", 
      badge: "Probation Risk", 
      color: "text-rose-300 bg-rose-500/15 border-rose-500/30",
      description: "Below minimum graduation threshold (2.00). Needs immediate improvement."
    };
  };

  // Comprehensive Multi-Semester Data Processing
  const processedData = useMemo(() => {
    // 1. Calculate subject scores and GPAs
    const subjectsWithCalculations = subjects.map(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const scheme = subject.gradingScheme || defaultScheme;
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      let subjectFinalPercentage = 0;
      let subjectGPA = 0;
      let subjectGrade = 'N/A';
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
        subjectGrade = getVUGrade(subjectFinalPercentage);
      } else if (subject.gradePoints !== undefined && subject.gradePoints !== null && !isNaN(Number(subject.gradePoints))) {
        subjectGPA = Number(subject.gradePoints);
        subjectGrade = subject.grade || (subjectGPA >= 4.0 ? 'A' : subjectGPA >= 3.66 ? 'A-' : subjectGPA >= 3.33 ? 'B+' : subjectGPA >= 3.0 ? 'B' : subjectGPA >= 2.66 ? 'B-' : subjectGPA >= 2.0 ? 'C' : 'D');
        isGradedCourse = true;
      } else if (subject.grade && subject.grade !== 'N/A') {
        const gradeKey = subject.grade.toUpperCase().trim();
        if (gradeKey === 'P' || gradeKey === 'PASS' || gradeKey === 'NON-GRADED') {
          subjectGPA = 0;
          subjectGrade = 'Pass';
          isGradedCourse = false;
        } else if (GRADE_POINTS_MAP[gradeKey] !== undefined) {
          subjectGPA = GRADE_POINTS_MAP[gradeKey];
          subjectGrade = gradeKey;
          isGradedCourse = true;
        }
      }

      const qualityPoints = isGradedCourse ? (subjectGPA * creditHours) : 0;

      return {
        ...subject,
        calculatedPercentage: subjectFinalPercentage,
        calculatedGPA: subjectGPA,
        calculatedGrade: subjectGrade,
        qualityPoints,
        creditHours,
        isGradedCourse,
        categoryStats
      };
    });

    // 2. Sort Semesters Chronologically (by order, then fallback creation)
    const sortedSemesters = [...semesters].sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

    // 3. Calculate Step-by-Step Chronological Progression
    let runningQualityPoints = 0;
    let runningGradedCredits = 0;
    let runningTotalCredits = 0;
    let previousTermCumulativeCGPA = 0;
    let previousTermSGPA = null;

    const semesterProgressions = sortedSemesters.map((sem, index) => {
      const semSubjects = subjectsWithCalculations.filter(s => 
        s.semesterId === sem.id || (!s.semesterId && (sem.isCurrent || index === 0))
      );

      let termQualityPoints = 0;
      let termGradedCredits = 0;
      let termTotalCredits = 0;
      let completedSubjectsCount = 0;

      semSubjects.forEach(s => {
        termTotalCredits += s.creditHours;
        if (s.isGradedCourse) {
          termQualityPoints += (s.calculatedGPA * s.creditHours);
          termGradedCredits += s.creditHours;
          if (s.calculatedGPA > 0 || (s.categoryStats && Object.keys(s.categoryStats).length > 0)) {
            completedSubjectsCount++;
          }
        } else {
          completedSubjectsCount++;
        }
      });

      const termSGPA = termGradedCredits > 0 ? (termQualityPoints / termGradedCredits) : 0;
      
      runningQualityPoints += termQualityPoints;
      runningGradedCredits += termGradedCredits;
      runningTotalCredits += termTotalCredits;

      const cumulativeCGPA = runningGradedCredits > 0 ? (runningQualityPoints / runningGradedCredits) : 0;
      
      const cgpaDelta = previousTermCumulativeCGPA > 0 ? (cumulativeCGPA - previousTermCumulativeCGPA) : 0;
      const sgpaDelta = previousTermSGPA !== null ? (termSGPA - previousTermSGPA) : null;
      
      const targetSGPA = Number(sem.targetSGPA || 3.50);
      const targetDelta = termSGPA - targetSGPA;
      const targetMet = termSGPA >= targetSGPA;

      const progressionItem = {
        semester: sem,
        semesterId: sem.id,
        name: sem.name,
        order: Number(sem.order) || (index + 1),
        status: sem.status || (sem.isCurrent ? 'active' : 'completed'),
        isCurrent: !!sem.isCurrent,
        subjects: semSubjects,
        subjectCount: semSubjects.length,
        completedSubjectsCount,
        termQualityPoints,
        termGradedCredits,
        termTotalCredits,
        termSGPA: Number(termSGPA.toFixed(2)),
        cumulativeQualityPoints: runningQualityPoints,
        cumulativeGradedCredits: runningGradedCredits,
        cumulativeTotalCredits: runningTotalCredits,
        cumulativeCGPA: Number(cumulativeCGPA.toFixed(2)),
        cgpaDelta: Number(cgpaDelta.toFixed(2)),
        sgpaDelta: sgpaDelta !== null ? Number(sgpaDelta.toFixed(2)) : null,
        targetSGPA,
        targetDelta: Number(targetDelta.toFixed(2)),
        targetMet
      };

      previousTermCumulativeCGPA = cumulativeCGPA;
      previousTermSGPA = termSGPA;

      return progressionItem;
    });

    // 4. Overall Degree Metrics
    const totalQualityPoints = runningQualityPoints;
    const totalGradedCredits = runningGradedCredits;
    const totalEnrolledCredits = runningTotalCredits;
    const overallCGPA = totalGradedCredits > 0 ? (totalQualityPoints / totalGradedCredits) : 0;
    
    // Best & Toughest Semester
    const gradedTerms = semesterProgressions.filter(p => p.termGradedCredits > 0);
    const bestSemester = gradedTerms.length > 0 
      ? [...gradedTerms].sort((a, b) => b.termSGPA - a.termSGPA)[0] 
      : null;
    const toughestSemester = gradedTerms.length > 0 
      ? [...gradedTerms].sort((a, b) => a.termSGPA - b.termSGPA)[0] 
      : null;

    // Average SGPA
    const avgSGPA = gradedTerms.length > 0 
      ? gradedTerms.reduce((acc, curr) => acc + curr.termSGPA, 0) / gradedTerms.length 
      : 0;

    // Grade counts distribution
    const gradeDistribution = {
      'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0, 'Pass': 0
    };

    subjectsWithCalculations.forEach(s => {
      const g = s.calculatedGrade;
      if (gradeDistribution[g] !== undefined) {
        gradeDistribution[g]++;
      } else if (g === 'A+') {
        gradeDistribution['A']++;
      }
    });

    const gradeDistributionChartData = Object.entries(gradeDistribution)
      .filter(([_, count]) => count > 0)
      .map(([grade, count]) => ({
        name: `Grade ${grade}`,
        grade,
        count,
        percentage: subjectsWithCalculations.length > 0 ? Math.round((count / subjectsWithCalculations.length) * 100) : 0
      }));

    // Chart timeline dataset
    const chartTimelineData = semesterProgressions.map(p => ({
      name: p.name,
      order: p.order,
      SGPA: p.termSGPA,
      CGPA: p.cumulativeCGPA,
      Target: p.targetSGPA,
      Credits: p.termTotalCredits,
      GradedCredits: p.termGradedCredits,
      QualityPoints: Number(p.termQualityPoints.toFixed(1))
    }));

    return {
      subjectsWithCalculations,
      sortedSemesters,
      semesterProgressions,
      totalQualityPoints,
      totalGradedCredits,
      totalEnrolledCredits,
      overallCGPA,
      overallStanding: getAcademicStanding(overallCGPA),
      bestSemester,
      toughestSemester,
      avgSGPA,
      gradeDistributionChartData,
      chartTimelineData
    };
  }, [subjects, assessments, semesters]);

  // GSAP Animations
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });

    tl.fromTo(".cgpa-header-card",
      { opacity: 0, y: -20, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7 }
    );

    tl.fromTo(".cgpa-stat-box",
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
      "-=0.4"
    );

    tl.fromTo(".cgpa-chart-section",
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.6 },
      "-=0.3"
    );

    tl.fromTo(".semester-timeline-card",
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.08 },
      "-=0.2"
    );
  }, { scope: pageRef, dependencies: [loading] });

  // Toggle semester accordion
  const toggleSemester = (semId) => {
    setExpandedSemesters(prev => ({
      ...prev,
      [semId]: !prev[semId]
    }));
  };

  const expandAllSemesters = () => {
    const next = {};
    processedData.semesterProgressions.forEach(p => {
      next[p.semesterId] = true;
    });
    setExpandedSemesters(next);
  };

  const collapseAllSemesters = () => {
    setExpandedSemesters({});
  };

  // Filtered semester progressions list
  const filteredSemesterProgressions = processedData.semesterProgressions.filter(p => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return p.status === 'completed';
    if (filterStatus === 'active') return p.status === 'active' || p.isCurrent;
    if (filterStatus === 'upcoming') return p.status === 'upcoming';
    return true;
  });

  // Degree Goal Forecast Calculations
  const goalForecast = useMemo(() => {
    const completedCredits = processedData.totalGradedCredits;
    const currentQP = processedData.totalQualityPoints;
    
    const remainingCredits = customRemainingCredits !== '' 
      ? Number(customRemainingCredits) 
      : Math.max(0, totalDegreeCredits - completedCredits);
    
    const targetTotalCredits = completedCredits + remainingCredits;
    const targetTotalQP = targetDegreeCGPA * targetTotalCredits;
    const requiredFutureQP = targetTotalQP - currentQP;
    
    const requiredFutureSGPA = remainingCredits > 0 
      ? (requiredFutureQP / remainingCredits) 
      : 0;

    const maxReachableCGPA = targetTotalCredits > 0 
      ? ((currentQP + (4.00 * remainingCredits)) / targetTotalCredits) 
      : 4.00;

    let status = 'achievable';
    let message = '';
    let recommendation = '';

    if (remainingCredits <= 0) {
      status = 'complete';
      message = 'Degree credits already fulfilled!';
      recommendation = 'Graduation credits reached.';
    } else if (requiredFutureSGPA <= 0) {
      status = 'secured';
      message = `Target of ${targetDegreeCGPA.toFixed(2)} CGPA is already guaranteed!`;
      recommendation = 'Even with minimum passing grades, your target will be achieved.';
    } else if (requiredFutureSGPA > 4.00) {
      status = 'impossible';
      message = `Mathematically impossible. Maximum reachable CGPA with straight 4.00 is ${maxReachableCGPA.toFixed(2)}.`;
      recommendation = `Consider adjusting your target to ${Math.min(4.0, maxReachableCGPA).toFixed(2)} or lower.`;
    } else if (requiredFutureSGPA >= 3.70) {
      status = 'demanding';
      message = `Requires an average SGPA of ${requiredFutureSGPA.toFixed(2)} across remaining ${remainingCredits} credits.`;
      recommendation = "You will need almost straight 'A' (85%+) grades in all remaining courses.";
    } else if (requiredFutureSGPA >= 3.30) {
      status = 'moderate';
      message = `Requires an average SGPA of ${requiredFutureSGPA.toFixed(2)} across remaining ${remainingCredits} credits.`;
      recommendation = "Maintain a steady mix of 'A' and 'A-' grades.";
    } else {
      status = 'comfortable';
      message = `Requires an average SGPA of ${requiredFutureSGPA.toFixed(2)} across remaining ${remainingCredits} credits.`;
      recommendation = "Achievable with consistent 'B+' and 'B' grades.";
    }

    return {
      completedCredits,
      remainingCredits,
      targetTotalCredits,
      requiredFutureSGPA: Number(requiredFutureSGPA.toFixed(2)),
      maxReachableCGPA: Number(maxReachableCGPA.toFixed(2)),
      status,
      message,
      recommendation
    };
  }, [processedData, targetDegreeCGPA, totalDegreeCredits, customRemainingCredits]);

  // Copy transcript JSON
  const handleCopyTranscriptJson = () => {
    const payload = {
      student: auth.currentUser?.displayName || auth.currentUser?.email || 'Student',
      degreeCGPA: processedData.overallCGPA.toFixed(2),
      academicStanding: processedData.overallStanding.title,
      totalCredits: processedData.totalGradedCredits,
      totalQualityPoints: processedData.totalQualityPoints.toFixed(1),
      semesters: processedData.semesterProgressions.map(p => ({
        semester: p.name,
        order: p.order,
        termSGPA: p.termSGPA,
        cumulativeCGPA: p.cumulativeCGPA,
        credits: p.termTotalCredits,
        courses: p.subjects.map(s => ({
          name: s.name,
          creditHours: s.creditHours,
          grade: s.calculatedGrade,
          gradePoints: s.calculatedGPA,
          percentage: s.calculatedPercentage.toFixed(1)
        }))
      }))
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2500);
  };

  const GRADE_COLORS = {
    'A': '#10B981',
    'A-': '#059669',
    'B+': '#3B82F6',
    'B': '#6366F1',
    'B-': '#8B5CF6',
    'C+': '#F59E0B',
    'C': '#D97706',
    'D': '#EF4444',
    'F': '#DC2626',
    'Pass': '#06B6D4'
  };

  // Custom Chart Tooltip
  const CustomProgressionTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0F172A]/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span className="font-bold text-white text-sm">{label}</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold">
              Term #{data.order}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-slate-400 block text-[11px]">Cumulative CGPA</span>
              <span className="text-base font-extrabold text-indigo-400">{data.CGPA?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Term SGPA</span>
              <span className="text-base font-extrabold text-emerald-400">{data.SGPA?.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/40 text-[11px] text-slate-300 flex justify-between">
            <span>Target: <strong className="text-amber-400">{data.Target?.toFixed(2)}</strong></span>
            <span>Credits: <strong className="text-slate-100">{data.Credits} Cr</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Calculating multi-semester CGPA progression...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex" ref={pageRef}>
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen">
        <TopNav title="CGPA Progression" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* 1. HERO / EXECUTIVE METRIC BANNER */}
          <div className="cgpa-header-card opacity-0 bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/50 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              
              {/* Left Side: Cumulative CGPA Big Display */}
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                    Academic Progression & CGPA Analytics
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                      {processedData.overallCGPA.toFixed(2)}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-500">/ 4.00</span>
                  </div>

                  <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 shadow-md ${processedData.overallStanding.color}`}>
                    <Award size={15} />
                    <span>{processedData.overallStanding.badge}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-200">
                    {processedData.overallStanding.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                    {processedData.overallStanding.description} Continuous weighted tracking across {processedData.semesterProgressions.length} {processedData.semesterProgressions.length === 1 ? 'semester' : 'semesters'}.
                  </p>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowTranscriptModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <FileText size={15} />
                    <span>View Academic Transcript</span>
                  </button>

                  <button
                    onClick={() => {
                      const element = document.getElementById('goal-simulator-section');
                      if (element) element.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Target size={15} className="text-amber-400" />
                    <span>Degree CGPA Forecaster</span>
                  </button>
                </div>
              </div>

              {/* Right Side: Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 w-full lg:w-auto shrink-0">
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Graded Credits
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-white">
                      {processedData.totalGradedCredits}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">Cr</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {processedData.totalEnrolledCredits} Total Enrolled
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quality Points
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-indigo-400">
                      {processedData.totalQualityPoints.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">pts</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    GPA × Credit Hours
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Average SGPA
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {processedData.avgSGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ 4.0</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Per Semester
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Best Semester
                  </span>
                  <div className="mt-2">
                    <span className="text-lg font-extrabold text-amber-400 truncate block" title={processedData.bestSemester?.name || 'N/A'}>
                      {processedData.bestSemester?.name || 'N/A'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold mt-1">
                    {processedData.bestSemester ? `${processedData.bestSemester.termSGPA.toFixed(2)} SGPA` : '—'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Courses
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-cyan-400">
                      {processedData.subjectsWithCalculations.length}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">subjects</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Across All Terms
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Degree Target
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold text-purple-400">
                      {Math.round((processedData.totalGradedCredits / totalDegreeCredits) * 100)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Of {totalDegreeCredits} Total Credits
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* 2. INTERACTIVE CHARTS & PROGRESSION ANALYTICS */}
          <div className="cgpa-chart-section opacity-0 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-6">
            
            {/* Chart Header & Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <BarChart2 size={20} className="text-indigo-400" />
                  <span>Academic Trajectory & Analytics</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizing multi-semester CGPA development, term SGPA spikes, and credit distributions.
                </p>
              </div>

              <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto text-xs">
                <button
                  onClick={() => setChartTab('progression')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartTab === 'progression' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LineChartIcon size={14} />
                  <span>CGPA vs SGPA</span>
                </button>

                <button
                  onClick={() => setChartTab('workload')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartTab === 'workload' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart2 size={14} />
                  <span>Workload & Quality Pts</span>
                </button>

                <button
                  onClick={() => setChartTab('distribution')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartTab === 'distribution' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Award size={14} />
                  <span>Grade Split</span>
                </button>
              </div>
            </div>

            {/* Chart Render Area */}
            <div className="w-full h-[320px] sm:h-[380px] pt-2">
              
              {/* TAB 1: CGPA VS SGPA PROGRESSION */}
              {chartTab === 'progression' && (
                processedData.chartTimelineData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No semester data available to plot progression.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedData.chartTimelineData} margin={{ top: 10, right: 20, left: -20, bottom: 25 }}>
                      <defs>
                        <linearGradient id="cgpaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="sgpaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false} 
                        domain={[0, 4.0]} 
                        ticks={[0, 1.0, 2.0, 3.0, 3.5, 4.0]}
                      />
                      <Tooltip content={<CustomProgressionTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        formatter={(value) => <span className="text-xs font-semibold text-slate-300 mr-4">{value}</span>}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="CGPA" 
                        name="Cumulative CGPA" 
                        stroke="#818CF8" 
                        strokeWidth={3.5} 
                        fillOpacity={1} 
                        fill="url(#cgpaGradient)" 
                        dot={{ fill: '#818CF8', r: 5, strokeWidth: 2, stroke: '#0F172A' }}
                        activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="SGPA" 
                        name="Term SGPA" 
                        stroke="#10B981" 
                        strokeWidth={2.5} 
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Target" 
                        name="Target SGPA" 
                        stroke="#F59E0B" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )
              )}

              {/* TAB 2: WORKLOAD & QUALITY POINTS */}
              {chartTab === 'workload' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData.chartTimelineData} margin={{ top: 10, right: 20, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} dy={8} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '16px', color: '#F8FAFC', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      formatter={(value) => <span className="text-xs font-semibold text-slate-300 mr-4">{value}</span>}
                    />
                    <Bar dataKey="Credits" name="Enrolled Credits (Cr)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="QualityPoints" name="Quality Points Earned (QP)" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* TAB 3: GRADE DISTRIBUTION */}
              {chartTab === 'distribution' && (
                <div className="h-full flex flex-col md:flex-row items-center justify-around gap-6">
                  <div className="w-full md:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={processedData.gradeDistributionChartData}
                          dataKey="count"
                          nameKey="grade"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                        >
                          {processedData.gradeDistributionChartData.map((entry) => (
                            <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#6366F1'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Grid for Grades */}
                  <div className="w-full md:w-1/2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {processedData.gradeDistributionChartData.map((item) => (
                      <div 
                        key={item.grade}
                        className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: GRADE_COLORS[item.grade] || '#6366F1' }}
                          />
                          <span className="text-xs font-bold text-white">Grade {item.grade}</span>
                        </div>
                        <span className="text-xs font-extrabold text-slate-300">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* 3. SEMESTER-BY-SEMESTER CHRONOLOGICAL JOURNEY */}
          <div className="space-y-4">
            
            {/* List Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers size={20} className="text-indigo-400" />
                  <span>Semester-by-Semester Progression Cards</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed timeline with individual course contributions, term SGPAs, and sequential CGPA impact.
                </p>
              </div>

              {/* Status Filters & Expand Toggle */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
                  {['all', 'completed', 'active', 'upcoming'].map((statusKey) => (
                    <button
                      key={statusKey}
                      onClick={() => setFilterStatus(statusKey)}
                      className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                        filterStatus === statusKey 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {statusKey}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={expandAllSemesters}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/50 transition-colors cursor-pointer"
                    title="Expand all semester cards"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAllSemesters}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/50 transition-colors cursor-pointer"
                    title="Collapse all semester cards"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>

            {/* Semester Cards List */}
            {filteredSemesterProgressions.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                <p className="text-slate-400 text-sm">No semesters matching filter "{filterStatus}".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSemesterProgressions.map((prog, idx) => {
                  const isExpanded = !!expandedSemesters[prog.semesterId];
                  const hasImprovedCGPA = prog.cgpaDelta > 0;
                  const hasDroppedCGPA = prog.cgpaDelta < 0;

                  return (
                    <div 
                      key={prog.semesterId}
                      className={`semester-timeline-card opacity-0 bg-white/5 border rounded-3xl transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-md ${
                        prog.isCurrent 
                          ? 'border-indigo-500/50 bg-indigo-950/20 shadow-indigo-500/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Semester Summary Header */}
                      <div 
                        onClick={() => toggleSemester(prog.semesterId)}
                        className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                      >
                        
                        {/* Title & Info */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-lg ${
                            prog.isCurrent 
                              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/30' 
                              : prog.status === 'completed'
                                ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            #{prog.order}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide truncate">
                                {prog.name}
                              </h3>
                              
                              {prog.isCurrent && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-indigo-600 text-white tracking-wider animate-pulse">
                                  Current Term
                                </span>
                              )}

                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                                prog.status === 'completed' 
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                                  : prog.status === 'active'
                                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                    : 'bg-slate-700/40 border-slate-600/40 text-slate-400'
                              }`}>
                                {prog.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                              <span>{prog.subjectCount} {prog.subjectCount === 1 ? 'Course' : 'Courses'}</span>
                              <span>•</span>
                              <span>{prog.termTotalCredits} Credit Hours</span>
                              <span>•</span>
                              <span>{prog.termQualityPoints.toFixed(1)} Quality Points</span>
                            </div>
                          </div>
                        </div>

                        {/* Metrics Pills (SGPA, Cumulative CGPA, Target) */}
                        <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-between md:justify-end">
                          
                          {/* Term SGPA */}
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Term SGPA
                            </span>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <span className={`text-xl sm:text-2xl font-black ${
                                prog.termSGPA >= 3.5 ? 'text-emerald-400' :
                                prog.termSGPA >= 3.0 ? 'text-blue-400' :
                                prog.termSGPA >= 2.0 ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {prog.termSGPA.toFixed(2)}
                              </span>
                              
                              {prog.sgpaDelta !== null && prog.sgpaDelta !== 0 && (
                                <span className={`text-xs font-bold flex items-center ${
                                  prog.sgpaDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {prog.sgpaDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                  {Math.abs(prog.sgpaDelta).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-9 w-px bg-slate-700/60 hidden sm:block" />

                          {/* Cumulative CGPA at this point */}
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-indigo-300 block tracking-wider">
                              Cumulative CGPA
                            </span>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <span className="text-xl sm:text-2xl font-black text-white">
                                {prog.cumulativeCGPA.toFixed(2)}
                              </span>

                              {hasImprovedCGPA && (
                                <span className="text-xs font-bold text-emerald-400 flex items-center" title="Pulled CGPA Up">
                                  <ArrowUpRight size={14} /> +{prog.cgpaDelta.toFixed(2)}
                                </span>
                              )}

                              {hasDroppedCGPA && (
                                <span className="text-xs font-bold text-rose-400 flex items-center" title="Pulled CGPA Down">
                                  <ArrowDownRight size={14} /> {prog.cgpaDelta.toFixed(2)}
                                </span>
                              )}

                              {!hasImprovedCGPA && !hasDroppedCGPA && (
                                <span className="text-xs text-slate-500 font-bold">
                                  <Minus size={14} />
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-9 w-px bg-slate-700/60 hidden sm:block" />

                          {/* Target SGPA Status Badge */}
                          <div className="hidden lg:block text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Target ({prog.targetSGPA.toFixed(2)})
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${
                              prog.targetMet 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {prog.targetMet ? '✓ Target Met' : `${prog.targetDelta.toFixed(2)}`}
                            </span>
                          </div>

                          {/* Accordion Chevron */}
                          <div className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>

                        </div>

                      </div>

                      {/* Expandable Course Breakdown Table */}
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-700/40 bg-slate-900/40 animate-in fade-in duration-200">
                          
                          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                              Course Breakdown for {prog.name}
                            </span>
                            <span>{prog.completedSubjectsCount} of {prog.subjectCount} graded</span>
                          </div>

                          {prog.subjects.length === 0 ? (
                            <div className="p-4 bg-slate-800/40 rounded-xl text-center text-xs text-slate-400">
                              No subjects enrolled under this semester yet.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                  <tr className="border-b border-slate-700/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Subject / Course</th>
                                    <th className="py-2.5 px-3 text-center">Credit Hours</th>
                                    <th className="py-2.5 px-3 text-center">Coursework %</th>
                                    <th className="py-2.5 px-3 text-center">Grade Points</th>
                                    <th className="py-2.5 px-3 text-center">Letter Grade</th>
                                    <th className="py-2.5 px-3 text-right">Quality Points</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prog.subjects.map(sub => (
                                    <tr 
                                      key={sub.id}
                                      onClick={() => transitionNavigate(`/subjects/${sub.id}`)}
                                      className="border-b border-slate-800 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1.5 rounded-lg shrink-0 ${
                                            sub.isCodingSubject ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                                          }`}>
                                            {sub.isCodingSubject ? <Terminal size={14} /> : <BookOpen size={14} />}
                                          </div>
                                          <div>
                                            <span className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors block">
                                              {sub.name}
                                            </span>
                                            {sub.categoryStats && Object.keys(sub.categoryStats).length > 0 && (
                                              <span className="text-[10px] text-slate-500">
                                                {Object.entries(sub.categoryStats).map(([type, st]) => `${type}: ${st.earned}/${st.total}`).join(' | ')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3 px-3 text-center text-slate-300 font-semibold">
                                        {sub.creditHours} Cr
                                      </td>

                                      <td className="py-3 px-3 text-center">
                                        <span className="font-bold text-slate-200">
                                          {sub.calculatedPercentage > 0 ? `${sub.calculatedPercentage.toFixed(1)}%` : '—'}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 text-center">
                                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                                          sub.calculatedGPA >= 3.5 ? 'text-emerald-400 bg-emerald-500/10' :
                                          sub.calculatedGPA >= 3.0 ? 'text-blue-400 bg-blue-500/10' :
                                          sub.calculatedGPA >= 2.0 ? 'text-amber-400 bg-amber-500/10' :
                                          sub.isGradedCourse ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400'
                                        }`}>
                                          {sub.isGradedCourse ? `${sub.calculatedGPA.toFixed(2)} GPA` : 'Non-Graded'}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 text-center">
                                        <span 
                                          className="px-2.5 py-0.5 rounded-full text-xs font-black"
                                          style={{ 
                                            backgroundColor: `${GRADE_COLORS[sub.calculatedGrade] || '#6366F1'}20`, 
                                            color: GRADE_COLORS[sub.calculatedGrade] || '#818CF8',
                                            border: `1px solid ${GRADE_COLORS[sub.calculatedGrade] || '#6366F1'}40`
                                          }}
                                        >
                                          {sub.calculatedGrade}
                                        </span>
                                      </td>

                                      <td className="py-3 px-3 text-right font-extrabold text-indigo-400">
                                        {sub.qualityPoints.toFixed(1)} pts
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* 4. DEGREE CGPA GOAL SIMULATOR & TARGET FORECASTER */}
          <div 
            id="goal-simulator-section"
            className="bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-indigo-950/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Target size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Degree CGPA Target Forecaster</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calculate exact future semester SGPAs required to graduate with your desired CGPA honor.
                  </p>
                </div>
              </div>

              {/* Quick Presets for Target CGPA */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-bold mr-1">Target Honors:</span>
                {[3.00, 3.30, 3.50, 3.70, 3.85, 4.00].map(val => (
                  <button
                    key={val}
                    onClick={() => setTargetDegreeCGPA(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetDegreeCGPA === val 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black' 
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {val.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs & Calculation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Target CGPA Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Desired Graduation CGPA
                    </label>
                    <span className="text-lg font-black text-amber-400">{targetDegreeCGPA.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range"
                    min="2.00"
                    max="4.00"
                    step="0.01"
                    value={targetDegreeCGPA}
                    onChange={(e) => setTargetDegreeCGPA(parseFloat(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Total Degree Required Credits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Total Degree Credits
                    </label>
                    <input 
                      type="number"
                      value={totalDegreeCredits}
                      onChange={(e) => setTotalDegreeCredits(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-bold focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Remaining Credits
                    </label>
                    <input 
                      type="number"
                      placeholder={`Auto (${goalForecast.remainingCredits})`}
                      value={customRemainingCredits}
                      onChange={(e) => setCustomRemainingCredits(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-bold focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Info Text */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Completed Graded Credits:</span>
                    <strong className="text-white">{goalForecast.completedCredits} Cr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining to Complete:</span>
                    <strong className="text-amber-400">{goalForecast.remainingCredits} Cr</strong>
                  </div>
                </div>

              </div>

              {/* Right Output Result Box (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-amber-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider block">
                      Required Future Average Performance
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      To graduate with {targetDegreeCGPA.toFixed(2)} CGPA across remaining {goalForecast.remainingCredits} credits.
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-black text-amber-400">
                      {goalForecast.requiredFutureSGPA <= 0 ? '0.00' : goalForecast.requiredFutureSGPA.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 block">Required SGPA</span>
                  </div>
                </div>

                {/* Feasibility Feedback Badge */}
                <div className={`p-3.5 rounded-xl border text-xs font-semibold leading-relaxed ${
                  goalForecast.status === 'impossible' ? 'bg-red-500/15 border-red-500/30 text-red-300' :
                  goalForecast.status === 'demanding' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                  goalForecast.status === 'secured' || goalForecast.status === 'complete' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                  'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                }`}>
                  <div className="font-bold text-sm mb-0.5">{goalForecast.message}</div>
                  <p className="text-slate-300 text-xs">{goalForecast.recommendation}</p>
                </div>

                {/* Benchmark Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Current CGPA</span>
                    <span className="font-extrabold text-white text-sm">{processedData.overallCGPA.toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Max Reachable</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{goalForecast.maxReachableCGPA.toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[10px]">Target CGPA</span>
                    <span className="font-extrabold text-amber-400 text-sm">{targetDegreeCGPA.toFixed(2)}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* 5. ACADEMIC TRANSCRIPT MODAL */}
      {showTranscriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#0F172A] border border-slate-700/80 w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Official Academic Transcript Summary</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Complete multi-semester grade and CGPA record.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyTranscriptJson}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy JSON Payload"
                >
                  {copiedTranscript ? <Check size={14} className="text-emerald-400" /> : <Download size={14} />}
                  <span>{copiedTranscript ? 'Copied' : 'JSON'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs sm:text-sm">
              
              {/* Student Bio & Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Student</span>
                  <span className="font-bold text-white">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student'}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Degree Cumulative CGPA</span>
                  <span className="font-black text-indigo-400 text-base">{processedData.overallCGPA.toFixed(2)} / 4.00</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Total Graded Credits</span>
                  <span className="font-bold text-white">{processedData.totalGradedCredits} Cr</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Academic Standing</span>
                  <span className="font-bold text-emerald-400">{processedData.overallStanding.badge}</span>
                </div>
              </div>

              {/* Semester Breakdown Tables */}
              {processedData.semesterProgressions.map((prog) => (
                <div key={prog.semesterId} className="border border-slate-700/60 rounded-2xl overflow-hidden">
                  
                  {/* Semester Header */}
                  <div className="bg-slate-800/80 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{prog.name}</span>
                      <span className="text-xs text-slate-400">({prog.termTotalCredits} Credits)</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Term SGPA: <strong className="text-emerald-400 font-bold">{prog.termSGPA.toFixed(2)}</strong></span>
                      <span>Cumulative CGPA: <strong className="text-indigo-400 font-bold">{prog.cumulativeCGPA.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Courses Table */}
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/40 bg-slate-900/60 text-slate-400">
                        <th className="py-2 px-4">Course</th>
                        <th className="py-2 px-4 text-center">Credit Hours</th>
                        <th className="py-2 px-4 text-center">Grade Points</th>
                        <th className="py-2 px-4 text-center">Grade</th>
                        <th className="py-2 px-4 text-right">Quality Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prog.subjects.map(s => (
                        <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="py-2 px-4 font-medium text-slate-200">{s.name}</td>
                          <td className="py-2 px-4 text-center text-slate-400">{s.creditHours}</td>
                          <td className="py-2 px-4 text-center text-slate-300 font-bold">{s.isGradedCourse ? s.calculatedGPA.toFixed(2) : '—'}</td>
                          <td className="py-2 px-4 text-center font-bold text-white">{s.calculatedGrade}</td>
                          <td className="py-2 px-4 text-right font-extrabold text-indigo-400">{s.qualityPoints.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              ))}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-700/60 shrink-0">
              <button
                onClick={() => setShowTranscriptModal(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
