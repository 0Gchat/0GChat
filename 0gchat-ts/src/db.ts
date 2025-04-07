import { Database } from "sqlite3";

const db = new Database("database.sqlite", (err: Error | null) => {
    if (err) {
        console.error("数据库连接失败:", err);
    } else {
        console.log("数据库连接成功！");
    }
});

export default db;