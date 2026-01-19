import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import log from 'electron-log/main';
import squirrelStartup from 'electron-squirrel-startup';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

// 관리 대상이 되는 실제 기기 정보 정의
const HARDCODED_PHONES = [
    { id: 'phone5', name: '공용폰 5 (Galaxy A10e)', ip: '192.168.10.131' },
    { id: 'phone3', name: '공용폰 3 (아직안됨!!)', ip: '192.168.10.129' },
];

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// 시놀로지 NAS 내 상태 관리 파일 및 로그 저장 경로
const STATUS_FILE_PATH = '\\\\dockersys.synology.me\\maintenance\\common\\share\\device-sync\\status.json';
const LOG_DIR_PATH = '\\\\dockersys.synology.me\\maintenance\\common\\share\\device-sync\\log';

if (app.isPackaged) app.disableHardwareAcceleration();

// 앱 실행 로그 설정 (날짜별 저장 및 포맷 지정)
const today = new Date().toISOString().split('T')[0];
log.transports.file.level = 'info';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.fileName = `${today}.log`;

const store = new Store({ name: 'my-settings' }) as any;
const execPromise = promisify(exec);
const activeProcesses: { [key: string]: any } = {};

// 기기 반납 시 사용 이력을 로그로 변환하고 상태를 초기화하는 함수
function processReleaseLog(phone: any) {
    if (!phone.currentStartAt) return;

    const logEntry = {
        user: phone.currentUser,
        dept: phone.currentUserDept || "미지정",
        startTime: phone.currentStartAt,
        endTime: new Date().toISOString()
    };

    saveToLogFile(phone.name, logEntry);

    phone.status = 'available';
    phone.currentUser = '';
    phone.currentUserDept = '';
    phone.currentStartAt = '';
}

// 로그를 파일에 기록하고 6일이 지난 오래된 로그는 자동으로 삭제
function saveToLogFile(phoneName: string, logEntry: any) {
    try {
        if (!fs.existsSync(LOG_DIR_PATH)) fs.mkdirSync(LOG_DIR_PATH, { recursive: true });

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const fileName = `${phoneName}_${dateStr}.log`;
        const filePath = path.join(LOG_DIR_PATH, fileName);

        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(filePath, logLine, 'utf8');

        // 오래된 로그 파일 정리 (최근 6일치만 유지)
        const files = fs.readdirSync(LOG_DIR_PATH);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 6);
        limitDate.setHours(0, 0, 0, 0);

        files.forEach(file => {
            if (file.startsWith(phoneName)) {
                const fileDatePart = file.match(/\d{4}-\d{2}-\d{2}/);
                if (fileDatePart && new Date(fileDatePart[0]) < limitDate) {
                    fs.unlinkSync(path.join(LOG_DIR_PATH, file));
                }
            }
        });
    } catch (err) { log.error("로그 저장 에러:", err); }
}

// 시놀로지 서버에서 현재 기기들의 점유 상태를 읽어옴
function readStatusFile() {
    try {
        if (fs.existsSync(STATUS_FILE_PATH)) {
            const content = fs.readFileSync(STATUS_FILE_PATH, 'utf-8');
            return JSON.parse(content);
        }
    } catch (err) { log.error("파일 읽기 에러:", err); }
    return { phones: [] };
}

// 기기 상태를 서버 파일에 업데이트 (10분 경과된 대기열은 자동 만료 처리)
function writeStatusFile(data: any) {
    try {
        const EXPIRATION_TIME = 10 * 60 * 1000;
        const now = Date.now();

        if (data.phones) {
            data.phones.forEach((phone: any) => {
                if (phone.requests && Array.isArray(phone.requests)) {
                    phone.requests = phone.requests.filter((req: any) =>
                        now - new Date(req.time).getTime() < EXPIRATION_TIME
                    );
                }
            });
        }

        fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) { log.error("파일 쓰기 에러:", err); }
}

