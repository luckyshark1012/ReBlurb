import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const App: React.FC<{}> = () => {
  const [summary, setSummary] = useState<string>('');
  useEffect(() => {
    chrome.storage.local.get('message', (result) => {
      const message = result.message || '';
      setSummary(message);
    });
  }, []);
  console.log(summary);
  return (
    <div>
      <p>{summary}</p>
    </div>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
