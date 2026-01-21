package com.aiconvo.autosave.utils

import com.aiconvo.autosave.data.ConversationRepository
import com.aiconvo.autosave.data.Message
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer

class PacketParser(private val repository: ConversationRepository) {

    private val gson = Gson()

    // Known AI service domains
    private val aiDomains = mapOf(
        "api.openai.com" to "ChatGPT",
        "api.anthropic.com" to "Claude",
        "generativelanguage.googleapis.com" to "Gemini",
        "api.perplexity.ai" to "Perplexity",
        "api.cohere.ai" to "Cohere"
    )

    suspend fun parsePacket(packet: ByteArray) = withContext(Dispatchers.IO) {
        try {
            // Basic IP packet parsing
            if (packet.size < 20) return@withContext

            val buffer = ByteBuffer.wrap(packet)
            val versionAndHeaderLength = buffer.get().toInt()
            val headerLength = (versionAndHeaderLength and 0x0F) * 4

            if (packet.size < headerLength) return@withContext

            // Get protocol (TCP = 6)
            buffer.position(9)
            val protocol = buffer.get().toInt()

            if (protocol != 6) return@withContext // Only process TCP

            // Skip to TCP payload (simplified)
            buffer.position(headerLength + 20) // Skip IP header + basic TCP header

            if (buffer.remaining() < 1) return@withContext

            // Try to extract HTTP/HTTPS payload
            val payload = ByteArray(buffer.remaining())
            buffer.get(payload)

            val payloadString = String(payload, Charsets.UTF_8)

            // Check if this is an HTTP response with JSON
            if (payloadString.contains("HTTP") && payloadString.contains("application/json")) {
                parseHttpResponse(payloadString)
            }
        } catch (e: Exception) {
            // Silent fail - most packets won't be AI conversations
        }
    }

    private suspend fun parseHttpResponse(response: String) {
        try {
            // Extract domain from Host header
            val hostMatch = Regex("Host: ([^\\r\\n]+)").find(response)
            val host = hostMatch?.groupValues?.get(1)?.trim() ?: return

            // Check if this is an AI service
            val aiService = aiDomains[host] ?: return

            // Try to extract JSON body
            val jsonStart = response.indexOf("{")
            if (jsonStart == -1) return

            val jsonBody = response.substring(jsonStart)

            // Parse based on AI service
            when (aiService) {
                "ChatGPT" -> parseOpenAIResponse(jsonBody, aiService)
                "Claude" -> parseAnthropicResponse(jsonBody, aiService)
                "Gemini" -> parseGeminiResponse(jsonBody, aiService)
                else -> parseGenericResponse(jsonBody, aiService)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private suspend fun parseOpenAIResponse(json: String, service: String) {
        try {
            val jsonObject = gson.fromJson(json, JsonObject::class.java)

            // Handle streaming responses
            if (jsonObject.has("choices")) {
                val choices = jsonObject.getAsJsonArray("choices")
                if (choices.size() > 0) {
                    val choice = choices[0].asJsonObject

                    // Get message content
                    val message = if (choice.has("message")) {
                        choice.getAsJsonObject("message")
                    } else if (choice.has("delta")) {
                        choice.getAsJsonObject("delta")
                    } else {
                        return
                    }

                    if (message.has("content")) {
                        val content = message.get("content").asString
                        val role = if (message.has("role")) {
                            message.get("role").asString
                        } else {
                            "assistant"
                        }

                        repository.saveMessage(
                            Message(
                                service = service,
                                role = role,
                                content = content,
                                timestamp = System.currentTimeMillis()
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private suspend fun parseAnthropicResponse(json: String, service: String) {
        try {
            val jsonObject = gson.fromJson(json, JsonObject::class.java)

            if (jsonObject.has("content")) {
                val content = jsonObject.getAsJsonArray("content")
                if (content.size() > 0) {
                    val textBlock = content[0].asJsonObject
                    if (textBlock.has("text")) {
                        val text = textBlock.get("text").asString

                        repository.saveMessage(
                            Message(
                                service = service,
                                role = "assistant",
                                content = text,
                                timestamp = System.currentTimeMillis()
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private suspend fun parseGeminiResponse(json: String, service: String) {
        try {
            val jsonObject = gson.fromJson(json, JsonObject::class.java)

            if (jsonObject.has("candidates")) {
                val candidates = jsonObject.getAsJsonArray("candidates")
                if (candidates.size() > 0) {
                    val candidate = candidates[0].asJsonObject
                    if (candidate.has("content")) {
                        val content = candidate.getAsJsonObject("content")
                        if (content.has("parts")) {
                            val parts = content.getAsJsonArray("parts")
                            if (parts.size() > 0) {
                                val part = parts[0].asJsonObject
                                if (part.has("text")) {
                                    val text = part.get("text").asString

                                    repository.saveMessage(
                                        Message(
                                            service = service,
                                            role = "model",
                                            content = text,
                                            timestamp = System.currentTimeMillis()
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private suspend fun parseGenericResponse(json: String, service: String) {
        // Fallback for other services - just save raw JSON
        try {
            val jsonObject = gson.fromJson(json, JsonObject::class.java)
            repository.saveMessage(
                Message(
                    service = service,
                    role = "response",
                    content = json,
                    timestamp = System.currentTimeMillis()
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
