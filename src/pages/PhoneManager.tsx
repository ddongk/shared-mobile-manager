import * as React from "react";
import { Smartphone, Clock, Loader2, RefreshCw, MonitorPlay, AlertCircle, ScrollText, ListOrdered, ChevronRight, Monitor, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PhoneManager({ selectedId, phoneData }: { selectedId: string, phoneData: any }) {
    // 대기 요청 유효 시간 및 기본 상태 변수 정의
    const WAITING_EXPIRATION_MS = 10 * 60 * 1000; // 10분
    const phone = phoneData;
    const [loading, setLoading] = React.useState(false);
    const [myUserName, setMyUserName] = React.useState<string>("");
    const { toast } = useToast();

    // 모달 상태 및 반납 요청 관리용 상태 정의
    const [showReturnModal, setShowReturnModal] = React.useState(false);
    const [showTimeoutModal, setShowTimeoutModal] = React.useState(false);
    const [activeRequest, setActiveRequest] = React.useState<any>(null);
    const [timeLeft, setTimeLeft] = React.useState(60);
    const [ackedRequestIds, setAckedRequestIds] = React.useState<Set<string>>(new Set());
    const timerRef = React.useRef<any>(null);

    // 기기 점유 확인 및 화면 제어(scrcpy) 실행
    const handleControlWithCheck = async () => {
        const acc = await window.electron.ipcRenderer.invoke('get-global-account');
        if (acc && acc.userName) {
            window.electron.ipcRenderer.invoke('log-info', `PhoneManager: ${selectedId} 기기 점유 시도`);
            const success = await window.electron.ipcRenderer.invoke('occupy-phone', {
                phoneId: selectedId,
                userName: acc.userName,
                userDept: ""
            });

            if (success) {
                setShowReturnModal(false);
                setActiveRequest(null);
                if (phone.requests) {
                    const myReqIds = phone.requests
                        .filter((r: any) => r.user === acc.userName)
                        .map((r: any) => `${r.user}-${r.time}`);
                    setAckedRequestIds(prev => new Set([...Array.from(prev), ...myReqIds]));
                }
                window.electron.ipcRenderer.invoke('log-info', `PhoneManager: 점유 성공, scrcpy 실행`);
                await window.electron.ipcRenderer.invoke('run-scrcpy', {
                    ip: phone.ip,
                    phoneId: selectedId
                });
            } else {
                window.electron.ipcRenderer.invoke('log-info', `PhoneManager: 점유 실패 (이미 사용 중)`);
                toast({ variant: "destructive", title: "점유 실패", description: "이미 사용 중입니다." });
            }
        }
    };

    // 컴포넌트 로드 시 전역 계정 정보 초기화
    React.useEffect(() => {
        const init = async () => {
            const acc = await window.electron.ipcRenderer.invoke('get-global-account');
            if (acc) setMyUserName(acc.userName);
        };
        init();
    }, []);

    // 타 사용자의 반납 요청 실시간 감시 및 팝업 노출 로직
    React.useEffect(() => {
        if (!myUserName || !phone || phone.currentUser !== myUserName) return;
        if (showReturnModal || showTimeoutModal) return;

        const reqs = phone.requests || [];
        if (reqs.length > 0) {
            const actualRequests = reqs.filter((req: any) => {
                const isMine = req.user === myUserName;
                const isAcked = ackedRequestIds.has(`${req.user}-${req.time}`);
                return !isMine && !isAcked;
            });

            if (actualRequests.length > 0) {
                const firstReq = actualRequests[0];
                const rid = `${firstReq.user}-${firstReq.time}`;
                window.electron.ipcRenderer.invoke('log-info', `PhoneManager: ${firstReq.user}의 반납 요청 감지`);
                setActiveRequest({ by: firstReq.user, phoneId: selectedId, requestId: rid });
                setTimeLeft(60);
                setShowReturnModal(true);
                setAckedRequestIds(prev => new Set(prev).add(rid));
            }
        }
    }, [phone, myUserName, selectedId, ackedRequestIds]);

    // 반납 요청 팝업 발생 시 카운트다운 및 자동 반납 타이머 관리
    React.useEffect(() => {
        if (showReturnModal && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
        } else if (showReturnModal && timeLeft === 0) {
            window.electron.ipcRenderer.invoke('log-info', 'PhoneManager: 응답 시간 초과로 인한 자동 반납 실행');
            handleAutoRelease();
        }
        return () => clearTimeout(timerRef.current);
    }, [showReturnModal, timeLeft]);

    // 시간 초과 시 기기 권한을 강제로 해제하는 로직
    const handleAutoRelease = async () => {
        setShowReturnModal(false);
        await window.electron.ipcRenderer.invoke('release-phone', { phoneId: selectedId });
        setShowTimeoutModal(true);
    };

    // 다른 사용자가 사용 중일 때 반납 요청(대기열 등록) 송신
    const handleRequest = async () => {
        const localISO = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, -1);
        window.electron.ipcRenderer.invoke('log-info', `PhoneManager: ${selectedId} 기기에 대한 반납 요청 발송`);
        await window.electron.ipcRenderer.invoke('send-return-request', {
            phoneId: selectedId,
            userName: myUserName,
            time: localISO
        });
        toast({ title: "요청 완료", description: "대기 리스트에 등록되었습니다." });
    };

    // 대기 리스트에 등록된 본인 요청 취소 처리
    const handleCancelRequest = async () => {
        window.electron.ipcRenderer.invoke('log-info', `PhoneManager: ${selectedId} 기기 대기 취소`);
        await window.electron.ipcRenderer.invoke('cancel-return-request', {
            phoneId: selectedId,
            userName: myUserName
        });
        toast({ title: "대기 취소", description: "대기 리스트에서 삭제되었습니다." });
    };

    // 데이터 로딩 중 스피너 노출 처리
    if (!phone) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    // 대기열 유효성 검사 및 본인의 대기 상태 확인 로직
    const isMyPhone = phone.currentUser === myUserName;
    const validRequests = (phone.requests || []).filter((req: any) => {
        const requestTime = new Date(req.time).getTime();
        const isExpired = Date.now() - requestTime >= WAITING_EXPIRATION_MS;
        const isMine = req.user === myUserName;
        const isOccupiedByMe = phone.currentUser === myUserName;
        if (isOccupiedByMe && isMine) return false;
        return !isExpired;
    });
    const amIWaiting = validRequests.some((req: any) => req.user === myUserName);

    return (
        <div className="h-full flex flex-col space-y-5 animate-in fade-in duration-700 w-full px-6 overflow-hidden pb-8">

            {/* 기기 명칭 및 접속 IP 정보를 포함한 상단 헤더 영역 */}
            <div className="flex justify-between items-end flex-shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className={cn("w-2 h-2 rounded-full", phone.status === 'available' ? "bg-emerald-500" : "bg-blue-500 animate-pulse")} />
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">{phone.name}</h2>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-4">{phone.ip}</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">

                {/* 제어 시작, 화면 제어 중 상태, 반납 요청 버튼이 위치한 메인 카드 */}
                <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                    <div className={cn(
                        "flex-1 rounded-[2.5rem] border p-8 flex flex-col shadow-lg transition-all duration-500",
                        isMyPhone ? "bg-blue-50/50 border-blue-200" : "bg-white border-slate-100"
                    )}>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic mb-8">Control Center</h3>

                        <div className="flex-1 flex flex-col justify-center gap-8">
                            <div className={cn(
                                "p-8 rounded-[2rem] border transition-all duration-500 shadow-inner flex flex-col justify-center min-h-[160px]",
                                isMyPhone ? "bg-white border-blue-100" : "bg-slate-50/50 border-slate-100"
                            )}>
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors",
                                        isMyPhone ? "bg-blue-600 text-white" : "bg-slate-800 text-white"
                                    )}>
                                        <Monitor size={28} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Active PC Name</span>
                                        <span className={cn("text-2xl font-black truncate tracking-tighter", isMyPhone ? "text-blue-700" : "text-slate-900")}>
                                            {phone.status === 'busy' ? (isMyPhone ? `${phone.currentUser} (나)` : phone.currentUser) : "Available"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[72px] flex-shrink-0">
                                {phone.status === 'available' ? (
                                    <Button onClick={handleControlWithCheck} className="w-full h-full bg-slate-900 hover:bg-blue-600 text-white font-black text-lg rounded-[1.5rem] shadow-xl transition-all group active:scale-[0.98]">
                                        제어 시작하기 <ChevronRight size={22} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                ) : (
                                    isMyPhone ? (
                                        <Button disabled className="w-full h-full bg-slate-100 text-blue-600 rounded-[1.5rem] font-black text-lg opacity-100 border border-blue-100">
                                            <MonitorPlay size={22} className="mr-2 animate-bounce" /> 화면 제어 중...
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={amIWaiting ? handleCancelRequest : handleRequest}
                                            className={cn(
                                                "w-full h-full rounded-[1.5rem] font-black text-lg shadow-lg transition-all active:scale-[0.98]",
                                                amIWaiting
                                                    ? "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 shadow-rose-100/50"
                                                    : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/50"
                                            )}
                                        >
                                            {amIWaiting ? (
                                                <span className="flex items-center gap-2"><XCircle size={20} /> 대기 취소하기</span>
                                            ) : "반납 요청하기"}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 해당 기기를 사용했던 사용자들의 시계열 로그 목록 영역 */}
                <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-8 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2.5 text-slate-800 mb-6 flex-shrink-0">
                            <ScrollText size={16} className="text-blue-500" />
                            <h3 className="text-[12px] font-black uppercase tracking-widest italic">Access History</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                            {phone.accessLogs && phone.accessLogs.length > 0 ? (
                                [...phone.accessLogs].sort((a,b) => b.startTime.localeCompare(a.startTime)).map((log, idx) => {
                                    const start = new Date(log.startTime);
                                    const end = new Date(log.endTime);
                                    const startTime = start.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                    const endTime = end.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={idx} className="flex items-center justify-between py-1.5 px-4 rounded-xl hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors shrink-0" />
                                                <span className="font-bold text-slate-600 text-[13px] truncate group-hover:text-slate-900">{log.user}</span>
                                            </div>
                                            <div className="text-[11px] font-mono font-bold text-slate-400 shrink-0 bg-slate-50 group-hover:bg-white px-2 py-0.5 rounded-md border border-transparent group-hover:border-slate-100">
                                                {startTime} <span className="mx-1 opacity-20 text-slate-900">-</span> {endTime}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">No logs found</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 현재 기기 사용을 위해 대기 중인 사용자 순번 리스트 영역 */}
                <div className="col-span-12 flex-shrink-0">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <ListOrdered size={18} className="text-blue-600" />
                                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest italic">Waiting List</h3>
                            </div>
                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                                {validRequests.length} Waiting
                            </span>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar-h pb-2 flex gap-4">
                            {validRequests.length > 0 ? (
                                validRequests.map((req: any, idx: number) => (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-5 p-4 px-6 rounded-[1.5rem] border min-w-[200px] shadow-sm transition-all",
                                        req.user === myUserName ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100" : "bg-slate-50/50 border-slate-100"
                                    )}>
                                        <div className={cn("text-2xl font-black italic shrink-0", req.user === myUserName ? "text-blue-200" : "text-slate-200")}>#{idx + 1}</div>
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-800 text-sm truncate">{req.user === myUserName ? `${req.user} (나)` : req.user}</p>
                                            <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1.5 mt-0.5">
                                                <Clock size={12} /> {new Date(req.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full py-6 text-center bg-slate-50/30 rounded-[1.5rem] border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold italic text-sm">No one is currently waiting in the list</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 타 사용자의 반납 요청 수신 시 노출되는 확인 안내 팝업 */}
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

            {/* 응답 미기입으로 인한 자동 기기 반납 완료 안내 팝업 */}
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