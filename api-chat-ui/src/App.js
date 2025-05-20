import React, { useEffect, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { ref, push, onValue } from 'firebase/database';

function App() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const messagesRef = ref(db, 'messages');
        onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const chat = data ? Object.values(data) : [];
            setMessages(chat);
        });
    }, []);

    const handleSend = async () => {
        if (!message.trim()) return;

        const userMessage = {
            message,
            response: 'Typing...',
            timestamp: Date.now()
        };

        const messageRef = push(ref(db, 'messages'), userMessage);
        setMessage('');

        try {
            const res = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            const data = await res.json();
            const reply = data.response || "No response";

            await push(ref(db, 'messages'), {
                message: '[AI Response]',
                response: reply,
                timestamp: Date.now()
            });

        } catch (err) {
            await push(ref(db, 'messages'), {
                message: '[Error]',
                response: 'Error contacting server.',
                timestamp: Date.now()
            });
        }
    };

    return (
        <div className="App">
            <div className="chat-container">
                <div className="messages">
                    {messages.map((msg, index) => (
                        <div key={index} className="message-block">
                            <div className="message user">{msg.message}</div>
                            <div className="message bot">{msg.response}</div>
                        </div>
                    ))}
                </div>
                <div className="input-area">
                    <input
                        type="text"
                        value={message}
                        placeholder="Type your message..."
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default App;
