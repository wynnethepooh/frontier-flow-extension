import {useEffect, useState} from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const [isOnFrontierSite, setIsOnFrontierSite] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      const tabUrl = tabs[0]?.url; // Safe optional chaining

      if (tabUrl) {
        const url = new URL(tabUrl);
        setIsOnFrontierSite(url.hostname.endsWith("flyfrontier.com") && url.protocol === "https:");
      } else {
        console.error("No active tab or URL found");
      }
    });
  }, []);

  return (
    <div>
      <h1>Frontier Flow</h1>
      <p>Count: {count}</p>
      <button disabled={!isOnFrontierSite} onClick={() => setCount(count + 1)}>Increase</button>
    </div>
  )
}

export default App