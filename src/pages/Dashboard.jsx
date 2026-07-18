import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import CircularGauge from '../components/ui/CircularGauge';
import ProgressBar from '../components/ui/ProgressBar';
import { BookOpen, Terminal, TrendingUp, Loader2 } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(useGSAP, Draggable);

export default function Dashboard() {
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dashboardRef = useRef();

  // Fetch both Subjects and Assessments in real-time
  useEffect(() => {
    const qSubjects = query(collection(db, 'subjects'), where("userId", "==", auth.currentUser?.uid));
    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      const subs = [];
      snapshot.forEach(doc => subs.push({ id: doc.id, ...doc.data() }));
      setSubjects(subs);
    });

    const qAssessments = query(collection(db, 'assessments'), where("userId", "==", auth.currentUser?.uid));
    const unsubAssessments = onSnapshot(qAssessments, (snapshot) => {
      const asts = [];
      snapshot.forEach(doc => asts.push({ id: doc.id, ...doc.data() }));
      setAssessments(asts);
      setLoading(false); // Once assessments load, we can render
    });

    return () => {
      unsubSubjects();
      unsubAssessments();
    };
  }, []);

  // GSAP Master Timeline for Dashboard Entrance
  useGSAP(() => {
    if (loading) return; // Only animate after loading is complete

    const tl = gsap.timeline({ 
      defaults: { ease: "power3.out" }, 
      delay: 1.0,
      onComplete: () => {
        // Initialize Draggable on cards for fun interactive tossing
        Draggable.create(".dashboard-card", {
          type: "x,y",
          edgeResistance: 0.65,
          onRelease: function() {
            // Wait 1.5 seconds, then Boing back to original position!
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

    // 2. Animate main metric cards (3D Flip Reveal - Drawbridge up)
    tl.fromTo(".dashboard-card", 
      { opacity: 0, rotationX: 90, y: 50, transformPerspective: 1000, transformOrigin: "bottom center" }, 
      { opacity: 1, rotationX: 0, y: 0, duration: 1.0, stagger: 0.2, ease: "back.out(1.5)" }
    );

    // 3. Animate Active Subjects header
    tl.fromTo(".active-subjects-title",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.6"
    );

    // 4. Animate the mini subject cards (3D Flip Reveal - Falling tiles)
    tl.fromTo(".active-subject-item",
      { opacity: 0, rotationX: -90, transformPerspective: 1000, transformOrigin: "top center" },
      { opacity: 1, rotationX: 0, duration: 0.8, stagger: 0.1, ease: "back.out(1.5)" },
      "-=0.5"
    );
  }, { scope: dashboardRef, dependencies: [loading] });

  // --- Dynamic Calculations ---

  // Helper for VU Grading Scale (Percentage to 4.0 scale)
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

  // 1. Calculate Live GPA (True Weighted CGPA)
  let currentGPA = 0;
  let isGoodStanding = true;

  if (subjects.length > 0) {
    let totalQualityPoints = 0;
    let totalCreditHours = 0;

    subjects.forEach(subject => {
      const subjectAssessments = assessments.filter(a => a.subjectId === subject.id);
      
      const defaultScheme = { Quiz: 15, Assignment: 10, GDB: 5, Midterm: 20, Final: 50, Project: 0 };
      const scheme = subject.gradingScheme || defaultScheme;
      const creditHours = subject.creditHours !== undefined ? Number(subject.creditHours) : (subject.isCodingSubject ? 1 : 3);
      
      if (subjectAssessments.length > 0) {
        const categoryStats = {};
        
        subjectAssessments.forEach(a => {
          // Normalize type name slightly if needed (e.g. "GDB" vs "gdb")
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

        const subjectFinalPercentage = totalAttemptedWeight > 0 
          ? (earnedWeightedPercentage / totalAttemptedWeight) * 100 
          : 0;

        const subjectGPA = getVUGPA(subjectFinalPercentage);
        
        totalQualityPoints += (subjectGPA * creditHours);
        totalCreditHours += creditHours;
        
        subject.calculatedPercentage = subjectFinalPercentage;
        subject.calculatedGPA = subjectGPA;
        subject.categoryStats = categoryStats;
      }
    });

    currentGPA = totalCreditHours > 0 ? (totalQualityPoints / totalCreditHours) : 0;
    isGoodStanding = currentGPA >= 2.0;
  }

  // Formatting Data for the new Bar Chart
  const chartData = subjects.map(sub => ({
    name: sub.name.length > 12 ? sub.name.substring(0, 12) + '...' : sub.name, // Shorten long names
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

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={dashboardRef}>
        <TopNav title="Dashboard" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* GPA Predictor */}
            <div className="dashboard-card opacity-0 col-span-1 md:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl">
              <CircularGauge value={currentGPA} max={4.0} title="Current GPA" />
              
              <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full border ${
                isGoodStanding 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <TrendingUp size={16} />
                <span className="text-sm font-medium">
                  {isGoodStanding ? 'On track for Target' : 'Needs Improvement'}
                </span>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="dashboard-card opacity-0 col-span-1 md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white tracking-wide">Subject Progress (%)</h2>
              </div>
              
              <div className="flex-1 w-full min-h-[200px]">
                {subjects.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No subjects added yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        cursor={{ fill: '#334155', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC' }}
                      />
                      <Bar dataKey="Progress" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Active Subjects Section */}
          <div>
            <h2 className="active-subjects-title opacity-0 text-lg font-bold text-white tracking-wide mb-4 px-1">Active Subjects</h2>
            
            {subjects.length === 0 ? (
              <div className="active-subject-item opacity-0 p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                <p className="text-slate-400">Go to the Subjects tab to add your first class.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((sub) => (
                  <div 
                    key={sub.id}
                    onClick={() => navigate(`/subjects/${sub.id}`)}
                    className="active-subject-item opacity-0 bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`shrink-0 p-2 rounded-lg transition-colors ${
                          sub.isCodingSubject 
                            ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white' 
                            : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                        }`}>
                          {sub.isCodingSubject ? <Terminal size={20} /> : <BookOpen size={20} />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="text-slate-200 font-semibold truncate" title={sub.name}>{sub.name}</h3>
                          {sub.categoryStats && Object.keys(sub.categoryStats).length > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5 truncate">
                              {Object.entries(sub.categoryStats).map(([key, stats]) => `${key}: ${stats.earned}/${stats.total}`).join(' | ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-800 text-emerald-400 rounded-md">
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