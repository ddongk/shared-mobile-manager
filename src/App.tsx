import * as React from "react";
import { Bell, Smartphone, Settings, ClipboardList, X, ScrollText, ChevronRight, RefreshCw, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Notice from "./pages/Notice";
import PhoneManager from "./pages/PhoneManager";
import { AccountSettingModal } from "./components/AccountSettingModal";
import { UpdateModal } from "@/components/UpdateModal";

export default function App() {
    const { toast } = useToast();
    const [isNetworkConnected, setIsNetworkConnected] = React.useState(true);
    const [activeMenu, setActiveMenu] = React.useState('Notice');
    const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = React.useState(false);
    const [phoneList, setPhoneList] = React.useState<any[]>([]);
    const [selectedPhoneId, setSelectedPhoneId] = React.useState("phone5");
    const [isLogModalOpen, setIsLogModalOpen] = React.useState(false);
    const [systemLogs, setSystemLogs] = React.useState("");
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // 업데이트 확인 상태 및 모달 제어
    const [hasUpdate, setHasUpdate] = React.useState(false);
    const [updateModalOpen, setUpdateModalOpen] = React.useState(false);

    // 호스트네임을 식별자로 사용자 계정 정보 자동 동기화
    React.useEffect(() => {
        const syncAccount = async () => {
            try {
                const currentHostname = await window.electron.ipcRenderer.invoke('get-hostname');
                await window.electron.saveGlobalAccount({
                    userName: currentHostname,
                    userDept: ""
                });
                window.electron.ipcRenderer.invoke('log-info', `App: 사용자 정보 동기화 완료 (${currentHostname})`);
            } catch (err) {
                window.electron.ipcRenderer.invoke('log-info', 'App: 사용자 정보 동기화 실패');
            }
        };
        syncAccount();
    }, []);

    // 신규 업데이트 존재 여부 주기적으로 확인
    React.useEffect(() => {
        const checkUpdateSilently = async () => {
            try {
                const result = await window.electron.ipcRenderer.invoke('check-for-updates');
                const updateAvailable = !!(result && result.isUpdateAvailable);
                setHasUpdate(updateAvailable);
                if (updateAvailable) {
                    window.electron.ipcRenderer.invoke('log-info', 'App: 신규 업데이트 발견');
                }
            } catch (err) {
                setHasUpdate(false);
            }
        };
        checkUpdateSilently();
    }, []);

    // 1초 간격으로 공용폰들의 실시간 점유 현황 및 네트워크 상태 수신
    React.useEffect(() => {
        const updateStatus = async () => {
            try {
                const data = await window.electron.ipcRenderer.invoke('get-phone-status');
                if (data) {
                    setPhoneList(data.phones);
                    setIsNetworkConnected(data.isNetworkConnected);
                }
            } catch (error) {
                setIsNetworkConnected(false);
            }
        };
        updateStatus();
        const timer = setInterval(updateStatus, 1000);
        return () => clearInterval(timer);
    }, []);

    // 현재 선택된 메뉴에 따라 대시보드 또는 기기 상세 제어 화면 렌더링
    const renderContent = () => {
        switch (activeMenu) {
            case 'Notice': return <Notice />;
            case 'PhoneManager': {
                const selectedPhone = phoneList.find(p => p.id === selectedPhoneId);
                return <PhoneManager selectedId={selectedPhoneId} phoneData={selectedPhone} />;
            }
            default: return <Notice />;
        }
    };

    // 로그 모달이 열릴 때 최하단으로
    React.useEffect(() => {
        if (isLogModalOpen && systemLogs) {
            setTimeout(scrollToBottom, 50);
        }
    }, [systemLogs, isLogModalOpen]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
        }
    };

    // 실시간 시스템 동작 기록을 가져와 모달 창 표시
    const handleShowLogs = async () => {
        try {
            window.electron.ipcRenderer.invoke('log-info', 'App: 실시간 로그 팝업 요청');
            const logs = await window.electron.ipcRenderer.invoke('get-logs');
            setSystemLogs(logs);
            setIsLogModalOpen(true);
        } catch (error) {
            window.electron.ipcRenderer.invoke('log-info', 'App: 로그 로드 실패');
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] antialiased font-sans overflow-hidden">

            {/* 좌측 메인 내비게이션 사이드바 영역 */}
            <aside className="w-[72px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-8 z-50 shadow-sm">
                <button
                    onClick={() => { setActiveMenu('Notice'); setIsPhoneMenuOpen(false); }}
                    className={cn(
                        "p-3.5 rounded-2xl transition-all mb-6 relative outline-none",
                        activeMenu === 'Notice' ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    )}
                >
                    <Bell size={24} />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                        className={cn(
                            "p-3.5 rounded-2xl transition-all relative outline-none",
                            activeMenu === 'PhoneManager' ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        )}
                    >
                        <Smartphone size={24} />
                    </button>
                    {isPhoneMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[-1]" onClick={() => setIsPhoneMenuOpen(false)} />
                            <div className="absolute left-[70px] top-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in slide-in-from-left-2 duration-200">
                                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device List</p>
                                </div>
                                <div className="space-y-1">
                                    {phoneList.map((p) => (
                                        <button key={p.id} onClick={() => { setSelectedPhoneId(p.id); setActiveMenu('PhoneManager'); setIsPhoneMenuOpen(false); }}
                                                className="w-full text-left rounded-xl py-3 px-4 hover:bg-blue-50 hover:text-blue-700 transition-colors group flex items-center justify-between">
                                            <span className="font-bold text-sm text-slate-700 group-hover:text-blue-700">{p.name}</span>
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* 헤더 및 메인 콘텐츠 렌더링 영역 */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
                <header className="h-16 flex items-center justify-end px-8 flex-shrink-0">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative w-10 h-10 rounded-full hover:bg-white shadow-sm border border-slate-100 transition-all active:scale-95 outline-none"
                            >
                                <Settings className="w-5 h-5 text-slate-600" />
                                {hasUpdate && (
                                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-bounce" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-2 rounded-2xl shadow-2xl border-none bg-white z-[100]">
                            <div className="px-3 py-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Settings</p>
                            </div>
                            <DropdownMenuItem onClick={() => setIsAccountModalOpen(true)} className="flex items-center gap-3 rounded-xl py-3 cursor-pointer">
                                <Settings2 className="text-slate-400" size={18} />
                                <span className="font-bold text-sm text-slate-700">기기 정보 확인</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleShowLogs} className="flex items-center gap-3 rounded-xl py-3 cursor-pointer">
                                <ClipboardList className="text-slate-400" size={18} />
                                <span className="font-bold text-sm text-slate-700">로그 확인</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setUpdateModalOpen(true)} className="flex items-center justify-between py-3 rounded-xl cursor-pointer">
                                <div className="flex items-center gap-3 font-bold text-sm text-slate-700">
                                    <RefreshCw size={18} className={cn("text-slate-400", hasUpdate && "text-red-500")} />
                                    <span>업데이트 확인</span>
                                </div>
                                {hasUpdate && <span className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <main className="flex-1 overflow-hidden px-10 pb-6">
                    <div className="max-w-[1200px] mx-auto h-full flex flex-col">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* 토스트 알림 및 설정/업데이트 관련 공용 모달 구성 */}
            <Toaster />
            <AccountSettingModal open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} />
            <UpdateModal open={updateModalOpen} onOpenChange={setUpdateModalOpen} />

            {/* 시스템 동작 기록 확인을 위한 상세 로그 팝업 영역 */}
            <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
                <DialogContent className="max-w-[800px] p-0 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden [&>button]:hidden">
                    <div className="p-10 pb-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-slate-900 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-slate-200">
                                    <ScrollText size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
                                        시스템 로그 확인
                                    </DialogTitle>
                                    <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                                        Application Runtime Activity
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setIsLogModalOpen(false)}
                                className="text-slate-300 hover:text-slate-600 rounded-full w-10 h-10 p-0"
                            >
                                <X size={24} />
                            </Button>
                        </div>
                    </div>
                    <div className="px-10 pb-10 flex flex-col h-[500px]">
                        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 rounded-[1.5rem] p-8 font-mono text-[13px] leading-relaxed text-slate-600 shadow-inner custom-scrollbar">
                            {systemLogs ? (
                                <pre className="whitespace-pre-wrap break-all">{systemLogs}</pre>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <p className="font-black text-[11px] uppercase tracking-[0.2em]">로그 데이터를 불러오는 중...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}