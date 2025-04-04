import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import withWalletCheck from "../components/withWalletCheck";
import privateKeyData from "../assets/private_key.json";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import dayjs from "dayjs";



declare global {
    interface Window {
        ethereum?: any;
    }
}

interface Message {
    id: number;
    conversation_id: number;
    sender: string;
    sender_username?: string; // 从JOIN查询获得，非表字段
    text: string;
    status?: string; // 数据库有默认值
    timestamp: string;
    translations?: string | null; // 对应数据库TEXT字段
    isTranslation?: boolean; // 仅前端使用的标记
}

interface ConversationUserRow {
    user1: string;
    user2: string;
    user1_username: string | null;
    user1_avatar: string | null;
    user1_language: string | null;
    user2_username: string | null;
    user2_avatar: string | null;
    user2_language: string | null;
}

const fetchUserLanguage = async (address: string, conversationId:string): Promise<string> => {
    const response = await fetch(`http://localhost:5001/contact/user-info?address=${address}&conversationId=${conversationId}`);
    const data = await response.json();
    console.log(data);
    return data.otherUser.language || 'English'; // 默认英语
};


const ChatPage = () => {
    const { conversationId } = useParams();
    const userAddress = localStorage.getItem("walletAddress");
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>("");
    const [translatedText, setTranslatedText] = useState<string>("");
    const [useZeroGTranslation, setUseZeroGTranslation] = useState(false);
    const [broker, setBroker] = useState<any>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const [userLanguage, setUserLanguage] = useState('English');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const providerAddress = '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';



    useEffect(() => {
        if (!conversationId || !userAddress) return;

        if (userAddress && conversationId) {
            fetchUserLanguage(userAddress, conversationId).then(setUserLanguage);
        }

        console.log("userLanguage ", userLanguage);

        if (ws.current) {
            ws.current.close();
        }

        const socket = new WebSocket(`ws://localhost:5001/chat?conversationId=${conversationId}&userAddress=${userAddress}`);

        socket.onopen = () => {
            console.log("WebSocket连接已建立");
            ws.current = socket;
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "history") {
                setMessages(data.messages);
            } else if (data.type === "message") {
                setMessages(prev => [...prev, data.message]);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket错误:", error);
        };

        socket.onclose = () => {
            console.log("WebSocket连接关闭");
        };

        return () => {
            socket.close();
        };
    }, [conversationId, userAddress]); // 确保依赖项正确


    // 初始化 0G Broker
    const initializeBroker = async () => {
        try {
            setIsInitializing(true);
            const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
            const wallet = new ethers.Wallet(privateKeyData.private_key, provider);
            const brokerInstance = await createZGComputeNetworkBroker(wallet);
            setBroker(brokerInstance);
            console.log("0G Broker 初始化成功");
        } catch (error) {
            console.error("初始化 0G Broker 失败:", error);
            alert("初始化 0G 翻译服务失败");
            setUseZeroGTranslation(false);
        } finally {
            setIsInitializing(false);
        }
    };

    // 切换开关时处理
    const handleToggleZeroG = async (checked: boolean) => {
        setUseZeroGTranslation(checked);
        if (checked && !broker) {
            await initializeBroker();
        }
    };

    // 使用 0G API 翻译消息
    const translateWithZeroG = async (text: string) => {
        if (!broker || !userLanguage) {
            console.log("0G Broker 未初始化或语言未设置")
            throw new Error("0G Broker 未初始化或语言未设置");
        }


        try {
            const content = `Please translate this text to ${userLanguage} with no other comments: ${text}`;
            console.log(content);

            const { endpoint, model } = await broker.inference.getServiceMetadata(
                providerAddress
            );

            const headers = await broker.inference.getRequestHeaders(
                providerAddress,
                content
            );

            const response = await fetch("http://localhost:5001/test/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint, model, content, headers, originalText: text, conversationId, sender: userAddress, userLanguage, providerAddress }),
            });

            const result = await response.json();
            console.log(result)

            await broker.inference.processResponse(providerAddress, JSON.stringify(result.fee_text), result.chatID);
            console.log("Response:successed")

            return result.translatedText || result.text || "翻译失败";

        } catch (error) {
            console.error("0G 翻译失败:", error);
            throw error;
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !ws.current) return;

        try {
            let translatedText = "";
            if (useZeroGTranslation) {
                translatedText = await translateWithZeroG(inputText); // 调用翻译API
            }

            // 发送到WebSocket服务器
            ws.current.send(JSON.stringify({
                text: inputText,
                translatedText,
                userLanguage,  // 当前用户的语言偏好
                isTranslation: useZeroGTranslation
            }));

            setInputText("");
        } catch (error) {
            console.error("发送失败:", error);
        }
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            height: '90vh'
        }}>
            <h2 style={{ marginBottom: '20px' }}>聊天室 - 对话 {conversationId}</h2>

            {/* 消息容器 */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.map((msg) => {
                    // 判断当前用户是否是发送者（优先用 original_text）
                    const isSender = msg.sender === userAddress;
                    const translations = msg.translations ? JSON.parse(msg.translations) : null;

                    const displayText = isSender
                        ? translations?.Original || msg.text
                        : translations?.[userLanguage] || msg.text;

                    const isTranslated = !isSender && !!translations?.[userLanguage];

                    return (
                        <div key={msg.id} style={{
                            marginBottom: '12px',
                            padding: '10px',
                            backgroundColor: isSender ? '#e3f2fd' : '#ffffff',
                            borderRadius: '8px',
                            borderLeft: isTranslated ? '4px solid #722ed1' : 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                                alignItems: 'center'
                            }}>
                                <strong style={{
                                    color: isSender ? '#1976d2' : '#333',
                                    fontSize: '0.95rem'
                                }}>
                                    {msg.sender_username || msg.sender}
                                </strong>
                                <span style={{
                                    color: '#666',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                }}>
                        {dayjs(msg.timestamp).format('HH:mm')}
                                    {isTranslated && (
                                        <span style={{
                                            marginLeft: '6px',
                                            color: '#722ed1',
                                            fontSize: '0.7rem'
                                        }}>
                                (翻译)
                            </span>
                                    )}
                    </span>
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                wordBreak: 'break-word'
                            }}>
                                {displayText}
                                {/* 可选：显示原始消息（调试用） */}
                                {!isSender && process.env.NODE_ENV === 'development' && (
                                    <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>
                                        {translations && `[存储的翻译: ${JSON.stringify(translations)}]`}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>


            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {translatedText && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#f9f0ff',
                        borderRadius: '6px',
                        borderLeft: '3px solid #722ed1'
                    }}>
                        <div style={{
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#722ed1'
                        }}>
                            翻译结果:
                        </div>
                        <div style={{
                            marginBottom: '10px',
                            fontSize: '0.9rem'
                        }}>
                            {translatedText}
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#722ed1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            发送翻译消息
                        </button>
                    </div>
                )}

                {/* 输入框和按钮 */}
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="输入消息..."
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        resize: 'none',
                        fontSize: '0.9rem'
                    }}
                />

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => sendMessage()}
                        disabled={!inputText.trim()}
                        style={{
                            padding: '10px 16px',
                            backgroundColor: !inputText.trim() ? '#cccccc' : '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: !inputText.trim() ? 'not-allowed' : 'pointer',
                            flex: 1,
                            fontWeight: '500'
                        }}
                    >
                        发送消息
                    </button>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '6px'
                    }}>
                        <label htmlFor="zeroGSwitch" style={{
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                        }}>
                            使用0G翻译
                        </label>
                        <input
                            id="zeroGSwitch"
                            type="checkbox"
                            checked={useZeroGTranslation}
                            onChange={(e) => handleToggleZeroG(e.target.checked)}
                            disabled={isInitializing}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: isInitializing ? 'not-allowed' : 'pointer'
                            }}
                        />
                        {isInitializing && (
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#666'
                            }}>
                                初始化中...
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default withWalletCheck(ChatPage);