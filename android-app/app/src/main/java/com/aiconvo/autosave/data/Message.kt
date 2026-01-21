package com.aiconvo.autosave.data

data class Message(
    val service: String,
    val role: String,
    val content: String,
    val timestamp: Long
)

data class Conversation(
    val service: String,
    val messages: List<Message>,
    val startTime: Long,
    val lastActivityTime: Long
)
