package com.aiconvo.autosave.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class ConversationRepository(private val context: Context) {

    private val mutex = Mutex()
    private val currentMessages = mutableListOf<Message>()

    private val _lastActivityTime = MutableStateFlow(0L)
    val lastActivityTime: StateFlow<Long> = _lastActivityTime.asStateFlow()

    private val _messageCount = MutableStateFlow(0)
    val messageCount: StateFlow<Int> = _messageCount.asStateFlow()

    suspend fun saveMessage(message: Message) = mutex.withLock {
        currentMessages.add(message)
        _lastActivityTime.value = System.currentTimeMillis()
        _messageCount.value = currentMessages.size
    }

    suspend fun getCurrentConversation(): Conversation? = mutex.withLock {
        if (currentMessages.isEmpty()) return@withLock null

        val service = currentMessages.firstOrNull()?.service ?: "Unknown"
        val startTime = currentMessages.firstOrNull()?.timestamp ?: 0L
        val lastTime = currentMessages.lastOrNull()?.timestamp ?: 0L

        Conversation(
            service = service,
            messages = currentMessages.toList(),
            startTime = startTime,
            lastActivityTime = lastTime
        )
    }

    suspend fun clearConversation() = mutex.withLock {
        currentMessages.clear()
        _messageCount.value = 0
    }

    suspend fun hasMessages(): Boolean = mutex.withLock {
        currentMessages.isNotEmpty()
    }

    fun formatConversation(conversation: Conversation): String {
        val sb = StringBuilder()

        sb.appendLine("=" .repeat(60))
        sb.appendLine("AI Conversation - ${conversation.service}")
        sb.appendLine("Started: ${formatTimestamp(conversation.startTime)}")
        sb.appendLine("Last Activity: ${formatTimestamp(conversation.lastActivityTime)}")
        sb.appendLine("=" .repeat(60))
        sb.appendLine()

        conversation.messages.forEach { message ->
            sb.appendLine("[${message.role.uppercase()}] - ${formatTimestamp(message.timestamp)}")
            sb.appendLine(message.content)
            sb.appendLine()
            sb.appendLine("-".repeat(60))
            sb.appendLine()
        }

        return sb.toString()
    }

    private fun formatTimestamp(timestamp: Long): String {
        val date = java.util.Date(timestamp)
        val format = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US)
        return format.format(date)
    }
}
