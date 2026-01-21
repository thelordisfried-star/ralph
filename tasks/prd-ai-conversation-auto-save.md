# PRD: AI Conversation Auto-Save Android App

## Overview
Android app that monitors network traffic to detect AI conversations (ChatGPT, Claude, etc.) and automatically saves them to Google Drive after 20 minutes of inactivity.

## User Story
As a user who frequently uses AI assistants on my phone, I want my conversations automatically backed up to Google Drive so I never lose important conversations, without having to manually export them.

## Core Requirements

### 1. Network Traffic Monitoring
- Use Android VPN Service API to intercept network traffic
- Monitor HTTP/HTTPS requests from known AI apps (ChatGPT, Claude, Gemini, etc.)
- Parse API responses to extract conversation data
- No root access required

### 2. Conversation Detection
- Identify AI app traffic by domain patterns:
  - `api.openai.com` (ChatGPT)
  - `api.anthropic.com` (Claude)
  - `generativelanguage.googleapis.com` (Gemini)
  - Other major AI services
- Extract conversation messages from API responses
- Track conversation threads and timestamps

### 3. Auto-Save Logic
- Monitor for 20 minutes of inactivity (no new messages)
- When threshold reached, trigger auto-save
- Save as formatted text file with metadata:
  - Timestamp
  - AI service used
  - Full conversation history
  - Optional: Include images/attachments

### 4. Google Drive Integration
- Authenticate with Google Drive API
- Create folder structure: `/AI Conversations/[Year]/[Month]/`
- Upload with naming: `[AI-Service]_[Date]_[Time].txt`
- Handle network failures with retry logic

### 5. Background Service
- Run as Android Foreground Service (persistent notification)
- Auto-start on device boot
- Battery optimized (minimal resource usage)
- Configurable on/off toggle

### 6. User Interface
- Simple settings screen:
  - Google Drive account connection
  - Enable/disable monitoring
  - Inactivity timeout (default 20 min)
  - Select which AI apps to monitor
  - View recent saves log
- Status notification showing:
  - Current monitoring state
  - Last save timestamp
  - Quick actions (pause/resume)

## Technical Stack
- **Language**: Kotlin
- **Min SDK**: Android 8.0 (API 26)
- **Architecture**: MVVM with Repository pattern
- **Key Libraries**:
  - VPN Service API (built-in)
  - Google Drive API
  - WorkManager (background tasks)
  - Room (local database for conversation cache)
  - Kotlin Coroutines

## Privacy & Security
- All traffic parsing happens on-device
- No data sent to external servers (except Google Drive)
- User controls which conversations are saved
- Encryption in transit (HTTPS)
- Clear privacy policy

## Success Criteria
- Successfully captures conversations from 3+ AI apps
- Auto-saves within 1 minute of 20-minute threshold
- Battery usage < 5% per day
- 99% upload success rate (with retries)
- User can access saved conversations in Drive immediately

## Future Enhancements
- Support for more AI platforms
- Search/browse conversations in-app
- Export formats (PDF, Markdown)
- Conversation tagging/categorization
- Smart summaries of long conversations
