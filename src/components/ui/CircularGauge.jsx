// // import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// // export default function CircularGauge({ 
// //   value = 3.8, 
// //   max = 4.0, 
// //   title = "Current GPA" 
// // }) {
// //   // Calculate percentage for the chart logic
// //   const percentage = (value / max) * 100;
  
// //   // Data array for the PieChart (Part 1 is filled, Part 2 is the empty track)
// //   const data = [
// //     { name: 'Achieved', value: percentage },
// //     { name: 'Remaining', value: 100 - percentage }
// //   ];

// //   // Dynamic color logic based on performance
// //   // Mint Green (>= 3.5), Amber (>= 2.5), Red (< 2.5)
// //   const getColor = (gpa) => {
// //     if (gpa >= 3.5) return '#10B981'; // success (Mint)
// //     if (gpa >= 2.5) return '#F59E0B'; // warning (Amber)
// //     return '#EF4444'; // danger (Coral/Red)
// //   };

// //   const chartColor = getColor(value);

// //   return (
// //     <div className="relative flex flex-col items-center justify-center w-48 h-48 sm:w-56 sm:h-56">
      
// //       {/* The Recharts Donut Ring */}
// //       <ResponsiveContainer width="100%" height="100%">
// //         <PieChart>
// //           <Pie
// //             data={data}
// //             cx="50%"
// //             cy="50%"
// //             innerRadius="75%"
// //             outerRadius="90%"
// //             startAngle={90}
// //             endAngle={-270}
// //             dataKey="value"
// //             stroke="none"
// //             cornerRadius={10} // Gives the ends of the progress bar a rounded, modern look
// //           >
// //             <Cell key="cell-0" fill={chartColor} />
// //             <Cell key="cell-1" fill="#1E293B" /> {/* Tailwind slate-800 for the empty track */}
// //           </Pie>
// //         </PieChart>
// //       </ResponsiveContainer>

// //       {/* The Absolute Positioned Text in the Center */}
// //       <div className="absolute flex flex-col items-center justify-center pointer-events-none">
// //         <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
// //           {value.toFixed(2)}
// //         </span>
// //         <span className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-widest mt-1">
// //           {title}
// //         </span>
// //       </div>

// //     </div>
// //   );
// // }

// export default function CircularGauge({ value, max, title }) {
//   const percentage = (value / max) * 100;
//   const radius = 40;
//   const circumference = 2 * Math.PI * radius;
//   const strokeDashoffset = circumference - (percentage / 100) * circumference;

//   return (
//     <div className="flex flex-col items-center">
//       <div className="relative w-32 h-32">
//         <svg className="w-full h-full -rotate-90">
//           <circle cx="64" cy="64" r={radius} fill="none" stroke="#1E293B" strokeWidth="8" />
//           <circle 
//             cx="64" cy="64" r={radius} fill="none" 
//             stroke="#6366f1" strokeWidth="8" 
//             strokeDasharray={circumference} 
//             strokeDashoffset={strokeDashoffset}
//             strokeLinecap="round"
//           />
//         </svg>
//         <div className="absolute inset-0 flex flex-col items-center justify-center">
//           <span className="text-2xl font-bold text-white">{value.toFixed(2)}</span>
//           <span className="text-xs text-slate-400 uppercase">GPA</span>
//         </div>
//       </div>
//       <p className="mt-2 text-sm font-semibold text-slate-300">{title}</p>
//     </div>
//   );
// }
import React from 'react';

export default function CircularGauge({ value = 0, max = 4.0, title = "Current GPA" }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  // THE CAP FIX: Ensure the visual value never exceeds the maximum (prevents SVG wrapping)
  const safeValue = Math.min(Math.max(value, 0), max);
  
  const percentage = max > 0 ? (safeValue / max) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Dynamic Color Logic based on VU GPA scale
  let colorClass = "text-emerald-400"; 
  if (safeValue < 2.0) colorClass = "text-red-400";
  else if (safeValue < 3.0) colorClass = "text-amber-400";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Background Track Circle */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Active Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className={`transition-all duration-1000 ease-out ${colorClass}`}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
        
        {/* Center Text Data */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white tracking-tighter shadow-black drop-shadow-md">
            {/* We display the REAL value, even if it's over 4.0, but only draw up to 4.0 */}
            {value.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            out of {max.toFixed(1)}
          </span>
        </div>
      </div>
      
      {title && (
        <h3 className="mt-4 text-sm font-bold text-slate-300 uppercase tracking-widest">
          {title}
        </h3>
      )}
    </div>
  );
}