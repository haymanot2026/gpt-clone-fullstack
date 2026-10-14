import mysql from "mysql2/promise";

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
  },
  connectTimeout: 20000,
});

dbConnection.getConnection()
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