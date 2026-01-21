package com.aiconvo.autosave.utils

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class PreferencesManager(private val context: Context) {

    private object Keys {
        val MONITORING_ENABLED = booleanPreferencesKey("monitoring_enabled")
        val DRIVE_ACCOUNT = stringPreferencesKey("drive_account")
        val INACTIVITY_TIMEOUT = stringPreferencesKey("inactivity_timeout")
    }

    suspend fun setMonitoringEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[Keys.MONITORING_ENABLED] = enabled
        }
    }

    suspend fun isMonitoringEnabled(): Boolean {
        return context.dataStore.data.map { preferences ->
            preferences[Keys.MONITORING_ENABLED] ?: false
        }.first()
    }

    suspend fun setDriveAccount(email: String) {
        context.dataStore.edit { preferences ->
            preferences[Keys.DRIVE_ACCOUNT] = email
        }
    }

    suspend fun getDriveAccount(): String {
        return context.dataStore.data.map { preferences ->
            preferences[Keys.DRIVE_ACCOUNT] ?: ""
        }.first()
    }

    suspend fun clearDriveAccount() {
        context.dataStore.edit { preferences ->
            preferences.remove(Keys.DRIVE_ACCOUNT)
        }
    }

    suspend fun setInactivityTimeout(minutes: Int) {
        context.dataStore.edit { preferences ->
            preferences[Keys.INACTIVITY_TIMEOUT] = minutes.toString()
        }
    }

    suspend fun getInactivityTimeout(): Int {
        return context.dataStore.data.map { preferences ->
            preferences[Keys.INACTIVITY_TIMEOUT]?.toIntOrNull() ?: 20
        }.first()
    }
}
