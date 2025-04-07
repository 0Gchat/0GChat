import express from "express";
import fetch from "node-fetch";
import db from "../db"; // 假设这是你的数据库连接模块
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";



const router = express.Router();

/**
 * POST /api/proxy
 * 代理转发到 0G API 服务并存储翻译结果
 */
router.post("/proxy", async (req, res) => {
    try {
        const { content, headers, endpoint, model, conversationId, sender, originalText, userLanguage } = req.body;

        // 调用翻译API
        const apiResponse = await fetch(`${endpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
                messages: [{ role: "system", content }],
                model
            }),
        });

        const translationResult = await apiResponse.json();
        const translatedText = translationResult.choices?.[0]?.message?.content || "";
        const chatID = translationResult.id;

        // 返回翻译结果
        res.json({
            success: true,
            translatedText,
            targetLanguage: userLanguage,
            fee_text: translatedText,
            chatID: chatID
        });

    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});



router.post("/settle-fee", async (req, res) => {
    try {
        console.log("POST /settle-fee");
        const { providerAddress, fee } = req.body;
        const privateKeyData = require("./private_key.json");
        const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
        const wallet = new ethers.Wallet(privateKeyData.private_key, provider);
        const broker = await createZGComputeNetworkBroker(wallet);
        await broker.inference.settleFee(providerAddress, fee);
        res.json({
            success: true
        });
    } catch (err) {
        console.log("请求失败: " + (err as Error).message);
        throw err;
    }
});


export default router;