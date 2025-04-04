import express, {Request, Response} from "express";
import db from "../db";

const router = express.Router();

// 授权对话用于任务
router.post("/authorize", async (req: Request, res: Response): Promise<any> => {
    const {userAddress, conversationId} = req.body;

    if (!userAddress || !conversationId) {
        return res.status(400).json({error: "缺少参数"});
    }

    const sql = `
        INSERT INTO authorized_tasks (user_address, conversation_id)
        VALUES (?, ?) ON CONFLICT(user_address, conversation_id) 
        DO
        UPDATE SET updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userAddress, conversationId], function (err) {
        if (err) {
            console.error("授权对话失败:", err);
            return res.status(500).json({error: "授权失败"});
        }
        res.json({success: true});
    });
});

export default router;