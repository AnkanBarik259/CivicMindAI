import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Users, Activity, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.analytics.getStats(),
  });

  const chartData = [
    { name: 'Mon', reports: 40, resolved: 24 },
    { name: 'Tue', reports: 30, resolved: 13 },
    { name: 'Wed', reports: 20, resolved: 48 },
    { name: 'Thu', reports: 27, resolved: 39 },
    { name: 'Fri', reports: 18, resolved: 48 },
    { name: 'Sat', reports: 23, resolved: 38 },
    { name: 'Sun', reports: 34, resolved: 43 },
  ];

  const departmentData = [
    { name: 'Public Works', load: 85, color: '#ef4444' },
    { name: 'Sanitation', load: 45, color: '#10b981' },
    { name: 'Parks & Rec', load: 30, color: '#10b981' },
    { name: 'Traffic', load: 65, color: '#f59e0b' },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const { metrics, insights } = stats || { metrics: {}, insights: [] };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            City Analytics
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">AI-generated insights and performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-medium outline-none text-slate-700 dark:text-slate-200">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Total Reports</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mb-2">{metrics.totalReports || '1,248'}</p>
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 w-max px-2 py-1 rounded-md">
            <TrendingUp className="w-4 h-4" /> +12% this week
          </span>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Avg Resolution Time</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mb-2">{metrics.averageResolutionTime || '2.4d'}</p>
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 w-max px-2 py-1 rounded-md">
            <TrendingUp className="w-4 h-4" /> Faster by 1.1 days
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">AI Routing Accuracy</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mb-2">96.8%</p>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 w-max px-2 py-1 rounded-md mt-2 block">
            Across all departments
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Auto-Merged Duplicates</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mb-2">342</p>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 w-max px-2 py-1 rounded-md mt-2 block">
            Saved 85+ hours of review
          </span>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Predictive AI Insights */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> AI Predictive Hotspots
          </h3>
          <div className="flex-1 space-y-4">
            {insights && insights.length > 0 ? insights.map((insight: any, i: number) => (
              <div key={i} className={`p-5 border rounded-2xl ${
                insight.type === 'risk' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' :
                'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
              }`}>
                <h4 className={`font-bold mb-2 ${insight.type === 'risk' ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'}`}>
                  {insight.title}
                </h4>
                <p className={`text-sm leading-relaxed ${insight.type === 'risk' ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}>
                  {insight.description}
                </p>
              </div>
            )) : (
               <>
                 <div className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                    <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">High Risk: Flooding (Downtown)</h4>
                    <p className="text-sm leading-relaxed text-red-600 dark:text-red-300">
                      Based on recent weather patterns and historical blockages, our AI predicts a 85% chance of severe flooding in the downtown transit corridor if current storm drains are not cleared within 48 hours.
                    </p>
                  </div>
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                    <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2">Warning: Pothole Clustering (Route 9)</h4>
                    <p className="text-sm leading-relaxed text-amber-600 dark:text-amber-300">
                      A 300% surge in pothole reports along Route 9 suggests underlying structural degradation. Recommend comprehensive road inspection rather than spot repairs.
                    </p>
                  </div>
               </>
            )}
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" /> Weekly Reporting Trend
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="reports" stroke="#3b82f6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="New Reports" />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" /> Department Load
            </h3>
            <div className="space-y-6">
              {departmentData.map((dept, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
                    <span>{dept.name}</span>
                    <span className={dept.load > 80 ? 'text-red-500' : 'text-slate-500'}>{dept.load}% Capacity</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dept.load}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full" 
                      style={{ backgroundColor: dept.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
