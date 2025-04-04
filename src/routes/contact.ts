import express, { Request, Response } from "express";
import db from "../db";
import {normalizeAddress} from "./genernal";
import {int} from "aws-sdk/clients/datapipeline";
import { ConversationUserRow, ContactRow } from './interface';

const router = express.Router();


// 添加联系人
router.post("/add", (req: Request, res: Response): void => {
    const { raw_address, raw_contactAddress } = req.body;
    console.log("processing ", raw_address);

    if (!raw_address) {
        res.status(400).json({ message: "地址不能为空" });
        return;
    }

    const address = normalizeAddress(raw_address);
    const contactAddress = normalizeAddress(raw_contactAddress);

    if (!address || !contactAddress) {
        res.status(400).json({ message: "缺少必要参数" });
        return;
    }

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
                    console.log(address, contactAddress, "contacts existed!");
                    return res.status(400).json({ message: "该联系人已存在" });
                }

                // 2. 创建新对话（修改此处）
                db.run(
                    "INSERT INTO conversations (user1, user2) VALUES (?, ?)",
                    [address, contactAddress],
                    function (err) {
                        if (err) {
                            console.error("创建对话失败详情:", err.message);
                            db.run("ROLLBACK");
                            return res.status(500).json({ message: "创建对话失败" });
                        }

                        const conversationId = this.lastID;

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
                                    console.error("添加联系人失败:", err.message);
                                    db.run("ROLLBACK");
                                    return res.status(500).json({ message: "添加联系人失败" });
                                }

                                db.run("COMMIT");
                                console.log(address, contactAddress, "contacts added!");
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
    console.log("processing ", userAddress);
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

router.get("/user-info", async (req: Request, res: Response): Promise<any> => {
    try {
        const { address, conversationId } = req.query;

        console.log("processing ", address, conversationId);

        // 验证参数
        if (!address || typeof address !== "string" || !conversationId) {
            return res.status(400).json({ error: "缺少必要参数" });
        }

        const normalizedAddress = normalizeAddress(address);
        if (!normalizedAddress) {
            return res.status(400).json({ error: "无效的地址格式" });
        }

        // 查询对话信息和双方用户信息
        db.get<ConversationUserRow>(
            `SELECT
                 c.user1,
                 c.user2,
                 u1.username AS user1_username,
                 u1.avatar_url AS user1_avatar,
                 u1.language AS user1_language,
                 u2.username AS user2_username,
                 u2.avatar_url AS user2_avatar,
                 u2.language AS user2_language
             FROM conversations c
                      JOIN users u1 ON c.user1 = u1.address
                      JOIN users u2 ON c.user2 = u2.address
             WHERE c.id = ? AND (c.user1 = ? OR c.user2 = ?)`,
            [conversationId, normalizedAddress, normalizedAddress],
            (err, row) => {
                if (err) {
                    console.error("数据库查询失败:", err);
                    return res.status(500).json({ error: "数据库查询失败" });
                }

                if (!row) {
                    return res.status(404).json({ error: "对话或用户未找到" });
                }

                // 确定当前用户和对方用户
                const isUser1 = row.user1 === normalizedAddress;
                const currentUser = {
                    address: isUser1 ? row.user1 : row.user2,
                    username: isUser1 ? row.user1_username : row.user2_username,
                    avatarUrl: isUser1 ? row.user1_avatar : row.user2_avatar,
                    language: isUser1 ? row.user1_language : row.user2_language
                };

                const otherUser = {
                    address: isUser1 ? row.user2 : row.user1,
                    username: isUser1 ? row.user2_username : row.user1_username,
                    avatarUrl: isUser1 ? row.user2_avatar : row.user1_avatar,
                    language: isUser1 ? row.user2_language : row.user1_language
                };

                res.json({
                    success: true,
                    currentUser,
                    otherUser,
                    conversationId
                });
            }
        );
    } catch (error) {
        console.error("获取用户信息失败:", error);
        res.status(500).json({ error: "服务器内部错误" });
    }
});

export default router;