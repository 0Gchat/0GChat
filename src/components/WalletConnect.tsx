import { useState } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import "./WalletConnect.css";
declare global {
    interface Window {
        ethereum?: any;
    }
}

const WalletConnect = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState<boolean>(false);
    const navigate = useNavigate();


    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("请安装 MetaMask 以继续");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWalletAddress(address);
            localStorage.setItem("walletAddress", address); // 保存钱包地址到 localStorage
        } catch (error) {
            console.error("连接钱包失败:", error);
        }
    };

    const signMessage = async () => {
        if (!walletAddress) {
            alert("请先连接钱包");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const timestamp = Date.now();
            const message = `Please sign this message to verify ownership of ${walletAddress} at timestamp ${timestamp}`;
            const sig = await signer.signMessage(message);
            setSignature(sig);

            // 发送数据到后端
            const response = await fetch("http://localhost:5001/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raw_address: walletAddress, message, signature: sig }),
            });

            const data = await response.json();
            if (response.ok) {
                setIsRegistered(data.isRegistered); // 更新 isRegistered 状态
                alert(data.message);

                // 根据 isRegistered 跳转到不同页面
                if (data.isRegistered) {
                    navigate("/chat-list"); // 跳转到联系人列表页面
                } else {
                    navigate("/profile-edit", { state: { walletAddress } }); // 跳转到编辑页面
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("签名失败:", error);
        }
    };

    return (
        <div className="wallet-connect-container">
            <button className="wallet-btn" onClick={connectWallet}>连接钱包</button>
            {walletAddress && <p className="wallet-address">钱包地址: {walletAddress}</p>}
            {walletAddress && !isRegistered && <button className="wallet-btn sign-btn" onClick={signMessage}>签署消息</button>}
            {signature && <p className="signature">签名: {signature}</p>}
        </div>
    );
};


export default WalletConnect;