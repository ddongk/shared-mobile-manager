import * as React from "react";
import { Smartphone, User, Clock, Loader2, RefreshCw, MonitorPlay, AlertCircle, ScrollText, ListOrdered, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PhoneManager({ selectedId }: { selectedId: string }) {
    // 대기 요청이 유효하다고 판단하는 기준 시간 (10분)
    const WAITING_EXPIRATION_MS = 10 * 60 * 1000;

    const [phone, setPhone] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [myUserName, setMyUserName] = React.useState<string>("");
    const [myUserDept, setMyUserDept] = React.useState<string>("");
    const { toast } = useToast();

    const [showReturnModal, setShowReturnModal] = React.useState(false);
    const [showTimeoutModal, setShowTimeoutModal] = React.useState(false);
    const [activeRequest, setActiveRequest] = React.useState<any>(null);
    const [timeLeft, setTimeLeft] = React.useState(60);
    const [ackedRequestIds, setAckedRequestIds] = React.useState<Set<string>>(new Set());
    const timerRef = React.useRef<any>(null);

    // 시놀로지 서버로부터 최신 기기 상태 데이터를 가져옴
    const fetchData = React.useCallback(async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-phone-status');
            const target = data.phones.find((p: any) => p.id === selectedId);
            if (target) {
                setPhone(target);
            }
        } catch (error) {
            console.error("데이터 로드 실패", error);
        }
    }, [selectedId]);

    // 기기 제어 권한을 획득하고 scrcpy를 실행
    const handleControlWithCheck = async () => {
        if (!myUserName || myUserName.trim() === "") {
            toast({
                variant: "destructive",
                title: "사용자 정보 필요",
                description: "먼저 우측 상단에서 사용자 정보를 설정해 주세요.",
            });
            return;
        }

        const success = await window.electron.ipcRenderer.invoke('occupy-phone', {
            phoneId: selectedId,
            userId: myUserName,
            userName: myUserName,
            userDept: myUserDept
        });

        if (success) {
            await window.electron.ipcRenderer.invoke('run-scrcpy', {
                ip: phone.ip,
                phoneId: selectedId
            });
            fetchData();
        }
    };

    // 컴포넌트 마운트 시 사용자 계정 정보 및 기기 데이터를 초기 로드
    React.useEffect(() => {
        const init = async () => {
            const acc = await window.electron.ipcRenderer.invoke('get-global-account');
            if (acc) { setMyUserName(acc.userName); setMyUserDept(acc.userDept || ""); }
            await fetchData();
            setLoading(false);
        };
        init();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // 사이드바에서 선택된 기기가 변경될 때마다 데이터를 갱신
    React.useEffect(() => {
        setLoading(true);
        fetchData().then(() => setLoading(false));
    }, [selectedId, fetchData]);

    // 현재 사용자가 기기를 점유 중일 때 타인의 반납 요청이 있는지 감시
    React.useEffect(() => {
        if (!myUserName || showReturnModal || showTimeoutModal || !phone) return;
        if (phone.currentUser === myUserName && phone.requests?.length > 0) {
            const validReqs = phone.requests.filter((r: any) => Date.now() - new Date(r.time).getTime() < WAITING_EXPIRATION_MS);
            if (validReqs.length > 0) {
                const req = validReqs[0];
                const rid = `${req.user}-${req.time}`;
                if (!ackedRequestIds.has(rid)) {
                    setActiveRequest({ by: req.user, phoneId: selectedId, requestId: rid });
                    setShowReturnModal(true);
                    setTimeLeft(60);
                }
            }
        }
    }, [phone, myUserName, ackedRequestIds, showReturnModal, showTimeoutModal, selectedId]);

    // 반납 요청 팝업 시 60초 타이머 작동
    React.useEffect(() => {
        if (showReturnModal && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
        } else if (showReturnModal && timeLeft === 0) {
            handleAutoRelease();
        }
        return () => clearTimeout(timerRef.current);
    }, [showReturnModal, timeLeft]);

    // 타이머 종료 시 기기를 강제로 반납 처리
    const handleAutoRelease = async () => {
        setShowReturnModal(false);
        await window.electron.ipcRenderer.invoke('release-phone', { phoneId: selectedId });
        fetchData();
        setShowTimeoutModal(true);
    };

    // 현재 사용 중인 사람에게 반납 요청 데이터 전송
    const handleRequest = async () => {
        const requester = `${myUserName}(${myUserDept || '미지정'})`;
        const localISO = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, -1);
        await window.electron.ipcRenderer.invoke('send-return-request', { phoneId: selectedId, requestedBy: requester, time: localISO });
        fetchData();
        toast({ title: "요청 완료", description: "대기 등록되었습니다. (10분 유지)" });
    };

    if (loading || !phone) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    const isMyPhone = phone.currentUser === myUserName;
    const validRequests = (phone.requests || []).filter((req: any) => Date.now() - new Date(req.time).getTime() < WAITING_EXPIRATION_MS);
    const amIWaiting = validRequests.some((req: any) => req.user.startsWith(myUserName));

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700 overflow-hidden">
            {/* 기기 이름 및 IP 정보 헤더 */}
            <div className="flex justify-between items-center px-2 flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{phone.name}</h2>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{phone.ip}</p>
                </div>

                <Button
                    onClick={() => { setLoading(true); fetchData().then(() => setLoading(false)); }}
                    variant="ghost"
                    className="hover:bg-slate-100 rounded-xl gap-2 text-slate-500 font-bold"
                >
                    <RefreshCw size={14} className={cn(loading && "animate-spin")} /> 갱신
                </Button>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
                {/* 메인 제어 카드 - 현재 상태 및 제어 버튼 */}
                <div className="col-span-12 lg:col-span-5 h-full flex flex-col">
                    <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8 flex-shrink-0">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Control Center</h3>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold border",
                                phone.status === 'available' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                            )}>
                                {phone.status === 'available' ? "● Available" : "● Busy"}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-tighter">Current User</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                                        <User size={20} />
                                    </div>
                                    <span className="text-lg font-black text-slate-700 truncate">
                                        {phone.status === 'occupied' ? `${phone.currentUser} (${phone.currentUserDept})` : "현재 비어 있음"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 상태별 액션 버튼 (제어 시작, 웨이팅 취소, 반납 요청) */}
                        <div className="mt-8 flex-shrink-0">
                            {phone.status === 'available' ? (
                                <Button
                                    onClick={handleControlWithCheck}
                                    className="w-full bg-[#1e293b] hover:bg-blue-600 text-white font-black py-8 rounded-2xl shadow-lg transition-all group border-b-4 border-blue-900/20"
                                >
                                    제어 시작하기 <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                isMyPhone ? (
                                    <Button disabled className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl py-8 font-black opacity-100">
                                        <MonitorPlay size={18} className="mr-2 animate-pulse" /> 현재 제어 중입니다
                                    </Button>
                                ) : (
                                    amIWaiting ? (
                                        <Button onClick={() => window.electron.ipcRenderer.invoke('cancel-return-request', { phoneId: selectedId, userName: myUserName }).then(fetchData)} variant="outline" className="w-full py-8 rounded-2xl font-black text-red-500 border-red-100 hover:bg-red-50">웨이팅 취소하기</Button>
                                    ) : (
                                        <Button onClick={handleRequest} variant="outline" className="w-full py-8 rounded-2xl border-slate-200 text-slate-600 font-black hover:bg-slate-50">반납 요청하기</Button>
                                    )
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* 오늘 일자의 기기 접속 로그 리스트 */}
                <div className="col-span-12 lg:col-span-7 h-full flex flex-col overflow-hidden">
                    <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-6 text-slate-400 flex-shrink-0">
                            <ScrollText size={16} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Recent Access Log (Today)</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {phone.accessLogs && phone.accessLogs.length > 0 ? (
                                [...phone.accessLogs]
                                    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                    .reverse()
                                    .map((log: any, idx: number) => {
                                        const start = new Date(log.startTime);
                                        const end = new Date(log.endTime);
                                        const ymd = `${String(start.getFullYear()).slice(2)}/${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
                                        const startTime = start.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                        const endTime = end.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <div key={idx} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-white hover:border-blue-100 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 text-sm">{log.user} <span className="text-[10px] text-slate-400 font-medium ml-1">{log.dept}</span></span>
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2 shadow-sm">
                                                    <span className="text-slate-300">{ymd}</span>
                                                    <span className="font-bold text-slate-700">{startTime} ~ {endTime}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">기록이 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 하단 대기열 섹션 */}
                <div className="col-span-12 flex-shrink-0">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <ListOrdered size={16} className="text-blue-500" />
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Waiting List</h3>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                    <Info size={12} className="text-slate-400" />
                                    <span className="text-[11px] text-slate-500 font-medium">대기 정보는 요청 후 <strong className="text-blue-600 font-black">10분간</strong>만 유지됩니다.</span>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                {validRequests.length}명 대기 중
                            </span>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar-h pb-2">
                            {validRequests.length > 0 ? (
                                <div className="flex gap-4 min-w-max">
                                    {validRequests.map((req: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 min-w-[240px]">
                                            <div className="text-xl font-black text-blue-200">0{idx + 1}</div>
                                            <div>
                                                <p className="font-black text-slate-700 text-sm">{req.user}</p>
                                                <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(req.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-300 font-bold italic text-sm">현재 대기 중인 사용자가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 타인의 반납 요청 알림 모달 */}
            <Dialog open={showReturnModal} onOpenChange={(o) => !o && setShowReturnModal(false)}>
                <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white [&>button]:hidden">
                    <div className="bg-red-50 p-8 pb-6 border-b border-red-100 text-center">
                        <Clock className="text-red-500 animate-pulse mx-auto mb-4" size={28} />
                        <DialogTitle className="text-xl font-black text-slate-800">기기 반납 요청</DialogTitle>
                    </div>
                    <div className="p-8 text-center">
                        <p className="text-slate-600 font-medium leading-relaxed">
                            <span className="text-blue-600 font-black">{activeRequest?.by}</span>님이<br/>반납을 요청하였습니다.
                        </p>
                        <div className="mt-6 p-5 bg-slate-50 rounded-3xl border border-slate-100 text-4xl font-black text-red-500 font-mono shadow-inner tracking-tighter">
                            {String(timeLeft).padStart(2, '0')}s
                        </div>
                    </div>
                    <DialogFooter className="p-8 pt-0">
                        <Button onClick={() => { setAckedRequestIds(prev => new Set(prev).add(activeRequest.requestId)); setShowReturnModal(false); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-7 rounded-2xl shadow-xl transition-all active:scale-95">확인 (계속 사용하기)</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 응답 미기입으로 인한 자동 반납 안내 모달 */}
            <Dialog open={showTimeoutModal} onOpenChange={setShowTimeoutModal}>
                <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
                    <div className="bg-slate-50 p-8 pb-6 border-b border-slate-100 text-center">
                        <AlertCircle className="text-slate-400 mx-auto mb-4" size={28} />
                        <DialogTitle className="text-xl font-black text-slate-800">자동 반납 안내</DialogTitle>
                    </div>
                    <div className="p-8 text-center text-slate-600 font-medium">
                        응답 시간이 초과되어 기기가<br/><span className="text-red-500 font-black underline underline-offset-4">자동으로 반납</span> 되었습니다.
                    </div>
                    <DialogFooter className="p-8 pt-0">
                        <Button onClick={() => setShowTimeoutModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-7 rounded-2xl shadow-xl transition-all active:scale-95">확인했습니다</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}