import React, { useEffect, useState, useRef, useCallback } from 'react';

// 일렉트론 메인 프로세스에서 생성되는 시스템 로그(main.log)를 실시간으로 모니터링하는 컴포넌트
const SystemLogs = () => {
    const [logs, setLogs] = useState<string>('');
    const logEndRef = useRef<HTMLDivElement>(null);

    // 메인 프로세스로부터 전체 로그 텍스트를 수신하여 상태 업데이트
    const fetchLogs = useCallback(async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-logs');
            if (data) {
                setLogs(data);
            }
        } catch (err) {
            console.error('[SystemLogs] 호출 에러:', err);
        }
    }, []);

    // 컴포넌트 로드 시 로그 수집을 시작하고 1초 간격으로 자동 갱신 수행
    useEffect(() => {
        void fetchLogs();

        const timer = setInterval(() => {
            void fetchLogs();
        }, 1000);

        // 컴포넌트 소멸 시 불필요한 리소스 점유 방지를 위해 타이머 제거
        return () => clearInterval(timer);
    }, [fetchLogs]);

    // 새로운 로그가 추가될 때마다 화면 최하단으로 자동 스크롤 처리
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* 상단 헤더 - 서비스 상태 표시 */}
            <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">System Logs</h1>
                    <p className="text-slate-400 text-sm font-medium">실시간 앱 실행 및 엔진 가동 상태를 확인합니다.</p>
                </div>

                {/* 현재 로그 스트리밍 활성화 상태를 시각적으로 표시 */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Streaming</span>
                </div>
            </div>

            {/* 터미널 스타일의 로그 출력 본문 */}
            <div className="flex-1 bg-slate-950 rounded-2xl p-6 overflow-hidden flex flex-col shadow-2xl border border-slate-800">
                <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pr-2">
                    {logs ? (
                        logs.split('\n').map((line, i) => (
                            <div
                                key={i}
                                className="py-0.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                            >
                                {/* 줄 번호 표시 */}
                                <span className="opacity-30 mr-3 text-[10px] inline-block w-4 text-right">{i + 1}</span>

                                {/* 로그 레벨에 따른 텍스트 색상 분기 처리 (Error, Warn 등) */}
                                <span className={
                                    line.toLowerCase().includes('[error]') ? 'text-red-400' :
                                        line.toLowerCase().includes('[warn]') ? 'text-yellow-400' :
                                            line.toLowerCase().includes('[watcher]') ? 'text-blue-400' : ''
                                }>
                                    {line}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-500 italic">로그를 기다리는 중...</div>
                    )}
                    {/* 스크롤 하단 고정을 위한 빈 요소 */}
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;