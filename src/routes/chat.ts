import { WebSocketServer, WebSocket } from "ws";
import db from "../db";

interface ConversationRow {
    id: number;
    user1: string;
    user2: string;
}

interface Message {
    sender: string;
    text: string;
    conversation_id: number;
}

// 创建 WebSocket 服务
const setupWebSocket = (server: any) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: WebSocket, req) => {
        // 从URL中获取会话参数
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const conversationId = url.searchParams.get("conversationId");
        const userAddress = url.searchParams.get("userAddress");

        if (!conversationId || !userAddress) {
            ws.close(4001, "缺少必要参数");
            return;
        }

        console.log(`用户 ${userAddress} 加入对话 ${conversationId}`);

        // 验证用户是否有权限加入这个对话
        db.get(
            "SELECT * FROM conversations WHERE id = ? AND (user1 = ? OR user2 = ?)",
            [conversationId, userAddress, userAddress],
            (err, row: ConversationRow | undefined) => {
                if (err || !row) {
                    console.error("验证对话权限失败:", err);
                    ws.close(4003, "无权限加入此对话");
                    return;
                }

                // 监听消息
                ws.on("message", async (message) => {
                    try {
                        const { text } = JSON.parse(message.toString());

                        // 存储消息到数据库
                        db.run(
                            "INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)",
                            [conversationId, userAddress, text],
                            function (err) {
                                if (err) {
                                    console.error("存储消息失败:", err);
                                    return;
                                }

                                // 构建完整的消息对象
                                const fullMessage: Message = {
                                    sender: userAddress,
                                    text,
                                    conversation_id: parseInt(conversationId)
                                };

                                // 广播消息给当前对话的所有客户端
                                wss.clients.forEach((client) => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify(fullMessage));
                                    }
                                });
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