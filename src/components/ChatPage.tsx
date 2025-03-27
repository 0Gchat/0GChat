import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import withWalletCheck from "./withWalletCheck";

declare global {
    interface Window {
        ethereum?: any;
    }
}

const ChatPage = () => {
    const location = useLocation();
    const { sessionKey } = location.state || { sessionKey: null }; // 获取会话键
    const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
    const [inputText, setInputText] = useState<string>("");
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionKey) {
            alert("会话键无效");
            return;
        }

        // 建立 WebSocket 连接
        ws.current = new WebSocket(`ws://localhost:5001/chat?sessionKey=${sessionKey}`);

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setMessages((prevMessages) => [...prevMessages, message]);
        };

        ws.current.onclose = () => {
            console.log("WebSocket 连接关闭");
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [sessionKey]);

    const sendMessage = () => {
        if (!inputText.trim() || !ws.current) {
            return;
        }

        const message = {
            sender: localStorage.getItem("walletAddress"), // 当前用户地址
            text: inputText,
        };

        // 发送消息到 WebSocket 服务器
        ws.current.send(JSON.stringify(message));
        setInputText("");
    };

    return (
        <div>
            <h2>聊天室</h2>
            <div>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <div>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage}>发送</button>
            </div>
        </div>
    );
};

export default withWalletCheck(ChatPage);
