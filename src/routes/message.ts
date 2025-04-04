import express, {Request, Response} from "express";
import db from "../db";
import {MessageRow} from "./interface"

const router = express.Router();

router.get("/history", (req: Request, res: Response): any => {
    const {conversationId, start_time} = req.query;

    if (!conversationId) {
        return res.status(400).json({error: "缺少对话ID"});
    }

    // 构建查询条件
    let query = `
        SELECT sender, text, timestamp
        FROM messages
        WHERE conversation_id = ?
    `;
    const params: any[] = [conversationId];

    // 如果有起始时间参数
    if (start_time) {
        query += ` AND timestamp >= ?`;
        params.push(start_time);
    }

    // 添加排序和限制
    query += ` ORDER BY timestamp DESC LIMIT 200`;

    db.all<MessageRow>(
        query,
        params,
        (err, rows) => {
            if (err) {
                console.error("查询消息失败:", err);
                return res.status(500).json({error: "数据库查询失败"});
            }

            // 将结果按时间升序排列返回（最新的200条但按从旧到新排序）
            const sortedRows = rows.reverse();

            res.json({
                messages: sortedRows,
                count: sortedRows.length,
                latest_timestamp: sortedRows.length > 0 ? sortedRows[sortedRows.length - 1].timestamp : null
            });
        }
    );
});

export default router;