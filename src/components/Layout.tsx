import React, { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Layout.css";
import logoImg from "../assets/logo.png";

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const walletAddress = localStorage.getItem("walletAddress");

  return (
    <div className="app-container">
      <div className="sidebar">
        <img className="logo-image" src={logoImg} alt="logo" />
        <div className="category">文字频道</div>
        <div
          className={`channel-item ${
            location.pathname === "/chat-list" ? "active" : ""
          }`}
          onClick={() => navigate("/chat-list")}
        >
          # 聊天列表
        </div>
        <div
          className={`channel-item ${
            location.pathname === "/profile-edit" ? "active" : ""
          }`}
          onClick={() => navigate("/profile-edit")}
        >
          # 个人资料
        </div>
        <div
          className={`channel-item ${
            location.pathname === "/reportsdetails" ? "active" : ""
          }`}
          onClick={() => navigate("/reportsdetails")}
        >
          # 日报
        </div>

        <div className="category">加密功能</div>
        <div
          className={`channel-item ${
            location.pathname === "/test" ? "active" : ""
          }`}
          onClick={() => navigate("/test")}
        >
          # 钱包连接
        </div>

        {walletAddress && (
          <div className="user-info">
            <div className="avatar">{walletAddress.slice(0, 2)}</div>
            <div className="user-address">
              {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
            </div>
          </div>
        )}
      </div>
      <div className="main-content">{children}</div>
    </div>
  );
};

export default Layout;
