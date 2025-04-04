import express, {Request, Response} from "express";
import db from "../db";
import {AuthorizedTaskRow} from "./interface";

const router = express.Router();

// 授权对话用于任务
router.post("/authorize", async (req: Request, res: Response): Promise<any> => {
    const { userAddress, conversationId, isActive } = req.body;

    if (!userAddress || !conversationId || typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "缺少参数" });
    }

    const sql = `
        INSERT INTO authorized_tasks (user_address, conversation_id, is_active)
        VALUES (?, ?, ?)
            ON CONFLICT(user_address, conversation_id) 
        DO UPDATE SET is_active = ?, updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userAddress, conversationId, isActive, isActive], function (err) {
        if (err) {
            console.error("授权对话失败:", err);
            return res.status(500).json({ error: "授权失败" });
        }
        res.json({ success: true });
    });
});


router.get("/authorized-conversations", async (req: Request, res: Response): Promise<any> => {
    const { userAddress, isActive } = req.query;

    if (!userAddress) {
        return res.status(400).json({ error: "缺少用户地址参数" });
    }

    db.all(
        `SELECT conversation_id 
     FROM authorized_tasks 
     WHERE user_address = ? AND is_active = ?`,
        [userAddress, isActive],
        (err, rows) => {
            if (err) {
                console.error("查询授权对话失败:", err);
                return res.status(500).json({ error: "数据库查询失败" });
            }
            res.json({ conversations: rows });
        }
    );
});


router.get("/authorized", async (req: Request, res: Response): Promise<any> => {
    const { userAddress, isActive } = req.query;

    if (!userAddress) {
        return res.status(400).json({ error: "缺少用户地址" });
    }

    db.all(
        `SELECT conversation_id 
     FROM authorized_tasks 
     WHERE user_address = ? AND is_active = ?`,
        [userAddress, isActive === '1' ? 1 : 0],
        (err, rows: AuthorizedTaskRow[]) => {
            if (err) {
                console.error("查询授权对话失败:", err);
                return res.status(500).json({ error: "数据库查询失败" });
            }

            res.json({
                conversations: rows.map(row => row.conversation_id)
            });
        }
    );
});


export default router;