import sql from "mssql";
import { initDb } from "./db-init";

const config: sql.config = {
  server: process.env.DB_SERVER ?? "localhost",
  port: Number(process.env.DB_PORT ?? 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "PetruzTasks",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
};

// Em dev o Next recarrega módulos a cada alteração; o pool fica no escopo
// global para não abrir uma conexão nova por reload.
declare global {
  // eslint-disable-next-line no-var
  var _mssqlPool: Promise<sql.ConnectionPool> | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!global._mssqlPool) {
    global._mssqlPool = new sql.ConnectionPool(config)
      .connect()
      .then(async (pool) => {
        await initDb(pool);
        return pool;
      })
      .catch((err) => {
        global._mssqlPool = undefined;
        throw err;
      });
  }
  return global._mssqlPool;
}

export { sql };
