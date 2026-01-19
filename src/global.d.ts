/**
 * IElectronAPI 인터페이스
 * 메인 프로세스(Main)와 렌더러 프로세스(React) 간의 통신 규격을 정의합니다.
 */
export interface IElectronAPI {
    // 사용자 계정 정보를 로컬 전자 스토어에 저장하거나 불러오는 API
    saveGlobalAccount: (data: any) => Promise<{ success: boolean; error?: string }>;
    getGlobalAccount: () => Promise<any>;

    // 일렉트론 기본 ipcRenderer 통신 인터페이스
    ipcRenderer: {
        // 메인 프로세스에 비동기 요청을 보내고 응답을 수신
        invoke(channel: string, ...args: any[]): Promise<any>;
        // 메인 프로세스로부터 이벤트를 수신 (리스너 해제를 위한 함수 반환)
        on(channel: string, func: (...args: any[]) => void): () => void;
        // 특정 채널의 모든 리스너를 제거하여 메모리 누수 방지
        removeAllListeners(channel: string): void;
    };

    // 시스템 실행 로그 파일의 텍스트 데이터를 읽어오는 API
    getLogs?: () => Promise<string>;

    // 앱 실행 및 파일 시스템 접근을 위한 사용자 권한 상태 확인
    checkAuthStatus: () => Promise<{ success: boolean; reason?: string }>;
}

/**
 * Global Declaration
 * 브라우저의 window 객체 내에 electron 인터페이스를 전역으로 등록합니다.
 */
declare global {
    interface Window {
        electron: IElectronAPI;
    }
}