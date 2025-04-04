import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import db from "./db";
import authRoutes from "./routes/auth";
import contactRoutes from "./routes/contact";
import setupWebSocket from "./routes/chat";
import testRoutes from "./routes/test_api"
import taskRoutes from "./routes/task";

// 初始化数据库
const initDatabase = () => {
    const createUserTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
             address TEXT PRIMARY KEY,
             username TEXT,
             avatar_url TEXT,
             language TEXT DEFAULT 'English',
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME
        );
    `;

    const createConversationsTableSQL = `
        CREATE TABLE IF NOT EXISTS conversations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             user1 TEXT NOT NULL,
             user2 TEXT NOT NULL,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createContactsTableSQL = `
        CREATE TABLE IF NOT EXISTS contacts (
            owner TEXT NOT NULL,          -- 用户地址
            contact TEXT NOT NULL,        -- 联系人地址
            conversation_id INTEGER NOT NULL, -- 共享对话ID
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (owner, contact),
            FOREIGN KEY (owner) REFERENCES users(address),
            FOREIGN KEY (contact) REFERENCES users(address),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );
    `;

    const createMessagesTableSQL = `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            translations TEXT,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );
    `;

    const createAuthorizedTasksTableSQL = `
        CREATE TABLE IF NOT EXISTS authorized_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,          -- 用户地址
            conversation_id INTEGER NOT NULL,     -- 授权用于生成日报的对话ID
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (user_address) REFERENCES users(address),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id),
            UNIQUE(user_address, conversation_id)
        );
    `;


    db.exec(createUserTableSQL, (err: Error | null) => {
        if (err) {
            console.error("创建用户表失败:", err);
        } else {
            console.log("用户表已创建或已存在");
        }
    });

    db.exec(createConversationsTableSQL, (err: Error | null) => {
        if (err) {
            console.error("创建对话表失败:", err);
        } else {
            console.log("对话表已创建或已存在");
        }
    });

    db.exec(createMessagesTableSQL, (err: Error | null) => {
        if (err) {
            console.error("创建消息表失败:", err);
        } else {
            console.log("消息表已创建或已存在");
        }
    });

    db.exec(createContactsTableSQL, (err: Error | null) => {
        if (err) {
            console.error("创建消息表失败:", err);
        } else {
            console.log("联系人表已创建或已存在");
        }
    });

    db.exec(createAuthorizedTasksTableSQL, (err: Error | null) => {
        if (err) {
            console.error("创建授权任务表失败:", err);
        } else {
            console.log("授权任务表已创建或已存在");
        }
    });
};


// 加载环境变量
dotenv.config();

// 创建 Express 应用和 HTTP 服务器
const app = express();
const server = createServer(app);

// 设置 WebSocket 服务
setupWebSocket(server);

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/test", testRoutes);
app.use("/task", taskRoutes);

// 静态文件服务
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

// 初始化数据库
initDatabase();

// 启动服务器
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});