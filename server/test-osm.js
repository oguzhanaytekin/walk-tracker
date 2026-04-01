const axios = require('axios');
const osmtogeojson = require('osmtogeojson');

async function testOSM() {
  const overpassQuery = `
    [out:json][timeout:60];
    area["name"="Etimesgut"]["admin_level"="8"]->.searchArea;
    (
      relation["admin_level"="10"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const geojson = osmtogeojson(response.data);
  console.log("Features count:", geojson.features.length);
  if (geojson.features.length > 0) {
    console.log("Sample feature:", JSON.stringify(geojson.features[0].geometry.type));
    console.log("Sample properties:", JSON.stringify(geojson.features[0].properties));
  } else {
    console.log("No features found. Check query.");
  }
}

testOSM();
