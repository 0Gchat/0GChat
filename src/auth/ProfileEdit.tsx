import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ethers } from "ethers";
import withWalletCheck from "../components/withWalletCheck";

const languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'Chinese', label: '中文' },
    { value: 'Japanese', label: '日本語' },
    { value: 'Korean', label: '한국어' },
    { value: 'Spanish', label: 'Español' },
    { value: 'French', label: 'Français' },
    { value: 'German', label: 'Deutsch' },
    { value: 'Italian', label: 'Italiano' },
    { value: 'Portuguese', label: 'Português' },
    { value: 'Russian', label: 'Русский' },
    { value: 'Arabic', label: 'العربية' },
    { value: 'Hindi', label: 'हिन्दी' },
    { value: 'Bengali', label: 'বাংলা' },
    { value: 'Turkish', label: 'Türkçe' },
    { value: 'Dutch', label: 'Nederlands' },
    { value: 'Greek', label: 'Ελληνικά' },
    { value: 'Hebrew', label: 'עברית' },
    { value: 'Thai', label: 'ไทย' },
    { value: 'Vietnamese', label: 'Tiếng Việt' },
    { value: 'Swedish', label: 'Svenska' },
    { value: 'Polish', label: 'Polski' },
    { value: 'Czech', label: 'Čeština' },
    { value: 'Hungarian', label: 'Magyar' },
    { value: 'Finnish', label: 'Suomi' },
    { value: 'Danish', label: 'Dansk' },
    { value: 'Norwegian', label: 'Norsk' },
    { value: 'Malay', label: 'Bahasa Melayu' },
    { value: 'Indonesian', label: 'Bahasa Indonesia' },
    { value: 'Filipino', label: 'Filipino' },
    { value: 'Ukrainian', label: 'Українська' },
    { value: 'Romanian', label: 'Română' },
    { value: 'Serbian', label: 'Српски' },
    { value: 'Croatian', label: 'Hrvatski' },
    { value: 'Slovak', label: 'Slovenčina' },
    { value: 'Bulgarian', label: 'Български' },
    { value: 'Persian', label: 'فارسی' },
    { value: 'Urdu', label: 'اردو' },
    { value: 'Tamil', label: 'தமிழ்' },
    { value: 'Telugu', label: 'తెలుగు' },
    { value: 'Marathi', label: 'मराठी' },
    { value: 'Gujarati', label: 'ગુજરાતી' },
    { value: 'Swahili', label: 'Kiswahili' },
    { value: 'Afrikaans', label: 'Afrikaans' },
    { value: 'Hausa', label: 'Hausa' },
    { value: 'Yoruba', label: 'Yorùbá' },
    { value: 'Zulu', label: 'isiZulu' },
    { value: 'Malayalam', label: 'മലയാളം' },
    { value: 'Burmese', label: 'မြန်မာစာ' },
    { value: 'Mongolian', label: 'Монгол' }
];

const ProfileEdit = () => {
    const location = useLocation();
    const { walletAddress } = location.state || { walletAddress: null };

    const [username, setUsername] = useState<string>("");
    const [language, setLanguage] = useState<string>("en"); // 默认英语
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
        formData.append("language", language); // 添加语言参数

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
            setUploading(true);
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
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2>编辑个人信息</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>用户名:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>偏好语言:</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ width: '100%', padding: '8px' }}
                    >
                        {languageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>头像:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={uploading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {uploading ? "上传中..." : "提交"}
                </button>
            </form>
        </div>
    );
};

export default withWalletCheck(ProfileEdit);