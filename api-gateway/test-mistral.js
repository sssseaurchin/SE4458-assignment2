import axios from 'axios';

const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'mistral',
    prompt: `You are an API parser. User says: "I'd like to pay my bill". Return:
{
  "intent": "makePayment",
  "parameters": {
    "subscriberId": 123,
    "year": 2025,
    "month": 5
  },
  "user_response": "Would you like to pay your May 2025 bill of $50?"
}
Only return this JSON and nothing else.`,
    stream: false
});

console.log(response.data);
