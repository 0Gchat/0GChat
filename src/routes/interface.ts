// This file contains the TypeScript interfaces for the database rows.
export interface UserRow {
    address: string;
    username: string | null;
    avatar_url: string | null;
    language: string | null;
    created_at: string;
}

export interface ConversationRow {
    id: number;
    user1: string;
    user2: string;
}

export interface Message {
    id: number;
    sender: string;
    sender_username: string;
    text: string;
    conversation_id: string;
    timestamp: string;
}

export interface ConversationUserRow {
    user1: string;
    user2: string;
    user1_username: string | null;
    user1_avatar: string | null;
    user1_language: string | null;
    user2_username: string | null;
    user2_avatar: string | null;
    user2_language: string | null;
}

export interface ContactRow {
    contact: string;
    username: string | null;
    created_at: string;
    conversation_id: number;
}

export interface ConversationRow {
    id: number;
    user1: string;
    user2: string;
    created_at: string;
    user1_name: string;
    user2_name: string;
}

export interface AuthorizedTaskRow {
    conversation_id: number;
    is_active: number; // SQLite 使用 0/1 表示布尔值
    contact: string;
    username: string;
}

export interface MessageRow {
    sender: string;
    text: string;
    timestamp: string; // 或 Date，根据实际数据库存储类型
}