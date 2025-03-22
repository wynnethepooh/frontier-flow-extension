import React, { useEffect, useState } from 'react';
import googleLogo from '../assets/google.png';
import './gmail-search.css';

const GmailSearch: React.FC = () => {
  const [confirmationNumbers, setConfirmationNumbers] = useState(new Set<string>());
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticate = () => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          setError('Error during authentication: ' + chrome.runtime.lastError.message);
          console.error('Error during authentication:', chrome.runtime.lastError);
          return;
        }

        console.log(token)
        if (token) {
          // @ts-expect-error token is already a string
          setAuthToken(token);
        } else {
          setError('User did not approve access');
        }
      });
    };

    authenticate();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchEmails(authToken);
    }
  }, [authToken]);

  const fetchEmails = async (token: string) => {
    try {

      // Construct the query parameter to search for relevant emails
      const query = 'from:*@flyfrontier.com';

      // Modify the URL to include the query as a query parameter
      const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;

      // Make the GET request
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        const emailIds = data.messages;

        if (emailIds) {
          const emailDetails = await Promise.all(
            emailIds.map(async (msg: { id: string }) => {
              const email = await fetchEmailDetails(msg.id, token);
              email.text = extractEmailBody(email);
              return email;
            })
          );
          console.log(emailDetails);
          const confirmationNumbers = extractConfirmationNumbers(emailDetails);
          setConfirmationNumbers(new Set(confirmationNumbers));
        } else {
          setConfirmationNumbers(new Set());
        }
      } else {
        setError('Failed to fetch emails');
      }
    } catch (error) {
      setError('Error fetching emails');
      console.error('Error fetching emails:', error);
    }
    setLoading(false);
  };

  const fetchEmailDetails = async (messageId: string, token: string) => {
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error fetching email details');
    }

    return response.json();
  };

  function decodeBase64Url(base64Url: string) {
    // Convert base64url to base64 by replacing URL-specific characters
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return decoded;
  }

  function extractEmailBody(email: any) {
    const { payload } = email;
    let parts;
    if (payload.parts) {
      parts = payload.parts || [];
    } else {
      parts = [payload]
    }
    let bodyText = '';

    for (const part of parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        bodyText = decodeBase64Url(part.body.data);
        break;
      }
    }

    return bodyText;
  }

  const extractConfirmationNumbers = (emails: any[]) => {
    return emails
      .map((email) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(email.text, "text/html");

        const match = doc.body?.textContent?.match(/confirmation code:\s*([A-Za-z0-9]{6})/i);
        return match ? match[1] : null; // Return the first matched confirmation number
      })
      .filter((match) => match !== null);
  };

  const handleSignOut = () => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      // @ts-expect-error token is already a string
      chrome.identity.removeCachedAuthToken({ token: token }, () => {
        setAuthToken(null);
        setConfirmationNumbers(new Set());
        setError(null);
      });
    });
  };

  return (
    <div>
      <h2 className="header">Your Frontier Flights</h2>
      {loading ? (
          <div className="loader" />
        ) : (
          <div className="frontier-button-container">
            {[...confirmationNumbers].map((confirmationNumber, index) => (
              <button key={index} className="frontier-button">{confirmationNumber}</button>
            ))}
          </div>
        )
      }
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!authToken ? (
        <button onClick={() => window.location.reload()} className="logo-button">
          <img src={googleLogo} alt={"Google"} />
          Sign in with Google
        </button>
      ) : (
        <button onClick={handleSignOut} className="logo-button">
          <img src={googleLogo} alt={"Google"} />
          Sign out
        </button>
      )}
    </div>
  );
};

export default GmailSearch;
