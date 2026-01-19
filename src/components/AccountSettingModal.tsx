import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, UserCog, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// 모달 컴포넌트의 가시성 상태를 제어하는 인터페이스
interface AccountSettingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AccountSettingModal({ open, onOpenChange }: AccountSettingModalProps) {
    const [userName, setUserName] = React.useState("");
    const [userDept, setUserDept] = React.useState("");
    const [errors, setErrors] = React.useState({ userName: false });
    const [isSaved, setIsSaved] = React.useState(false);
    const { toast } = useToast();

    // 필수 입력 필드 포커싱을 위한 참조 객체
    const nameRef = React.useRef<HTMLInputElement>(null);

    // 모달이 열릴 때마다 전자 스토어에서 저장된 사용자 정보를 불러옴
    React.useEffect(() => {
        if (open) {
            window.electron.getGlobalAccount().then((data: any) => {
                if (data) {
                    setUserName(data.userName || "");
                    setUserDept(data.userDept || "");
                }
            });
            setErrors({ userName: false });
            setIsSaved(false);
        }
    }, [open]);

    // 입력값 유효성 검사 및 사용자 정보 저장 처리
    const handleSave = async () => {
        if (!userName.trim()) {
            setErrors({ userName: true });
            nameRef.current?.focus();
            toast({
                variant: "destructive",
                title: "입력 오류",
                description: "이름은 필수 입력 항목입니다.",
            });
            return;
        }

        const result = await window.electron.saveGlobalAccount({ userName, userDept });

        if (result.success) {
            // 메인 프로세스로 로그 전송하여 사용자 변경 이력 기록
            window.electron.ipcRenderer.invoke('log-to-main', {
                level: 'info',
                message: `[Setting] 사용자 변경: ${userName} (${userDept})`
            });

            setIsSaved(true);
            toast({
                title: "저장 완료",
                description: "사용자 정보가 성공적으로 반영되었습니다.",
            });

            // 저장 완료 후 사용자 인지를 위해 잠시 대기했다가 모달 닫기
            setTimeout(() => {
                setIsSaved(false);
                onOpenChange(false);
            }, 1500);
        } else {
            toast({
                variant: "destructive",
                title: "저장 실패",
                description: result.error,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                {/* 상단 헤더 영역 - 서비스 용도 안내 */}
                <div className="bg-slate-50/80 p-8 pb-6 border-b border-slate-100/80 relative">
                    <DialogHeader>
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                            <UserCog className="text-blue-500" size={24} />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                            사용자 정보 등록
                        </DialogTitle>
                        <DialogDescription className="text-[13px] text-slate-500 font-medium leading-relaxed mt-1.5">
                            공용폰 제어 로그를 위해 정보를 입력해주세요.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* 입력 폼 영역 */}
                <div className="p-8 space-y-6">
                    {/* 사용자 이름 입력 필드 */}
                    <div className="space-y-2.5">
                        <label className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.1em] ml-1 transition-colors",
                            errors.userName ? "text-red-500" : "text-slate-400"
                        )}>
                            Full Name {errors.userName && " - 필수 입력"}
                        </label>
                        <div className="relative group">
                            <User className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                                errors.userName ? "text-red-400" : "text-slate-300 group-focus-within:text-blue-500"
                            )} size={16} />
                            <Input
                                ref={nameRef}
                                placeholder="성함을 입력하세요"
                                className={cn(
                                    "pl-12 h-12 bg-slate-50 transition-all rounded-xl border-none shadow-inner",
                                    errors.userName ? "ring-2 ring-red-100 bg-red-50/30" : "focus:bg-white focus:ring-4 focus:ring-blue-50"
                                )}
                                value={userName}
                                onChange={(e) => {
                                    setUserName(e.target.value);
                                    if (errors.userName) setErrors({ userName: false });
                                }}
                            />
                        </div>
                    </div>

                    {/* 소속 부서 입력 필드 */}
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">
                            Department
                        </label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <Input
                                placeholder="소속 부서를 입력하세요"
                                className="pl-12 h-12 bg-slate-50 transition-all rounded-xl border-none shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-50"
                                value={userDept}
                                onChange={(e) => setUserDept(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 저장 버튼 영역 */}
                    <div className="pt-2 flex flex-col gap-4">
                        <Button
                            onClick={handleSave}
                            disabled={isSaved}
                            className={cn(
                                "w-full h-13 font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] py-6",
                                isSaved
                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                    : "bg-slate-900 hover:bg-blue-600 text-white"
                            )}
                        >
                            {isSaved ? (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    <span>정보가 저장되었습니다!</span>
                                </div>
                            ) : (
                                "데이터 업데이트"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}