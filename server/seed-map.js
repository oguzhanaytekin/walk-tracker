require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');

async function seedMap() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL for Seeding.");

    // Clear existing neighborhoods
    await client.query('DELETE FROM neighborhoods;');
    console.log("Cleared existing neighborhoods.");

    console.log("Fetching data from Overpass API for Etimesgut...");
    // Overpass query for Etimesgut (admin_level=8) neighborhoods (admin_level=10)
    const overpassQuery = `
      [out:json][timeout:60];
      relation["name"="Etimesgut"]["admin_level"="8"];
      out body;
      >;
      out skel qt;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 60000
    });

    console.log("Converting OSM data to GeoJSON...");
    const geojson = osmtogeojson(response.data);

    let count = 0;
    // Insert into database
    for (const feature of geojson.features) {
      // Filter out points/linestrings, we only want Polygons/MultiPolygons
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const name = feature.properties.name || "Bilinmeyen Mahalle";
        const district = "Etimesgut";
        
        // MultiPolygon cast for PostGIS
        const geomType = feature.geometry.type;
        let geometryData = feature.geometry;
        if (geomType === 'Polygon') {
          // Wrap in MultiPolygon array
          geometryData = {
            type: 'MultiPolygon',
            coordinates: [geometryData.coordinates]
          };
        }

        const geojsonStr = JSON.stringify(geometryData);

        const query = `
          INSERT INTO neighborhoods (name, district, geom, area_sqm)
          VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography))
          RETURNING id;
        `;
        
        await client.query(query, [name, district, geojsonStr]);
        count++;
      }
    }

    console.log(`✅ Successfully inserted ${count} neighborhoods!`);

  } catch (err) {
    console.error("Error seeding map:", err.message);
  } finally {
    await client.end();
  }
}

seedMap();
