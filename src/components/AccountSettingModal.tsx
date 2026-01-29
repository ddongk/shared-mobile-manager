import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Monitor, UserCircle, WifiOff, Wifi, Info, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountSettingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// 설정 모달 컴포넌트(사용자 PC 정보 및 서버 상태)
export function AccountSettingModal({ open, onOpenChange }: AccountSettingModalProps) {
    const [hostname, setHostname] = React.useState("");// 현재 접속 중인 호스트네임
    const [isNetworkConnected, setIsNetworkConnected] = React.useState(true);// 서버와의 실시간 네트워크 연결 여부
    const [isAdmin, setIsAdmin] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const initAccount = async () => {
                window.electron.ipcRenderer.invoke('log-info', 'AccountSettingModal: 모달 진입 및 기기 정보 조회 시작');
                const baseUrl = await window.electron.ipcRenderer.invoke('get-server-url');
                // 현재 PC의 호스트네임 반영
                const currentHostname = await window.electron.ipcRenderer.invoke('get-hostname');
                setHostname(currentHostname);

                try {
                    const res = await fetch(`${baseUrl}check-admin?hostname=${currentHostname}`);
                    const data = await res.json();
                    setIsAdmin(data.isAdmin);
                } catch (e) {
                    console.error("관리자 체크 실패:", e);
                    setIsAdmin(false);
                }

                // 현재 접속 기기 자동 등록 및 정보 갱신
                await window.electron.saveGlobalAccount({
                    userName: currentHostname,
                    userDept: ""
                });
                window.electron.ipcRenderer.invoke('log-info', `AccountSettingModal: 기기 정보 자동 갱신 완료 - ${currentHostname}`);

                // 서버와의 통신 가능 여부 초기 점검
                const status = await window.electron.ipcRenderer.invoke('get-phone-status');
                setIsNetworkConnected(status.isNetworkConnected);
            };

            initAccount();

            // 서버 연결 상태 실시간으로 추적
            const timer = setInterval(async () => {
                const data = await window.electron.ipcRenderer.invoke('get-phone-status');// 최신 서버 연결 상태 데이터 조회
                setIsNetworkConnected(data.isNetworkConnected);// 실시간 연결 상태 반영
            }, 2000);

            // 모달 종료 시 인터벌 자원 정리
            return () => {
                window.electron.ipcRenderer.invoke('log-info', 'AccountSettingModal: 모달 종료 및 상태 감지 인터벌 해제');
                clearInterval(timer);
            };
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[480px] p-10 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                {/* 상단 제목 영역 및 아이콘 장식 구성 */}
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
                            <UserCircle size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">
                                기기 정보 확인
                            </DialogTitle>
                            {isAdmin ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Shield size={12} className="text-red-500 fill-red-500" />
                                    <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">
                                        Administrator
                                    </span>
                                </div>
                            ) : (
                                <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                                    Device Information
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* 호스트네임 정보 섹션 */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            Hostname
                        </label>
                        <div className="relative group">
                            <Monitor className={cn(
                                "absolute left-5 top-1/2 -translate-y-1/2 z-10",
                                isAdmin ? "text-red-500" : "text-blue-500"
                            )} size={18} />
                            <div className={cn(
                                "h-16 pl-14 pr-6 border-none rounded-2xl font-black shadow-inner text-lg flex items-center select-none cursor-default",
                                isAdmin ? "bg-red-50/30 text-red-700" : "bg-slate-50 text-slate-700"
                            )}>
                                {hostname}
                            </div>
                        </div>
                    </div>

                    {/* 기기 식별자 자동 등록 관련 안내 박스 */}
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-[12px] leading-relaxed text-slate-500 font-medium">
                            {isAdmin
                                ? "관리자 권한으로 접속되었습니다. 대시보드에서 기기 강제 초기화가 가능합니다."
                                : `해당 PC는 ${hostname} 식별자로 자동 등록되었습니다. 공용폰 제어 시 이 이름으로 사용 기록이 남습니다.`
                            }
                        </p>
                    </div>

                    {/* 실시간 서버 연결 상태 */}
                    <div className={cn(
                        "p-5 rounded-[1.5rem] flex items-center gap-4 border transition-all duration-500",
                        isNetworkConnected
                            ? "bg-blue-50/50 border-blue-100/50 text-blue-700"
                            : "bg-amber-50 border-amber-100 text-amber-700"
                    )}>
                        <div className="relative">
                            {isNetworkConnected ? (
                                <>
                                    <Wifi size={20} className="text-blue-500"/>
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"/>
                                </>
                            ) : (
                                <WifiOff size={20} className="text-amber-500 animate-pulse"/>
                            )}
                        </div>
                        {/* 상태별 상세 텍스트 설명 영역 */}
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black tracking-tight">
                                {isNetworkConnected ? "서버 동기화 중" : "서버 연결 끊김"}
                            </span>
                            <span className="text-[10px] font-bold opacity-70">
                                {isNetworkConnected ? "정상적으로 데이터를 주고받고 있습니다." : "네트워크 환경을 확인해주세요."}
                            </span>
                        </div>
                    </div>

                    {/* 모달 닫기 버튼 */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-full h-14 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-[0.98]"
                    >
                        닫기
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}