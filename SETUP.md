# ContextVault MVP - Setup Guide

## Prerequisites

- Node.js 16+ and npm
- Supabase project (database and auth enabled)
- OpenAI API key

## 1. Environment Configuration

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

Get these values from:
- **Supabase URL & Anon Key**: Project Settings → API
- **OpenAI API Key**: https://platform.openai.com/account/api-keys

## 2. Supabase Edge Functions Configuration

The project uses Supabase Edge Functions for content capture and semantic search. These are automatically deployed but require the OpenAI API key to be configured as a secret.

**The OpenAI API key must be added to your Supabase project:**

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions → Secrets
3. Add a new secret named `OPENAI_API_KEY` with your OpenAI API key value

The following edge functions are deployed:
- `/functions/capture` - Processes content capture with AI analysis
- `/functions/search` - Performs semantic search over your vault

## 3. Database Setup

The database schema is automatically created with:
- `content_items` table with pgvector support for semantic search
- Row Level Security (RLS) policies for user data privacy
- Vector similarity search function

## 4. Web App Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The web app runs on `http://localhost:5173` by default.

## 5. Chrome Extension Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Navigate to the `extension` folder in this project

The extension will appear in your toolbar. Click on it to:
- **First time**: Go to Options (right-click extension → Options)
  - Configure your Supabase URL and Anon Key
  - Sign in with your email and password
- **Then**: Use the popup to save content with one click

## Architecture Overview

### Frontend
- **Web App**: React + TypeScript + Tailwind CSS
- **Chrome Extension**: Vanilla JS with Manifest V3
- Handles authentication, content capture UI, and search interface

### Backend
- **Supabase Auth**: Email/password authentication
- **Edge Functions**: Serverless handlers for capture and search
- **PostgreSQL with pgvector**: Vector database for semantic search

### AI Processing Pipeline
1. **Capture**: Extension sends page content (URL, title, text) to `/capture` edge function
2. **Analysis**: OpenAI processes content:
   - Generates 2-sentence summary
   - Extracts 5-8 keywords
   - Identifies content type (article/video/tweet/reel/etc)
   - Creates semantic embedding (1536-dimensional vector)
3. **Storage**: Results stored in PostgreSQL with pgvector index
4. **Search**: User query → converted to embedding → cosine similarity search against vault

## Key Features

### Semantic Search
- Search by meaning, not keywords
- "that video about compound interest" finds content about "rule of 72"
- Natural language queries matched against 1536-dimensional embeddings

### Smart Capture
- One-click save from any website
- Automatic text extraction from pages
- Duplicate detection (alerts if already saved)

### Privacy First
- All data encrypted and private by default
- Row Level Security ensures users only see their own content
- No sharing/public vault in MVP

## Rate Limits

- **50 captures per user per day** (MVP limit to control OpenAI costs)
- Contact support if you need higher limits

## Troubleshooting

### Extension not capturing content
1. Check that extension is signed in (verify in Options)
2. Verify Supabase URL and Anon Key are correct
3. Check browser console for errors (F12)

### Search returning no results
1. Ensure you have at least 5-10 saved items
2. Try different search terms with different meanings
3. Check that items show "processed" status in database

### Build errors
```bash
# Clear node_modules and rebuild
rm -rf node_modules
npm install
npm run build
```

## Next Steps (Post-MVP)

- Mobile app with passive screen capture
- Weekly digest emails
- Auto-categorization dashboard
- RAG-based AI chat with your vault
- Team collaboration features
- Export to Notion/Obsidian

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase project is active and accessible
4. Check OpenAI API key has remaining credits
