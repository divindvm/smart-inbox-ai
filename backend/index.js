// === server.js (Backend) ===
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000' // Adjust if your frontend is deployed elsewhere
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getGmailClient = (auth) => google.gmail({ version: 'v1', auth });

// === Utility: Fetch emails with filter and limit ===
async function fetchEmails(gmail, labelFilter = 'all', maxResults = 5) {
  const query = labelFilter === 'read' ? 'is:read' :
                labelFilter === 'unread' ? 'is:unread' : '';
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
  });

  if (!data.messages) return [];
  return Promise.all(data.messages.map(async ({ id }) => {
    const msg = await gmail.users.messages.get({ userId: 'me', id });
    return {
      id,
      snippet: msg.data.snippet,
      threadId: msg.data.threadId,
    };
  }));
}

// === Exchange Code for Token & Fetch Emails ===
app.post('/exchangeCodeAndGetEmails', async (req, res) => {
  const { code, labelFilter = 'all', maxResults = 5 } = req.body;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    const gmail = getGmailClient(oAuth2Client);
    const emails = await fetchEmails(gmail, labelFilter, maxResults);
    res.json({ refresh_token: tokens.refresh_token, emails });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error exchanging code for token');
  }
});

// === Refresh Token & Fetch Emails ===
app.post('/refreshTokenAndGetEmails', async (req, res) => {
  const { refresh_token, labelFilter = 'all', maxResults = 5 } = req.body;
  try {
    oAuth2Client.setCredentials({ refresh_token });
    const gmail = getGmailClient(oAuth2Client);
    const emails = await fetchEmails(gmail, labelFilter, maxResults);
    res.json({ emails });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to refresh token or fetch emails');
  }
});

// === Summarize Email ===
app.post('/summarizeEmail', async (req, res) => {
  const { emailSnippet } = req.body;
  if (!emailSnippet) return res.status(400).send('Missing email snippet');
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Summarize this email snippet in one sentence:' },
        { role: 'user', content: emailSnippet },
      ],
    });
    const summary = completion.choices[0]?.message?.content || 'No summary returned';
    res.json({ summary });
  } catch (error) {
    console.error('OpenAI Error:', error?.response?.data || error.message);
    res.status(500).send('Error summarizing email');
  }
});

// === Generate Reply ===
app.post('/generateReply', async (req, res) => {
  const { summary } = req.body;
  if (!summary) return res.status(400).send('Missing summary');
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Generate a concise and polite email reply based on this summary:' },
        { role: 'user', content: summary },
      ],
    });
    const reply = completion.choices[0]?.message?.content || 'No reply generated';
    res.json({ reply });
  } catch (error) {
    console.error('OpenAI Error (generateReply):', error?.response?.data || error.message);
    res.status(500).send('Error generating reply');
  }
});

// === Send Reply to Thread ===
app.post('/sendReply', async (req, res) => {
  const { refresh_token, threadId, replyText } = req.body;
  if (!refresh_token || !threadId || !replyText) {
    return res.status(400).send('Missing required fields');
  }

  try {
    oAuth2Client.setCredentials({ refresh_token });
    const gmail = getGmailClient(oAuth2Client);

    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
    const lastMessage = thread.data.messages[thread.data.messages.length - 1];
    const headers = lastMessage.payload.headers;

    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');

    const to = fromHeader?.value;
    const subject = subjectHeader?.value || 'No Subject';

    if (!to) return res.status(400).send('Could not find recipient address');

    const messageParts = [
      `To: ${to}`,
      `Subject: Re: ${subject}`,
      `In-Reply-To: ${lastMessage.id}`,
      `References: ${lastMessage.id}`,
      'Content-Type: text/plain; charset=UTF-8',
      'MIME-Version: 1.0',
      '',
      replyText
    ];

    const rawMessage = messageParts.join('\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId,
      },
    });

    res.send('Reply sent!');
  } catch (err) {
    console.error('Error sending reply:', err?.response?.data || err.message);
    res.status(500).send('Failed to send reply');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
