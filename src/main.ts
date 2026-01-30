import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import log from 'electron-log/main';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { autoUpdater } from 'electron-updater';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SERVER_URL = 'https://otp.unipost.co.kr/';
// const SERVER_URL = 'http://192.168.10.31:7003'; // test url

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// 전역 변수 및 설정 스토어 초기화
const store = new Store({ name: 'my-settings' }) as any;
const execPromise = promisify(exec);
const activeProcesses: { [key: string]: any } = {};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuiting = false;
let currentOccupiedPhoneId: string | null = null;

let lastKnownPhones: any[] = [];
let isFetchingStatus = false;

// 앱 아이콘 경로 설정 및 로그 파일 시스템 커스텀
const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'iconPizza.png')
    : path.join(app.getAppPath(), 'assets', 'iconPizza.png');

log.transports.file.level = 'info';
const today = new Date().toISOString().split('T')[0];
log.transports.file.fileName = `${today}.log`;
log.transports.console.format = '[{h}:{i}:{s}.{ms}] {text}';

autoUpdater.autoDownload = false; // 수동 다운로드 설정

// 기기 반납을 알리고 내부 점유 상태를 해제
async function handleReleasePhone(phoneId: string) {
    try {
        const response = await fetch(`${SERVER_URL}/phones`);
        const { phones } = await response.json();
        const phone = phones.find((p: any) => p.id === phoneId);

        if (phone) {
            await fetch(`${SERVER_URL}/release`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneId: phoneId,
                    userName: phone.currentUser,
                    userDept: phone.currentUserDept,
                    startTime: phone.currentStartAt
                })
            });
            log.info(`Main: 기기 반납 요청 성공 (ID: ${phoneId})`);
            if (currentOccupiedPhoneId === phoneId) currentOccupiedPhoneId = null;
        }
    } catch (err: any) {
        log.error(`Main: 기기 반납 통신 에러 (ID: ${phoneId}): ${err.message}`);
    }
}

