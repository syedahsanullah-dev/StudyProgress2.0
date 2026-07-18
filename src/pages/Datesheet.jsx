import { useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export default function Datesheet() {
  const containerRef = useRef();

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".datesheet-header",
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6 }
    );

    tl.fromTo(".datesheet-row",
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.1 },
      "-=0.2"
    );
  }, { scope: containerRef });

  const datesheetData = [
    { sr: 1, course: "CS304P - Object Oriented Programming (Practical)", date: "Tuesday, July 28, 2026", time: "Start Time: 12:00 pm", status: "CONFIRMED" },
    { sr: 2, course: "CS311 - Introduction to Web Services Development", date: "Friday, July 31, 2026", time: "Start Time: 06:30 pm", status: "CONFIRMED" },
    { sr: 3, course: "CS403P - Database Management Systems (Practical)", date: "Wednesday, July 29, 2026", time: "Start Time: 04:30 pm", status: "CONFIRMED" },
    { sr: 4, course: "CS603 - Software Architecture and Design", date: "Monday, July 27, 2026", time: "Start Time: 10:00 am", status: "CONFIRMED" },
    { sr: 5, course: "CS603P - Software Architecture and Design (Practical)", date: "Monday, July 27, 2026", time: "Start Time: 06:30 pm", status: "CONFIRMED" },
    { sr: 6, course: "CS611 - Software Quality Engineering", date: "Monday, August 3, 2026", time: "Start Time: 12:00 pm", status: "CONFIRMED" },
    { sr: 7, course: "CS615 - Software Project Management", date: "Wednesday, August 5, 2026", time: "Start Time: 06:30 pm", status: "CONFIRMED" },
    { sr: 8, course: "MGT101 - Financial Accounting", date: "Friday, August 7, 2026", time: "Start Time: 06:30 pm", status: "CONFIRMED" },
  ];

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen" ref={containerRef}>
        <TopNav title="Datesheet" />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="datesheet-header mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="text-indigo-400" />
                Exam Schedule
              </h2>
              <p className="text-slate-400 text-sm mt-1">Your confirmed exam dates and times.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm font-medium">
                    <th className="py-4 px-4">Sr. No.</th>
                    <th className="py-4 px-4">My Courses</th>
                    <th className="py-4 px-4">Exam Dates</th>
                    <th className="py-4 px-4">Exam Time</th>
                    <th className="py-4 px-4 text-right">Confirmation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {datesheetData.map((exam, index) => (
                    <tr 
                      key={index} 
                      className={`datesheet-row border-b border-white/5 transition-colors group ${
                        exam.course.includes('(Practical)') 
                          ? 'bg-amber-500/10 hover:bg-amber-500/20' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-4 px-4 text-slate-300">{exam.sr}</td>
                      <td className="py-4 px-4 text-white font-medium">{exam.course}</td>
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          {exam.date}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                          {exam.time}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide">
                          <CheckCircle size={14} />
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
