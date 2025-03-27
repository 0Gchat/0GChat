import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ethers } from "ethers";
import withWalletCheck from "./withWalletCheck";
// import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";

// const RPC_URL = "https://evmrpc-testnet.0g.ai/";
// const INDEXER_RPC = "https://indexer-storage-testnet-standard.0g.ai/";

const ProfileEdit = () => {
    const location = useLocation();
    const { walletAddress } = location.state || { walletAddress: null };

    const [username, setUsername] = useState<string>("");
    const [avatar, setAvatar] = useState<File | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username) {
            alert("请填写用户名");
            return;
        }

        const formData = new FormData();

        formData.append("raw_address", walletAddress);
        formData.append("username", username);

        if (avatar) {
            const timestamp = Date.now();
            const message = `Please sign this message to verify ownership of ${walletAddress} at timestamp ${timestamp}`;
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(message);
            formData.append("signature", signature);
            formData.append("message", message);
            formData.append("avatar", avatar);
        }

        try {
            const response = await fetch("http://localhost:5001/auth/updateProfile", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                alert("个人信息更新成功！");
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("更新失败:", error);
            alert("更新失败，请重试");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <h2>编辑个人信息</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>用户名:</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                    <label>头像:</label>
                    <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
                </div>
                <button type="submit" disabled={uploading}>
                    {uploading ? "上传中..." : "提交"}
                </button>
            </form>
        </div>
    );
};

export default withWalletCheck(ProfileEdit);