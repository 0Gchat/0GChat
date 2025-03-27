import React, { useState, useRef } from "react";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { BrowserProvider, ethers } from "ethers";

const Test = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null); // 新增余额状态
    const brokerRef = useRef<any>(null);

    const initializeBroker = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!window.ethereum) {
                throw new Error("请安装 MetaMask 或其他以太坊钱包!");
            }

            await window.ethereum.request({ method: "eth_requestAccounts" });
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            brokerRef.current = await createZGComputeNetworkBroker(signer);

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

            // 创建账户，初始余额设为0
            const tx = await brokerRef.current.ledger.addLedger(0.1);
            await tx.wait(); // 等待交易确认

            console.log("账户创建成功");
            // 创建成功后自动查询余额
            await query_balance();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    const query_balance = async () => {
        if (!brokerRef.current) {
            setError("请先初始化 Broker");
            return;
        }
        try {
            setLoading(true);
            const ledger = await brokerRef.current.ledger.getLedger();
            // 假设余额以wei为单位，转换为A0GI（18位小数）
            const balanceInA0GI = ethers.formatUnits(ledger.balance.toString(), 18);
            setBalance(balanceInA0GI);
            console.log("当前余额:", balanceInA0GI, "A0GI");
        } catch (err) {
            setError((err as Error).message);
            setBalance(null);
        } finally {
            setLoading(false);
        }
    };

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
                    onClick={query_balance}
                    disabled={loading || !brokerRef.current}
                    style={buttonStyle("#2196F3")}
                >
                    查询余额
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