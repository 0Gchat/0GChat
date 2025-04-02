import React, { useState, useRef } from "react";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";
import privateKeyData from "./private_key.json";

const Test = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const brokerRef = useRef<any>(null);
    const providerAddress = '0xf07240Efa67755B5311bc75784a061eDB47165Dd';

    const initializeBroker = async () => {
        try {
            setLoading(true);
            setError(null);

            // 使用私钥直接初始化
            const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
            const wallet = new ethers.Wallet(privateKeyData.private_key, provider);
            brokerRef.current = await createZGComputeNetworkBroker(wallet);

            const serviceList = await brokerRef.current.inference.listService();

            setServices(serviceList);
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const create_account = async () => {
        if (!brokerRef.current) {
            setError("请先初始化 Broker");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            console.log("start create account");
            const tx = await brokerRef.current.ledger.addLedger(0.5, 40000000000);
            // await tx.wait();
            console.log("账户创建成功", tx );
            await query_balance();
            // console.log("账户创建成功", tx );
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const query_balance = async () => {
        if (!brokerRef.current) {
            setError("请先初始化 Broker");
            return;
        }
        try {
            setLoading(true);
            const ledger = await brokerRef.current.ledger.getLedger();
            console.log("Ledger 对象:", ledger); // 调试日志

            if (!ledger || ledger.balance === undefined) {
                throw new Error("账户未创建或余额不可用");
            }

            const balanceInA0GI = ethers.formatUnits(ledger.balance.toString(), 18);
            setBalance(balanceInA0GI);
            console.log("当前余额:", ledger, "A0GI");
        } catch (err) {
            setError((err as Error).message);
            setBalance(null);
        } finally {
            setLoading(false);
        }
    };

    const test_api = async () => {
        if (!brokerRef.current) {
            setError("请先初始化 Broker");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const content = "Please translate this text to English: 比特币今天的价格又在下跌，我觉得现在应该要抛售了！";
            const providerAddress = '0xf07240Efa67755B5311bc75784a061eDB47165Dd';

            const { endpoint, model } = await brokerRef.current.inference.getServiceMetadata(
                providerAddress
            );


            const headers = await brokerRef.current.inference.getRequestHeaders(
                providerAddress,
                content
            );
            console.log("start fetch api");
            console.log("endpoint ", endpoint);
            console.log("model ", model);
            console.log("content ", content);
            console.log("headers ", headers);
            // 2. 将 headers 和其他参数一起发送到你的后端代理
            const response = await fetch("http://localhost:5001/test/proxy", { // 替换为你的后端接口
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    endpoint,
                    model,
                    content,
                    headers,
                }),
            });

            const result = await response.json();
            console.log("API 响应:", result);
            return result;
        } catch (err) {
            setError("请求失败: " + (err as Error).message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const add_balance = async () => {
        if (!brokerRef.current) {
            setError("请先初始化 Broker");
            return;
        }
        const tx = await brokerRef.current.ledger.addLedger(0.5, 4000000000);
        console.log("tx: ", tx);

    }


    const mannual_settle = async (fee: number) => {
        console.log(fee)

        const response = await fetch("http://localhost:5001/test/settle-fee", { // 替换为你的后端接口
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                providerAddress,
                fee,
            }),
        });

        const result = await response.json();
        console.log("API 响应:", result);
    }

    return (
        <div style={{ padding: "20px" }}>
            <h2>0G Network 服务列表测试</h2>

            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <button
                    onClick={initializeBroker}
                    disabled={loading}
                    style={buttonStyle("#4CAF50")}
                >
                    {loading ? "加载中..." : "初始化Broker"}
                </button>

                <button
                    onClick={create_account}
                    disabled={loading || !brokerRef.current}
                    style={buttonStyle("#FF9800")}
                >
                    创建预付费账户
                </button>

                <button
                    onClick={add_balance}
                    disabled={loading || !brokerRef.current}
                    style={buttonStyle("#2196F3")}
                >
                    查询余额
                </button>

                <button
                    onClick={test_api}
                    disabled={loading || !brokerRef.current}
                    style={buttonStyle("#2196F3")}
                >
                    测试api
                </button>

                <button
                    onClick={() => mannual_settle(0.000000000000000009000000000000000644)}
                    disabled={loading || !brokerRef.current}
                    style={buttonStyle("#2196F3")}
                >
                    手动结算费用
                </button>

            </div>

            {error && (
                <div style={{ color: "red", margin: "10px 0" }}>{error}</div>
            )}

            {balance !== null && (
                <div style={{
                    padding: "10px",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                    margin: "10px 0"
                }}>
                    <strong>当前余额:</strong> {balance} A0GI
                </div>
            )}

            {services.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                    <h3>可用服务：</h3>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {services.map((service, index) => (
                            <li key={index} style={serviceItemStyle}>
                                <strong>模型:</strong> {service.model}<br />
                                <strong>提供商:</strong> {service.provider}<br />
                                <strong>类型:</strong> {service.serviceType}<br />
                                <strong>输入价格:</strong> {ethers.formatUnits(service.inputPrice.toString(), 18)} A0GI<br />
                                <strong>输出价格:</strong> {ethers.formatUnits(service.outputPrice.toString(), 18)} A0GI<br />
                                <strong>验证方式:</strong> {service.verifiability || "无"}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// 样式抽离
const buttonStyle = (color: string) => ({
    padding: "10px 15px",
    background: color,
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    minWidth: "150px"
});

const serviceItemStyle = {
    marginBottom: "15px",
    padding: "15px",
    background: "#f9f9f9",
    borderRadius: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
};

export default Test;