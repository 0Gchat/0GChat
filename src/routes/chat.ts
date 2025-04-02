import { WebSocketServer, WebSocket } from "ws";
import db from "../db";
import { normalizeAddress } from "./genernal";
import { Message, ConversationRow } from './interface'; // 注意路径是否正确



// 获取对话历史消息
const getHistoryMessages = async (conversationId: string, limit = 50): Promise<Message[]> => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT m.*, u.username as sender_username 
             FROM messages m
             LEFT JOIN users u ON m.sender = u.address
             WHERE m.conversation_id = ?
             ORDER BY m.timestamp DESC
             LIMIT ?`,
            [conversationId, limit],
            (err, rows: Message[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.reverse()); // 反转以保持时间顺序
                }
            }
        );
    });
};

// 获取用户信息
const getUserInfo = async (address: string): Promise<{ username: string }> => {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT username FROM users WHERE address = ?",
            [address],
            (err, row: { username: string } | undefined) => {
                if (err || !row) {
                    resolve({ username: address }); // 默认返回地址
                } else {
                    resolve(row);
                }
            }
        );
    });
};

const setupWebSocket = (server: any) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", async (ws: WebSocket, req) => {
        // 从URL中获取会话参数
        const url = new URL(req.url!, `https://${req.headers.host}`);
        const conversationId = url.searchParams.get("conversationId");
        const raw_userAddress = url.searchParams.get("userAddress");

        if (!conversationId || !raw_userAddress) {
            ws.close(4001, "缺少必要参数");
            return;
        }
        const userAddress = normalizeAddress(raw_userAddress) ?? "";

        console.log(`用户 ${userAddress} 加入对话 ${conversationId}`);

        // 验证用户是否有权限加入这个对话
        db.get(
            "SELECT * FROM conversations WHERE id = ? AND (user1 = ? OR user2 = ?)",
            [conversationId, userAddress, userAddress],
            async (err, row: ConversationRow | undefined) => {
                if (err || !row) {
                    console.error("验证对话权限失败:", err);
                    ws.close(4003, "无权限加入此对话");
                    return;
                }

                try {
                    // 发送历史消息
                    const historyMessages = await getHistoryMessages(conversationId);
                    ws.send(JSON.stringify({
                        type: "history",
                        messages: historyMessages
                    }));
                } catch (error) {
                    console.error("获取历史消息失败:", error);
                }

                // 监听消息
                ws.on("message", async (message) => {
                    try {
                        const { text, isTranslation, translatedText } = JSON.parse(message.toString());
                        const userInfo = await getUserInfo(userAddress);

                        // 存储消息到数据库
                        db.run(
                            `INSERT INTO messages (
                conversation_id, sender, text, status,
                translations
            ) VALUES (?, ?, ?, ?, ?)`,
                            [
                                conversationId,
                                userAddress,
                                text,
                                'sent',
                                isTranslation ? JSON.stringify({
                                    Original: text,
                                    Translation: translatedText
                                }) : null
                            ],
                            function (err) {
                                // ...广播逻辑不变...
                            }
                        );
                    } catch (error) {
                        console.error("处理消息出错:", error);
                    }
                });

                // 监听连接关闭
                ws.on("close", () => {
                    console.log(`用户 ${userAddress} 离开对话 ${conversationId}`);
                });
            }
        );
    });

    // 错误处理
    wss.on("error", (error) => {
        console.error("WebSocket服务器错误:", error);
    });
};

export default setupWebSocket;