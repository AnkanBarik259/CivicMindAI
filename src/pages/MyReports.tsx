import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store';
import { Link } from 'react-router-dom';
import { Loader2, Calendar, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function MyReports() {
  const { user } = useAuthStore();
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', 'my-reports'],
    queryFn: () => api.reports.getAll(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const myReports = (reports || []).filter((r: any) => r.userId === user?.id).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Contributions</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Track the progress of your submitted reports.</p>
      </div>

      {myReports.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No reports yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">You haven't submitted any civic issues yet.</p>
          <Link to="/report" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            Report an Issue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myReports.map((report: any, i: number) => (
            <motion.div 
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              {report.imageUrl || (report.imageUrls && report.imageUrls[0]) ? (
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={report.imageUrl || report.imageUrls[0]} alt={report.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <MapPin className="w-8 h-8 opacity-50" />
                </div>
              )}
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                    ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      report.status === 'escalated' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      report.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      report.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}
                  `}>
                    {report.status?.replace('_', ' ') || 'Pending'}
                  </span>
                  
                  {report.aiDecision && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {report.aiDecision.category}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">{report.title}</h3>
                
                <div className="flex flex-col gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400 mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                  {report.aiDecision && (
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{report.aiDecision.severity} Priority • {report.aiDecision.department}</span>
                    </div>
                  )}
                  {report.aiDecision && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{Math.round((report.aiDecision.confidenceScore || 0) * 100)}% AI Confidence</span>
                    </div>
                  )}
                </div>
                
                <Link to={`/reports/${report.id}`} className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mt-auto">
                  View Details
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
