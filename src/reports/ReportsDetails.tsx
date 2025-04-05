import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, List, Card, Spin, message, DatePicker, Space, Modal } from "antd"; // 添加了Modal
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import withWalletCheck from "../components/withWalletCheck";
import privateKeyData from "../assets/private_key.json";
import { UserRow } from "../components/interface";
import dayjs from "dayjs";
import ReactMarkdown from 'react-markdown'; // 添加Markdown渲染组件
import {PrivateKeyDataType, ConversationMessages} from "../components/types";



const { RangePicker } = DatePicker;


const ReportsDetails: React.FC = () => {
    const navigate = useNavigate();
    const [conversationMessages, setConversationMessages] = useState<ConversationMessages>({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [broker, setBroker] = useState<any>(null);
    const [userInfo, setUserInfo] = useState<UserRow | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'), // 默认选择最近一周
        dayjs()
    ]);
    const [reportVisible, setReportVisible] = useState(false); // 控制弹窗显示
    const [reportContent, setReportContent] = useState(""); // 存储报告内容
    const userAddress = localStorage.getItem("walletAddress");

    // 禁用今天之后的日期
    const disabledDate = (current: dayjs.Dayjs) => {
        return current && current > dayjs().endOf('day');
    };

    const fetchUserInfo = async () => {
        try {
            const response = await fetch("http://localhost:5001/auth/userInfo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: userAddress }),
            });

            if (!response.ok) throw new Error("获取用户信息失败");
            const data = await response.json();
            setUserInfo(data.userInfo);
        } catch (error) {
            console.error("获取用户信息失败:", error);
        }
    };

    useEffect(() => {
        if (!userAddress) {
            navigate("/");
            return;
        }
        fetchUserInfo();
        fetchAuthorizedConversations();
    }, [userAddress, navigate]);

    const initBroker = async () => {
        try {
            if (!userAddress) {
                throw new Error("未找到用户钱包地址");
            }
            const keys = privateKeyData as PrivateKeyDataType;
            const privateKey = keys[userAddress.toLowerCase()];

            const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
            const wallet = new ethers.Wallet(privateKey, provider);
            const brokerInstance = await createZGComputeNetworkBroker(wallet);
            console.log("正在初始化 0g broker...");
            setBroker(brokerInstance);
        } catch (error) {
            console.error("初始化 0g broker 失败:", error);
            message.error("初始化服务失败");
        }
    };

    const fetchAuthorizedConversations = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5001/task/authorized?userAddress=${userAddress}&isActive=0`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const { conversations } = await response.json();
            await fetchMessagesForConversations(conversations, dateRange[0].format('YYYY-MM-DDTHH:mm:ss'));
        } catch (error) {
            console.error("获取授权对话失败:", error);
            message.error("获取授权对话失败");
        } finally {
            setLoading(false);
        }
    };

    const fetchMessagesForConversations = async (conversationIds: number[], start_time: string) => {
        try {
            const messagesData: ConversationMessages = {};

            await Promise.all(conversationIds.map(async (id) => {
                const response = await fetch(
                    `http://localhost:5001/message/history?conversationId=${id}&start_time=${encodeURIComponent(start_time)}`
                );

                if (!response.ok) throw new Error(`获取对话 ${id} 消息失败`);

                const { messages } = await response.json();
                messagesData[id] = messages.map((msg: any) => ({
                    [msg.sender]: msg.text,
                    timestep: msg.timestamp
                }));
            }));

            setConversationMessages(messagesData);
        } catch (error) {
            console.error("获取消息失败:", error);
            message.error("获取消息失败");
        }
    };

    const handleDateChange = (dates: any, dateStrings: [string, string]) => {
        if (dates) {
            setDateRange(dates);
            // 当日期变化时重新获取数据
            fetchAuthorizedConversations();
        }
    };

    const generateDailyReport = async () => {
        if (!broker || !userAddress || !userInfo) {
            message.warning("请先初始化服务");
            return;
        }

        console.log("正在生成日报...")

        try {
            setGenerating(true);
            const content = `Based on the following conversation history, generate a detailed daily work report for user ${userAddress} with no other comments:

            ${JSON.stringify(conversationMessages, null, 2)}
            
            Requirements:
            1. Sort the tasks by priority  
            2. Specify the deadline for each task  
            3. Identify the deliverable owner for each task  
            4. Output in ${userInfo.language}`;

            const providerAddress = "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3";
            const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
            const headers = await broker.inference.getRequestHeaders(providerAddress, content);

            const apiResponse = await fetch(`${endpoint}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    messages: [{ role: "system", content }],
                    model
                }),
            });

            const result = await apiResponse.json();
            const reportText = result.choices?.[0]?.message?.content || "";
            const chatID = result.id;

            console.log("生成结果:", reportText);
            message.success("日报生成成功");

            // 设置报告内容并显示弹窗
            setReportContent(reportText);
            setReportVisible(true);

            await broker.inference.processResponse(providerAddress, reportText, chatID);

        } catch (error) {
            console.error("生成日报失败:", error);
            message.error("生成日报失败");
        } finally {
            setGenerating(false);
        }
    };

    const ReportModal = () => (
        <Modal
            title="工作日报"
            visible={reportVisible}
            onCancel={() => setReportVisible(false)}
            footer={null}
            width="80%"
            style={{ top: 20 }}
        >
            <div style={{
                maxHeight: "70vh",
                overflow: "auto",
                padding: "0 10px",
                border: "1px solid #f0f0f0",
                borderRadius: "4px"
            }}>
                <ReactMarkdown>{reportContent}</ReactMarkdown>
            </div>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
                <Button type="primary" onClick={() => setReportVisible(false)}>
                    关闭
                </Button>
            </div>
        </Modal>
    );


    if (!userAddress) return null;

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            <h2>工作日报生成</h2>
            <p>基于您授权的对话记录生成日报</p>

            <Space direction="vertical" style={{ marginBottom: 20 }}>
                <RangePicker
                    showTime={{ format: 'HH:mm' }}
                    format="YYYY-MM-DD HH:mm"
                    disabledDate={disabledDate}
                    value={dateRange}
                    onChange={handleDateChange}
                    ranges={{
                        '今天': [dayjs().startOf('day'), dayjs()],
                        '最近3天': [dayjs().subtract(3, 'day'), dayjs()],
                        '最近一周': [dayjs().subtract(7, 'day'), dayjs()],
                    }}
                />
            </Space>

            <Spin spinning={loading}>
                <div style={{ marginBottom: "20px" }}>
                    <Button
                        type="primary"
                        onClick={initBroker}
                        style={{ marginRight: "10px" }}
                    >
                        初始化0G服务
                    </Button>
                    <Button
                        type="primary"
                        onClick={generateDailyReport}
                        loading={generating}
                        disabled={!broker || Object.keys(conversationMessages).length === 0}
                    >
                        生成日报
                    </Button>
                </div>

                {Object.entries(conversationMessages).map(([conversationId, messages]) => (
                    <Card
                        key={conversationId}
                        title={`对话 ID: ${conversationId}`}
                        style={{ marginBottom: "20px" }}
                    >
                        <List
                            dataSource={messages}
                            renderItem={(message, index) => {
                                const sender = Object.keys(message).find(key => key !== "timestep") || "unknown";
                                return (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={`${sender} (${message.timestep})`}
                                            description={message[sender]}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </Card>
                ))}
            </Spin>
            <ReportModal />
        </div>
    );
};

export default withWalletCheck(ReportsDetails);