
import mysql from "mysql2/promise";

console.log("Database configuration check:", {
  hostConfigured: Boolean(process.env.DB_HOST),
  portConfigured: Boolean(process.env.DB_PORT),
  userConfigured: Boolean(process.env.DB_USER),
  passwordConfigured: Boolean(process.env.DB_PASSWORD),
  databaseConfigured: Boolean(process.env.DB_NAME),
  hostHasProtocol: /^https?:\/\//i.test(process.env.DB_HOST || ""),
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
  .then((connection) => {
    console.log("✅ MySQL connection successful");
    connection.release();
  })
  .catch((error) => {
    console.error("❌ MySQL connection failed:", {
      code: error.code,
      message: error.message,
      address: error.address,
      port: error.port,
    });
  });

export default dbConnection;
