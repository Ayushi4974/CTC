import { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

const Cron = () => {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCrons = async () => {
      try {
        const res = await api.get('/admin/cron/status');
        setCrons(res.data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load cron monitor status');
      } finally {
        setLoading(false);
      }
    };
    fetchCrons();
  }, []);

  return (
    <div className="space-y-6">
      {/* Crons List grid */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : crons.length === 0 ? (
        <div className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
          No active cron runs logged in the database yet. They will initialize upon schedule.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {crons.map((c) => (
            <div key={c._id} className="bg-[#0B0F1A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/[0.005] pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-white font-mono">{c.cronName}</h3>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Cycle Monitor</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                  c.isRunning 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {c.isRunning ? 'Executing Lock' : 'Idle / Ready'}
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                  <span className="text-gray-400">Last Executed Cycle</span>
                  <span className="font-semibold text-white font-mono">{c.lastCycleId || 'None'}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                  <span className="text-gray-400">Last Executed Timestamp</span>
                  <span className="font-semibold text-white">{c.lastRunAt ? new Date(c.lastRunAt).toLocaleString() : 'N/A'}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-800/30">
                  <span className="text-gray-400">Execution Frequency</span>
                  <span className="font-semibold text-[#FF00FF] uppercase tracking-wide">Twice-Daily (Mon-Fri)</span>
                </div>

                {c.errorLog && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 space-y-1 mt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wide">Last Error Logged:</span>
                    <p className="font-mono text-[10px] leading-relaxed select-all">{c.errorLog}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cron;
