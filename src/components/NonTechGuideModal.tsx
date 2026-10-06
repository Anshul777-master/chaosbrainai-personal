import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Sparkles,
  Shield,
  Flame,
  Zap,
  Activity,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Play,
  HeartHandshake,
  Lightbulb,
} from 'lucide-react';

interface NonTechGuideModalProps {
  onClose: () => void;
  onRunStory: (storyType: 'payment' | 'database' | 'gateway') => void;
}

export const NonTechGuideModal: React.FC<NonTechGuideModalProps> = ({
  onClose,
  onRunStory,
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'analogies' | 'how-to-play'>('basics');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-[#131726] to-[#0c0e17] border-2 border-cyan-500/40 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl shadow-cyan-950/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with vibrant neon gradient */}
        <div className="p-5 border-b border-[#22283d] bg-gradient-to-r from-violet-950/60 via-cyan-950/40 to-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-xl text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-emerald-300">
                  Welcome to ChaosBrain AI!
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  Beginner & Non-Tech Friendly
                </span>
              </div>
              <p className="text-xs text-[#a1a7c4] mt-0.5">
                Understand cloud reliability, stress-testing, and smart self-healing in simple human terms.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#7f85a3] hover:text-white hover:bg-[#1f2438] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1e2338] px-5 bg-[#0e101a] text-xs font-semibold gap-2">
          <button
            onClick={() => setActiveTab('basics')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'basics'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-[#7c83a4] hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <span>The Big Picture (In 60 Seconds)</span>
          </button>

          <button
            onClick={() => setActiveTab('analogies')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analogies'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-[#7c83a4] hover:text-white'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Real-World Analogies</span>
          </button>

          <button
            onClick={() => setActiveTab('how-to-play')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'how-to-play'
                ? 'border-violet-400 text-violet-300 bg-violet-950/20'
                : 'border-transparent text-[#7c83a4] hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 text-violet-400" />
            <span>How to Play & Interact</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#d1d5e6]">
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-[#131929] to-violet-950/30 border border-cyan-500/30">
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <span>What is ChaosBrain AI actually doing?</span>
                </h3>
                <p className="text-xs text-[#b8bfdc] leading-relaxed">
                  Imagine an online store like Amazon or Netflix. It is not just one big computer program — it is made of <strong className="text-cyan-300">8 specialized smaller apps</strong> working together (one handles the Website, another handles Logins, another handles Orders, another handles Payments).
                  If the Payment app slows down or crashes, it can drag down the whole store!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#121624] border border-[#232a42] hover:border-red-500/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">1. The Stress Test (Chaos)</h4>
                  <p className="text-xs text-[#959cb8] leading-relaxed">
                    We intentionally inject realistic problems (slow networks, crashes, overloads) to see how the system reacts before real customers notice.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#121624] border border-[#232a42] hover:border-amber-500/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">2. Ripple Effect (Blast Radius)</h4>
                  <p className="text-xs text-[#959cb8] leading-relaxed">
                    Watch the color changes on the map. Red circles show trouble spreading upstream like dominoes.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#121624] border border-[#232a42] hover:border-emerald-500/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">3. 1-Click Smart Self-Repair</h4>
                  <p className="text-xs text-[#959cb8] leading-relaxed">
                    ChaosBrain instantly detects the culprit and flips automatic safety switches (Circuit Breakers) to restore green health!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analogies' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#121624] border border-cyan-500/30 flex items-start gap-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Circuit Breaker = Household Fuse Box</h4>
                    <p className="text-xs text-[#b8bfdc] mt-1 leading-relaxed">
                      If a toaster in your kitchen catches fire, your home’s electrical fuse box trips instantly so the entire house doesn’t burn down. In our software, a <strong>Circuit Breaker</strong> stops a broken Payment app from freezing the whole website.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#121624] border border-emerald-500/30 flex items-start gap-3">
                  <div className="text-2xl">🚗</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Microservices = A Fast-Food Drive-Thru</h4>
                    <p className="text-xs text-[#b8bfdc] mt-1 leading-relaxed">
                      One person takes orders, one cooks burgers, and one hands out bags. If the burger grill gets backed up, customers wait. By auto-scaling (calling in backup cooks), speed is immediately restored!
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#121624] border border-amber-500/30 flex items-start gap-3">
                  <div className="text-2xl">🚨</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Chaos Testing = A Scheduled Fire Drill</h4>
                    <p className="text-xs text-[#b8bfdc] mt-1 leading-relaxed">
                      You don’t wait for an actual fire to test if the alarms and emergency doors work. We test resilience during calm hours so real shoppers never experience downtime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'how-to-play' && (
            <div className="space-y-4">
              <p className="text-xs text-[#b8bfdc]">
                Here is a simple 3-step walkthrough you can try right now on this screen:
              </p>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 via-[#151928] to-[#121624] border border-red-500/40 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-red-400 text-xs">STEP 1</span>
                      <h4 className="font-bold text-white text-xs">Trigger a Breakdown Simulation</h4>
                    </div>
                    <p className="text-xs text-[#9aa2c0] mt-0.5">
                      Click below to test what happens when 10,000 customers try to pay at once:
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onRunStory('payment');
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-900/40 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Payment Test</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#151928] to-[#121624] border border-amber-500/40 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-400 text-xs">STEP 2</span>
                      <h4 className="font-bold text-white text-xs">Simulate Database Crash</h4>
                    </div>
                    <p className="text-xs text-[#9aa2c0] mt-0.5">
                      See what happens if the order database suddenly shuts off:
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onRunStory('database');
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-900/40 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Database Test</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#151928] to-[#121624] border border-emerald-500/40 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-400 text-xs">STEP 3</span>
                      <h4 className="font-bold text-white text-xs">Watch the Map & Hit "1-Click Auto-Repair"</h4>
                    </div>
                    <p className="text-xs text-[#9aa2c0] mt-0.5">
                      When trouble begins, a glowing green button will appear. Click it to watch the system heal itself!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2338] bg-[#0c0e17] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#7f86a7]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Simulator Ready</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
