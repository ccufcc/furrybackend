require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const PROPERTY_ID = process.env.PROPERTY_ID;

async function getAccessToken() {
    try {
        console.log("Requesting new access token...");
        const response = await axios.post("https://oauth2.googleapis.com/token", null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: REFRESH_TOKEN,
                grant_type: "refresh_token",
            },
        });

        console.log("Access token received:", response.data.access_token ? "SUCCESS" : "FAILED");
        return response.data.access_token;
    } catch (error) {
        console.error("Failed to get access token:", error.response?.data || error.message);
        throw error;
    }
}

app.get('/active-users', async (req, res) => {
    try {
        console.log("Fetching active users from Google Analytics...");
        const accessToken = await getAccessToken();
        const response = await axios.post(
            `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`,
            { metrics: [{ name: "activeUsers" }] },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log("API Response:", response.data);

        const activeUsers = response.data.rows?.[0]?.metricValues?.[0]?.value || "0";
        res.json({ activeUsers });
    } catch (error) {
        console.error("Error fetching active users:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch active users" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