// 싱글 인스턴스 실행 보장 및 메인 윈도우 관리
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    let mainWindow: BrowserWindow | null = null;
    let tray: Tray | null = null;
    let forceQuit = false;

    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.on('before-quit', () => { forceQuit = true; });
    if (squirrelStartup) { app.quit(); }

    // IPC 통신 핸들러 등록
    ipcMain.on('log-to-main', (event, message) => { log.info(`[Renderer Log] ${message}`); });

    ipcMain.handle('save-global-account', async (event, data) => {
        try { store.set('global_account', data); return { success: true }; }
        catch (error: any) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('get-global-account', async () => { return store.get('global_account', null); });

    ipcMain.handle('get-logs', async () => {
        try {
            const logPath = log.transports.file.getFile().path;
            return fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : "로그가 없습니다.";
        } catch (error: any) { return `로그 읽기 실패: ${error.message}`; }
    });

    // 서버의 상태 데이터와 소스 코드의 하드코딩된 기기 정보를 병합하여 반환
    ipcMain.handle('get-phone-status', async () => {
        try {
            const data = readStatusFile();
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const EXPIRATION_TIME = 10 * 60 * 1000;

            const mergedPhones = HARDCODED_PHONES.map(hp => {
                const existing = data.phones.find((p: any) => p.id === hp.id) || { status: 'available' };

                let requests = existing.requests || [];
                requests = requests.filter((req: any) =>
                    Date.now() - new Date(req.time).getTime() < EXPIRATION_TIME
                );

                const todayLogs: any[] = [];
                try {
                    const fileName = `${hp.name}_${todayStr}.log`;
                    const filePath = path.join(LOG_DIR_PATH, fileName);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        content.split('\n').filter(l => l.trim()).forEach(l => {
                            try { todayLogs.push(JSON.parse(l)); } catch (e) {}
                        });
                    }
                } catch (e) {}

                return {
                    ...existing,
                    ...hp,
                    requests,
                    accessLogs: todayLogs.reverse()
                };
            });

            return { phones: mergedPhones };
        } catch (error) {
            return { phones: HARDCODED_PHONES.map(hp => ({ ...hp, status: 'available' })) };
        }
    });

    // 사용자가 기기 점유를 시도할 때 상태를 변경하고 대기열에서 제거
    ipcMain.handle('occupy-phone', async (event, { phoneId, userId, userName, userDept }) => {
        const data = await readStatusFile();
        const phone = data.phones.find((p: any) => p.id === phoneId);

        if (phone) {
            phone.status = 'occupied';
            phone.currentUser = userName;
            phone.currentUserDept = userDept;
            phone.currentStartAt = new Date().toISOString();

            if (phone.requests) {
                phone.requests = phone.requests.filter((req: any) => !req.user.startsWith(userName));
            }

            await writeStatusFile(data);
            return true;
        }
        return false;
    });

    // scrcpy 프로세스를 실행하여 안드로이드 기기 화면을 미러링
    ipcMain.handle('run-scrcpy', async (event, { ip, readonly, phoneId }) => {
        const scrcpyDir = app.isPackaged
            ? path.join(process.resourcesPath, 'assets', 'scrcpy')
            : path.join(app.getAppPath(), 'assets', 'scrcpy');
        const scrcpyPath = path.join(scrcpyDir, 'scrcpy.exe');
        const adbPath = path.join(scrcpyDir, 'adb.exe');

        const hp = HARDCODED_PHONES.find(p => p.id === phoneId);
        const finalIp = ip || (hp ? hp.ip : "");
        const targetIp = finalIp.includes(':') ? finalIp : `${finalIp}:5555`;

        try {
            if (activeProcesses[phoneId]) {
                activeProcesses[phoneId].kill();
                delete activeProcesses[phoneId];
            }

            // 윈도우 보안 해제 및 기기 연결
            await execPromise(`powershell "Get-ChildItem -Path '${scrcpyDir}' -Recurse | Unblock-File"`);
            await execPromise(`"${adbPath}" connect ${targetIp}`);

            // 기기 화면에 제어 시작 알림 전송 (Broadcast 메시지)
            try {
                const data = readStatusFile();
                const phone = data.phones.find((p: any) => p.id === phoneId);
                const userName = phone ? phone.currentUser : "사용자";
                const alertMsg = `${userName}님이 제어를 시작했습니다.`;

                await execPromise(`"${adbPath}" -s ${targetIp} shell "input keyevent KEYCODE_WAKEUP"`);
                const toastCmd = `"${adbPath}" -s ${targetIp} shell "am broadcast -a com.android.systemui.demo -e command display --es text '${alertMsg}'"`;
                await execPromise(toastCmd).catch(() => {});
            } catch (err) { log.error(`[알림 실패] ${err.message}`); }

            const args = ['-s', targetIp, '--window-title', `PIZZA_${finalIp}`, '--no-audio', '--always-on-top'];
            if (readonly) args.push('--no-control');

            const child = spawn(scrcpyPath, args, { cwd: scrcpyDir });
            activeProcesses[phoneId] = child;

            child.stderr.on('data', (data) => { log.error(`[scrcpy stderr] ${phoneId}: ${data.toString()}`); });

            // scrcpy 윈도우가 닫히면 자동으로 기기 반납 처리
            child.on('exit', (code) => {
                log.info(`[종료] ${phoneId} 화면 닫힘`);
                delete activeProcesses[phoneId];
                const d = readStatusFile();
                const i = d.phones.findIndex((p: any) => p.id === phoneId);
                if (i !== -1) {
                    const mergedPhone = { ...d.phones[i], ...hp };
                    processReleaseLog(mergedPhone);
                    d.phones[i].status = 'available';
                    d.phones[i].currentUser = '';
                    d.phones[i].currentUserDept = '';
                    d.phones[i].currentStartAt = '';
                    writeStatusFile(d);
                }
                event.sender.send('scrcpy-closed', { phoneId });
            });

            return { success: true };
        } catch (error: any) {
            log.error(`[scrcpy 실행 에러] ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    // 명시적으로 기기 반납을 수행
    ipcMain.handle('release-phone', async (event, { phoneId }) => {
        if (activeProcesses[phoneId]) { activeProcesses[phoneId].kill(); delete activeProcesses[phoneId]; }
        const data = readStatusFile();
        const idx = data.phones.findIndex((p: any) => p.id === phoneId);
        if (idx !== -1) {
            const hp = HARDCODED_PHONES.find(p => p.id === phoneId);
            const mergedPhone = { ...data.phones[idx], name: hp ? hp.name : data.phones[idx].name };
            processReleaseLog(mergedPhone);
            data.phones[idx].status = 'available';
            data.phones[idx].currentUser = '';
            data.phones[idx].currentUserDept = '';
            data.phones[idx].currentStartAt = '';
            writeStatusFile(data);
            return true;
        }
        return false;
    });

    // 다른 사용자가 점유 중인 기기에 반납 요청 추가
    ipcMain.handle('send-return-request', async (event, { phoneId, requestedBy, time }) => {
        const data = await readStatusFile();
        const phone = data.phones.find((p: any) => p.id === phoneId);

        if (phone) {
            if (!phone.requests) phone.requests = [];
            const isAlreadyWaiting = phone.requests.some((req: any) => req.user === requestedBy);

            if (!isAlreadyWaiting) {
                phone.requests.push({ user: requestedBy, time: time });
                await writeStatusFile(data);
                return true;
            }
        }
        return false;
    });

    // 등록한 반납 요청 취소
    ipcMain.handle('cancel-return-request', async (event, { phoneId, userName }) => {
        const data = await readStatusFile();
        const phone = data.phones.find((p: any) => p.id === phoneId);

        if (phone && phone.requests) {
            phone.requests = phone.requests.filter((req: any) => !req.user.startsWith(userName));
            await writeStatusFile(data);
            return true;
        }
        return false;
    });

    const createWindow = () => {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 900,
            show: false,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false, contextIsolation: true,
            },
        });
        mainWindow.setMenu(null);
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) { mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL); }
        else { mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)); }
        mainWindow.once('ready-to-show', () => { mainWindow?.show(); });
        mainWindow.on('close', (e) => { if (!forceQuit) { e.preventDefault(); mainWindow?.hide(); } });
    };

    // 트레이 아이콘 설정 (최소화 시 백그라운드 실행용)
    const createTray = () => {
        const iconPath = app.isPackaged
            ? path.join(app.getAppPath(), '.vite', 'build', 'assets', 'iconPizza.ico')
            : path.join(app.getAppPath(), 'assets', 'iconPizza.ico');
        const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
        tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
        const contextMenu = Menu.buildFromTemplate([
            { label: 'PIZZA 열기', click: () => { mainWindow?.show(); } },
            { type: 'separator' },
            { label: '완전 종료', click: () => { forceQuit = true; app.quit(); } }
        ]);
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => mainWindow?.show());
    };

    app.whenReady().then(() => { createWindow(); createTray(); });
}