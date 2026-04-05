# 🏗️ BuildMarshalAI

**An intelligent, context-aware construction document assistant** powered by ColPali visual document retrieval and Google Gemini AI.

Upload your project documents — PDFs, spreadsheets, images, drawings — and ask questions in natural language. Get accurate, cited answers backed by visual document understanding.

---

## Architecture

```
┌──────────────┐    ┌─────────────────────────────────────────────────┐
│   Frontend   │    │         Backend (Kaggle Notebook)               │
│  (Browser)   │◄──►│                                                 │
│              │    │  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  • Chat UI   │    │  │ FastAPI │  │ ColPali  │  │   Gemini AI  │   │
│  • Doc Upload│    │  │ Server  │──│ (Byaldi) │──│ (Multimodal) │   │
│  • Citations │    │  └────┬────┘  └─────────┘  └──────────────┘   │
│              │    │       │                                         │
└──────────────┘    │  ┌────▼────┐                                   │
       ▲            │  │  Ngrok  │                                   │
       │            │  │ Tunnel  │                                   │
       └────────────│──┘         │                                   │
                    └─────────────────────────────────────────────────┘
```

## Features

- 🤖 **AI Chat** — Natural language Q&A over your documents
- 📄 **Multi-format Upload** — PDF, Excel, CSV, Images, Word (.docx)
- 🔍 **Visual Retrieval** — ColPali-based retrieval that understands document layout, tables, and images
- 📎 **Source Citations** — Every answer shows which document page it came from
- 🖼️ **Page Preview** — Click citations to see the actual document page
- 💬 **Chat History** — Persistent conversation threads with localStorage
- 🌙 **Premium Dark UI** — Glassmorphism design with smooth animations
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🆓 **Free GPU** — Runs on Kaggle's free GPU tier

---

## Quick Start

### 1. Backend Setup (Kaggle)

1. Go to [Kaggle](https://www.kaggle.com/) and create a new notebook
2. Enable **GPU** (Settings → Accelerator → GPU P100)
3. Enable **Internet** (Settings → Internet → On)
4. Add your secrets (Add-ons → Secrets):
   - `GEMINI_API_KEY` — Get from [Google AI Studio](https://aistudio.google.com/)
   - `NGROK_AUTH_TOKEN` — Get from [ngrok.com](https://ngrok.com/)
5. Copy the contents of `backend/kaggle_server.py` into notebook cells:
   - **Cell 1**: Install dependencies (the `!pip install` and `!apt-get` lines)
   - **Cell 2**: Configuration & Imports
   - **Cell 3**: Initialize ColPali Model
   - **Cell 4**: Document Ingestion Pipeline
   - **Cell 5**: Query Pipeline
   - **Cell 6**: FastAPI Application
   - **Cell 7**: Launch Server (`start_server()`)
6. Run all cells. The last cell will print your **public ngrok URL**.

### 2. Frontend Setup

#### Option A: GitHub Pages (Recommended)

1. Create a GitHub repository
2. Push the `frontend/` folder to the repo
3. Go to Settings → Pages → Source: Deploy from branch → `main` → `/frontend`
4. Your frontend will be live at `https://yourusername.github.io/repo-name/`

#### Option B: Local

```bash
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000
```

### 3. Connect

1. Open the frontend in your browser
2. Click **⚙ Settings** in the sidebar
3. Paste your **ngrok URL** from the Kaggle notebook
4. Click **Save** — the status indicator should turn green ✅
5. Upload documents via the **📄 Documents** panel
6. Start chatting!

---

## Project Structure

```
BuildMarshalAI/
├── frontend/
│   ├── index.html      # Main chatbot page
│   ├── styles.css       # Premium dark theme + glassmorphism
│   ├── config.js        # Configuration (backend URL, settings)
│   └── app.js           # Chat logic, uploads, streaming, citations
│
├── backend/
│   ├── kaggle_server.py # Complete Kaggle backend (copy into cells)
│   └── requirements.txt # Python dependencies
│
├── docs/                # Place your documents here for reference
│
└── README.md            # This file
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + GPU status |
| `GET` | `/api/status` | Index statistics |
| `POST` | `/api/upload` | Upload a document (multipart form) |
| `GET` | `/api/documents` | List all indexed documents |
| `GET` | `/api/documents/{id}/status` | Check indexing status |
| `DELETE` | `/api/documents/{id}` | Remove a document |
| `POST` | `/api/chat` | Send query, get AI response with sources |
| `GET` | `/api/pages/{doc_id}/{page_num}` | Serve a page image |

---

## Supported File Types

| Type | Extensions | Processing |
|------|-----------|------------|
| PDF | `.pdf` | Rendered to page images → ColPali indexed |
| Excel | `.xlsx`, `.xls`, `.csv` | Sheets rendered as table images + text extracted |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tiff` | Directly indexed |
| Word | `.doc`, `.docx` | Text extracted → rendered as images |

---

## Kaggle Limitations

- ⏱️ **Max 12 hours** per session
- 💤 **60-min idle timeout** (keep interacting or use "Save & Run All")
- 🔄 **Ngrok URL changes** each session — update frontend Settings
- 🎮 **30 hours/week** GPU quota
- 💾 Data in `/kaggle/working/` is lost after session (save important indices as datasets)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, FastAPI, Uvicorn |
| Document Retrieval | ColPali v1.2 via Byaldi |
| AI Generation | Google Gemini (2.5 Flash / Pro) |
| Tunnel | ngrok (pyngrok) |
| GPU | Kaggle P100 (free tier) |

---

## License

MIT License — Built with ❤️ by BuildMarshalAI
