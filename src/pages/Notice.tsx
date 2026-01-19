import * as React from "react";
import { AlertTriangle, Info, Smartphone, UserCircle, ExternalLink, ChevronRight } from "lucide-react";

export default function Notice() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[900px]">
            {/* 페이지 헤더 영역 */}
            <div className="px-1">
                <h2 className="text-xl font-black text-slate-800 tracking-tight italic">필독 사항</h2>
                <p className="text-[13px] text-slate-500 font-medium">공용폰 사용 전 반드시 확인해 주세요.</p>
            </div>

            <div className="grid gap-5">
                {/* 인프라 연결 및 계정 설정을 위한 사전 준비 섹션 */}
                <div className="bg-amber-50/80 border border-amber-100 p-6 rounded-[1.5rem] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-5 text-amber-600">
                        <AlertTriangle size={20} />
                        <h3 className="text-base font-black tracking-tight italic">사전 준비 사항</h3>
                    </div>

                    <div className="space-y-5">
                        {/* 시놀로지 공용 저장소 연결 가이드 */}
                        <div className="flex gap-4 items-start">
                            <div className="bg-amber-200 p-2 rounded-xl text-amber-700 shrink-0 shadow-sm">
                                <Smartphone size={18} />
                            </div>
                            <div className="flex-1 space-y-2.5">
                                <h4 className="text-slate-800 font-black text-[14px] italic">공용 저장소 연결 설정</h4>

                                <div className="grid gap-2">
                                    {/* 계정 확인 및 웹 접속 단계 */}
                                    <div className="bg-white/70 p-3 rounded-xl border border-amber-200/50 text-[11px] text-slate-600 shadow-sm transition-all hover:bg-white/90 leading-relaxed">
                                        <div className="flex items-center justify-between">
                                            <span>
                                                <span className="font-black text-amber-600 mr-2 uppercase">Step 1.</span>
                                                웹 주소 <code className="bg-amber-100 px-1 rounded text-amber-800 font-mono">https://dockersys.synology.me:5001/</code> 접속 후 <strong>회원가입</strong>
                                                <span className="ml-1.5 text-amber-700 font-black decoration-amber-300 underline underline-offset-2">
                                                    (구독 그룹 인원은 모두 계정이 생성되어 있는 상태입니다!)
                                                </span>
                                            </span>
                                            <a href="https://dockersys.synology.me:5001/" target="_blank" className="text-amber-600 hover:text-amber-700 transition-colors">
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* 윈도우 탐색기 네트워크 경로 연결 및 자격 증명 저장 단계 */}
                                    <div className="bg-white/70 p-3 rounded-xl border border-amber-200/50 text-[11px] text-slate-600 shadow-sm transition-all hover:bg-white/90 leading-relaxed italic">
                                        <span className="font-black text-amber-600 mr-2 uppercase font-sans">Step 2.</span>
                                        파일 탐색기 주소창에 <code className="bg-amber-100 px-1 rounded text-amber-800 font-mono italic">\\dockersys.synology.me</code> 경로 입력 <ChevronRight size={10} className="inline mx-0.5 text-slate-400" /> 로그인 창에서 <strong className="text-slate-900 underline underline-offset-4 font-black text-[12px]">내 자격 증명 기억</strong> 체크 후 로그인
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 앱 내 사용자 프로필 등록 안내 */}
                        <div className="flex gap-4 items-start border-t border-amber-200/30 pt-5">
                            <div className="bg-amber-200 p-2 rounded-xl text-amber-700 shrink-0 shadow-sm">
                                <UserCircle size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-slate-800 font-black text-[14px] italic mb-2.5">사용자 정보 등록</h4>
                                <div className="bg-white/70 p-3 rounded-xl border border-amber-200/50 text-[11px] text-slate-600 shadow-sm transition-all hover:bg-white/90 leading-relaxed">
                                    <span className="font-black text-amber-600 mr-2 uppercase">Action.</span>
                                    우측 상단 <span className="font-bold text-slate-800">설정 톱니바퀴</span> 클릭 <ChevronRight size={10} className="inline mx-0.5 text-slate-400" /> 본인의 <strong>이름</strong>과 <strong>부서</strong>를 입력하여 저장
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 원활한 기기 공유를 위한 이용 규칙 섹션 */}
                <div className="bg-blue-50/80 border border-blue-100 p-6 rounded-[1.5rem] shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4 text-blue-600">
                        <Info size={20} />
                        <h3 className="text-base font-black tracking-tight italic">이용 에티켓</h3>
                    </div>
                    {/* 모바일 가독성 고려 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex gap-2.5 items-center text-slate-700 font-bold text-[12px] bg-white/50 p-3 rounded-xl border border-blue-100/50">
                            <div className="w-1 h-1 rounded-full bg-blue-400" />
                            사용 종료 시 <span className="text-blue-600 mx-0.5"> 연결된 모바일 창을 닫으면</span> 자동 반납됩니다.
                        </div>
                        <div className="flex gap-2.5 items-center text-slate-700 font-bold text-[12px] bg-white/50 p-3 rounded-xl border border-blue-100/50">
                            <div className="w-1 h-1 rounded-full bg-blue-400" />
                            반납 요청을 받을 경우 가급적 <span className="text-blue-600 mx-0.5 font-black">1분 이내</span> 정리 부탁드립니다.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}