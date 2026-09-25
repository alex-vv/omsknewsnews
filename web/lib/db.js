import { parse } from "pg-connection-string";
import { Pool } from "pg";

const ca = process.env.DATABASE_CA_CERT;
const config = parse(process.env.DATABASE_URL);

if (ca) {
  config.ssl = { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true };
} else if (config.ssl === undefined) {
  config.ssl = false;
} else if (config.ssl !== false) {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);

export default pool;