// 앱의 중복 실행 방지(이미 실행 중일 경우 기존 창 활성화)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            log.info("Main: 중복 실행 감지로 인한 기존 창 복구");
            restoreWindow();
        }
    });

    // 앱 준비 완료 시 트레이 생성 및 렌더러 프로세스와의 IPC 핸들러 등록
    app.whenReady().then(() => {
        log.info("Main: Unipost Auto-Launcher 실행 환경 준비 완료");
        createTray();

        // 서버 주소
        ipcMain.handle('get-server-url', () => {
            const cleanBase = SERVER_URL.replace(/\/+$/, "");
            return `${cleanBase}/`;
        });

        // 디바이스 상태 호출
        ipcMain.handle('get-phone-status', async () => {
            if (isFetchingStatus) {
                return { phones: lastKnownPhones, isNetworkConnected: true, isPending: true };
            }

            isFetchingStatus = true;
            try {
                let currentUrl = store.get('server_url') || SERVER_URL;
                const cleanBase = currentUrl.replace(/\/+$/, "");
                const targetFullUrl = `${cleanBase}/phones`;
                const res = await fetch(targetFullUrl);

                if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

                const data = await res.json();
                const phones = data.phones || [];

                phones.forEach((phone: any) => {
                    if (phone.status === 'available' && activeProcesses[phone.id]) {
                        log.info(`Main: 관리자 강제 초기화 감지 - ${phone.id} 프로세스를 종료합니다.`);

                        activeProcesses[phone.id].kill(); // scrcpy 창 닫기
                        delete activeProcesses[phone.id]; // 관리 목록에서 삭제

                        if (currentOccupiedPhoneId === phone.id) {
                            currentOccupiedPhoneId = null;
                        }
                    }
                });

                lastKnownPhones = data.phones || [];

                return { phones: lastKnownPhones, isNetworkConnected: true };
            } catch (e: any) {
                log.error(`Main: 연결 실패 상세 에러: ${e.message}`);
                return { phones: lastKnownPhones, isNetworkConnected: false };
            } finally {
                isFetchingStatus = false;
            }
        });

        // 관리자 명단 조회
        ipcMain.handle('get-admins', async () => {
            try {
                const cleanBase = SERVER_URL.replace(/\/+$/, "");
                const res = await fetch(`${cleanBase}/check-admin-list`);
                return await res.json();
            } catch (e) { return []; }
        });

        // 관리자 여부 조회
        ipcMain.handle('check-admin', async (_, hostname) => {
            try {
                const cleanBase = SERVER_URL.replace(/\/+$/, "");
                const targetUrl = `${cleanBase}/check-admin?hostname=${hostname}`;

                const res = await fetch(targetUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                return await res.json();
            } catch (e: any) {
                log.error(`Main: 관리자 체크 통신 에러 - ${e.message}`);
                return { isAdmin: false };
            }
        });

        // 서버 설정 및 관리자 호스트네임 저장
        ipcMain.handle('save-app-settings', async (_, settings) => {
            try {
                if (settings.serverUrl) store.set('server_url', settings.serverUrl);
                if (settings.refreshInterval) store.set('refresh_interval', settings.refreshInterval);
                return { success: true };
            } catch (e) { return { success: false }; }
        });

        // 강제 초기화 명령
        ipcMain.handle('request-force-release', async (_, { phoneId, hostname }) => {
            try {
                const cleanBase = SERVER_URL.replace(/\/+$/, "");
                const res = await fetch(`${cleanBase}/force-release`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneId: phoneId,
                        adminHostname: hostname
                    })
                });

                const result = await res.json();
                log.info(`Main: 강제 초기화 시도 결과 - ${JSON.stringify(result)}`);
                return result;
            } catch (e: any) {
                log.error(`Main: 강제 초기화 통신 에러 - ${e.message}`);
                return { success: false, error: e.message };
            }
        });

        // 현재 기록되고 있는 시스템 로그 파일의 전체 텍스트 읽기
        ipcMain.handle('get-logs', async () => {
            try {
                const logFile = log.transports.file.getFile();
                const logPath = logFile.path;
                if (fs.existsSync(logPath)) return fs.readFileSync(logPath, 'utf-8');
                return "로그 파일을 찾을 수 없습니다.";
            } catch (e: any) { return "로그 읽기 실패: " + e.message; }
        });

        // 특정 기기에 대한 점유권을 서버에 등록
        ipcMain.handle('occupy-phone', async (_, data) => {
            try {
                const res = await fetch(`${SERVER_URL}/occupy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) currentOccupiedPhoneId = data.phoneId;
                return result.success;
            } catch (e) { return false; }
        });

        // 현재 접속 중인 PC의 호스트네임을 렌더러에 전달
        ipcMain.handle('get-hostname', () => os.hostname());

        // ADB 연결을 수행하고 SCRCPY 화면 제어 프로세스 실행
        ipcMain.handle('run-scrcpy', async (event, { ip, readonly, phoneId }) => {
            const scrcpyDir = app.isPackaged
                ? path.join(process.resourcesPath, 'assets', 'scrcpy')
                : path.join(app.getAppPath(), 'assets', 'scrcpy');
            const scrcpyPath = path.join(scrcpyDir, 'scrcpy.exe');
            const adbPath = path.join(scrcpyDir, 'adb.exe');
            const keyDir = app.isPackaged
                ? path.join(process.resourcesPath, 'assets', 'keys')
                : path.join(app.getAppPath(), 'assets', 'keys');

            const adbEnv = {
                ...process.env,
                ADB_VENDOR_KEYS: keyDir,
                HOME: os.homedir(),
                USERPROFILE: os.homedir()
            };

            try {
                const res = await fetch(`${SERVER_URL}/phones`);
                const { phones } = await res.json();
                const phone = phones.find((p: any) => p.id === phoneId);
                const targetIp = ip || phone?.ip || "";
                const finalIp = targetIp.includes(':') ? targetIp : `${targetIp}:5555`;

                log.info(`Main: ADB 연결 시도 (${finalIp})`);

                // ADB 서버를 통해 타겟 기기 연결 수행
                await new Promise((resolve, reject) => {
                    exec(`"${adbPath}" connect ${finalIp}`, { env: adbEnv }, (err, stdout) => {
                        if (err && !stdout.includes('already connected')) {
                            log.error(`Main: ADB 연결 실패 - ${stdout}`);
                            reject(err);
                        } else { resolve(stdout); }
                    });
                });

                // 설정된 인자값에 따라 SCRCPY 제어 창 실행
                const args = [
                    '-s', finalIp,
                    '--window-title', `Unipost Auto-Launcher - ${phone?.name || finalIp}`,
                    '--no-audio',
                    '--always-on-top'
                ];
                if (readonly) args.push('--no-control');

                const child = spawn(scrcpyPath, args, { cwd: scrcpyDir, env: adbEnv });
                activeProcesses[phoneId] = child;

                // 제어 창 종료 시 ADB 연결 해제 및 서버 반납
                child.on('exit', async () => {
                    delete activeProcesses[phoneId];
                    log.info(`Main: SCRCPY 종료 및 ADB 세션 해제 (${finalIp})`);
                    try {
                        await execPromise(`"${adbPath}" disconnect ${finalIp}`, { env: adbEnv });
                    } catch (disErr) {
                        log.warn(`Main: ADB 연결 해제 중 경고 - ${disErr}`);
                    }

                    await handleReleasePhone(phoneId);
                    if (!event.sender.isDestroyed()) {
                        event.sender.send('scrcpy-closed', { phoneId });
                    }
                });

                return { success: true };
            } catch (e: any) {
                log.error(`Main: SCRCPY 실행 프로세스 에러 - ${e.message}`);
                return { success: false, error: e.message };
            }
        });

        // 수동 또는 자동 반납 요청 시 실행 중인 프로세스 종료
        ipcMain.handle('release-phone', async (_, { phoneId }) => {
            if (activeProcesses[phoneId]) {
                activeProcesses[phoneId].kill();
                delete activeProcesses[phoneId];
                log.info(`Main: ${phoneId} 프로세스 강제 종료`);
            }
            await handleReleasePhone(phoneId);
            return true;
        });

        // 다른 사용자에게 기기 반납 요청 메시지 전송
        ipcMain.handle('send-return-request', async (event, data) => {
            try {
                const finalName = data.requestedBy || data.userName || data.user || data.name;
                const res = await fetch(`${SERVER_URL}/request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneId: data.phoneId, userName: finalName })
                });
                const result = await res.json();
                return { success: result.success };
            } catch (e: any) { return { success: false }; }
        });

        // 본인이 요청했던 반납 대기 취소
        ipcMain.handle('cancel-return-request', async (_, data) => {
            try {
                const res = await fetch(`${SERVER_URL}/cancel-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneId: data.phoneId, userName: data.userName })
                });
                const result = await res.json();
                return result.success;
            } catch (e) { return false; }
        });

        // 소프트웨어 업데이트 서버 확인
        ipcMain.handle('check-for-updates', async () => {
            try {
                const result = await autoUpdater.checkForUpdates();
                return {
                    isUpdateAvailable: !!(result && result.updateInfo && result.updateInfo.version !== app.getVersion()),
                    updateInfo: result?.updateInfo
                };
            } catch (e) { return { isUpdateAvailable: false }; }
        });

        // 로컬 스토리지 데이터 관리 (계정 정보 등)
        ipcMain.handle('get-global-account', async () => store.get('global_account', null));
        ipcMain.handle('save-global-account', async (_, data) => {
            store.set('global_account', data);
            return { success: true };
        });
        // 프론트에서 보낸 메시지를 electron-log를 통해 파일에 기록
        ipcMain.handle('log-info', (_, message) => {
            log.info(message);
        });


        // 업데이트 다운로드 시작 핸들러
        ipcMain.handle('start-download', () => {
            log.info("Main: 업데이트 다운로드 시작");
            autoUpdater.downloadUpdate();
        });

        // 업데이트 진행 상태 전달
        autoUpdater.on('download-progress', (progressObj) => {
            if (mainWindow) {
                // 'update-progress' 리스너로 퍼센트 전달
                mainWindow.webContents.send('update-progress', progressObj.percent);
            }
        });

        // 다운로드 완료 시 처리
        autoUpdater.on('update-downloaded', () => {
            log.info("Main: 다운로드 완료, 3초 후 설치 및 재시작");
            if (mainWindow) {
                mainWindow.webContents.send('update-finished');
            }

            setTimeout(() => {
                isQuiting = true; // 이 변수가 true여야 창 닫기 이벤트에서 app.quit() 작동
                autoUpdater.quitAndInstall(false, true);
            }, 3000);
        });

        // 에러 처리
        autoUpdater.on('error', (err) => {
            log.error(`[Update Error]
               Message: ${err.message}
               Stack: ${err.stack}`);

            if (mainWindow) {
                mainWindow.webContents.send('update-error', err.message);
            }
        });

        createWindow();
    });

    // 앱이 완전히 종료되기 전 점유 중인 기기가 있다면 자동 반납 처리
    app.on('will-quit', async () => {
        if (currentOccupiedPhoneId) {
            log.info("Main: 앱 종료로 인한 마지막 점유 기기 자동 반납 시작");
            if (activeProcesses[currentOccupiedPhoneId]) activeProcesses[currentOccupiedPhoneId].kill();
            await handleReleasePhone(currentOccupiedPhoneId);
        }
    });
}

// 시스템 트레이 아이콘 생성 및 컨텍스트 메뉴 설정
function createTray() {
    try {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Unipost Auto-Launcher 열기', click: () => restoreWindow() },
            { type: 'separator' },
            { label: '완전 종료', click: () => { isQuiting = true; app.quit(); } }
        ]);
        tray.setToolTip('Unipost Auto-Launcher');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => restoreWindow());
    } catch (error) { log.error("Main: 트레이 생성 에러"); }
}

// 창이 이미 있는 경우 복구하고, 없는 경우 새로 생성하는 창 제어 함수
function restoreWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

// 기본 브라우저 창 설정 및 렌더러 로드
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        resizable: false,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    mainWindow.setMenu(null);

    // 닫기 버튼 클릭 시 앱을 종료하지 않고 트레이로 숨김
    mainWindow.on('close', (event) => {
        if (!isQuiting) {
            event.preventDefault();
            mainWindow?.hide();
            log.info("Main: 메인 창 백그라운드 전환 (트레이 실행)");
        }
    });

    if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
}