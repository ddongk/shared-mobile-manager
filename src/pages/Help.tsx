import * as React from "react";
import {
    HelpCircle,
    AlertCircle,
    Wifi,
    BatteryCharging,
    MessageSquare,
    Settings2,
    CheckCircle2,
    Wrench,
    Lightbulb,
    PowerOff,
    RefreshCw,
    FileQuestion,
    Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Help() {
    return (
        /* space-y-8 -> space-y-6으로 줄여서 전체적인 밀도 상향, pb-10 -> pb-4로 하단 여백 조정 */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-[900px] mx-auto pb-4">

            {/* 1. 상단 타이틀 영역 */}
            <div className="px-1">
                <div className="flex items-center gap-2.5 mb-1">
                    <FileQuestion size={22} className="text-blue-600" strokeWidth={2.5} />
                    <h2 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">사용자 가이드</h2>
                </div>
                <p className="text-[13px] text-slate-500 font-medium ml-[32px]">공용폰 사용 중 발생하는 문제 해결 및 가이드입니다.</p>
            </div>

            {/* 2. 장기 점유 안내 */}
            <div className="flex flex-col px-1">
                <div className="flex items-center gap-2 px-3 mb-3">
                    <AlertCircle size={16} className="text-rose-500" />
                    <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">장기 점유 기기 조치</span>
                </div>

                <div className="bg-white border border-rose-100 p-5 rounded-[2rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full opacity-40 group-hover:scale-110 transition-transform" />
                    <div className="flex items-start gap-5 relative z-10">
                        <div className="w-11 h-11 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100 shrink-0">
                            <MessageSquare size={20} />
                        </div>
                        <div className="flex flex-col justify-center min-h-[44px]">
                            <h3 className="text-[14px] font-black text-slate-800 tracking-tight mb-0.5">장기 점유 기기 강제 해제 안내</h3>
                            <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                                사용자가 반납하지 않고 계속 점유 중인 상태라면 <span className="text-rose-600 font-black underline underline-offset-4 decoration-rose-200">관리자에게 연결 해제를 요청</span>하시기 바랍니다..
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. 주의사항 및 오류 해결 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">

                {/* 필수 주의사항 섹션 */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-3 mb-3">
                        <Settings2 size={16} className="text-blue-600" />
                        <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">필수 주의사항</span>
                    </div>

                    <div className="flex-1 bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3">
                        <div className="group p-4 rounded-[1.2rem] bg-slate-50/50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <Wifi size={18} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-slate-800 mb-0.5">Wi-Fi 연결 필수</h4>
                                <p className="text-[11px] text-slate-500 leading-snug">고정 IP 기반 내부망을 사용하므로 Wi-Fi가 항상 켜져 있어야 합니다.</p>
                            </div>
                        </div>

                        <div className="group p-4 rounded-[1.2rem] bg-slate-50/50 border border-slate-100 hover:border-amber-200 hover:bg-white transition-all flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                <BatteryCharging size={18} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-slate-800 mb-0.5">상시 전원 유지</h4>
                                <p className="text-[11px] text-slate-500 leading-snug">폰이 꺼지면 포트 연결이 해제됩니다. 항상 충전 케이블을 연결해주세요.</p>
                            </div>
                        </div>

                        <div className="mt-auto p-3.5 bg-blue-50/30 rounded-[1.2rem] border border-dashed border-blue-100 flex items-center gap-3">
                            <Smartphone size={15} className="text-blue-500 shrink-0" />
                            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                공용폰 3: Galaxy J5 / 공용폰 5: Galaxy A10e
                            </p>
                        </div>
                    </div>
                </div>

                {/* 연결 오류 해결 섹션 */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-3 mb-3">
                        <Wrench size={16} className="text-slate-400" />
                        <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">오류 원인 및 해결방법</span>
                    </div>

                    <div className="flex-1 bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm flex flex-col gap-3">
                        <div className="group p-4 rounded-[1.2rem] bg-slate-50/50 border border-slate-100 hover:border-rose-200 hover:bg-white transition-all flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                <PowerOff size={18} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-slate-800 mb-0.5">기기 전원 종료 확인</h4>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                    전원이 꺼지면 포트 연결이 끊깁니다. 폰을 켜고 <span className="text-rose-600 font-bold">공용폰 메뉴</span>에 들어가 <span className="text-rose-600 font-bold">'연결이 안돼요'</span> 버튼으로 재연결을 시도하세요.
                                </p>
                            </div>
                        </div>

                        <div className="group p-4 rounded-[1.2rem] bg-slate-50/50 border border-slate-100 hover:border-emerald-200 hover:bg-white transition-all flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                                <RefreshCw size={18} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-slate-800 mb-0.5">Wi-Fi 연결 상태 확인</h4>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                    <span className="text-emerald-600 font-bold">공용폰의 Wi-Fi가 켜져 있는지 확인</span> 후 WIFI를 껐다가 다시 켜보세요.
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto p-3.5 bg-slate-50 rounded-[1.2rem] border border-dashed border-slate-200 flex items-center gap-3">
                            <AlertCircle size={15} className="text-slate-400 shrink-0" />
                            <p className="text-[11px] text-slate-600 font-bold">
                                해결되지 않을 경우, <span className="text-blue-600 underline underline-offset-2">관리자</span>에게 문의해 주세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}