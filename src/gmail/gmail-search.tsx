import React, { useEffect, useState } from 'react';
import googleLogo from '../assets/google.png';
import './gmail-search.css';
import {Flight} from "./types.ts";
import FlightInfo from "./flight-info.tsx";

const GmailSearch: React.FC = () => {
  const [confirmationDetails, setConfirmationDetails] = useState(new Map<string, Flight | null>());
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
          extractConfirmationDetails(emailDetails);
        } else {
          setConfirmationDetails(new Map());
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

  const extractConfirmationDetails = (emails: any[]) => {
    const newConfirmationDetails = new Map();
    emails
      .map((email) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(email.text, "text/html");

        const match = doc.body?.textContent?.match(/confirmation code is:\s*([A-Za-z0-9]{6})/i);
        const confirmationCode = match ? match[1] : null;

        if (!confirmationCode) return null; // Skip if no confirmation code is found

        const flightInfo = extractFlightInfo(doc, confirmationCode);

        newConfirmationDetails.set(confirmationCode, flightInfo);
      })
      .filter((item) => item !== null); // Remove null values

    setConfirmationDetails(newConfirmationDetails);
  };

  const extractFlightInfo = (doc: Document, confirmationCode: string): Flight | null => {
    const linkElement = Array.from(doc.querySelectorAll("a"))
      .find((a) => a.textContent?.trim() === confirmationCode);

    console.log(linkElement);
    const confirmationLink = linkElement ? linkElement.getAttribute("href") : null;

    const flightHeader = Array.from(doc.querySelectorAll("h2"))
        .find(h2 => h2.textContent?.toLowerCase().includes("departing flight"));

    console.log(flightHeader);
    if (!flightHeader) return null; // If not found, skip

    const routeElement = flightHeader.closest("table")?.nextElementSibling?.querySelector("p");
    const route = routeElement ? routeElement.textContent?.trim() : null;

    const dateElement = routeElement?.nextElementSibling;
    const departureInfo = dateElement ? dateElement.textContent?.trim() : null;
    console.log(departureInfo);
    const parts = departureInfo?.split('|');
    let depart, arrive;
    if (parts) {
      depart = parts[0]?.trim();
      arrive = parts[1]?.trim();
    }

    return {
      link: confirmationLink,
      route,
      depart,
      arrive,
    };
  }

  const handleSignOut = () => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      // @ts-expect-error token is already a string
      chrome.identity.removeCachedAuthToken({ token: token }, () => {
        setAuthToken(null);
        setConfirmationDetails(new Map());
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
            {[...confirmationDetails].map(([code, flightInfo]) => {
              return (
                <FlightInfo code={code} flight={flightInfo} />
              );
            })}
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
