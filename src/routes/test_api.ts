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
        const { content, headers, endpoint, model, conversationId, sender, originalText, userLanguage, providerAddress } = req.body;
        console.log("POST /proxy");

        // 3. 调用翻译API
        const apiResponse = await fetch(`${endpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
                messages: [{ role: "system", content }],
                model
            }),
        });


        // 4. 存储翻译结果
        const translationResult = await apiResponse.json();

        // await broker.inference.processResponse(providerAddress, apiResponse)


        console.log("translationResult: ", translationResult);
        const translatedText = translationResult.choices?.[0]?.message?.content || "";
        console.log("translatedText: ", translatedText);

        // const response = await fetch('http://8.210.39.6:3080/v1/proxy/settle-fee', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ providerAddress, content })
        // });

        await new Promise<void>((resolve, reject) => {
            db.run(
                `UPDATE messages SET translations = ? 
                 WHERE conversation_id = ? AND sender = ? AND text = ?`,
                [
                    JSON.stringify({
                        userLanguage: translatedText,
                        Original: originalText
                    }),
                    conversationId,
                    sender,
                    originalText
                ],
                (err) => err ? reject(err) : resolve()
            );
        });

        res.json({
            success: true,
            translatedText,
            targetLanguage: userLanguage,
            fee_text: apiResponse
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