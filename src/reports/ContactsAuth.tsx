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

interface Conversation {
    id: number;
    created_at: string;
    partner: {
        address: string;
        username: string;
    };
}

const ContactsAuth: React.FC = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const walletAddress = localStorage.getItem("walletAddress");

    useEffect(() => {
        if (!walletAddress) {
            navigate("/");
            return;
        }

        fetchContacts();
    }, [walletAddress, navigate]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5001/contact/list?userAddress=${walletAddress}`);
            console.log(response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data);
            setContacts(data.contacts);
        } catch (error) {
            console.error("获取联系人失败:", error);
            message.error("获取联系人失败");
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleAuthorize = async () => {
        if (selectedIds.length === 0) {
            message.warning("请至少选择一个对话");
            return;
        }

        try {
            setAuthorizing(true);

            const results = await Promise.all(
                selectedIds.map(async id => {
                    const response = await fetch("http://localhost:5001/task/authorize", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            userAddress: walletAddress,
                            conversationId: id
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`授权失败: ${response.status}`);
                    }

                    return response.json();
                })
            );

            message.success("授权成功");
            setSelectedIds([]);
        } catch (error) {
            console.error("授权失败:", error);
            message.error("授权失败");
        } finally {
            setAuthorizing(false);
        }
    };

    if (!walletAddress) return null;

    const contactConversations = contacts.map(contact => ({
        id: contact.conversation_id,
        created_at: contact.createdAt,
        partner: {
            address: contact.address,
            username: contact.username
        }
    }));

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h2>授权对话用于日报生成</h2>
            <p>选择您希望授权用于生成工作日报的联系人对话</p>

            <Spin spinning={loading}>
                <List
                    itemLayout="horizontal"
                    dataSource={contactConversations}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Checkbox
                                    checked={selectedIds.includes(item.id)}
                                    onChange={() => handleSelect(item.id)}
                                />
                            ]}
                        >
                            <List.Item.Meta
                                title={`与 ${item.partner.username} 的对话`}
                                description={`创建时间: ${new Date(item.created_at).toLocaleString()}`}
                            />
                        </List.Item>
                    )}
                />
            </Spin>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
                <Button
                    type="primary"
                    onClick={handleAuthorize}
                    loading={authorizing}
                    disabled={selectedIds.length === 0}
                >
                    授权选中的对话
                </Button>
            </div>
        </div>
    );
};

export default withWalletCheck(ContactsAuth);