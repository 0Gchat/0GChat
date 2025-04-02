import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WalletConnect from "./components/WalletConnect";
import ProfileEdit from "./components/ProfileEdit";
import ChatList from "./components/ChatList";
import ChatPage from "./components/ChatPage";
import Test from "./components/test";
import "./App.css";

function App() {
    return (
        <Router>
            <div>
                <h1>钱包连接 & 签名验证</h1>
                <Routes>
                    <Route path="/" element={<WalletConnect />} />
                    <Route path="/profile-edit" element={<ProfileEdit />} />
                    <Route path="/chat-list" element={<ChatList />} />
                    <Route path="/chat/:conversationId" element={<ChatPage />} />
                    <Route path="/test" element={<Test />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;