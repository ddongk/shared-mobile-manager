import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * contextBridge를 통한 메인 프로세스와 렌더러 프로세스 간의 통신 정의
 * 이 설정 덕분에 React 컴포넌트 내에서 window.electron 객체를 사용할 수 있습니다.
 */
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        // 메인 프로세스에 데이터를 요청하고 결과를 비동기로 반환받음
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

        // 메인 프로세스에 단방향 메시지 전송
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),

        /**
         * 메인 프로세스로부터 이벤트를 수신하는 리스너 등록
         * @returns 리스너를 해제할 수 있는 함수(Unsubscribe)를 반환하여 메모리 누수를 방지함
         */
        on: (channel: string, func: (...args: any[]) => void) => {
            const subscription = (_event: IpcRendererEvent, ...args: any[]) => func(...args);
            ipcRenderer.on(channel, subscription);

            // 컴포넌트 언마운트 시 removeListener 에러를 해결하기 위한 반환값
            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        },

        // 특정 채널에 등록된 모든 이벤트 리스너를 강제로 제거
        removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
    },

    // --- 업데이트 관련 API ---
    // GitHub 서버에 새 버전이 있는지 확인
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    // 사용자가 승인했을 때 실제 다운로드 시작
    startDownload: () => ipcRenderer.invoke('start-download'),

    // --- 기존 기기 및 계정 관리 API ---
    saveGlobalAccount: (data: any) => ipcRenderer.invoke('save-global-account', data),
    getGlobalAccount: () => ipcRenderer.invoke('get-global-account'),

    // 시스템 실행 로그(main.log) 내용을 문자열로 수신
    getLogs: () => ipcRenderer.invoke('get-logs'),

    // 앱 구동 시 필요한 시스템 권한(파일 접근 등) 확인
    checkAuthStatus: () => ipcRenderer.invoke('check-auth-status'),
});