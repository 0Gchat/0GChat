import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { List, Button, message, Spin, Checkbox } from "antd";
import withWalletCheck from "../components/withWalletCheck";

interface Contact {
    address: string;
    username: string;
    createdAt: string;
    conversation_id: number;
}

interface AuthorizedTask {
    conversationId: number;
    isActive: boolean;
}

const ContactsAuth: React.FC = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [authorizedTasks, setAuthorizedTasks] = useState<AuthorizedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const walletAddress = localStorage.getItem("walletAddress");

    useEffect(() => {
        if (!walletAddress) {
            navigate("/");
            return;
        }

        fetchData();
    }, [walletAddress, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 获取联系人列表
            const contactsResponse = await fetch(`http://localhost:5001/contact/list?userAddress=${walletAddress}`);
            if (!contactsResponse.ok) throw new Error("获取联系人失败");
            const contactsData = await contactsResponse.json();

            // 获取授权信息
            const authResponse = await fetch(`http://localhost:5001/contact/authorized-list?userAddress=${walletAddress}`);
            if (!authResponse.ok) throw new Error("获取授权信息失败");
            const authData = await authResponse.json();

            setContacts(contactsData.contacts);
            setAuthorizedTasks(authData.authorizedTasks);
        } catch (error) {
            console.error("获取数据失败:", error);
            message.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    };

    const isChecked = (conversationId: number) => {
        const task = authorizedTasks.find(t => t.conversationId === conversationId);
        return task ? task.isActive : false;
    };

    const handleAuthorize = async (conversationId: number, isActive: boolean) => {
        try {
            const response = await fetch("http://localhost:5001/task/authorize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userAddress: walletAddress,
                    conversationId,
                    isActive
                })
            });

            if (!response.ok) {
                throw new Error(`授权失败: ${response.status}`);
            }

            // 更新本地状态
            setAuthorizedTasks(prev => {
                const existing = prev.find(t => t.conversationId === conversationId);
                if (existing) {
                    return prev.map(t =>
                        t.conversationId === conversationId
                            ? { ...t, isActive }
                            : t
                    );
                }
                return [...prev, { conversationId, isActive }];
            });

            message.success("授权状态更新成功");
        } catch (error) {
            console.error("授权失败:", error);
            message.error("授权失败");
        }
    };

    if (!walletAddress) return null;

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h2>授权对话用于日报生成</h2>
            <p>选择您希望授权用于生成工作日报的联系人对话</p>

            <Spin spinning={loading}>
                <List
                    itemLayout="horizontal"
                    dataSource={contacts}
                    renderItem={contact => (
                        <List.Item
                            actions={[
                                <Checkbox
                                    checked={isChecked(contact.conversation_id)}
                                    onChange={e => handleAuthorize(contact.conversation_id, e.target.checked)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                title={`与 ${contact.username} 的对话`}
                                description={`创建时间: ${new Date(contact.createdAt).toLocaleString()}`}
                            />
                        </List.Item>
                    )}
                />
            </Spin>
        </div>
    );
};

export default withWalletCheck(ContactsAuth);