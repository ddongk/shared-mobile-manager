// 페이지 구성을 위한 리액트 및 아이콘 에셋 임포트
import * as React from "react";
import {
    Info,
    Smartphone,
    UserCircle,
    CheckCircle2,
    Lock,
    Loader2,
    Monitor,
    LayoutDashboard,
    RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notice() {
    // 공용폰 리스트 저장 및 로딩 상태 관리
    const [phones, setPhones] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [myHostname, setMyHostname] = React.useState("");

    // 관리자 메시지 상태
    const [adminMessage, setAdminMessage] = React.useState("불러오는 중...");
    const [isSaving, setIsSaving] = React.useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = React.useState(false);

    // 서버 베이스 URL
    const getApiUrl = async (endpoint: string) => {
        const baseUrl = await window.electron.ipcRenderer.invoke('get-server-url');
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBase}/${endpoint}`;
    };

    // 관리자 체크 로직
    const checkAdminStatus = async () => {
        try {
            const hostname = await window.electron.ipcRenderer.invoke('get-hostname');
            setMyHostname(hostname);
            const data = await window.electron.ipcRenderer.invoke('check-admin', hostname);
            setIsAdmin(data.isAdmin);
        } catch (error) {
            console.error("관리자 체크 실패:", error);
            setIsAdmin(false);
        }
    };

    // 강제 초기화 실행 함수
    const handleForceRelease = async (phoneId: string) => {
        if (!confirm(`${phoneId} 기기를 강제로 초기화하시겠습니까?`)) return;

        try {
            const result = await window.electron.ipcRenderer.invoke('request-force-release', {
                phoneId,
                hostname: myHostname
            });

            if (result.success) {
                alert("초기화되었습니다.");
                fetchStatus();
            } else {
                alert(`초기화 실패: ${result.error || '권한이 없거나 서버 에러입니다.'}`);
            }
        } catch (error: any) {
            console.error("강제 초기화 통신 에러:", error);
            alert("통신 실패: 서버와 연결할 수 없습니다.");
        }
    };
    // 최신 공용폰 점유 상태
    const fetchStatus = async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-phone-status');
            if (data.isNetworkConnected) {
                setPhones(data.phones);
            }
        } catch (error) {
            window.electron.ipcRenderer.invoke('log-info', 'Notice: 상태 업데이트 통신 실패');
            console.error("상태 업데이트 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    // 최초 로딩 시 서버에서 관리자 메시지 가져오기
    const fetchAdminMessage = async () => {
        try {
            const message = await window.electron.ipcRenderer.invoke('get-admin-message');
            setAdminMessage(message);
        } catch (error) {
            console.error("메시지 로드 실패", error);
        }
    };

    const handleSaveMessage = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setShowSaveSuccess(false);

        try {
            const result = await window.electron.ipcRenderer.invoke('save-admin-message', adminMessage);
            if (result.success) {
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 2000);
            } else {
                console.error("저장 실패:", result.error);
                alert("저장 실패: " + (result.error || "서버 응답 오류"));
            }
        } catch (error) {
            console.error("저장 통신 에러:", error);
            alert("통신 실패: 서버와 연결할 수 없습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // 최초 실행 및 주기적인 자동 갱신 설정
    React.useEffect(() => {
        window.electron.ipcRenderer.invoke('log-info', 'Notice: 대시보드 진입 및 자동 갱신 시작');
        checkAdminStatus();
        fetchStatus();
        fetchAdminMessage();
        const timer = setInterval(fetchStatus, 4000);
        return () => {
            window.electron.ipcRenderer.invoke('log-info', 'Notice: 대시보드 이탈 및 타이머 해제');
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[900px] mx-auto pb-10">
            {/* 상단 타이틀 영역 */}
            <div className="px-1 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <LayoutDashboard size={20} className="text-blue-600"/>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight italic">대시보드</h2>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium ml-7">실시간 공용폰 점유 현황판입니다.</p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black text-red-600 uppercase">Admin Mode</span>
                    </div>
                )}
            </div>

            {/* 공용폰 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-1">
                {loading ? (
                    <div className="col-span-full h-32 flex items-center justify-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Loader2 className="animate-spin text-slate-300" size={24}/>
                    </div>
                ) : (
                    <>
                        {/* 1. 실제 서버에서 받아온 폰 리스트 */}
                        {phones.map((phone) => (
                            <div
                                key={phone.id}
                                className={cn(
                                    "p-6 rounded-[2rem] border transition-all duration-300 flex flex-col gap-4 relative group",
                                    phone.status === 'available'
                                        ? "bg-white border-slate-100 shadow-sm hover:shadow-md"
                                        : "bg-blue-50/50 border-blue-100 shadow-none"
                                )}
                            >
                                {isAdmin && phone.status === 'busy' && (
                                    <button
                                        onClick={() => handleForceRelease(phone.id)}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110 z-20"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={14} className={phone.status === 'available' ? "text-slate-400" : "text-blue-500"}/>
                                        <span className="text-[14px] font-black text-slate-700 uppercase tracking-tight">{phone.name}</span>
                                    </div>
                                    {phone.status === 'available' ? (
                                        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Idle</span>
                                        </div>
                                    ) : (
                                        <CheckCircle2 size={16} className="text-blue-500"/>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 bg-white/80 p-4 rounded-2xl border border-slate-100/50 shadow-inner">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        phone.status === 'available' ? "bg-slate-50 text-slate-300" : "bg-blue-600 text-white shadow-md scale-105"
                                    )}>
                                        <Monitor size={20}/>
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active PC</span>
                                        <span className={cn(
                                            "text-[13px] font-black truncate",
                                            phone.status === 'available' ? "text-slate-200 italic font-medium" : "text-slate-800"
                                        )}>
                                {phone.status === 'available' ? "Available" : phone.currentUser}
                            </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-slate-300 tracking-tighter italic">ID: {phone.id}</span>
                                    <span className="text-[10px] font-bold text-slate-300 tracking-tighter">{phone.ip}</span>
                                </div>
                            </div>
                        ))}

                        {/* 2. 가짜(더미) 공용폰 2번 박스 추가 */}
                        <div className="p-6 rounded-[2rem] border border-slate-200 bg-slate-50/40 flex flex-col gap-4 relative opacity-60 select-none shadow-sm">
                            {/* 상단 미연결 안내 라벨 */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">연결되지 않은 기기</span>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={14} className="text-slate-300"/>
                                    <span className="text-[14px] font-black text-slate-300 uppercase tracking-tight">공용폰 2</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Disabled</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white/50 p-4 rounded-2xl border border-slate-200/50 shadow-inner">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-300">
                                    <Monitor size={20}/>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Active PC</span>
                                    <span className="text-[13px] font-black text-slate-200 italic tracking-tight">Ready to Connect</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold text-slate-200 tracking-tighter italic">ID: phone2</span>
                                <span className="text-[10px] font-bold text-slate-200 tracking-tighter">0.0.0.0</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 안내 섹션 */}
            <div className="grid gap-6 px-1">
                {/* 관리자의 한마디 박스 */}
                <div className="bg-amber-50/80 border border-amber-100 p-7 rounded-[2rem] shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5 text-amber-600">
                            <UserCircle size={22}/>
                            <h3 className="text-base font-black tracking-tight italic">관리자의 한마디</h3>
                        </div>

                        {/* 관리자일 때만 노출되는 저장 버튼 */}
                        {isAdmin && (
                            <div className="flex items-center gap-3">
                                {/* 💡 저장 성공 시 나타나는 메시지 */}
                                {showSaveSuccess && (
                                    <span className="text-[11px] font-bold text-emerald-600 animate-bounce">
                                    ✓ 저장 완료!
                                </span>
                                )}
                                <button
                                    onClick={handleSaveMessage}
                                    disabled={isSaving}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-md active:scale-95",
                                        isSaving
                                            ? "bg-slate-300 text-white cursor-not-allowed"
                                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                    )}
                                >
                                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    {isSaving ? "저장 중..." : "저장하기"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 입력/표시 컨테이너 */}
                    <div className={cn(
                        "flex gap-3 items-start font-bold text-[13px] p-5 rounded-2xl border transition-all bg-white shadow-md shadow-amber-50 ring-1 ring-amber-200 text-slate-700 w-full",
                        isAdmin ? "focus-within:ring-amber-400 focus-within:shadow-lg ring-amber-300" : ""
                    )}>
                        <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"/>

                        {isAdmin ? (
                            <textarea
                                value={adminMessage}
                                onChange={(e) => setAdminMessage(e.target.value)}
                                readOnly={isSaving}
                                className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none leading-relaxed min-h-[60px] text-slate-800 placeholder:text-slate-300 outline-none"
                                placeholder="사용자들에게 남길 메시지를 입력하세요..."
                                spellCheck={false}
                            />
                        ) : (
                            <div className="w-full min-h-[60px]">
                                <p className="leading-relaxed whitespace-pre-wrap text-slate-800">
                                    {adminMessage}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-100 p-7 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-5 text-blue-600">
                        <Info size={22}/>
                        <h3 className="text-base font-black tracking-tight italic">이용 에티켓</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {[
                            {text: "사용 종료 시 프로그램을 종료하거나 반납 버튼을 눌러주세요.", highlight: "프로그램을 종료"},
                            {text: "공용폰 3, 5 모델은 반드시 충전 상태를 유지해 주세요.", highlight: "충전 상태를 유지"},
                            {text: "반납 요청 알림이 뜨면 1분 이내에 정리 부탁드립니다.", highlight: "1분 이내"},
                            {text: "장시간 점유가 필요할 경우 메신저로 미리 양해를 구해주세요.", highlight: "메신저로 미리 양해"}
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-start font-bold text-[12px] p-4 rounded-2xl border transition-all bg-white shadow-md shadow-blue-50 ring-1 ring-blue-200 text-slate-700 h-full">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"/>
                                <p className="leading-snug">
                                    {item.text.split(item.highlight)[0]}
                                    <span className="text-blue-600 font-black">{item.highlight}</span>
                                    {item.text.split(item.highlight)[1]}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}