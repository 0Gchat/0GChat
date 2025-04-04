import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import WalletConnect from "./auth/WalletConnect";
import ProfileEdit from "./auth/ProfileEdit";
import ChatList from "./chat/ChatList";
import ChatPage from "./chat/ChatPage";
import Test from "./components/test";
import Layout from "./components/Layout";
import "./App.css";
import ContactsAuth from "./reports/ContactsAuth";
import ReportsDetails from "./reports/ReportsDetails";


function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<WalletConnect />} />
          <Route path="/profile-edit" element={<ProfileEdit />} />
          <Route path="/chat-list" element={<ChatList />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/test" element={<Test />} />
          <Route path="/contacts-auth" element={<ContactsAuth />} />
          <Route path="/reportsdetails" element={<ReportsDetails />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
