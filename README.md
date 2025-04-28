# 📬 Gmail Smart Inbox Backend

An Express.js server that integrates with the **Gmail API** and **OpenAI API** to:

- Fetch emails based on filters (read, unread, all)
- Summarize email snippets
- Generate polite replies
- Send email replies back to Gmail threads

---

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-Backend-blue)](https://expressjs.com/)
[![Google Gmail API](https://img.shields.io/badge/Gmail-API-red)](https://developers.google.com/gmail/api)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-ff69b4)](https://openai.com/)

---

## ✨ Features

- **OAuth2** authentication with Google Gmail
- **Fetch emails** (filtered and limited)
- **Summarize** email content using GPT-3.5
- **Generate replies** using GPT-3.5
- **Send email replies** directly through Gmail
- **Token refresh** support for long sessions

---

## ⚙️ Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gmail-smart-inbox-backend.git
   cd gmail-smart-inbox-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   
   Inside your project root, create a `.env` file and add:

   ```bash
   PORT=4000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start the server**
   ```bash
   npm start
   ```

✅ Server will run on: `http://localhost:4000`

---

## 🔑 Important Notes

- Make sure your **Google OAuth2 redirect URI** matches your frontend (default is `http://localhost:3000`).
- You must have a valid **OpenAI API key** to summarize and generate replies.
- If you want to change ports, modify the `PORT` value in `.env`.

---

## 🛣️ API Endpoints

### 1. Exchange Authorization Code for Tokens + Fetch Emails
`POST /exchangeCodeAndGetEmails`

| Field        | Type     | Required | Description                      |
| ------------ | -------- | -------- | -------------------------------- |
| `code`        | `string` | ✅        | OAuth2 authorization code       |
| `labelFilter` | `string` | ❌        | "all" (default), "read", "unread" |
| `maxResults`  | `number` | ❌        | Maximum emails to fetch (default 5) |

---

### 2. Refresh Token + Fetch Emails
`POST /refreshTokenAndGetEmails`

| Field          | Type     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| `refresh_token` | `string` | ✅        | OAuth2 refresh token               |
| `labelFilter`   | `string` | ❌        | "all", "read", "unread"            |
| `maxResults`    | `number` | ❌        | Number of emails to fetch (default 5) |

---

### 3. Summarize Email
`POST /summarizeEmail`

| Field         | Type     | Required | Description              |
| ------------- | -------- | -------- | ------------------------ |
| `emailSnippet` | `string` | ✅        | The snippet of the email to summarize |

---

### 4. Generate Email Reply
`POST /generateReply`

| Field   | Type     | Required | Description                        |
| ------- | -------- | -------- | ---------------------------------- |
| `summary` | `string` | ✅        | Summary of the email content |

---

### 5. Send Reply to Gmail Thread
`POST /sendReply`

| Field           | Type     | Required | Description                        |
| --------------- | -------- | -------- | ---------------------------------- |
| `refresh_token` | `string` | ✅        | OAuth2 refresh token               |
| `threadId`      | `string` | ✅        | Gmail thread ID                    |
| `replyText`     | `string` | ✅        | Text of the reply to send          |

---

## 🛡️ Security

- Keep your `.env` file **private**.
- Do not hardcode any sensitive tokens or API keys.
- Make sure **OAuth consent screen** is properly set up if deploying.

---

## ✨ Future Improvements

- Better error handling and retries
- Pagination for fetching more emails
- Rate limiting to protect server
- Admin dashboard for token management

---

## 📚 Resources

- [Google Gmail API Docs](https://developers.google.com/gmail/api)
- [Google OAuth2 Docs](https://developers.google.com/identity/protocols/oauth2)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

# 🛠 Built With
- Node.js
- Express
- Google APIs Node.js Client
- OpenAI SDK
- dotenv
- cors