package com.aiconvo.autosave.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.aiconvo.autosave.service.ConversationVpnService
import com.aiconvo.autosave.utils.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val preferencesManager = PreferencesManager(context)

            CoroutineScope(Dispatchers.IO).launch {
                val isEnabled = preferencesManager.isMonitoringEnabled()

                if (isEnabled) {
                    // Restart VPN service after boot
                    val serviceIntent = Intent(context, ConversationVpnService::class.java)
                    context.startService(serviceIntent)
                }
            }
        }
    }
}
