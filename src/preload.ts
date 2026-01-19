import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * contextBridge를 통한 메인 프로세스와 렌더러 프로세스 간의 통신 정의
 * 이 설정 덕분에 React 컴포넌트 내에서 window.electron 객체를 사용할 수 있습니다.
 */
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        // 메인 프로세스에 데이터를 요청하고 결과를 비동기로 반환받음
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

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

    /**
     * 사용자 정보(이름, 부서 등) 영구 저장을 위한 API
     * electron-store를 사용하는 메인 프로세스 핸들러를 호출합니다.
     */
    saveGlobalAccount: (data: any) => ipcRenderer.invoke('save-global-account', data),
    getGlobalAccount: () => ipcRenderer.invoke('get-global-account'),

    // 시스템 실행 로그(main.log) 내용을 문자열로 수신
    getLogs: () => ipcRenderer.invoke('get-logs'),

    // 앱 구동 시 필요한 시스템 권한(파일 접근 등) 확인
    checkAuthStatus: () => ipcRenderer.invoke('check-auth-status'),
});