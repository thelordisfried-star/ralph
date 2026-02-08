# AI Orchestration Toolkit

A Chrome extension that enables seamless orchestration between multiple AI services (ChatGPT, Claude, Gemini) for creating conversational workflows where each AI can respond to the previous AI's output.

## Features

- **Automatic AI Detection**: Automatically detects and registers open tabs for ChatGPT, Claude, and Gemini
- **Seamless Orchestration**: Enables conversational workflows that flow between different AI services
- **Real-time Conversation Log**: View the entire conversation flow in real-time through the popup interface
- **Enhanced Error Handling**: Robust error handling with clear user feedback
- **Improved Connection Reliability**: Better connection management between components
- **Conversation Persistence**: Save and recall previous conversations
- **Intuitive UI Controls**: Simple interface with start, pause, and reset functionality

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `ai-orchestrator` directory
5. The extension icon should now appear in your Chrome toolbar

## Usage

1. Open tabs for the AI services you want to use (ChatGPT, Claude, Gemini)
2. Click the extension icon to open the popup interface
3. Enter your initial prompt in the text area
4. Click "Start Conversation" to begin the orchestrated workflow
5. Watch as each AI responds to the previous AI's output in real-time
6. Use "Pause" to temporarily stop the conversation flow
7. Use "Reset" to clear the conversation and start fresh
8. Save conversations with a custom name for later retrieval

## How It Works

1. **AI Detection**: When you open an AI service tab, the content script automatically detects and registers the service with the background script
2. **Conversation Orchestration**: The background script manages the conversation flow, sending prompts to each AI in sequence
3. **Context Preservation**: Each AI receives the complete conversation history to maintain context
4. **Response Extraction**: Content scripts extract responses from each AI service using robust detection methods
5. **Real-time Monitoring**: The popup interface displays real-time conversation updates

## Troubleshooting

If you experience issues with the extension, try these solutions:

1. **Extension Not Detecting AI Tabs**:
   - Ensure you're on the actual chat pages of the AI services (not homepages)
   - Refresh the AI service tabs after installing the extension
   - Check that the extension has permission to access all websites in Chrome's extension settings

2. **Text Injection Not Working**:
   - Try refreshing the AI service tabs
   - Check that you're using the latest version of the extension
   - Some AI services may have updated their UI - the extension uses multiple fallback selectors for robustness

3. **Responses Not Being Extracted**:
   - Wait a bit longer for responses to appear (some AI services are slower than others)
   - Check the browser console for error messages (Ctrl+Shift+J)
   - The extension now includes retry mechanisms with shorter intervals for better performance

4. **Conversation Not Progressing**:
   - Check the browser console for detailed error messages
   - Ensure all AI service tabs remain open during the conversation
   - The enhanced error reporting now provides clearer feedback in the popup UI

5. **Connection Issues**:
   - The extension now includes improved timeout handling with better retry mechanisms
   - Check that all AI service tabs are still active and haven't crashed

## Technical Details

### Architecture

The extension consists of four main components:

1. **Manifest File**: Defines extension metadata, permissions, and entry points
2. **Content Scripts**: Run on AI service pages to interact with their DOM
3. **Background Script**: Manages conversation state and coordination between services
4. **Popup Interface**: Provides user controls and conversation monitoring

### Communication Flow

1. Content scripts detect AI service pages and register with the background script
2. User initiates conversation through popup interface
3. Background script orchestrates message passing between services
4. Content scripts handle text injection and extraction on AI service pages
5. Popup interface displays real-time conversation updates

### Selectors

The content script uses service-specific selectors with multiple fallback options for robustness:

- **ChatGPT**: Targets prompt textarea and send button elements with fallback selectors
- **Claude**: Identifies contenteditable input areas and send controls with composition event support
- **Gemini**: Locates input fields and submission buttons with enhanced detection

These selectors are regularly updated to maintain compatibility with evolving AI service interfaces.

### Performance Improvements

1. **Enhanced Retry Mechanisms**: Reduced wait times between retries for faster response handling
2. **Improved Connection Reliability**: Better tab existence checking before sending messages
3. **Optimized State Management**: More efficient storage and retrieval of conversation state
4. **Better UI Feedback**: Visual indicators for loading states and error messages

## Supported AI Services

- OpenAI ChatGPT (https://chat.openai.com)
- Anthropic Claude (https://claude.ai)
- Google Gemini (https://gemini.google.com)

## Limitations

- Requires manual installation as an unpacked extension
- Depends on specific selectors for each AI service, which may occasionally break
- Basic response detection mechanism that may not work for all scenarios
- No automatic refresh of AI service tabs

## Future Enhancements

- Enhanced response detection algorithms with AI-powered element recognition
- Conversation persistence using Chrome storage for cross-session saving
- Customizable orchestration sequences with drag-and-drop interface
- Support for additional AI services like Bard, Bing Chat, and more
- Advanced context management strategies with selective history pruning
- Voice control integration for hands-free operation

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests for improvements, especially for:
- Adding support for new AI services
- Improving selector robustness
- Enhancing error handling and recovery
- Optimizing performance and reducing latency
- Expanding UI feedback and error reporting

## License

This project is licensed under the MIT License - see the LICENSE file for details.
