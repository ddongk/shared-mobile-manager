import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function run() {
    const userQuestion = process.argv.slice(2).join(" ");
    if (!userQuestion) return console.log("질문을 입력하세요.");

    try {
        console.log("1단계: 내 키로 사용 가능한 모델 목록 조회 중...");
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (listData.error) {
            throw new Error(`인증 실패: ${listData.error.message}`);
        }

        const validModel = listData.models.find(m => m.supportedGenerationMethods.includes("generateContent"));

        if (!validModel) {
            throw new Error("사용 가능한 모델이 없습니다. API Studio에서 권한을 확인하세요.");
        }

        const modelName = validModel.name;
        console.log(`확인된 모델명: ${modelName}`);

        console.log("2단계: 프로젝트 코드 분석 중...");
        const code = await getContext();

        console.log("3단계: 구글 서버에 최종 질문 전달 중...");
        const askUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(askUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `코드를 분석해서 답변해줘:\n\n${code}\n\n질문: ${userQuestion}` }] }]
            })
        });

        const data = await response.json();
        console.log("\n================ AI 답변 ================\n");
        console.log(data.candidates[0].content.parts[0].text);
        console.log("\n=========================================");

    } catch (error) {
        console.error("\n실패!");
        console.error("사유:", error.message);
    }
}

async function getContext() {
    const projectRoot = process.cwd();
    const srcDir = path.join(projectRoot, "src");
    let context = "";
    function readDir(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (!["node_modules", ".git", "dist"].includes(file)) readDir(fullPath);
            } else if ([".ts", ".tsx", ".json"].includes(path.extname(file))) {
                context += `\n[File: ${path.relative(projectRoot, fullPath)}]\n${fs.readFileSync(fullPath, "utf8")}\n`;
            }
        });
    }
    readDir(srcDir);
    return context;
}

run();