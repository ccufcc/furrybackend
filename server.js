require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const PROPERTY_ID = process.env.PROPERTY_ID;

let cache = {
  total: 0,
  byCountry: {},   // { "United States": 42, "Taiwan": 18, ... }
  lastUpdated: 0
};

async function getAccessToken() {
  const { data } = await axios.post("https://oauth2.googleapis.com/token", null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    },
  });
  return data.access_token;
}

async function fetchRealtime() {
  try {
    const token = await getAccessToken();
    // One realtime call: activeUsers by country
    const { data } = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`,
      {
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rows = Array.isArray(data.rows) ? data.rows : [];
    const byCountry = {};
    let total = 0;

    for (const r of rows) {
      const country = r.dimensionValues?.[0]?.value || "Unknown";
      const val = parseInt(r.metricValues?.[0]?.value || "0", 10);
      if (val > 0) {
        byCountry[country] = (byCountry[country] || 0) + val;
        total += val;
      }
    }

    cache.total = total;
    cache.byCountry = byCountry;
    cache.lastUpdated = Date.now();
  } catch (e) {
    console.error("Realtime fetch error:", e.response?.data || e.message);
  }
}

// poll
setInterval(fetchRealtime, 60000);
fetchRealtime();

// EDIT 2: shape output with site key
app.get('/active-users', (req, res) => {
  res.json({
    "https://perchance.org/ai-furry-generator": cache.total,
    lastUpdated: cache.lastUpdated
  });
});

// NEW for Edit 1: country stats
app.get('/country-stats', (req, res) => {
  res.json({
    lastUpdated: cache.lastUpdated,
    countries: cache.byCountry
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
