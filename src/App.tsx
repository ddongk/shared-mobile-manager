import * as React from "react";
import { Bell, Smartphone, Settings, UserCircle, ClipboardList, X, ScrollText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Notice from "./pages/Notice";
import PhoneManager from "./pages/PhoneManager";
import { AccountSettingModal } from "./components/AccountSettingModal";

export default function App() {
    // 현재 활성화된 메뉴 및 모달 상태 관리
    const [activeMenu, setActiveMenu] = React.useState('Notice');
    const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
    const [isPhoneMenuOpen, setIsPhoneMenuOpen] = React.useState(false);

    // 시놀로지 서버에서 동적으로 가져올 폰 리스트 상태
    const [phoneList, setPhoneList] = React.useState<{id: string, name: string}[]>([]);

    // 상세 페이지(PhoneManager)에서 보여줄 타겟 기기 ID
    const [selectedPhoneId, setSelectedPhoneId] = React.useState("phone5");

    // 시스템 로그 뷰어 모달 관련 상태
    const [isLogModalOpen, setIsLogModalOpen] = React.useState(false);
    const [systemLogs, setSystemLogs] = React.useState("");

    const scrollRef = React.useRef<HTMLDivElement>(null);

    // 앱 구동 시 초기 데이터 로드 (기기 목록 수신)
    React.useEffect(() => {
        const loadPhoneList = async () => {
            try {
                const data = await window.electron.ipcRenderer.invoke('get-phone-status');
                setPhoneList(data.phones.map((p: any) => ({ id: p.id, name: p.name })));
            } catch (error) {
                console.error("폰 목록 로드 실패:", error);
            }
        };
        loadPhoneList();
    }, []);

    // 메뉴 선택에 따른 메인 컨텐츠 렌더링 분기 처리
    const renderContent = () => {
        switch (activeMenu) {
            case 'Notice': return <Notice />;
            case 'PhoneManager':
                return <PhoneManager selectedId={selectedPhoneId} />;
            default: return <Notice />;
        }
    };

    // 로그 모달이 열리거나 로그 내용이 갱신될 때 자동 스크롤 수행
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

    // 설정 메뉴에서 시스템 로그를 불러오는 핸들러
    const handleShowLogs = async () => {
        try {
            const logs = await window.electron.ipcRenderer.invoke('get-logs');
            setSystemLogs(logs);
            setIsLogModalOpen(true);
        } catch (error) { console.error("로그 로드 실패:", error); }
    };

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] antialiased font-sans overflow-hidden">
            {/* 좌측 사이드바 - 내비게이션 메뉴 */}
            <aside className="w-[72px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-8 z-50 shadow-sm">
                {/* 필독 사항 메뉴 버튼 */}
                <button
                    onClick={() => { setActiveMenu('Notice'); setIsPhoneMenuOpen(false); }}
                    className={cn(
                        "p-3.5 rounded-2xl transition-all mb-6 relative outline-none",
                        activeMenu === 'Notice' ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    )}
                >
                    <Bell size={24} />
                    {activeMenu === 'Notice' && <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-l-full" />}
                </button>

                {/* 기기 리스트 메뉴 버튼 및 플로팅 드롭다운 */}
                <div className="relative">
                    <button
                        onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
                        className={cn(
                            "p-3.5 rounded-2xl transition-all relative outline-none",
                            activeMenu === 'PhoneManager' ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        )}
                    >
                        <Smartphone size={24} />
                        {activeMenu === 'PhoneManager' && <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-l-full" />}
                    </button>

                    {/* 기기 선택 팝오버 메뉴 */}
                    {isPhoneMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[-1]" onClick={() => setIsPhoneMenuOpen(false)} />
                            <div className="absolute left-[70px] top-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in slide-in-from-left-2 duration-200">
                                <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device List</p>
                                </div>

                                <div className="space-y-1">
                                    {phoneList.length > 0 ? (
                                        phoneList.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedPhoneId(p.id);
                                                    setActiveMenu('PhoneManager');
                                                    setIsPhoneMenuOpen(false);
                                                }}
                                                className="w-full text-left rounded-xl py-3 px-4 hover:bg-blue-50 hover:text-blue-700 transition-colors group flex items-center justify-between"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-700 group-hover:text-blue-700">{p.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">상태 및 제어</span>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-[11px] text-slate-400 italic">연결된 폰이 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* 우측 메인 대시보드 영역 */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
                {/* 상단 액션 바 - 환경 설정 */}
                <header className="h-16 flex items-center justify-end px-8 flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-100 outline-none">
                                <Settings size={22} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-slate-100">
                            <div className="px-3 py-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings</p></div>
                            <DropdownMenuItem onClick={() => setIsAccountModalOpen(true)} className="rounded-xl py-3 cursor-pointer">
                                <UserCircle className="mr-2 text-slate-400" size={18} />
                                <span className="font-bold text-sm text-slate-700">사용자 정보 수정</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleShowLogs} className="rounded-xl py-3 cursor-pointer">
                                <ClipboardList className="mr-2 text-slate-400" size={18} />
                                <span className="font-bold text-sm text-slate-700">로그 확인</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* 페이지별 컨텐츠 렌더링 영역 */}
                <main className="flex-1 overflow-hidden px-10 pb-6">
                    <div className="max-w-[1200px] mx-auto h-full flex flex-col">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* 글로벌 알림(Toast) 및 설정 모달 */}
            <Toaster />
            <AccountSettingModal open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} />

            {/* 별도 팝업으로 제공되는 시스템 로그 뷰어 */}
            <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
                <DialogContent className="max-w-[800px] h-[600px] rounded-[2.5rem] p-0 overflow-hidden border-none bg-white">
                    <div className="bg-slate-900 p-8 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                                <ScrollText size={20} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white">System Log Viewer</DialogTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Application Runtime Activity</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0">
                            <X size={20} />
                        </Button>
                    </div>
                    <div className="flex-1 p-8 bg-[#0f172a] overflow-hidden">
                        <div
                            ref={scrollRef}
                            className="h-full overflow-y-auto custom-scrollbar bg-black/30 rounded-2xl p-6 font-mono text-sm text-blue-100/80 whitespace-pre-wrap"
                        >
                            {systemLogs || "표시할 로그가 없습니다."}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}