'use client'

import { Eye, TrendingUp, Users, ArrowRight, Star, BarChart3, Search, Fingerprint, Crosshair, Zap, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function ScoutingFeatured() {
  const tacticalModules = [
    { name: 'Film Room', icon: Search, color: 'text-blue-400', desc: 'Detailed tape analysis and traits.' },
    { name: 'NFL Comps', icon: Crosshair, color: 'text-emerald-400', desc: 'Predictive pro player comparisons.' },
    { name: 'Draft Value', icon: BarChart3, color: 'text-amber-400', desc: 'Market-beating rookie projections.' },
  ]

  return (
    <section className="max-w-7xl mx-auto py-24 px-6 animate-on-scroll">
      <div className="relative overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-16">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-8 left-8 flex items-center gap-2 opacity-20">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em]">Diamond Tier Scouting Active</span>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-black font-mono text-blue-400 uppercase tracking-widest">
                <Star className="h-3 w-3 fill-current" />
                <span>Elite Prospect Data</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white font-mono leading-tight uppercase tracking-tighter">
                SCOUT THE <span className="text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">DIAMONDS</span>
              </h2>
              <p className="text-slate-400 text-sm md:text-base font-mono uppercase tracking-wide leading-relaxed max-w-xl opacity-80">
                Our scouting engine identifies elite outliers before the market catches up. Build your dynasty around the next generation of superstars.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {tacticalModules.map((module) => (
                <div key={module.name} className="group relative">
                  <div className="absolute inset-0 bg-white/[0.02] rounded-xl -rotate-2 group-hover:rotate-0 transition-transform" />
                  <div className="relative p-5 bg-slate-900/40 border border-white/5 rounded-xl hover:border-blue-400/30 transition-all">
                    <module.icon className={`h-5 w-5 ${module.color} mb-3`} />
                    <div className="text-[11px] font-black text-white font-mono uppercase tracking-widest mb-1">
                      {module.name}
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase leading-tight">{module.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/scouting-portal" className="inline-block group">
              <div className="flex items-center gap-6">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-black font-mono h-14 px-10 shadow-[0_0_40px_rgba(59,130,246,0.2)] rounded-xl uppercase tracking-widest">
                  Explore Prospects
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="hidden sm:flex flex-col">
                  <span className="text-[10px] font-black font-mono text-emerald-500 uppercase">Live: 2026 Prospects</span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">Updated Hourly</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Visual Card Element */}
          <div className="relative">
            <div className="relative z-10 grid grid-cols-1 gap-6">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-slate-950/60 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group"
              >
                {/* Decorative scanning line - more subtle */}
                <div className="absolute inset-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent top-1/2 -translate-y-1/2 animate-[scan_4s_ease-in-out_infinite]" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest mb-1">Prospect Profile</span>
                    <h3 className="text-xl font-black text-white font-mono uppercase">Top_Prospect_QB</h3>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">Tier 1 Elite</Badge>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[9px] font-black font-mono text-slate-500 uppercase mb-2 block tracking-widest">Hit Rate</span>
                      <div className="text-2xl font-black text-white font-mono">92.4%</div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[9px] font-black font-mono text-slate-500 uppercase mb-2 block tracking-widest">Dynasty Pts</span>
                      <div className="text-2xl font-black text-blue-400 font-mono">+1.2k</div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black font-mono text-blue-400 uppercase tracking-widest flex items-center gap-2">
                         <Zap className="h-3 w-3" />
                         Talent Index
                       </span>
                       <span className="text-[10px] font-black font-mono text-blue-300">EXCEPTIONAL</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '88%' }}
                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 blur-[120px] -z-10 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border uppercase tracking-wider ${className}`}>
      {children}
    </span>
  )
}

