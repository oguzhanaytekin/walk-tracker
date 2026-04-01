require('dotenv').config();
const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to PostgreSQL!");
    
    // Enable PostGIS extension format
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log("PostGIS extension enabled.");
    
    const res = await client.query('SELECT PostGIS_Version();');
    console.log("PostGIS Version:", res.rows[0].postgis_version);
    
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await client.end();
  }
}
setupDatabase();
