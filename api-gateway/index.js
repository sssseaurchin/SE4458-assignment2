import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./se-4458-assignment-2-firebase-adminsdk-fbsvc-456b0d2521.json', 'utf8'));

const app = express();
app.use(cors());
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

let jwtToken = null;

async function loginAndGetToken() {
    try {
        const response = await axios.post(`${process.env.SPRING_API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123',
        });

        jwtToken = response.data.token;
        console.log('Logged in and obtained token.');
    } catch (err) {
        console.error('Failed to login and get JWT token:', err.message || err);
    }
}


app.post('/chat', async (req, res) => {
    const { message } = req.body;
    console.log('Received message from user:', message);

    try {
        console.log('Sending request to AI service...');

        const prompt = `You are a strict API command parser. The user says: "${message}"

Your job is to return ONLY a valid JSON object with this structure:

{
  "intent": "queryBill" | "queryBillDetailed" | "makePayment",
  "parameters": {
    "subscriberId": 123,
    "year": 2025,
    "month": 5,
    "amount": 50,
    "page": 0,
    "size": 10
  },
  "user_response": "A message to confirm or ask the user something"
}

- Always include the "intent".
- Include only relevant parameters for the intent:
  - For "queryBill" and "makePayment", include: subscriberId, year, month.
  - For "makePayment", include amount if available.
  - For "queryBillDetailed", include subscriberId, page, and size.
- Always include a user_response message string.
- subscriberId should be 123 if not specified by user.

Return JSON only. DO NOT explain. DO NOT include anything outside the JSON. DO NOT include markdown, code fences, or extra text. Stop immediately after closing the JSON.`;

        const requestPayload = {
            model: 'mistral',
            prompt,
            stream: false
        };

        console.log('Request body sent to AI:', requestPayload);

        // Ensure the AI service is reachable and responding
        const aiRes = await axios.post('http://127.0.0.1:11434/api/generate', requestPayload, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Received response from AI service:', aiRes.data);

        // Check if the AI service responded with valid JSON and parse it
        const text = aiRes.data.response;
        let parsed;

        try {
            parsed = JSON.parse(text);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return res.status(500).send({ error: 'Invalid response from AI service.' });
        }

        console.log('Parsed response from AI:', parsed);

        const intent = parsed.intent?.toLowerCase();
        const parameters = parsed.parameters || {};
        const subscriberId = parseInt(parameters.subscriberId);
        const userResponse = parsed.user_response || "Sorry, I couldn't process that.";
        const year = parseInt(parameters.year);
        const month = parseInt(parameters.month);
        const amount = parseFloat(parameters.amount);
        const page = parameters.page || 0;
        const size = parameters.size || 10;

        let apiResponse = 'Unknown intent.';

        if (intent === 'querybill') {
            const resp = await axios.get(`${process.env.SPRING_API_BASE}/bill/query/${subscriberId}/${year}/${month}`);
            apiResponse = resp.data;
        } else if (intent === 'calculatebill') {
            const resp = await axios.post(`${process.env.SPRING_API_BASE}/bill/calculate`, {
                subscriberId,
                year,
                month,
            });
            apiResponse = resp.data;
        } else if (intent === 'makepayment') {
            apiResponse = 'Payment request prepared.'; // DEBUG
            const amount = parseFloat(parameters.amount);

            if (isNaN(amount)) {
                throw new Error('Amount is required for makePayment intent.');
            }

            const resp = await axios.post(
                `${process.env.SPRING_API_BASE}/bill/pay`,
                null,
                {
                    params: {
                        subscriberId,
                        year,
                        month,
                        amount,
                    },
                }
            );
            apiResponse = resp.data;
        } else if (intent === 'querybilldetailed') {
            const resp = await axios.get(
                `${process.env.SPRING_API_BASE}/bill/query/detailed/${subscriberId}?page=${page}&size=${size}`,
                {
                    headers: {
                        Authorization: `Bearer ${jwtToken}`,
                    },
                }
            );
            apiResponse = resp.data;
        }

        console.log('Final API response:', apiResponse);

        await db.collection('messages').add({
            userId: 'user',
            message,
            response: typeof apiResponse === 'string' ? apiResponse : JSON.stringify(apiResponse),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.send({
            success: true,
            response: userResponse
        });

    } catch (error) {
        console.error('Error in /chat:', error.message || error);
        res.status(500).send({ error: 'Failed to process message.' });
    }
});

await loginAndGetToken();

const PORT = 3001;
app.listen(PORT, () => console.log(`API Gateway running on http://localhost:${PORT}`));
