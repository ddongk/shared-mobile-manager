import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// index.html에 정의된 <div id="root"></div> 요소
// <App />을 화면에 그림
const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error("Failed to find the root element. Check your index.html");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    // StrictMode: 개발 단계에서 잠재적인 문제를 감지하기 위한 래퍼
    <React.StrictMode>
        <App />
    </React.StrictMode>
);