import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, ShieldAlert, Cpu, ArrowLeft, CheckCircle2, Loader2, Image as ImageIcon, MessageSquare, Send, User as UserIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store';
import { motion } from 'motion/react';

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.reports.getOne(id!),
    enabled: !!id
  });

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [showVerifyOptions, setShowVerifyOptions] = useState(false);
  const [reverifyMessage, setReverifyMessage] = useState('');

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.reports.getComments(id!),
    enabled: !!id
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.reports.addComment(id!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
    }
  });

  const reverifyMutation = useMutation({
    mutationFn: (vote: 'still_exists' | 'cleared') => api.reports.reverify(id!, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setReverifyMessage('Your verification vote has been registered!');
      setShowVerifyOptions(false);
      setTimeout(() => setReverifyMessage(''), 4000);
    },
    onError: (err: any) => {
      setReverifyMessage(`Verification failed: ${err.message}`);
      setTimeout(() => setReverifyMessage(''), 4000);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.reports.resolve(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setReverifyMessage('Issue status updated and logged successfully.');
      setTimeout(() => setReverifyMessage(''), 4000);
    },
    onError: (err: any) => {
      setReverifyMessage(`Resolution update failed: ${err.message}`);
      setTimeout(() => setReverifyMessage(''), 4000);
    }
  });

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentMutation.isPending) return;
    commentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Report not found</h2>
        <Link to="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider 
                ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  report.status === 'escalated' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                  report.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                  report.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  report.status === 'needs_reverification' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                  report.status === 'awaiting_verification' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}
              `}>
                {report.status?.replace('_', ' ') || 'UNKNOWN'}
              </span>
              <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight">{report.title}</h1>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-8">
              {report.description}
            </p>

            {report.imageUrl || (report.imageUrls && report.imageUrls[0]) ? (
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                <img src={report.imageUrl || report.imageUrls[0]} alt="Report attachment" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-8 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">No image attached</span>
              </div>
            )}

            {report.status === 'resolved' && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Resolution</h3>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-emerald-800 dark:text-emerald-300 font-medium mb-3">Issue has been successfully resolved by the designated authority.</p>
                      <div className="aspect-video bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-500">
                        <ImageIcon className="w-6 h-6 mr-2 opacity-50" />
                        <span className="text-sm font-medium opacity-80">Resolution photo unavailable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start sm:items-center gap-3 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white font-sans text-sm">
                  {report.location?.address || 'Reported Location'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Lat: {report.location?.latitude?.toFixed(5) || report.location?.lat?.toFixed(5) || 'N/A'}, Lng: {report.location?.longitude?.toFixed(5) || report.location?.lng?.toFixed(5) || 'N/A'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Community & Timeline Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Community & Progress</h3>
            
            {report.reverification && (report.reverification.stillExistsUsers?.length > 0 || report.reverification.clearedUsers?.length > 0) && (
              <div className="mb-4 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4">
                <span>⚠️ Still Exists votes: {report.reverification.stillExistsUsers?.length || 0}</span>
                <span>✅ Cleared confirmations: {report.reverification.clearedUsers?.length || 0}/2</span>
              </div>
            )}

            {showVerifyOptions ? (
              <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Verify Issue Status:</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your feedback updates dynamic route planning. Confirmed 'Still Exists' resets the issue to Active. Multiple 'Cleared' votes automatically mark it Resolved.</p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => reverifyMutation.mutate('still_exists')}
                    disabled={reverifyMutation.isPending}
                    className="flex-1 min-w-[120px] py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    {reverifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '⚠️ Still Exists'}
                  </button>
                  <button 
                    onClick={() => reverifyMutation.mutate('cleared')}
                    disabled={reverifyMutation.isPending}
                    className="flex-1 min-w-[120px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    {reverifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Cleared'}
                  </button>
                  <button 
                    onClick={() => setShowVerifyOptions(false)}
                    className="py-2 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {reverifyMessage && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl text-blue-800 dark:text-blue-300 text-sm font-medium animate-fadeIn">
                {reverifyMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => {
                  if (!user) {
                    setReverifyMessage("Please sign in to verify reports.");
                    setTimeout(() => setReverifyMessage(''), 4000);
                  } else {
                    setShowVerifyOptions(!showVerifyOptions);
                  }
                }}
                className="flex-1 min-w-[120px] py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" /> Verify Issue
              </button>

              {(user?.role === 'authority' || user?.role === 'admin') && (
                <button 
                  onClick={() => resolveMutation.mutate()}
                  disabled={resolveMutation.isPending || report.status === 'resolved'}
                  className="flex-1 min-w-[120px] py-3 bg-indigo-600 text-white border border-indigo-700 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {resolveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      <span>{report.status === 'resolved' ? 'Resolved' : 'Mark Resolved'}</span>
                    </>
                  )}
                </button>
              )}

              <button className="flex-1 min-w-[120px] py-3 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                Upvote
              </button>
              <button 
                onClick={() => {
                  const inputEl = document.querySelector('input[placeholder="Share an update or ask a question..."]');
                  if (inputEl) (inputEl as HTMLInputElement).focus();
                }}
                className="flex-1 min-w-[120px] py-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                Comment
              </button>
            </div>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8">
              <div className="relative pl-6">
                <div className="absolute w-4 h-4 bg-emerald-500 rounded-full -left-[9px] top-1 border-4 border-white dark:border-slate-900"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Today</p>
                <h4 className="font-bold text-slate-900 dark:text-white">Community Verification</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">Awaiting verification from nearby users.</p>
              </div>
              
              <div className="relative pl-6">
                <div className="absolute w-4 h-4 bg-blue-500 rounded-full -left-[9px] top-1 border-4 border-white dark:border-slate-900"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                <h4 className="font-bold text-slate-900 dark:text-white">Routed to {report.aiDecision?.department || 'Department'}</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">AI successfully categorized and assigned the report.</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute w-4 h-4 bg-slate-300 dark:bg-slate-700 rounded-full -left-[9px] top-1 border-4 border-white dark:border-slate-900"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                <h4 className="font-bold text-slate-900 dark:text-white">Report Submitted</h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">Citizen logged the initial issue.</p>
              </div>
            </div>
          </motion.div>

          {/* Discussion / Comments Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Discussion</h3>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold ml-1">
                {comments ? comments.length : 0}
              </span>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {isLoadingComments ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {comment.userName ? comment.userName[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{comment.userName}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  No comments yet. Be the first to start the conversation!
                </div>
              )}
            </div>

            {/* New Comment Input */}
            {user ? (
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Share an update or ask a question..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={commentMutation.isPending}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <button 
                  type="submit" 
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold shrink-0"
                >
                  {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Post</span>
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Please <Link to="/" className="text-blue-600 hover:underline font-bold">sign in</Link> to join the discussion.
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar - AI Reasoning */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <Cpu className="w-48 h-48 -mr-10 -mt-10" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">AI Assessment</h3>
              </div>

              {report.aiDecision ? (
                <>
                  <div className="space-y-4 mb-8 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-400 text-sm font-medium">Category</span>
                      <span className="font-bold capitalize text-slate-200">{report.aiDecision.category}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-400 text-sm font-medium">Severity</span>
                      <span className={`font-bold capitalize flex items-center gap-1.5 ${
                        report.aiDecision.severity === 'high' || report.aiDecision.severity === 'critical' ? 'text-red-400' :
                        report.aiDecision.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        <ShieldAlert className="w-4 h-4" /> {report.aiDecision.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-400 text-sm font-medium">Routed To</span>
                      <span className="font-bold text-slate-200">{report.aiDecision.department}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-400 text-sm font-medium">Confidence</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-400/10 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-4 h-4" /> {Math.round((report.aiDecision.confidenceScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-400 text-sm font-medium">Duplicate Check</span>
                      <span className="font-bold text-slate-200">{report.aiDecision.isDuplicate ? 'Duplicate Found' : 'Unique Issue'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm font-medium">Est. Resolution</span>
                      <span className="font-bold text-slate-200">2-4 Days</span>
                    </div>
                  </div>

                  {report.aiDecision.agentDecisions && report.aiDecision.agentDecisions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <span className="w-full h-px bg-slate-800 flex-1"></span>
                        Reasoning Logs
                        <span className="w-full h-px bg-slate-800 flex-1"></span>
                      </h4>
                      <div className="space-y-3">
                        {report.aiDecision.agentDecisions.map((log: any, i: number) => (
                          <div key={i} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm">
                            <div className="font-semibold text-blue-300 mb-2 flex justify-between items-center">
                              {log.agentName || 'Agent'}
                              {log.confidence && (
                                <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-xs">
                                  {Math.round(log.confidence * 100)}%
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 leading-relaxed font-mono text-xs">{log.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-400 text-sm p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
                  AI assessment pending or unavailable for this report.
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
