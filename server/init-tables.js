require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        team_color VARCHAR(20) DEFAULT 'GRAY', -- RED, BLUE, GREEN
        total_distance_km FLOAT DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("-> users table created/verified.");

    // Create neighborhoods table (GeoSpatial)
    await client.query(`
      CREATE TABLE IF NOT EXISTS neighborhoods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        geom GEOMETRY(MultiPolygon, 4326),
        area_sqm FLOAT NOT NULL DEFAULT 0.0,
        owner_team VARCHAR(20) DEFAULT 'GRAY',
        score_red FLOAT DEFAULT 0.0,
        score_blue FLOAT DEFAULT 0.0,
        score_green FLOAT DEFAULT 0.0
      );
      
      -- Create spatial index for fast querying
      CREATE INDEX IF NOT EXISTS neighborhoods_geom_idx ON neighborhoods USING GIST (geom);
    `);
    console.log("-> neighborhoods table and spatial index created/verified.");

    // Create walk_logs table (GeoSpatial)
    await client.query(`
      CREATE TABLE IF NOT EXISTS walk_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        geom GEOMETRY(Point, 4326),
        speed_kmh FLOAT DEFAULT 0.0,
        is_valid BOOLEAN DEFAULT TRUE, -- AI/Cheat flag
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS walk_logs_geom_idx ON walk_logs USING GIST (geom);
    `);
    console.log("-> walk_logs table and spatial index created/verified.");

    console.log("✅ All PostGIS Gamification tables are successfully initialized!");
    
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    await client.end();
  }
}
createTables();
