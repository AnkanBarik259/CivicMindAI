import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, Activity, ShieldCheck, Map as MapIcon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.reports.getAll(),
    enabled: !!user
  });

  if (!user) {
    return <Navigate to="/auth" />;
  }

  const isAuthority = user.role === 'authority';
  const displayReports = reports || [];

  const pendingCount = displayReports.filter((r: any) => r.status === 'pending' || r.status === 'in_progress' || r.status === 'processing').length;
  const resolvedCount = displayReports.filter((r: any) => r.status === 'resolved').length;
  const escalatedCount = displayReports.filter((r: any) => r.status === 'escalated').length;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {isAuthority ? <ShieldCheck className="w-8 h-8 text-blue-600" /> : null}
            {isAuthority ? 'Authority Operations Center' : 'Citizen Dashboard'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isAuthority ? 'Manage and track city-wide civic issues.' : 'Track your civic impact and recent reports.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/map" className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2">
            <MapIcon className="w-4 h-4" /> View Map
          </Link>
          {!isAuthority && (
            <Link to="/report" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2">
              New Report <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Reports</h3>
              {isLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" /> : (
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{displayReports.length}</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">In Progress</h3>
              {isLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" /> : (
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Resolved</h3>
              {isLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" /> : (
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{resolvedCount}</p>
              )}
            </div>
          </div>
        </motion.div>
        
        {isAuthority && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Escalated</h3>
                {isLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" /> : (
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{escalatedCount}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
        {isAuthority ? 'Recent Submissions' : 'Your Reports'}
      </h3>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : displayReports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No reports yet</h4>
            <p className="text-slate-500 max-w-sm mb-6">When you report civic issues, they will appear here along with their resolution status.</p>
            {!isAuthority && (
              <Link to="/report" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm">
                Report an Issue
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {displayReports.map((report: any) => (
              <li key={report.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider 
                        ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          report.status === 'escalated' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          report.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          report.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}
                      `}>
                        {report.status.replace('_', ' ')}
                      </span>
                      {report.aiDecision?.category && (
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {report.aiDecision.category}
                        </span>
                      )}
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white ml-1">{report.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Reported {new Date(report.createdAt).toLocaleDateString()} 
                      {report.aiDecision?.department && ` • Assigned to ${report.aiDecision.department}`}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 max-w-3xl">
                      {report.description}
                    </p>
                  </div>
                  <Link to={`/reports/${report.id}`} className="shrink-0 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors text-center mt-2 sm:mt-0">
                    View Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
