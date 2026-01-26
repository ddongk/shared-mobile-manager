import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpdateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'downloading';

export function UpdateModal({ open, onOpenChange }: UpdateModalProps) {
    const [status, setStatus] = React.useState<UpdateStatus>('idle');
    const [updateInfo, setUpdateInfo] = React.useState<any>(null);
    const [progress, setProgress] = React.useState<number>(0);

    // 새로운 버전 확인
    const checkUpdate = async () => {
        setStatus('checking');
        window.electron.ipcRenderer.invoke('log-info', 'UpdateModal: 업데이트 체크 시작');
        try {
            const result = await window.electron.ipcRenderer.invoke('check-for-updates');
            if (result && result.isUpdateAvailable === true) {
                setUpdateInfo(result.updateInfo);
                setStatus('available');
                window.electron.ipcRenderer.invoke('log-info', `UpdateModal: 업데이트 가능 버전 발견 - ${result.updateInfo.version}`);
            } else {
                setStatus('latest');
                window.electron.ipcRenderer.invoke('log-info', 'UpdateModal: 현재 최신 버전 사용 중');
            }
        } catch (error) {
            window.electron.ipcRenderer.invoke('log-info', 'UpdateModal: 업데이트 확인 중 에러 발생');
            setStatus('latest');
        }
    };

    // 모달이 열릴 때마다 진행률 초기화 및 업데이트 확인 실행
    React.useEffect(() => {
        if (open) {
            setProgress(0);
            checkUpdate();
        }
    }, [open]);

    // 메인 프로세스로부터 전달되는 다운로드 진행 상태 및 완료 이벤트 리스너 등록
    React.useEffect(() => {
        const removeProgressListener = window.electron.ipcRenderer.on('update-progress', (percent: number) => {
            setStatus('downloading');
            setProgress(Math.round(percent));
        });

        const removeFinishedListener = window.electron.ipcRenderer.on('update-finished', () => {
            window.electron.ipcRenderer.invoke('log-info', 'UpdateModal: 다운로드 완료');
            setProgress(100);
        });

        return () => {
            if (removeProgressListener) removeProgressListener();
            if (removeFinishedListener) removeFinishedListener();
        };
    }, []);

    // 사용자 클릭 시 업데이트 파일 다운로드 및 설치 프로세스 시작
    const handleDownload = () => {
        if (status === 'available') {
            setStatus('downloading');
            window.electron.ipcRenderer.invoke('log-info', 'UpdateModal: 사용자 업데이트 다운로드 승인');
            window.electron.ipcRenderer.invoke('start-download');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-10 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">

                {/* 현재 업데이트 진행 상태 헤더 영역 */}
                <DialogHeader className="mb-8">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl transition-all duration-500",
                            status === 'available' || status === 'downloading' ? "bg-red-500 shadow-red-100" : "bg-slate-900 shadow-slate-200"
                        )}>
                            <RefreshCw size={28} className={status === 'checking' || status === 'downloading' ? "animate-spin" : ""} strokeWidth={2.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">
                                소프트웨어 업데이트
                            </DialogTitle>
                            <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                                Software Update
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-8 text-center py-4">
                    {/* 서버로부터 버전 정보를 가져오는 동안 표시되는 로딩 화면 */}
                    {status === 'checking' && (
                        <div className="py-6 flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                            <p className="font-bold text-slate-500 tracking-tight">버전 정보를 확인 중...</p>
                        </div>
                    )}

                    {/* 업데이트 파일 다운로드 진행률을 보여주는 프로그레스 바 영역 */}
                    {status === 'downloading' && (
                        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-end px-1">
                                    <p className="font-black text-slate-900 text-lg">업데이트 다운로드 중...</p>
                                    <p className="font-black text-blue-500 tracking-tighter">{progress}%</p>
                                </div>
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-[12px] font-bold text-slate-400 italic">완료 후 자동으로 앱이 재시작됩니다.</p>
                            </div>
                        </div>
                    )}

                    {/* 추가 설치가 필요 없는 최신 버전 상태 안내 화면 */}
                    {status === 'latest' && (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-black text-slate-900">최신 상태입니다</p>
                                <p className="text-[13px] font-bold text-slate-400">현재 가장 최신 버전을 사용 중입니다.</p>
                            </div>
                        </div>
                    )}

                    {/* 새로운 버전 설치가 가능할 때 표시되는 알림 및 버전 정보 화면 */}
                    {status === 'available' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-black text-slate-900">새 버전 발견: v{updateInfo?.version}</p>
                                <p className="text-[13px] font-bold text-slate-400">지금 업데이트를 적용하여 성능을 개선하세요.</p>
                            </div>
                        </div>
                    )}

                    {/* 상태별 액션 버튼 구성 영역 */}
                    <div className="pt-4 flex flex-col gap-3">
                        {status === 'available' && (
                            <Button onClick={handleDownload} className="w-full h-16 rounded-2xl font-black text-base bg-slate-900 hover:bg-blue-600 shadow-xl transition-all">
                                <Download className="mr-2" size={20} />
                                지금 업데이트 및 재시작
                            </Button>
                        )}
                        {status === 'downloading' && (
                            <Button disabled className="w-full h-16 rounded-2xl bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed font-black">
                                설치 준비 중...
                            </Button>
                        )}
                        {(status === 'latest' || status === 'idle') && (
                            <Button onClick={() => onOpenChange(false)} className="w-full h-16 rounded-2xl font-black text-base bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
                                닫기
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}