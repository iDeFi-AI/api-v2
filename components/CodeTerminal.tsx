import React, { useState, useEffect } from 'react';

export const CodeTerminal: React.FC<CodeTerminalProps> = ({ children }) => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // Extract insights response from children
    const insightsResponse = children.match(/Insights response:([\s\S]*)/)?.[1]?.trim() || children.trim();
    // Split insights response into individual messages
    const messageList = insightsResponse.split('\n');
    setMessages(messageList);
  }, [children]);

  return (
    <div
      id='App:CodeTerminal'
      style={{
        backgroundColor: '#000',
        padding: '1em',
        borderRadius: '5px',
        borderColor: '#ff9f66',
        color: '#fff',
        whiteSpace: 'pre-wrap', // Allow text to wrap
        wordWrap: 'break-word', // Break words that are too long
      }}
    >
      {messages.map((message, index) => (
        <div key={index} style={{ marginBottom: '2em' }}>{message}</div>
      ))}
    </div>
  );
};

interface CodeTerminalProps {
  children: string;
}

export default CodeTerminal;
