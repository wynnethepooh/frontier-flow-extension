import {useEffect, useState} from 'react'
import './App.css'
import GmailSearch from './gmail/gmail-search';

function App() {

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
      <h1 className="header">Frontier Flow</h1>
      <GmailSearch />
      {isOnFrontierSite &&
          <button>{'Breeze through check in'}</button>
      }
    </div>
  )
}

export default App