
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Home, 
  BarChart2, 
  Settings as SettingsIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  Square
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday,
  startOfToday
} from 'date-fns';
import { 
  PeriodLog, 
  ViewType, 
  FlowIntensity, 
  UserSettings 
} from './types';
import { COLORS, SYMPTOMS, DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from './constants';
import { getPredictions, calculateStats } from './utils/calculations';
import { getSymptomAdvice } from './services/geminiService';

// --- Sub-components ---

const TabButton = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${active ? 'text-[#EE91AC]' : 'text-[#F1BFC6]/40'}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

const LogModal = ({ 
  isOpen, 
  onClose, 
  date, 
  initialData, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  date: Date, 
  initialData?: PeriodLog, 
  onSave: (data: PeriodLog) => void 
}) => {
  const [isStart, setIsStart] = useState(initialData?.isStart || false);
  const [isEnd, setIsEnd] = useState(initialData?.isEnd || false);
  const [flow, setFlow] = useState<FlowIntensity>(initialData?.flow || FlowIntensity.NONE);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(initialData?.symptoms || []);
  const [note, setNote] = useState(initialData?.note || '');

  useEffect(() => {
    if (isOpen) {
      setIsStart(initialData?.isStart || false);
      setIsEnd(initialData?.isEnd || false);
      setFlow(initialData?.flow || FlowIntensity.NONE);
      setSelectedSymptoms(initialData?.symptoms || []);
      setNote(initialData?.note || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleToggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSave = () => {
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      date: format(date, 'yyyy-MM-dd'),
      isStart,
      isEnd,
      flow,
      symptoms: selectedSymptoms,
      note
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#42393B]/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#42393B] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t border-[#F1BFC6]/10 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{format(date, 'yyyy年M月d日')}</h2>
          <button onClick={onClose} className="text-[#F1BFC6]/40 font-medium hover:text-white transition-colors">取消</button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 hide-scrollbar text-white">
          <div className="flex gap-3">
            <button 
              onClick={() => { setIsStart(!isStart); if (!isStart) setIsEnd(false); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all border-2 ${isStart ? 'bg-[#EE91AC]/20 border-[#EE91AC] text-[#EE91AC]' : 'bg-[#4F4547] border-transparent text-[#F1BFC6]/60'}`}
            >
              经期开始
            </button>
            <button 
              onClick={() => { setIsEnd(!isEnd); if (!isEnd) setIsStart(false); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all border-2 ${isEnd ? 'bg-[#EE91AC]/20 border-[#EE91AC] text-[#EE91AC]' : 'bg-[#4F4547] border-transparent text-[#F1BFC6]/60'}`}
            >
              经期结束
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-[#F1BFC6]/40 uppercase tracking-wider mb-2 block">流量强度</label>
            <div className="flex gap-2">
              {[FlowIntensity.LIGHT, FlowIntensity.MEDIUM, FlowIntensity.HEAVY].map(f => (
                <button 
                  key={f}
                  onClick={() => setFlow(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${flow === f ? 'bg-[#EE91AC] text-[#42393B]' : 'bg-[#4F4547] text-[#F1BFC6]/60'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#F1BFC6]/40 uppercase tracking-wider mb-2 block">症状记录</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(s => (
                <button 
                  key={s}
                  onClick={() => handleToggleSymptom(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedSymptoms.includes(s) ? 'bg-[#EE91AC]/20 border-[#EE91AC] text-[#EE91AC]' : 'bg-[#4F4547] border-transparent text-[#F1BFC6]/60'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#F1BFC6]/40 uppercase tracking-wider mb-2 block">备注</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天感觉怎么样？"
              className="w-full bg-[#4F4547] border border-[#F1BFC6]/10 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-[#EE91AC]/20 outline-none placeholder-[#F1BFC6]/20"
              rows={3}
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full mt-8 bg-[#EE91AC] text-[#42393B] py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#EE91AC]/20 active:scale-95 transition-transform"
        >
          保存记录
        </button>
        <div className="h-6" />
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewType>('today');
  const [logs, setLogs] = useState<PeriodLog[]>(() => {
    const saved = localStorage.getItem('luna_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('luna_settings');
    return saved ? JSON.parse(saved) : { averageCycleLength: DEFAULT_CYCLE_LENGTH, averagePeriodLength: DEFAULT_PERIOD_LENGTH };
  });
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    localStorage.setItem('luna_logs', JSON.stringify(logs));
    localStorage.setItem('luna_settings', JSON.stringify(settings));
  }, [logs, settings]);

  const predictions = useMemo(() => getPredictions(logs, settings), [logs, settings]);
  const stats = useMemo(() => calculateStats(logs), [logs]);

  useEffect(() => {
    const fetchAdvice = async () => {
      if (view === 'today') {
        const todayStr = format(startOfToday(), 'yyyy-MM-dd');
        const todayLog = logs.find(l => l.date === todayStr);
        setLoadingAdvice(true);
        const phase = predictions.some(p => isSameDay(p.date, startOfToday()) && p.type === 'period') ? 'Menstrual' : 'Follicular';
        const advice = await getSymptomAdvice(todayLog?.symptoms || [], phase);
        setAiAdvice(advice);
        setLoadingAdvice(false);
      }
    };
    fetchAdvice();
  }, [view, logs, predictions]);

  const handleSaveLog = (newLog: PeriodLog) => {
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== newLog.date);
      return [...filtered, newLog];
    });
  };

  const toggleQuickPeriod = () => {
    const today = startOfToday();
    const todayStr = format(today, 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.date === todayStr);

    if (existingLog) {
      if (existingLog.isStart) {
         handleSaveLog({ ...existingLog, isStart: false, isEnd: true });
      } else if (existingLog.isEnd) {
         handleSaveLog({ ...existingLog, isStart: true, isEnd: false, flow: FlowIntensity.MEDIUM });
      } else if (existingLog.flow !== FlowIntensity.NONE) {
         handleSaveLog({ ...existingLog, isEnd: true });
      } else {
         handleSaveLog({ ...existingLog, isStart: true, flow: FlowIntensity.MEDIUM });
      }
    } else {
      handleSaveLog({
        id: Math.random().toString(36).substr(2, 9),
        date: todayStr,
        isStart: true,
        isEnd: false,
        flow: FlowIntensity.MEDIUM,
        symptoms: [],
        note: ''
      });
    }
  };

  const getDayStatus = (date: Date) => {
    const log = logs.find(l => l.date === format(date, 'yyyy-MM-dd'));
    if (log && (log.isStart || log.isEnd || log.flow !== FlowIntensity.NONE)) return 'actual-period';
    const pred = predictions.find(p => isSameDay(p.date, date));
    if (pred) return pred.type;
    return 'none';
  };

  const renderToday = () => {
    const today = startOfToday();
    const status = getDayStatus(today);
    const todayLog = logs.find(l => l.date === format(today, 'yyyy-MM-dd'));
    const sortedStarts = logs.filter(l => l.isStart).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastStart = sortedStarts.length > 0 ? parseISO(sortedStarts[0].date) : null;
    const cycleDay = lastStart ? Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) + 1 : '--';

    const getPhaseName = () => {
      if (status === 'actual-period' || status === 'period') return '经期';
      if (status === 'ovulation') return '排卵日';
      if (status === 'fertile') return '易孕期';
      return '卵泡期';
    };

    const isPeriodActive = todayLog && (todayLog.isStart || todayLog.flow !== FlowIntensity.NONE) && !todayLog.isEnd;

    return (
      <div className="p-6 space-y-6 overflow-y-auto pb-32 h-full hide-scrollbar bg-[#42393B]">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">今日</h1>
            <p className="text-[#F1BFC6]/60 font-medium">{format(today, 'yyyy年M月d日')}</p>
          </div>
          <div className="w-12 h-12 bg-[#EE91AC]/10 rounded-2xl flex items-center justify-center text-[#EE91AC] border border-[#EE91AC]/20">
            <Sparkles size={24} />
          </div>
        </header>

        {/* Hero Card using Picture Colors */}
        <div className="bg-gradient-to-br from-[#EE91AC] to-[#42393B] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-black/30 border border-white/5">
          <p className="text-[#F1BFC6] text-xs font-bold uppercase tracking-widest mb-2 opacity-80">当前阶段</p>
          <h2 className="text-4xl font-black mb-4">{getPhaseName()}</h2>
          <p className="text-[#F1BFC6] mb-8 opacity-90 leading-relaxed font-medium">
            {status === 'actual-period' || status === 'period' 
              ? "身体正在重启，请多多休息，给自己一点温柔。"
              : "活力正在恢复，你可能会感到更加自信和充满能量。"}
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={toggleQuickPeriod}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 ${isPeriodActive ? 'bg-white/10 text-white backdrop-blur-md' : 'bg-[#F1BFC6] text-[#42393B]'}`}
            >
              {isPeriodActive ? (
                <><Square size={18} fill="currentColor" /> 结束经期</>
              ) : (
                <><Play size={18} fill="currentColor" /> 开始经期</>
              )}
            </button>
            <button 
              onClick={() => { setSelectedDate(today); setIsModalOpen(true); }}
              className="w-full py-4 rounded-2xl font-bold text-[#F1BFC6] text-sm flex items-center justify-center gap-2 hover:text-white transition-colors"
            >
              <Plus size={16} strokeWidth={3} />
              添加详细记录
            </button>
          </div>
        </div>

        <div className="bg-[#4F4547] rounded-[2rem] p-6 shadow-sm border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[#EE91AC]/10 rounded-lg text-[#EE91AC] border border-[#EE91AC]/10">
              <Sparkles size={16} />
            </div>
            <h3 className="font-bold text-white text-sm">Luna 的建议</h3>
          </div>
          {loadingAdvice ? (
             <div className="animate-pulse flex space-y-2 flex-col">
               <div className="h-4 bg-[#42393B] rounded w-3/4"></div>
               <div className="h-4 bg-[#42393B] rounded w-1/2"></div>
             </div>
          ) : (
            <p className="text-[#F1BFC6]/80 text-sm leading-relaxed italic">
              "{aiAdvice}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#4F4547] p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest mb-1">周期第几天</p>
            <p className="text-2xl font-black text-white">第 {cycleDay} 天</p>
          </div>
          <div className="bg-[#4F4547] p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest mb-1">受孕几率</p>
            <p className="text-2xl font-black text-[#EE91AC]">
               {status === 'ovulation' || status === 'fertile' ? '高' : '低'}
            </p>
          </div>
        </div>

        {todayLog && (
           <div className="bg-[#4F4547]/50 p-6 rounded-3xl border border-white/5">
             <h3 className="font-bold text-[#F1BFC6]/60 text-xs uppercase tracking-widest mb-4">今日已记录</h3>
             <div className="flex flex-wrap gap-2">
               {todayLog.symptoms.map(s => (
                 <span key={s} className="bg-[#42393B] px-3 py-1.5 rounded-full text-xs font-semibold text-[#F1BFC6] border border-white/5">{s}</span>
               ))}
               {todayLog.flow !== FlowIntensity.NONE && (
                 <span className="bg-[#EE91AC]/10 text-[#EE91AC] border border-[#EE91AC]/20 px-3 py-1.5 rounded-full text-xs font-bold">{todayLog.flow}</span>
               )}
               {todayLog.isStart && <span className="bg-[#EE91AC]/20 text-[#EE91AC] border border-[#EE91AC]/30 px-3 py-1.5 rounded-full text-xs font-bold">开始日</span>}
               {todayLog.isEnd && <span className="bg-white/10 text-white border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold">结束日</span>}
             </div>
           </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const startWeekDay = days[0].getDay();
    const placeholders = Array.from({ length: startWeekDay });
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="p-6 h-full flex flex-col pb-24 bg-[#42393B]">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">{format(currentMonth, 'yyyy年 M月')}</h1>
          <div className="flex gap-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-[#F1BFC6]/40 hover:text-white"><ChevronLeft /></button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-[#F1BFC6]/40 hover:text-white"><ChevronRight /></button>
          </div>
        </header>

        <div className="grid grid-cols-7 mb-4">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-[#F1BFC6]/30 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-3 flex-grow">
          {placeholders.map((_, i) => <div key={`p-${i}`} />)}
          {days.map(day => {
            const status = getDayStatus(day);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            let bgClass = 'bg-transparent';
            let textClass = 'text-[#F1BFC6]/80';
            let dot = null;

            if (status === 'actual-period') {
              bgClass = 'bg-[#EE91AC]';
              textClass = 'text-[#42393B] shadow-lg shadow-black/20';
            } else if (status === 'period') {
              bgClass = 'bg-[#EE91AC]/10 border border-dashed border-[#EE91AC]';
              textClass = 'text-[#EE91AC]';
            } else if (status === 'ovulation') {
              textClass = 'text-[#F1BFC6] font-bold';
              dot = <div className="absolute -bottom-1 w-1.5 h-1.5 bg-[#F1BFC6] rounded-full" />;
            } else if (status === 'fertile') {
              bgClass = 'bg-white/5';
              textClass = 'text-white';
            }

            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setIsModalOpen(true); }}
                className={`relative flex flex-col items-center justify-center h-12 w-12 mx-auto rounded-2xl transition-all ${bgClass} ${isSelected ? 'ring-2 ring-[#F1BFC6] ring-offset-4 ring-offset-[#42393B]' : ''}`}
              >
                <span className={`text-sm font-semibold ${textClass} ${isTodayDate && status === 'none' ? 'text-[#EE91AC]' : ''}`}>
                  {format(day, 'd')}
                </span>
                {dot}
                {isTodayDate && status === 'none' && <div className="absolute top-1 right-1 w-1 h-1 bg-[#EE91AC] rounded-full" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-3 bg-[#4F4547] p-5 rounded-3xl border border-white/5">
           <h4 className="text-[10px] font-bold text-[#F1BFC6]/30 uppercase tracking-widest mb-2">图例</h4>
           <div className="grid grid-cols-2 gap-x-4 gap-y-3">
             <div className="flex items-center gap-2 text-[10px] font-medium text-[#F1BFC6]/60">
               <div className="w-3 h-3 rounded bg-[#EE91AC]" /> 已记录经期
             </div>
             <div className="flex items-center gap-2 text-[10px] font-medium text-[#F1BFC6]/60">
               <div className="w-3 h-3 rounded bg-[#EE91AC]/10 border border-dashed border-[#EE91AC]" /> 预测经期
             </div>
             <div className="flex items-center gap-2 text-[10px] font-medium text-[#F1BFC6]/60">
               <div className="w-3 h-3 rounded bg-white/5" /> 易孕期
             </div>
             <div className="flex items-center gap-2 text-[10px] font-medium text-[#F1BFC6]/60">
               <div className="w-1.5 h-1.5 rounded-full bg-[#F1BFC6]" /> 排卵日
             </div>
           </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    return (
      <div className="p-6 space-y-6 overflow-y-auto pb-32 h-full hide-scrollbar bg-[#42393B]">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">统计</h1>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-[#4F4547] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest mb-1">平均周期</p>
              <p className="text-4xl font-black text-white">{stats.avgCycle} <span className="text-lg font-medium text-[#F1BFC6]/40">天</span></p>
            </div>
            <div className="w-16 h-16 bg-[#EE91AC]/10 rounded-full flex items-center justify-center text-[#EE91AC] border border-[#EE91AC]/10">
              <BarChart2 size={32} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#4F4547] p-6 rounded-[2rem] border border-white/5 shadow-lg">
              <p className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest mb-1">平均时长</p>
              <p className="text-xl font-black text-white">{stats.avgPeriod} 天</p>
            </div>
            <div className="bg-[#4F4547] p-6 rounded-[2rem] border border-white/5 shadow-lg">
              <p className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest mb-1">周期波动</p>
              <p className="text-xl font-black text-white">{stats.maxCycle - stats.minCycle} 天</p>
            </div>
          </div>
        </div>
        <div className="bg-[#4F4547] p-6 rounded-[2rem] border border-white/5 shadow-lg">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
            <CalendarIcon size={16} className="text-[#EE91AC]" /> 最近记录
          </h3>
          <div className="space-y-4">
            {logs.filter(l => l.isStart).reverse().slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-[#42393B]/50 rounded-2xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{format(parseISO(l.date), 'yyyy年 M月')}</p>
                  <p className="text-[10px] font-medium text-[#F1BFC6]/40">开始日期: {format(parseISO(l.date), 'M月d日')}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-[#EE91AC] uppercase">已确认</p>
                </div>
              </div>
            ))}
            {logs.filter(l => l.isStart).length === 0 && (
              <p className="text-center py-8 text-[#F1BFC6]/20 text-sm font-medium">暂无记录。</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="p-6 space-y-6 h-full bg-[#42393B] overflow-y-auto pb-32">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">偏好设置</h1>
        <div className="space-y-4">
          <div className="bg-[#4F4547] p-6 rounded-3xl border border-white/5 shadow-lg">
            <label className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest block mb-4">目标周期长度</label>
            <div className="flex items-center gap-4">
               <input 
                  type="range" min="21" max="45" 
                  value={settings.averageCycleLength}
                  onChange={(e) => setSettings({...settings, averageCycleLength: parseInt(e.target.value)})}
                  className="flex-1 accent-[#EE91AC]"
               />
               <span className="text-lg font-black text-white w-12 text-center">{settings.averageCycleLength}</span>
            </div>
          </div>
          <div className="bg-[#4F4547] p-6 rounded-3xl border border-white/5 shadow-lg">
            <label className="text-[10px] font-bold text-[#F1BFC6]/40 uppercase tracking-widest block mb-4">目标经期时长</label>
            <div className="flex items-center gap-4">
               <input 
                  type="range" min="2" max="10" 
                  value={settings.averagePeriodLength}
                  onChange={(e) => setSettings({...settings, averagePeriodLength: parseInt(e.target.value)})}
                  className="flex-1 accent-[#EE91AC]"
               />
               <span className="text-lg font-black text-white w-12 text-center">{settings.averagePeriodLength}</span>
            </div>
          </div>
          <div className="h-10" />
          <button 
            onClick={() => {
              if (confirm('确定要抹掉所有健康数据吗？此操作无法撤销。')) {
                setLogs([]);
                localStorage.clear();
              }
            }}
            className="w-full py-4 text-[#EE91AC] font-bold bg-[#EE91AC]/10 border border-[#EE91AC]/20 rounded-2xl active:bg-[#EE91AC]/20 transition-colors shadow-lg"
          >
            清空所有数据
          </button>
        </div>
        <div className="p-6 text-center">
          <p className="text-[10px] text-[#F1BFC6]/20 font-bold uppercase tracking-[0.2em]">Luna 高级版</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#42393B] max-w-lg mx-auto overflow-hidden relative border-x border-white/5 shadow-2xl">
      <main className="flex-1 overflow-hidden">
        {view === 'today' && renderToday()}
        {view === 'calendar' && renderCalendar()}
        {view === 'stats' && renderStats()}
        {view === 'settings' && renderSettings()}
      </main>
      <nav className="ios-tab-bar h-20 safe-area-bottom flex border-t border-white/5 px-2">
        <TabButton active={view === 'today'} icon={Home} label="今日" onClick={() => setView('today')} />
        <TabButton active={view === 'calendar'} icon={CalendarIcon} label="日历" onClick={() => setView('calendar')} />
        <TabButton active={view === 'stats'} icon={BarChart2} label="分析" onClick={() => setView('stats')} />
        <TabButton active={view === 'settings'} icon={SettingsIcon} label="设置" onClick={() => setView('settings')} />
      </nav>
      <LogModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        date={selectedDate} 
        initialData={logs.find(l => l.date === format(selectedDate, 'yyyy-MM-dd'))}
        onSave={handleSaveLog}
      />
    </div>
  );
}
