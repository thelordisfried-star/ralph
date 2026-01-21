package com.aiconvo.autosave

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class AutoSaveApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_SERVICE,
                    "Monitoring Service",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Shows when AI conversation monitoring is active"
                },
                NotificationChannel(
                    CHANNEL_UPLOADS,
                    "Uploads",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Notifications for conversation uploads to Drive"
                }
            )

            val notificationManager = getSystemService(NotificationManager::class.java)
            channels.forEach { notificationManager.createNotificationChannel(it) }
        }
    }

    companion object {
        const val CHANNEL_SERVICE = "monitoring_service"
        const val CHANNEL_UPLOADS = "uploads"
    }
}
