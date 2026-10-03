import React from 'react';
import { AuditLog } from '../types';
import { X, History } from 'lucide-react';

interface AuditLogDrawerProps {
  logs: AuditLog[];
  onClose: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="bg-[#0e0f13] border-l border-[#1f2128] w-full max-w-lg h-full shadow-2xl flex flex-col text-xs font-mono-code">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2128] flex items-center justify-between bg-[#13141a]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Immutable SRE Audit Trail</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#717380] hover:text-white p-1 hover:bg-[#1a1c22] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <p className="text-[#555763] text-center py-8">No audit logs recorded.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-[#121318] border border-[#1f2128] p-3 rounded-md space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white font-bold">{log.action}</span>
                  <span className="text-[#717380]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[#d1d5db] text-xs font-sans">{log.details}</p>
                <div className="flex items-center justify-between text-[10px] text-[#717380] pt-1 border-t border-[#1f2128]">
                  <span>Actor: {log.userEmail} ({log.role})</span>
                  <span className="text-[#555763]">{log.resource}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
