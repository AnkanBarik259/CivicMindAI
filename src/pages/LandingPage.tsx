import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Activity, Map as MapIcon, Bot } from 'lucide-react';
import { motion } from 'motion/react';

const FADE_DOWN = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center relative">
        
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div initial="hidden" animate="visible" variants={FADE_DOWN} className="z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200 dark:border-blue-800">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            CivicMind v1.0 is live
          </div>
        </motion.div>

        <motion.h1 initial="hidden" animate="visible" variants={FADE_DOWN} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 z-10">
          The autonomous <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">AI brain</span> <br className="hidden md:block" /> for your city.
        </motion.h1>
        
        <motion.p initial="hidden" animate="visible" variants={FADE_UP} transition={{ delay: 0.2 }} className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mb-10 z-10 leading-relaxed">
          CivicMind uses agentic AI to detect, analyze, and route civic issues instantly. 
          Report a pothole, and our AI orchestrates the entire resolution process.
        </motion.p>
        
        <motion.div initial="hidden" animate="visible" variants={FADE_UP} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 z-10 w-full sm:w-auto">
          <Link to="/report" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center justify-center gap-2">
            Report an Issue <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/map" className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm flex items-center justify-center gap-2">
            <MapIcon className="w-5 h-5" /> View Live Map
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="w-full bg-slate-50 dark:bg-slate-900/50 py-24 border-y border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Powered by Multi-Agent AI</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Our specialized AI agents work together to process your reports with unprecedented speed and accuracy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-start p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Vision & Routing Agents</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Analyzes uploaded photos to determine the exact issue category and automatically routes it to the correct city department.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-start p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Transparent Reasoning</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Every AI decision includes a confidence score and human-readable reasoning log, keeping authorities in the loop.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-start p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Predictive Escalations</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Background supervisors constantly analyze unresolved issues to predict hotspots and trigger proactive escalations.
              </p>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
