import { parse } from "pg-connection-string";
import { Pool } from "pg";

const ca = process.env.DATABASE_CA_CERT;
const config = parse(process.env.DATABASE_URL);
config.ssl = ca
  ? { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true }
  : { rejectUnauthorized: false };

const pool = new Pool(config);

export default pool;
