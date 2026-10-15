
import mysql from "mysql2/promise";

console.log("Database configuration check:", {
  hostConfigured: Boolean(process.env.DB_HOST),
  portConfigured: Boolean(process.env.DB_PORT),
  userConfigured: Boolean(process.env.DB_USER),
  passwordConfigured: Boolean(process.env.DB_PASSWORD),
  databaseConfigured: Boolean(process.env.DB_NAME),
});

const dbConnection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.CA_CERTIFICATE,
  },
  connectTimeout: 20000,
});

dbConnection
  .getConnection()
  .then(async (connection) => {
    console.log("✅ MySQL connection successful");

    const [rows] = await connection.query(`
      SELECT
        DATABASE() AS db,
        @@hostname AS server,
        @@port AS port
    `);

    console.log("🔎 Database diagnostic:", rows);

    const [tables] = await connection.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'conversations'
    `);

    console.log("🔎 Conversations table:", tables);

    connection.release();
  })
  .catch((error) => {
    console.error("❌ MySQL connection/diagnostic failed:", {
      code: error.code,
      message: error.message,
    });
  });

export default dbConnection;
