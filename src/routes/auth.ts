import express, {Request, Response} from "express";
import {ethers} from "ethers";
import db from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";
// import {ZgFile, Indexer} from '@0glabs/0g-ts-sdk';
import {normalizeAddress} from './genernal'

const router = express.Router();

// 设置 multer 存储路径
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, {recursive: true});
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({storage});


// 注册路由
router.post("/register", async (req: Request, res: Response): Promise<void> => {
    const {raw_address, message, signature} = req.body;
    console.log("raw_address", raw_address);
    if (!raw_address) {
        res.status(400).json({ message: "地址不能为空" });
        return;
    }

    const address = normalizeAddress(raw_address)

    if (!message || !signature || !address) {
        res.status(400).json({message: "请签名"});
        return;
    }


    try {
        // 使用 ethers 验证签名
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            res.status(401).json({message: "签名验证失败"});
            return;
        }


        // 检查用户是否已经注册
        const stmt = db.prepare("SELECT * FROM users WHERE address = ?");
        stmt.get(address, (err, row) => {
            if (err) {
                console.error("查询失败:", err);
                return;
            }
            console.log("user:", row);
            const isRegistered = !!row; // 如果用户存在，isRegistered 为 true
            console.log("isRegistered:", isRegistered);

            // 如果用户未注册，则插入新用户

            if (!isRegistered) {
                const insertStmt = db.prepare(
                    "INSERT INTO users (address, created_at, updated_at) VALUES (?, ?, ?)"
                );
                insertStmt.run(address, new Date().toISOString(), new Date().toISOString());
            }

            console.log("user:", row);
            console.log("isRegistered:", isRegistered);


            // 返回结果
            res.json({
                message: isRegistered ? "用户已注册" : "注册成功",
                isRegistered, // 返回布尔值
            });
        });
    } catch (error) {
        console.error("验证失败:", error);
        res.status(500).json({message: "服务器错误"});
    }
});


// 更新用户信息路由
// 更新用户信息路由
router.post("/updateProfile", upload.single("avatar"), async (req: Request, res: Response) => {
    const { raw_address, username, language = 'en', message, signature } = req.body;
    const avatarFile = req.file;
    const address = normalizeAddress(raw_address);

    if (!address || !username) {
        res.status(400).json({ message: "请填写用户名" });
        return;
    }

    try {
        // 验证签名（如果有头像上传）
        if (message && signature && avatarFile) {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                res.status(401).json({ message: "签名验证失败" });
                return;
            }
        }

        // 构建更新数据
        const updateData: any = {
            username,
            language, // 添加语言字段
            updated_at: new Date().toISOString()
        };

        // 如果有头像，添加头像URL
        if (avatarFile) {
            updateData.avatar_url = `/uploads/${avatarFile.filename}`;
        }

        // 更新数据库
        const stmt = db.prepare(`
            UPDATE users
            SET username = ?,
                language = ?,
                ${avatarFile ? 'avatar_url = ?,' : ''}
                updated_at = ?
            WHERE address = ?
        `);

        const params = avatarFile
            ? [username, language, updateData.avatar_url, updateData.updated_at, address]
            : [username, language, updateData.updated_at, address];

        stmt.run(params, function (err: Error | null) {
            if (err) {
                console.error("更新用户信息失败:", err);
                res.status(500).json({ message: "更新用户信息失败" });
                return;
            }
            res.json({
                message: "个人信息更新成功",
                username,
                language,
                ...(avatarFile && { avatarUrl: updateData.avatar_url })
            });
        });
    } catch (error) {
        console.error("更新失败:", error);
        res.status(500).json({ message: "服务器错误" });
    }
});


export default router;