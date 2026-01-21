package com.aiconvo.autosave.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.aiconvo.autosave.AutoSaveApplication
import com.aiconvo.autosave.R
import com.aiconvo.autosave.data.ConversationRepository
import com.aiconvo.autosave.ui.MainActivity
import com.aiconvo.autosave.utils.PacketParser
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel

class ConversationVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var serviceJob: Job? = null
    private var isRunning = false

    private lateinit var repository: ConversationRepository
    private lateinit var packetParser: PacketParser

    override fun onCreate() {
        super.onCreate()
        repository = ConversationRepository(this)
        packetParser = PacketParser(repository)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isRunning) {
            startForeground(NOTIFICATION_ID, createNotification())
            startVpn()
        }
        return START_STICKY
    }

    private fun startVpn() {
        stopVpn()

        val builder = Builder()
            .setSession("AI Conversation Monitor")
            .addAddress("10.0.0.2", 24)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("8.8.8.8")
            .setBlocking(false)

        vpnInterface = builder.establish()
        isRunning = true

        serviceJob = CoroutineScope(Dispatchers.IO).launch {
            vpnInterface?.let { tunnelInterface ->
                val inputStream = FileInputStream(tunnelInterface.fileDescriptor)
                val outputStream = FileOutputStream(tunnelInterface.fileDescriptor)
                val buffer = ByteBuffer.allocate(32767)

                try {
                    while (isActive && isRunning) {
                        buffer.clear()
                        val length = inputStream.channel.read(buffer)

                        if (length > 0) {
                            buffer.flip()
                            val packet = ByteArray(length)
                            buffer.get(packet)

                            // Parse packet and check if it's from an AI service
                            launch {
                                packetParser.parsePacket(packet)
                            }

                            // Forward packet (write back to tunnel)
                            buffer.rewind()
                            outputStream.channel.write(buffer)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        // Start the monitoring service
        val monitorIntent = Intent(this, ConversationMonitorService::class.java)
        startService(monitorIntent)
    }

    private fun stopVpn() {
        isRunning = false
        serviceJob?.cancel()
        serviceJob = null
        vpnInterface?.close()
        vpnInterface = null
    }

    override fun onDestroy() {
        super.onDestroy()
        stopVpn()

        // Stop the monitoring service
        val monitorIntent = Intent(this, ConversationMonitorService::class.java)
        stopService(monitorIntent)
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, AutoSaveApplication.CHANNEL_SERVICE)
            .setContentTitle("AI Conversation Monitor")
            .setContentText("Monitoring AI conversations")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 1
    }
}
