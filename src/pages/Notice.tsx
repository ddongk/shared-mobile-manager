// 페이지 구성을 위한 리액트 및 아이콘 에셋 임포트
import * as React from "react";
import { Info, Smartphone, UserCircle, CheckCircle2, Lock, Loader2, Monitor, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notice() {
    // 공용폰 리스트 저장 및 로딩 상태 관리
    const [phones, setPhones] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

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

    // 최초 실행 및 주기적인 자동 갱신 설정
    React.useEffect(() => {
        window.electron.ipcRenderer.invoke('log-info', 'Notice: 대시보드 진입 및 자동 갱신 시작');
        fetchStatus();
        const timer = setInterval(fetchStatus, 3000);
        return () => {
            window.electron.ipcRenderer.invoke('log-info', 'Notice: 대시보드 이탈 및 타이머 해제');
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[900px] mx-auto pb-10">

            {/* 상단 타이틀 및 대시보드 설명 영역 */}
            <div className="px-1 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <LayoutDashboard size={20} className="text-blue-600"/>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight italic">대시보드</h2>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium ml-7">실시간 공용폰 점유 현황판입니다.</p>
                </div>
            </div>

            {/* 현재 연결된 모든 공용폰의 상태를 보여주는 그리드 레이아웃 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-1">
                {loading ? (
                    <div className="col-span-full h-32 flex items-center justify-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Loader2 className="animate-spin text-slate-300" size={24}/>
                    </div>
                ) : (
                    // 개별 기기의 점유 상태 및 사용자 정보를 표시하는 카드 루프
                    phones.map((phone) => (
                        <div
                            key={phone.id}
                            className={cn(
                                "p-6 rounded-[2rem] border transition-all duration-300 flex flex-col gap-4 relative group",
                                phone.status === 'available'
                                    ? "bg-white border-slate-100 shadow-sm hover:shadow-md"
                                    : "bg-blue-50/50 border-blue-100 shadow-none"
                            )}
                        >
                            {/* 기기 명칭 및 현재 활성화 상태 라벨 */}
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

                            {/* 현재 기기를 제어 중인 PC 정보 표시 박스 */}
                            <div className="flex items-center gap-3 bg-white/80 p-4 rounded-2xl border border-slate-100/50 shadow-inner">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
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

                            {/* 기기 식별 고유값 및 IP 주소 하단 정보 영역 */}
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold text-slate-300 tracking-tighter italic">ID: {phone.id}</span>
                                <span className="text-[10px] font-bold text-slate-300 tracking-tighter">{phone.ip}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="grid gap-6 px-1">
                {/* 호스트네임 기반 사용자 식별 시스템 안내 섹션 */}
                <div className="bg-amber-50/80 border border-amber-100 p-7 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-5 text-amber-600">
                        <UserCircle size={22}/>
                        <h3 className="text-base font-black tracking-tight italic">사용자 정보 관리</h3>
                    </div>
                    <div className="bg-white/80 p-5 rounded-2xl border border-amber-200/50 text-[13px] text-slate-600 leading-relaxed font-medium shadow-sm w-full">
                        본 프로그램은 별도의 회원가입 없이 PC의 <span className="text-amber-700 font-black">Hostname(장치 이름)</span>을 식별자로 사용합니다.
                        기기 점유 및 반납 로그는 자동으로 해당 이름으로 기록되므로 별도의 설정이 필요 없습니다.
                    </div>
                </div>

                {/* 원활한 기기 공유를 위한 이용 수칙 안내 섹션 */}
                <div className="bg-blue-50/80 border border-blue-100 p-7 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-5 text-blue-600">
                        <Info size={22}/>
                        <h3 className="text-base font-black tracking-tight italic">이용 에티켓</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {[
                            {text: "사용 종료 시 프로그램을 종료하거나 반납 버튼을 눌러주세요.", highlight: "프로그램을 종료"},
                            {text: "공용폰 3, 5 모델은 반드시 충전 상태를 유지해 주세요.", highlight: "충전 상태를 유지", isFocus: true},
                            {text: "반납 요청 알림이 뜨면 1분 이내에 정리 부탁드립니다.", highlight: "1분 이내"},
                            {text: "장시간 점유가 필요할 경우 메신저로 미리 양해를 구해주세요.", highlight: "메신저로 미리 양해"}
                        ].map((item: { text: string; highlight: string; isFocus?: boolean }, idx) => (
                            <div key={idx} className={cn(
                                "flex gap-3 items-start font-bold text-[12px] p-4 rounded-2xl border shadow-sm h-full transition-all bg-white/60 border-blue-100/50 text-slate-700",
                                item.isFocus && "ring-1 ring-blue-200 shadow-md shadow-blue-50"
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500",
                                    item.isFocus && "animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                )}/>
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