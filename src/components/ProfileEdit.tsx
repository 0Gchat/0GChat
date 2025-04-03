import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ethers } from "ethers";
import withWalletCheck from "./withWalletCheck";
import "./ProfileEdit.css";
import { Upload, message } from "antd";
import type {
  UploadChangeParam,
  UploadFile,
  UploadProps,
} from "antd/es/upload";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { Form, Input, Select } from "antd";
const languageOptions = [
  { value: "English", label: "English" },
  { value: "Chinese", label: "中文" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Italian", label: "Italiano" },
  { value: "Portuguese", label: "Português" },
  { value: "Russian", label: "Русский" },
  { value: "Arabic", label: "العربية" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Turkish", label: "Türkçe" },
  { value: "Dutch", label: "Nederlands" },
  { value: "Greek", label: "Ελληνικά" },
  { value: "Hebrew", label: "עברית" },
  { value: "Thai", label: "ไทย" },
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "Swedish", label: "Svenska" },
  { value: "Polish", label: "Polski" },
  { value: "Czech", label: "Čeština" },
  { value: "Hungarian", label: "Magyar" },
  { value: "Finnish", label: "Suomi" },
  { value: "Danish", label: "Dansk" },
  { value: "Norwegian", label: "Norsk" },
  { value: "Malay", label: "Bahasa Melayu" },
  { value: "Indonesian", label: "Bahasa Indonesia" },
  { value: "Filipino", label: "Filipino" },
  { value: "Ukrainian", label: "Українська" },
  { value: "Romanian", label: "Română" },
  { value: "Serbian", label: "Српски" },
  { value: "Croatian", label: "Hrvatski" },
  { value: "Slovak", label: "Slovenčina" },
  { value: "Bulgarian", label: "Български" },
  { value: "Persian", label: "فارسی" },
  { value: "Urdu", label: "اردو" },
  { value: "Tamil", label: "தமிழ்" },
  { value: "Telugu", label: "తెలుగు" },
  { value: "Marathi", label: "मराठी" },
  { value: "Gujarati", label: "ગુજરાતી" },
  { value: "Swahili", label: "Kiswahili" },
  { value: "Afrikaans", label: "Afrikaans" },
  { value: "Hausa", label: "Hausa" },
  { value: "Yoruba", label: "Yorùbá" },
  { value: "Zulu", label: "isiZulu" },
  { value: "Malayalam", label: "മലയാളം" },
  { value: "Burmese", label: "မြန်မာစာ" },
  { value: "Mongolian", label: "Монгол" },
];

const ProfileEdit = () => {
  const location = useLocation();
  const { walletAddress } = location.state || { walletAddress: null };

  const [username, setUsername] = useState<string>("");
  const [language, setLanguage] = useState<string>("en"); // 默认英语
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

    if (avatarFile) {
      const timestamp = Date.now();
      const message = `Please sign this message to verify ownership of ${walletAddress} at timestamp ${timestamp}`;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      formData.append("signature", signature);
      formData.append("message", message);
      formData.append("avatar", avatarFile);
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

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("只能上传JPG/PNG格式的图片!");
    }
    const isLt2M = file.size / 1024 / 1024 < 10;
    if (!isLt2M) {
      message.error("图片必须小于10MB!");
    }
    return false; // 返回false阻止自动上传
  };

  const handleChange: UploadProps["onChange"] = (
    info: UploadChangeParam<UploadFile>
  ) => {
    if (info.file.status === "uploading") {
      return;
    }
    console.log(info, "info---");

    const file = info.file as any;
    setAvatarFile(file);

    // 创建本地预览URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
  };

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  return (
    <div className="profile-edit-container">
      <h2 className="profile-edit-form-title">个人信息</h2>
      <div className="profile-edit-form">
        <Form onFinish={handleSubmit} labelWrap layout="vertical">
          <div className="profile-edit-form-item">
            {/* <label style={{ display: 'block', marginBottom: '4px' }}>用户名:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    /> */}
            <Form.Item
              label="用户名"
              name="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Item>
          </div>
          <div className="profile-edit-form-item">
            {/* <label style={{ display: "block", marginBottom: "4px" }}>
              偏好语言:
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select> */}
            <Form.Item
              label="偏好语言"
              name="偏好语言"
              rules={[{ required: true, message: "请选择偏好语言" }]}
            >
              <Select
                placeholder="请选择偏好语言"
                value={language}
                onChange={(value) => setLanguage(value)}
              >
                {languageOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div className="profile-edit-form-item">
            {/* <label style={{ display: "block", marginBottom: "4px" }}>
              头像:
            </label> */}
            <Form.Item label="头像" name="头像" rules={[{ required: true, message: "请上传头像" }]}>
              <Upload
                name="avatar"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handleChange}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ width: "100%" }} />
                ) : (
                  uploadButton
                )}
              </Upload>
            </Form.Item>
          </div>
          <button
            type="submit"
            disabled={uploading}
            style={{
              padding: "10px 50px",
              backgroundColor: "#0d6efa",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            {uploading ? "上传中..." : "提交"}
          </button>
        </Form>
      </div>
    </div>
  );
};

export default withWalletCheck(ProfileEdit);
