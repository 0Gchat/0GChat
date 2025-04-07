export interface Contact {
    address: string;
    username: string | null;
    createdAt: string;
    conversation_id: number;
}

export interface PrivateKeyDataType {
    [address: string]: string;
}

export interface Message {
    id: number;
    conversation_id: number;
    sender: string;
    sender_username?: string;
    text: string;
    status?: string; // 数据库有默认值
    timestamp: string;
    translations?: string | null; // 对应数据库TEXT字段
    isTranslation?: boolean; // 仅前端使用的标记
}


interface MessageType {
    [key: string]: string;
    timestep: string;
}

export interface ConversationMessages {
    [conversationId: string]: MessageType[];
}