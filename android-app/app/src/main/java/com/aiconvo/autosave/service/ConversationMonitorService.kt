package com.aiconvo.autosave.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.aiconvo.autosave.AutoSaveApplication
import com.aiconvo.autosave.R
import com.aiconvo.autosave.data.ConversationRepository
import com.aiconvo.autosave.ui.MainActivity
import com.aiconvo.autosave.utils.DriveUploader
import com.aiconvo.autosave.utils.PreferencesManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

class ConversationMonitorService : Service() {

    private var serviceJob: Job? = null
    private lateinit var repository: ConversationRepository
    private lateinit var driveUploader: DriveUploader
    private lateinit var preferencesManager: PreferencesManager

    private var lastCheckTime = 0L
    private val inactivityThreshold = 20 * 60 * 1000L // 20 minutes

    override fun onCreate() {
        super.onCreate()
        repository = ConversationRepository(this)
        driveUploader = DriveUploader(this)
        preferencesManager = PreferencesManager(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startMonitoring()
        return START_STICKY
    }

    private fun startMonitoring() {
        serviceJob?.cancel()
        serviceJob = CoroutineScope(Dispatchers.Default).launch {
            // Monitor last activity time
            repository.lastActivityTime.collectLatest { lastActivityTime ->
                if (lastActivityTime > 0) {
                    lastCheckTime = lastActivityTime

                    // Check inactivity every minute
                    while (isActive) {
                        delay(60_000) // 1 minute

                        val currentTime = System.currentTimeMillis()
                        val inactiveDuration = currentTime - lastCheckTime

                        if (inactiveDuration >= inactivityThreshold) {
                            // 20 minutes of inactivity - trigger save
                            if (repository.hasMessages()) {
                                saveConversation()
                            }
                            lastCheckTime = 0L
                            break
                        }
                    }
                }
            }
        }
    }

    private suspend fun saveConversation() = withContext(Dispatchers.IO) {
        try {
            val conversation = repository.getCurrentConversation() ?: return@withContext

            // Format conversation
            val formattedText = repository.formatConversation(conversation)

            // Upload to Drive
            val uploaded = driveUploader.uploadConversation(
                conversation = conversation,
                content = formattedText
            )

            if (uploaded) {
                // Clear conversation after successful upload
                repository.clearConversation()

                // Show notification
                showUploadNotification(conversation.service)
            } else {
                // Retry later
                delay(5 * 60 * 1000) // Retry in 5 minutes
                saveConversation()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showUploadNotification(service: String) {
        val notification = NotificationCompat.Builder(this, AutoSaveApplication.CHANNEL_UPLOADS)
            .setContentTitle("Conversation Saved")
            .setContentText("$service conversation uploaded to Drive")
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, AutoSaveApplication.CHANNEL_SERVICE)
            .setContentTitle("Monitoring AI Conversations")
            .setContentText("Auto-save after 20 min inactivity")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob?.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val NOTIFICATION_ID = 2
    }
}
