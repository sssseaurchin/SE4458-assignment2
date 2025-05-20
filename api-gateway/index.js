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

function formatDetailedBill(billList) {
    if (!Array.isArray(billList) || billList.length === 0) {
        return "No detailed bill records found.";
    }

    return billList.map(bill => {
        return `${bill.month}/${bill.year} - ${bill.totalCallMinutes} mins, ${bill.totalInternetMB}MB, $${bill.amount}, Paid: ${bill.paid ? 'T' : 'F'}`;
    }).join('\n');
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
- subscriberId should be 1 if not specified by user.

Return JSON only. DO NOT explain. DO NOT include anything outside the JSON. DO NOT include markdown, code fences, or extra text. Stop immediately after closing the JSON.`;

        const requestPayload = {
            model: 'mistral',
            prompt,
            stream: false
        };

        console.log('Request body sent to AI:', requestPayload);

        const aiRes = await axios.post('http://127.0.0.1:11434/api/generate', requestPayload, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Received response from AI service:', aiRes.data);

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
        const subscriberId = parseInt(parameters.subscriberId) || 1;
        const userResponse = parsed.user_response || "Sorry, I couldn't process that.";
        const year = parseInt(parameters.year);
        const month = parseInt(parameters.month);
        const amount = parseFloat(parameters.amount);
        const page = parameters.page || 0;
        const size = parameters.size || 10;

        if (intent === 'makepayment' && isNaN(amount)) {
            return res.status(400).send({ error: 'Amount is required for makePayment intent.' });
        }

        let apiResponse = 'Unknown intent.';

        if (intent === 'querybill') {
            try {
                const resp = await axios.get(`${process.env.SPRING_API_BASE}/bill/query/${subscriberId}/${year}/${month}`);
                apiResponse = resp.data;
            } catch (apiError) {
                console.error('API Request failed:', apiError.response ? apiError.response.data : apiError.message);
                return res.status(500).send({ error: 'API request failed.' });
            }
        } else if (intent === 'calculatebill') {
            try {
                const resp = await axios.post(`${process.env.SPRING_API_BASE}/bill/calculate`, {
                    subscriberId,
                    year,
                    month,
                });
                apiResponse = resp.data;
            } catch (apiError) {
                console.error('API Request failed:', apiError.response ? apiError.response.data : apiError.message);
                return res.status(500).send({ error: 'API request failed.' });
            }
        } else if (intent === 'makepayment') {
            apiResponse = 'Payment request prepared.'; // DEBUG
            try {
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
            } catch (apiError) {
                console.error('API Request failed:', apiError.response ? apiError.response.data : apiError.message);
                return res.status(500).send({ error: 'API request failed.' });
            }
        } else if (intent === 'querybilldetailed') {
            try {
                const resp = await axios.get(
                    `${process.env.SPRING_API_BASE}/bill/query/detailed/${subscriberId}?page=${page}&size=${size}`,
                    {
                        headers: {
                            Authorization: `Bearer ${jwtToken}`,
                        },
                    }
                );
                apiResponse = resp.data;
            } catch (apiError) {
                console.error('API Request failed:', apiError.response ? apiError.response.data : apiError.message);
                return res.status(500).send({ error: 'API request failed.' });
            }
        }

        console.log('Final API response:', apiResponse);

        await db.collection('messages').add({
            userId: 'user',
            message,
            response: typeof apiResponse === 'string' ? apiResponse : JSON.stringify(apiResponse),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        let finalResponse = userResponse;

        if (intent === 'querybilldetailed') {
            finalResponse += '\n\n' + formatDetailedBill(apiResponse);
        } else if (intent === 'querybill') {
            finalResponse += `\n\nTotal $${apiResponse.amount}, Paid: ${apiResponse.paid ? 'T' : 'F'}`;
        } else if (intent === 'makepayment') {
            finalResponse += `\n\nPayment completed: $${amount} for ${month}/${year}`;
        }

        res.send({
            success: true,
            response: finalResponse
        });


    } catch (error) {
        console.error('Error in /chat:', error.message || error);
        res.status(500).send({ error: 'Failed to process message.' });
    }
});

await loginAndGetToken();

const PORT = 3001;
app.listen(PORT, () => console.log(`API Gateway running on http://localhost:${PORT}`));
