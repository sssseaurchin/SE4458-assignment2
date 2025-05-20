import React, { useState } from 'react';
import './App.css';

function App() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    const handleSend = async () => {
        if (!message.trim()) return;

        const userMessage = { text: message, sender: 'user' };
        const newMessages = [...messages, userMessage, { text: 'Typing...', sender: 'bot' }];
        setMessages(newMessages);
        setMessage('');

        try {
            const res = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            const data = await res.json();
            const reply = data.response || "No response";

            // Replace "Typing..." with the real response
            setMessages((prev) => [
                ...prev.slice(0, -1),
                { text: reply, sender: 'bot' },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev.slice(0, -1),
                { text: 'Error contacting server.', sender: 'bot' },
            ]);
        }
    };


    return (
        <div className="App">
            <div className="chat-container">
                <div className="messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            {msg.text}
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
