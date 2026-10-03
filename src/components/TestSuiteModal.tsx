import React, { useState } from 'react';
import { TestRunner, TestCaseResult } from '../core/testRunner';
import { Terminal, CheckCircle2, XCircle, Play, X, Clock } from 'lucide-react';

interface TestSuiteModalProps {
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ onClose }) => {
  const [results, setResults] = useState<TestCaseResult[]>(() => TestRunner.runAllTests());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(TestRunner.runAllTests());
      setIsRunning(false);
    }, 250);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0).toFixed(2);

  const filteredResults =
    filterCategory === 'ALL'
      ? results
      : results.filter((r) => r.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0f13] border border-[#22242e] rounded-lg max-w-3xl w-full shadow-2xl flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#22242e] flex items-center justify-between bg-[#13141a]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">
              Automated Engineering Verification Test Suite
            </h2>
            <span className="font-mono-code text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
              v2.4 CI/CD
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-md font-mono-code transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Running...' : 'Re-Run All Tests'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#717380] hover:text-white p-1 hover:bg-[#1a1c22] rounded transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Test Summary Bar */}
        <div className="px-5 py-3 bg-[#121318] border-b border-[#1f2128] flex flex-wrap items-center justify-between gap-4 font-mono-code text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[#8e909d]">
              Total Tests: <strong className="text-white">{results.length}</strong>
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {passedCount} Passed
            </span>
            {failedCount > 0 && (
              <span className="text-red-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                {failedCount} Failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[#717380]">
            <Clock className="w-3.5 h-3.5" />
            <span>Execution Time: {totalDuration} ms</span>
          </div>
        </div>

        {/* Filter categories */}
        <div className="px-5 py-2 border-b border-[#1f2128] bg-[#0c0d10] flex items-center gap-1 font-mono-code text-[11px] overflow-x-auto">
          {['ALL', 'GRAPH', 'CHAOS', 'ANOMALY', 'RCA', 'REMEDIATION', 'RESILIENCE', 'SECURITY'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterCategory === cat
                    ? 'bg-[#1e2029] text-white font-bold border border-[#2c2f3a]'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {filteredResults.map((r, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-md border font-mono-code text-xs transition-colors ${
                r.passed
                  ? 'bg-[#121318] border-[#1f2128] hover:border-[#2f323f]'
                  : 'bg-red-950/20 border-red-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-bold text-white text-xs">{r.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#717380]">{r.durationMs} ms</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase ${
                      r.passed
                        ? 'border-emerald-800 text-emerald-400 bg-emerald-950/60'
                        : 'border-red-800 text-red-400 bg-red-950/60'
                    }`}
                  >
                    {r.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#8e909d] pl-6 font-sans">{r.message}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f2128] bg-[#121318] flex items-center justify-between text-[11px] font-mono-code text-[#717380]">
          <span>Target Architecture: Distributed Microservices SRE Stack</span>
          <span className="text-emerald-400 font-semibold">Ready for Academic & Engineering Evaluation</span>
        </div>
      </div>
    </div>
  );
};
