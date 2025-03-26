import express, { Request, Response } from "express";
import db from "../db";
import {normalizeAddress} from "./genernal";
import {int} from "aws-sdk/clients/datapipeline";

const router = express.Router();

// 定义 ContactRow 接口
interface ContactRow {
    contact: string;
    username: string | null;
    created_at: string;
    conversation_id: number
}


// 添加联系人
router.post("/add", (req: Request, res: Response): void => {
    const { raw_address, raw_contactAddress } = req.body;

    if (!raw_address) {
        res.status(400).json({ message: "地址不能为空" });
        return;
    }

    const address = normalizeAddress(raw_address)
    const contactAddress = normalizeAddress(raw_contactAddress)


    console.log(address, contactAddress);

    if (!address || !contactAddress) {
        res.status(400).json({ message: "缺少必要参数" });
        return;
    }

    // 使用事务确保数据一致性
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 1. 检查是否已经是联系人
        db.get(
            "SELECT * FROM contacts WHERE owner = ? AND contact = ?",
            [address, contactAddress],
            (err, row) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "数据库查询失败" });
                }

                if (row) {
                    return res.status(400).json({ message: "该联系人已存在" });
                }

                // 2. 创建新对话
                db.run(
                    "INSERT INTO conversations DEFAULT VALUES",
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ message: "创建对话失败" });
                            return;
                        }

                        const conversationId = this.lastID; // 获取自动生成的ID

                        // 3. 插入双向联系人关系
                        const stmt = db.prepare(`
                            INSERT INTO contacts (owner, contact, conversation_id)
                            VALUES (?, ?, ?), (?, ?, ?)
                        `);

                        stmt.run(
                            address, contactAddress, conversationId,
                            contactAddress, address, conversationId,
                            function (err: Error | null) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    res.status(500).json({ message: "添加联系人失败" });
                                    return;
                                }

                                db.run("COMMIT");
                                res.json({
                                    message: "联系人添加成功",
                                    conversationId
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});


// 获取联系人列表
router.get("/list", (req: Request, res: Response): void => {
    const userAddress = typeof req.query.userAddress === 'string' ? req.query.userAddress : undefined;

    if (!userAddress) {
        res.status(400).json({ message: "缺少必要参数" });
        return;
    }

    try {
        const address = normalizeAddress(userAddress);

        db.all(
            `SELECT c.contact, u.username, c.created_at, c.conversation_id
             FROM contacts c
             LEFT JOIN users u ON c.contact = u.address
             WHERE c.owner = ?`,
            [address],
            (err, rows: unknown) => {
                if (err) {
                    console.error("数据库查询失败:", err);
                    return res.status(500).json({ message: "数据库查询失败" });
                }

                const contactRows = rows as ContactRow[];
                res.json({
                    contacts: contactRows.map(row => ({
                        address: row.contact,
                        username: row.username,
                        createdAt: row.created_at,
                        conversation_id: row.conversation_id
                    }))
                });
            }
        );
    } catch (error) {
        res.status(400).json({ message: "地址格式错误" });
    }
});

export default router;