# 📄 DocParser - AI-Powered Document Processing System

A comprehensive document processing platform that extracts text from PDFs and images using OCR, then structures the data using LLMs. Built with React, Vite, TypeScript, and Supabase.

![TypeScript](https://img.shields.io/badge/TypeScript-91.2%25-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🔍 **Multi-Provider OCR Support**
- **Google Vision API** - High accuracy, 200+ languages
- **OpenAI Vision** (GPT-4o/GPT-4o-mini) - AI-powered image understanding
- **Mistral Pixtral** - Advanced vision model
- **Tesseract.js** - Privacy-focused, local processing
- **OCR.space** - Free tier available
- **AWS Textract** - Advanced table detection
- **Azure Document Intelligence** - Layout analysis

### 🧠 **Multi-Provider LLM Structuring**
- **OpenAI** - GPT-4o, GPT-4o-mini, GPT-4, GPT-4-turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Mistral** - Mistral Large, Medium, Small

### 📋 **13 Pre-Built Templates**
1. Exam Questions - Extract questions with answers and difficulty
2. Receipt - Store details, items, payment info
3. Medical Record - Patient details, diagnosis, treatment
4. Lab Report - Test results and findings
5. Meeting Minutes - Attendees, agenda, action items
6. Document Summary - Title, key points, conclusions
7. Invoice - Vendor, items, amounts
8. Contract - Parties, terms, dates
9. Resume/CV - Education, experience, skills
10. Product Catalog - Products, prices, specs
11. Real Estate Listing - Property details, features
12. Business Card - Contact information
13. Purchase Order - Items, quantities, delivery

### 🚀 **Advanced Capabilities**
- ✅ **Intelligent Chunking** - Process documents of any size without timeouts
- ✅ **Client-Side PDF Conversion** - Automatic conversion for vision-based OCR
- ✅ **Model Selection** - Choose specific AI models for OCR and LLM
- ✅ **Offline Logging** - IndexedDB with auto-sync to Supabase
- ✅ **Admin Dashboard** - Provider health, logs, and diagnostics
- ✅ **Recent Documents** - View, export, and retry functionality
- ✅ **DocETL Pipelines** - Create custom processing workflows

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up free](https://supabase.com))
- At least one API key for OCR and LLM providers

### 1. Clone the Repository

```bash
git clone https://github.com/patrick-jaritz/PDF-Parser-01.git
cd PDF-Parser-01
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase Database

1. Go to your Supabase project's SQL Editor:
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. Copy and run the entire `COMPLETE_DATABASE_SETUP.sql` file
   - This creates all tables, policies, templates, and storage buckets
   - Takes about 30 seconds to complete

3. (Optional) Add OpenAI Vision support:
   - Run `ADD_OPENAI_VISION.sql` in the SQL Editor

### 4. Deploy Edge Functions

Get your Supabase access token from: https://supabase.com/dashboard/account/tokens

Then run:

```bash
chmod +x deploy-functions.sh
./deploy-functions.sh sbp_YOUR_TOKEN_HERE
```

This deploys:
- `process-pdf-ocr` - OCR processing for all providers
- `generate-structured-output` - LLM structuring with chunking
- `execute-docetl-pipeline` - DocETL workflow execution
- `add-templates` - Template management

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these values from: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api

### 6. Add API Keys (Supabase Secrets)

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions

Click "Add new secret" and add the following:

#### **Required for OCR:**
- `OPENAI_API_KEY` - For OpenAI Vision OCR (get from [OpenAI](https://platform.openai.com/api-keys))
- `MISTRAL_API_KEY` - For Mistral OCR (get from [Mistral](https://console.mistral.ai))
- `GOOGLE_VISION_API_KEY` - For Google Vision (get from [Google Cloud](https://console.cloud.google.com))
- `OCR_SPACE_API_KEY` - For OCR.space (get free key from [OCR.space](https://ocr.space/ocrapi))

#### **Required for LLM Structuring:**
- `OPENAI_API_KEY` - If not already added (for GPT models)
- `ANTHROPIC_API_KEY` - For Claude models (get from [Anthropic](https://console.anthropic.com))
- `MISTRAL_API_KEY` - If not already added

#### **Optional:**
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` - For AWS Textract
- `AZURE_DOCUMENT_INTELLIGENCE_KEY` + `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` - For Azure

**Note:** You need at least one OCR provider and one LLM provider configured. Without API keys, the system returns demo data.

### 7. Start the Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:5173**

### 8. Login

Default admin credentials:
- **Email:** `admin@example.com`
- **Password:** `admin123`

**⚠️ Important:** Change these credentials after first login!

---

## 📖 Usage

### Basic Workflow

1. **Upload Document** - Drop a PDF or image file
2. **Select Template** - Choose from 13 pre-built templates or create custom
3. **Choose Providers** - Select OCR and LLM providers with specific models
4. **Process** - Click "Process Document"
5. **View Results** - See extracted text and structured output
6. **Export** - Download as JSON or CSV

### Provider Selection

#### **For Images (PNG, JPG, WebP):**
All OCR providers work directly with images.

#### **For PDFs:**
- **Direct PDF Support:** Google Vision, AWS Textract, Azure, OCR.space
- **Auto-Conversion:** OpenAI Vision, Mistral (automatically converts PDF → images)
- **Local Processing:** Tesseract (browser-based)

### Model Selection

When you select a provider, you can choose the specific AI model:

**OpenAI:**
- GPT-4o-mini (fastest, most affordable)
- GPT-4o (best balance)
- GPT-4 (highest quality)

**Anthropic:**
- Claude 3.5 Sonnet (recommended)
- Claude 3.5 Haiku (fast)
- Claude 3 Opus (highest intelligence)

**Mistral:**
- Large (highest performance)
- Medium (balanced)
- Small (efficient)

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for blazing fast builds
- TailwindCSS for styling
- React Router for navigation
- PDF.js for client-side PDF rendering
- Tesseract.js for local OCR

**Backend:**
- Supabase (PostgreSQL database)
- Supabase Edge Functions (Deno runtime)
- Supabase Storage for file uploads
- Row-Level Security (RLS) for data protection

**Logging & Monitoring:**
- IndexedDB for offline log storage
- Real-time log sync to Supabase
- Provider health monitoring
- Performance metrics tracking

### Key Components

```
src/
├── components/
│   ├── SimplifiedDashboard.tsx - Main user interface
│   ├── TemplateEditor.tsx - Template selection with custom order
│   ├── TesseractProcessor.tsx - Client-side OCR processing
│   ├── LiveLogViewer.tsx - Real-time log monitoring
│   └── Navigation.tsx - App navigation
├── pages/
│   ├── Admin.tsx - Unified admin panel with tabs
│   ├── AdminDashboard.tsx - Provider health monitoring
│   ├── AdminLogs.tsx - System logs viewer
│   ├── DiagnosticDashboard.tsx - System health checks
│   └── DocETLPipelines.tsx - Advanced workflow builder
├── hooks/
│   └── useDocumentProcessor.ts - Core processing logic
├── lib/
│   ├── supabase.ts - Supabase client
│   ├── logger.ts - Centralized logging
│   ├── offlineLogStorage.ts - IndexedDB management
│   ├── logSyncService.ts - Log synchronization
│   └── tesseractOCR.ts - PDF to image conversion
└── contexts/
    └── AuthContext.tsx - Authentication state
```

---

## 🔧 Advanced Features

### Intelligent Chunking for Large Documents

The system automatically detects large documents (>8,000 tokens / ~32,000 characters) and processes them in chunks:

1. Splits by page breaks (for multi-page OCR results)
2. Processes each chunk through the LLM separately
3. Intelligently merges results:
   - Arrays (questions, items) are concatenated
   - Totals are summed
   - Strings/objects use first non-empty value

This prevents timeouts and enables processing of 100+ page documents.

### Client-Side PDF Conversion

For vision-based OCR providers (OpenAI Vision, Mistral):
- PDFs are automatically converted to images client-side
- Each page rendered at 2x scale for high quality
- Uploaded as individual PNG images
- Processed separately and combined

### Offline-First Logging

All logs are stored in IndexedDB first, then synced to Supabase:
- Works offline
- Automatic retry on sync failure
- No logs lost during network issues
- Real-time monitoring in Admin panel

---

## 🛠️ Development

### Project Structure

```
doc-parser/
├── src/                    # Frontend React app
├── supabase/
│   ├── functions/          # Edge Functions (OCR, LLM)
│   └── migrations/         # Database migrations
├── scripts/                # Utility scripts for logs
├── COMPLETE_DATABASE_SETUP.sql  # All-in-one DB setup
├── ADD_OPENAI_VISION.sql        # OpenAI Vision migration
└── deploy-functions.sh          # Function deployment script
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Database Migrations

All migrations are in `supabase/migrations/`. To apply them:

**Option A: Use the all-in-one file (Recommended)**
- Run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor

**Option B: Run migrations individually**
- Apply each file in order by timestamp

### Adding New Templates

Templates are stored in the `structure_templates` table. To add a new template:

1. Define your JSON schema
2. Insert into `structure_templates` table via SQL Editor or Admin UI
3. Set `is_public = true` for all users to access

Example:
```sql
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES (
  'Custom Template',
  'Description of what this template extracts',
  '{"type": "object", "properties": {"field1": {"type": "string"}}}'::jsonb,
  true,
  NULL
);
```

---

## 🔒 Security

### Authentication
- Supabase Auth with email/password
- Row-Level Security (RLS) on all tables
- Admin role stored in `raw_app_metadata`
- Protected routes for admin features

### Data Privacy
- Users can only access their own documents
- API keys stored as Supabase secrets (never in code)
- Tesseract option for 100% local processing
- File storage with access policies

### API Key Management
Never commit API keys to the repository. Always use:
- Supabase Function Secrets for backend keys
- `.env` files (gitignored) for frontend config

---

## 📊 Cost Estimates

### OCR Costs (per page):
- **Tesseract** - Free (local processing)
- **OCR.space** - Free (500 pages/day limit)
- **OpenAI Vision (GPT-4o-mini)** - ~$0.00015
- **Mistral Pixtral** - ~$0.001
- **Google Vision** - ~$0.0015
- **AWS Textract** - ~$0.0015
- **Azure** - ~$0.0015

### LLM Costs (per request):
- **GPT-4o-mini** - ~$0.0001-0.001 (depending on text length)
- **Claude 3.5 Haiku** - ~$0.0003-0.003
- **Mistral Small** - ~$0.0002-0.002

**Total estimated cost for a typical 10-page document:**
- OCR: $0.0015 - $0.015
- LLM: $0.001 - $0.01
- **Total: ~$0.002 - $0.025 per document**

---

## 🐛 Troubleshooting

### Edge Functions Not Working (CORS Errors)

**Problem:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:** Deploy the Edge Functions:
```bash
./deploy-functions.sh YOUR_SUPABASE_TOKEN
```

### LLM Returns Demo Data

**Problem:** Output contains `_demo_note` field

**Solution:** Add API keys in Supabase Function Secrets:
- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
- Add `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `MISTRAL_API_KEY`

### Gateway Timeout (504) Errors

**Problem:** Processing fails with timeout after 2 minutes

**Solution:** The intelligent chunking system should handle this automatically. If still timing out:
1. Try a faster model (GPT-4o-mini, Claude 3.5 Haiku)
2. Use a simpler template with fewer fields
3. Check Edge Function logs for errors

### OCR.space File Size Limit

**Problem:** "File size exceeds 1MB limit"

**Solution:** 
- Use a different provider (Google Vision, OpenAI Vision, etc.)
- Or compress your PDF/images before uploading

### PDF Not Supported by Provider

**Problem:** "Provider only supports images, not PDFs"

**Solution:** This should auto-convert. If it doesn't:
- Use a provider with direct PDF support (Google Vision, AWS, Azure, OCR.space)
- Or manually convert PDF to images first

---

## 📚 Documentation

### Database Schema
See `COMPLETE_DATABASE_SETUP.sql` for the complete schema with detailed comments.

Key tables:
- `documents` - Uploaded files
- `processing_jobs` - OCR and LLM processing jobs
- `structure_templates` - Reusable output templates
- `logs` - System logs and debugging
- `provider_health` - Provider status monitoring
- `docetl_pipelines` - Custom processing workflows

### Edge Functions

**`process-pdf-ocr`**
- Handles OCR for all providers
- Supports images and PDFs
- Returns extracted text and metadata

**`generate-structured-output`**
- LLM-based data structuring
- Automatic chunking for large documents
- Fallback to demo data if no API keys

**`execute-docetl-pipeline`**
- Runs custom DocETL workflows
- Advanced document transformations

**`add-templates`**
- Programmatic template creation

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Environment Variables

### Frontend (`.env`)
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Backend (Supabase Function Secrets)
Add these in the Supabase Dashboard under Settings → Edge Functions:

**OCR Providers:**
```
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
GOOGLE_VISION_API_KEY=...
OCR_SPACE_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
```

**LLM Providers:**
```
OPENAI_API_KEY=sk-...        # If not already added
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...          # If not already added
```

---

## 🎯 Roadmap

- [ ] Batch processing for multiple documents
- [ ] Custom template builder UI
- [ ] Export to CSV/Excel
- [ ] Document versioning and history
- [ ] Webhook notifications
- [ ] API access for external integrations
- [ ] Docker containerization
- [ ] Self-hosted deployment guide

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [OpenAI](https://openai.com) - GPT models for OCR and structuring
- [Anthropic](https://anthropic.com) - Claude models
- [Mistral AI](https://mistral.ai) - Pixtral and Mistral models
- [Tesseract.js](https://tesseract.projectnaptha.com/) - Client-side OCR
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Beautiful icons

---

## 💬 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/patrick-jaritz/PDF-Parser-01/issues)
- Check the troubleshooting section above
- Review the implementation docs in the repo

---

## 🌟 Star this repo if you find it useful!

Built with ❤️ using React, TypeScript, and Supabase

