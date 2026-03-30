import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {Usb, Smartphone, CheckCircle2, XCircle, Terminal, Info, ChevronRight, Loader2, Wifi} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {toast} from "@/hooks/use-toast";

interface ConnectionHelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Step = 'INSTRUCTION' | 'ALLOW_CHECK' | 'SELECT_PHONE' | 'RESULT';

export function ConnectionHelpModal({ open, onOpenChange }: ConnectionHelpModalProps) {
    const [step, setStep] = React.useState<Step>('INSTRUCTION');
    const [loading, setLoading] = React.useState(false);
    const [log, setLog] = React.useState("");
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [targetPhone, setTargetPhone] = React.useState("");

    const ADB_PATH = `C:\\Program Files\\Unipost Auto-Launcher\\resources\\assets\\scrcpy\\adb.exe`;

    // 공통 ADB 실행 함수
    const runAdb = async (args: string) => {
        setLoading(true);
        try {
            // Electron 메인 프로세스에 adb 명령어 실행 요청 (가정된 IPC 채널)
            const result = await window.electron.ipcRenderer.invoke('execute-command', {
                command: `"${ADB_PATH}" ${args}`
            });
            return result;
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // 1단계: 포트 개방 실행
    const handleOpenPort = async () => {
        setLog("");
        const res = await runAdb("-d tcpip 5555");

        if (res.success) {
            setStep('ALLOW_CHECK');
        } else {
            // 만약 여전히 'more than one device'가 뜬다면 로그를 보여줍니다.
            setLog(res.output || res.error || "기기가 2대 이상 감지되었습니다. 다른 기기를 분리해주세요.");
            setIsSuccess(false);
            setStep('RESULT');
        }
    };

    // 3단계: 기기 연결 실행
    const handleConnect = async (phoneNum: string, ip: string) => {
        setTargetPhone(phoneNum);
        const res = await runAdb(`connect ${ip}:5555`);

        setLog(res.output || res.error || "Unknown Error");
        setIsSuccess(res.success && res.output?.includes("connected to"));
        setStep('RESULT');
    };

    // 모달 닫힐 때 상태 초기화
    React.useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep('INSTRUCTION');
                setLog("");
                setLoading(false);
            }, 300);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[480px] p-10 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-amber-100">
                            <Usb size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">연결 도우미</DialogTitle>
                            {/*<p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mt-0.5">Connection Troubleshooter</p>*/}
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* 단계별 화면 렌더링 */}
                    {step === 'INSTRUCTION' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">

                                <div className="rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                                    {/* [상단] 가이드 헤더: 높이를 줄이고 배경색으로 포인트 */}
                                    <div className="bg-blue-50/50 px-5 py-4 border-b border-blue-100/30">
                                        <div className="flex items-start gap-3">
                                            {/* 왼쪽: 상태 아이콘 (공간을 적게 차지하면서 시선 고정) */}
                                            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100/50 flex items-center justify-center">
                                                <Wifi size={16} className="text-blue-600" />
                                            </div>

                                            {/* 오른쪽: 정보 분절 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">네트워크 우선 점검</span>
                                                    <div className="h-px flex-1 bg-slate-100" /> {/* 미세한 구분선 */}
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-blue-500 leading-tight">
                                                        • 공용폰의 Wi-Fi 상태 및 인터넷 접속을 먼저 점검해 주세요.
                                                    </p>
                                                    <p className="text-[10px] font-bold text-blue-500 leading-tight">
                                                        • 정상적으로 연결되어 있음에도, 접속 불가 시 아래 절차 진행
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/*<div className="flex items-center gap-3">*/}
                                        {/*    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">*/}
                                        {/*        <Wifi size={14} className="text-blue-500" />*/}
                                        {/*    </div>*/}
                                        {/*    <div className="[white-space:pre-wrap] leading-tight">*/}
                                        {/*        <p className="text-[12px] font-black text-slate-700">공용폰의 Wi-Fi 상태 및 인터넷 접속을 먼저 점검해 주세요.</p>*/}
                                        {/*        <p className="text-[10px] font-bold text-blue-500/80 mt-0.5">네트워크가 정상임에도 접속이 불가하다면 아래 절차를 진행하세요.</p>*/}
                                        {/*    </div>*/}
                                        {/*</div>*/}
                                    </div>

                                    {/* [하단] 액션 스텝: 간결한 리스트 형식 */}
                                    <div className="p-5 space-y-3.5">
                                        <div className="flex items-center justify-between opacity-60 mb-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect Steps</span>
                                            <div className="h-[1px] flex-1 bg-slate-100 ml-3" />
                                        </div>

                                        <div className="space-y-2.5">
                                            <StepItem num="1" text="공용폰을 데이터 통신이 가능한 USB 케이블로 PC에 연결하세요." />
                                            <StepItem num="2" text='휴대폰 화면에 "USB 디버깅 허용" 또는 "디바이스 데이터에 접근 허용" 팝업이 뜨면 [허용]을 눌러주세요.' />
                                            <StepItem num="3" text='허용을 마쳤다면 아래 [포트 개방 (Step 1)] 버튼을 클릭하세요.' />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleOpenPort} disabled={loading} className="w-full h-16 bg-slate-900 hover:bg-blue-600 text-white font-black text-lg rounded-2xl shadow-xl transition-all">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : "포트 개방 (Step 1)"}
                            </Button>
                        </div>
                    )}

                    {step === 'ALLOW_CHECK' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="p-7 bg-blue-50/50 rounded-3xl border border-blue-100 flex gap-4">
                                <Info className="text-blue-500 shrink-0 mt-1" size={20} />
                                <div className="space-y-3">
                                    <p className="text-[15px] text-slate-600 font-bold leading-relaxed">
                                        휴대폰 화면에서 아래 문구가 나오면<br/>
                                        <span className="text-slate-900 underline underline-offset-4 decoration-blue-200 font-black">허용</span> 또는 <span className="text-slate-900 underline underline-offset-4 decoration-blue-200 font-black">확인</span>을 클릭해 주세요.
                                    </p>
                                    <div className="text-[13px] text-blue-600 font-black bg-white/60 py-2 px-3 rounded-xl border border-blue-100/50 inline-block">
                                        " USB 디버깅 허용 "<br/>
                                        " 디바이스 데이터 접근 허용 "
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => setStep('SELECT_PHONE')} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl">
                                허용했음 (Step 2)
                            </Button>
                        </div>
                    )}

                    {step === 'SELECT_PHONE' && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <p className="text-center text-slate-500 font-bold text-sm mb-2">연결할 기기를 선택하세요.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button onClick={() => handleConnect("3번", "192.168.10.129")} disabled={loading} className="h-24 bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-800 flex-col gap-2 rounded-3xl transition-all">
                                    <Smartphone size={24} /> <span className="font-black">공용폰 3번</span>
                                </Button>
                                <Button onClick={() => handleConnect("5번", "192.168.10.131")} disabled={loading} className="h-24 bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-800 flex-col gap-2 rounded-3xl transition-all">
                                    <Smartphone size={24} /> <span className="font-black">공용폰 5번</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'RESULT' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                            <div className={cn(
                                "p-8 rounded-[2rem] border-2 flex flex-col items-center text-center gap-4",
                                isSuccess ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                            )}>
                                {isSuccess ? <CheckCircle2 size={48} className="text-emerald-500" /> : <XCircle size={48} className="text-rose-500" />}
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">공용폰 {targetPhone} 연결 {isSuccess ? "완료" : "실패"}</h4>
                                    <p className="text-xs font-bold text-slate-500 mt-1">Status Log Below</p>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-5 shadow-inner">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Terminal size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Debug Log</span>
                                </div>
                                <code className="text-[11px] font-mono text-emerald-400 break-all leading-relaxed">
                                    {log || "No log output available."}
                                </code>
                            </div>
                            <Button onClick={() => onOpenChange(false)} className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl">창 닫기</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StepItem({ num, text }: { num: string, text: string }) {
    return (
        <div className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center mt-0.5">{num}</span>
            <p className="text-[13px] font-bold text-slate-600 leading-relaxed">{text}</p>
        </div>
    );
}