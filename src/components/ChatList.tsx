import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import withWalletCheck from "./withWalletCheck";
import { Contact } from "./types";

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
        console.log(conversation_id);
        navigate(`/chat/${conversation_id}`);
    };

    return (
        <div>
            <h2>联系人列表</h2>
            <div>
                <input
                    type="text"
                    value={newContactAddress}
                    onChange={(e) => setNewContactAddress(e.target.value)}
                    placeholder="输入联系人地址"
                />
                <button onClick={handleAddContact}>添加联系人</button>
            </div>
            <ul>
                {contacts.map((contact) => (
                    <li
                        key={`${contact.address}-${contact.conversation_id}`} // 添加唯一key
                        onClick={() => handleContactClick(contact.conversation_id)}
                        style={{ cursor: 'pointer', padding: '8px' }}
                    >
                        {contact.displayName}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default withWalletCheck(ChatList);