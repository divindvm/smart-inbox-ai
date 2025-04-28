// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SmartInbox.css';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const REDIRECT_URI = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:4000';

const SmartInbox = () => {
  const [emails, setEmails] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [replies, setReplies] = useState({});
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [labelFilter, setLabelFilter] = useState(localStorage.getItem('labelFilter') || 'all');
  const [maxResults, setMaxResults] = useState(Number(localStorage.getItem('maxResults') || 5));
  const [sidebarVisible, setSidebarVisible] = useState(JSON.parse(localStorage.getItem('sidebarVisible') || 'true'));

  const refresh_token = sessionStorage.getItem('refresh_token');

  const handleLogin = () => {
    const scope = 'https://www.googleapis.com/auth/gmail.modify';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const fetchEmails = async (token, isRefresh = false) => {
    setLoading(true);
    setProgress('Fetching emails...');
    try {
      const endpoint = isRefresh ? 'refreshTokenAndGetEmails' : 'exchangeCodeAndGetEmails';
      const res = await axios.post(`${BACKEND_URL}/${endpoint}`, {
        ...(isRefresh ? { refresh_token: token } : { code: token }),
        labelFilter,
        maxResults,
      });
      if (!isRefresh) sessionStorage.setItem('refresh_token', res.data.refresh_token);
      setEmails(res.data.emails);
      setProgress('Emails loaded.');
      if (!isRefresh) window.history.replaceState({}, document.title, '/');
    } catch (err) {
      console.error(err);
      setProgress('Failed to fetch emails.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryAndReply = async (email) => {
    try {
      const summaryRes = await axios.post(`${BACKEND_URL}/summarizeEmail`, { emailSnippet: email.snippet });
      const summary = summaryRes.data.summary;
      setSummaries((prev) => ({ ...prev, [email.id]: summary }));

      const replyRes = await axios.post(`${BACKEND_URL}/generateReply`, { summary });
      const reply = replyRes.data.reply;
      setReplies((prev) => ({ ...prev, [email.id]: reply }));
    } catch (err) {
      console.error('Error generating summary or reply:', err);
    }
  };

  const handleReply = async (threadId, replyText) => {
    try {
      await axios.post(`${BACKEND_URL}/sendReply`, { refresh_token, threadId, replyText });
      alert('Reply sent successfully!');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setSelectedEmail(null);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) fetchEmails(code, false);
    else if (refresh_token) fetchEmails(refresh_token, true);
  }, [refresh_token, labelFilter, maxResults]);

  useEffect(() => {
    localStorage.setItem('labelFilter', labelFilter);
    localStorage.setItem('maxResults', maxResults.toString());
    localStorage.setItem('sidebarVisible', sidebarVisible);
  }, [labelFilter, maxResults, sidebarVisible]);

  return (
    <div className="inbox-container">
      <button className="hamburger" onClick={() => setSidebarVisible(!sidebarVisible)}>
        ☰
      </button>
      {sidebarVisible && (
        <aside className="sidebar">
          <h2>📥 Smart Inbox</h2>
          <div className="filters">
            <label>Label Filter</label>
            <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>

            <label>Email Count</label>
            <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </aside>
      )}

      <main className="email-list">
        {loading && <div className="status">{progress}</div>}

        {!emails.length && !loading && (
          <button className="login-btn" onClick={handleLogin}>
            Authenticate with Google
          </button>
        )}

        <div className="emails">
          {emails.map((email) => (
            <div key={email.id} className="email-card" onClick={() => setSelectedEmail(email)}>
              <div className="email-snippet">📧 {email.snippet}</div>
              <div className="tags">{email.labels?.join(', ')}</div>
            </div>
          ))}
        </div>

        {selectedEmail && (
          <div className="email-detail slide-in">
            <button className="close-btn" onClick={() => setSelectedEmail(null)}>
              ✖
            </button>
            <h3>{selectedEmail.subject || 'No Subject'}</h3>
            <p><strong>From:</strong> {selectedEmail.from}</p>
            <p><strong>Date:</strong> {new Date(selectedEmail.date).toLocaleString()}</p>
            <p><strong>Snippet:</strong> {selectedEmail.snippet}</p>
            <button onClick={() => fetchSummaryAndReply(selectedEmail)}>Summarize & Generate Reply</button>
            {summaries[selectedEmail.id] && (
              <>
                <div className="summary"><strong>Summary:</strong> {summaries[selectedEmail.id]}</div>
                <textarea
                  value={replies[selectedEmail.id] || ''}
                  onChange={(e) =>
                    setReplies((prev) => ({ ...prev, [selectedEmail.id]: e.target.value }))
                  }
                />
                <button onClick={() => handleReply(selectedEmail.threadId, replies[selectedEmail.id])}>
                  Send Reply
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SmartInbox;