import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollText, Terminal, Info, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const SystemLogs = () => {
    // 로그 데이터 및 업데이트 횟수 기록
    const [logs, setLogs] = useState<string>('');
    const [tick, setTick] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 최신 로그 파일
    const fetchLogs = useCallback(async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-logs');
            setLogs(data || '');
            setTick(t => t + 1);
        } catch (err) {
            window.electron.ipcRenderer.invoke('log-info', 'SystemLogs: 로그 데이터 수집 실패');
            console.error('[SystemLogs] Error:', err);
        }
    }, []);

    // 컴포넌트 마운트 시 로그 수집 타이머 가동 및 종료 처리
    useEffect(() => {
        window.electron.ipcRenderer.invoke('log-info', 'SystemLogs: 시스템 로그 모니터링 페이지 진입');
        fetchLogs();
        const timer = setInterval(fetchLogs, 1000);
        return () => {
            window.electron.ipcRenderer.invoke('log-info', 'SystemLogs: 로그 모니터링 종료');
            clearInterval(timer);
        };
    }, [fetchLogs]);

    // 새로운 로그가 수신될 때마다 최하단으로 자동 스크롤 수행
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, tick]);

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] animate-in fade-in duration-700 w-full px-2 overflow-hidden pb-6">

            {/* 페이지 상단 제목 및 실시간 동기화 상태 표시 헤더 영역 */}
            <div className="flex justify-between items-end flex-shrink-0 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Terminal size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
                            시스템 로그 확인
                        </h2>
                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                            System Runtime Activity
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </div>
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-tight">
                        LIVE SYNC <span className="text-slate-900 ml-1">{tick}</span>
                    </span>
                </div>
            </div>

            {/* 수집된 로그 메인 박스 영역 */}
            <div className="flex-1 flex flex-col min-h-0 space-y-4">

                <div className="flex-1 bg-slate-50 border-none rounded-[2rem] shadow-inner relative overflow-hidden flex flex-col">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-8 font-mono text-[13px] leading-relaxed text-slate-600 custom-scrollbar selection:bg-blue-100 selection:text-blue-700"
                    >
                        {logs ? (
                            <pre className="whitespace-pre-wrap break-all">
                                {logs}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-3">
                                <ScrollText size={40} className="text-slate-400" />
                                <p className="font-black text-[11px] uppercase tracking-[0.2em]">Wait for system data...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 갱신 주기 및 자동 스크롤 작동 여부를 알려주는 하단 가이드바 */}
                <div className="flex items-center justify-between p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Info size={18} className="text-blue-500 shrink-0" />
                        <p className="text-[12px] text-slate-500 font-medium">
                            실시간으로 수집되는 런처의 작업 기록입니다. <span className="font-bold text-slate-800 underline decoration-blue-200 underline-offset-4 tracking-tight">1초 주기로 자동 갱신</span>됩니다.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <ChevronRight size={14} />
                        Auto Scroll Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;