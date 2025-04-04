import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import withWalletCheck from "../components/withWalletCheck";
import { Contact } from "../components/types";
import { Input } from 'antd';
const { Search } = Input;
import { Avatar, List } from 'antd';


interface DisplayContact {
    address: string;
    displayName: string;
    conversation_id: number;
}

const ChatList = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<DisplayContact[]>([]);
    const [newContactAddress, setNewContactAddress] = useState<string>("");

    // 获取当前用户地址
    const userAddress = localStorage.getItem("walletAddress");

    // 获取联系人列表
    useEffect(() => {
        if (!userAddress) {
            console.log("before request", userAddress);
            navigate("/");
            return;
        }

        fetch(`http://localhost:5001/contact/list?userAddress=${userAddress}`)
            .then((response) => response.json())
            .then((data: { contacts?: Contact[] }) => {
                if (data.contacts) {
                    const formattedContacts = data.contacts.map((contact) => ({
                        address: contact.address,
                        displayName: contact.username || contact.address,
                        conversation_id: contact.conversation_id
                    }));
                    setContacts(formattedContacts); // 添加这行来更新状态
                }
            })
            .catch((error) => {
                console.error("获取联系人列表失败:", error);
            });
    }, [userAddress, navigate]);

    // 添加联系人
    const handleAddContact = () => {
        if (!newContactAddress.trim()) {
            alert("请输入联系人地址");
            return;
        }

        fetch("http://localhost:5001/contact/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raw_address: userAddress, raw_contactAddress: newContactAddress }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message === "联系人添加成功") {
                    setContacts(prev => [
                        ...prev,
                        {
                            address: newContactAddress,
                            displayName: newContactAddress,
                            conversation_id: data.conversation_id // 使用服务器返回的ID
                        }
                    ]);
                }
            })
            .catch((error) => {
                console.error("添加联系人失败:", error);
            });
    };

    // 跳转到聊天页面
    const handleContactClick = (conversation_id: number) => {
        navigate(`/chat/${conversation_id}`, {
            state: {
                sessionKey: localStorage.getItem("walletAddress"), // 传递用户地址作为会话键
                conversationId: conversation_id // 也可以传递conversationId
            }
        });
    };

    return (
        <div className="chatListContainer">
            <h2>联系人列表</h2>
            <Search
                style={{ width: '400px', marginBottom: '20px' }}
                placeholder="输入联系人地址"
                allowClear
                enterButton="添加联系人"
                size="large"
                onChange={(e) => setNewContactAddress(e.target.value)}
                onSearch={handleAddContact}
            />
            {/* <div>
                <input
                    type="text"
                    value={newContactAddress}
                    onChange={(e) => setNewContactAddress(e.target.value)}
                    placeholder="输入联系人地址"
                />
                <button onClick={handleAddContact}>添加联系人</button>
            </div> */}
            {/* <ul>
                {contacts.map((contact) => (
                    <li
                        key={`${contact.address}-${contact.conversation_id}`} // 添加唯一key
                        onClick={() => handleContactClick(contact.conversation_id)}
                        style={{ cursor: 'pointer', padding: '8px' }}
                    >
                        {contact.displayName}
                    </li>
                ))}
            </ul> */}
              <List
                itemLayout="horizontal"
                dataSource={contacts}
                renderItem={(item, index) => (
                <List.Item onClick={() => handleContactClick(item.conversation_id)} style={{ cursor: 'pointer' }}>
                    <List.Item.Meta
                    style={{ display: 'flex', alignItems: 'center' }}
                    avatar={<Avatar style={{ backgroundColor: 'rgba(0, 110, 249, 0.5)' }}> {item.displayName.slice(0, 2)} </Avatar>}
                    title={<span style={{ margin: 0, color: '#fff', fontSize: '25px' }}>{item.displayName}</span>}
                    />
                </List.Item>
                )}
            />
        </div>
    );
};

export default withWalletCheck(ChatList);