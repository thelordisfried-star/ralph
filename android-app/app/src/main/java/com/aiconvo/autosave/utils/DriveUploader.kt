package com.aiconvo.autosave.utils

import android.content.Context
import com.aiconvo.autosave.data.Conversation
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential
import com.google.api.client.http.ByteArrayContent
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import com.google.api.services.drive.DriveScopes
import com.google.api.services.drive.model.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class DriveUploader(private val context: Context) {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.US)
    private val yearFormat = SimpleDateFormat("yyyy", Locale.US)
    private val monthFormat = SimpleDateFormat("MM-MMMM", Locale.US)

    suspend fun uploadConversation(conversation: Conversation, content: String): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val driveService = getDriveService() ?: return@withContext false

                // Create folder structure: AI Conversations/2024/01-January/
                val rootFolderId = getOrCreateFolder(driveService, "AI Conversations", null)
                val date = Date(conversation.startTime)
                val yearFolderId = getOrCreateFolder(
                    driveService,
                    yearFormat.format(date),
                    rootFolderId
                )
                val monthFolderId = getOrCreateFolder(
                    driveService,
                    monthFormat.format(date),
                    yearFolderId
                )

                // Create filename: ChatGPT_2024-01-15_14-30-00.txt
                val timestamp = dateFormat.format(date)
                val fileName = "${conversation.service}_$timestamp.txt"

                // Upload file
                val fileMetadata = File().apply {
                    name = fileName
                    parents = listOf(monthFolderId)
                }

                val mediaContent = ByteArrayContent.fromString("text/plain", content)

                driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute()

                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

    private fun getDriveService(): Drive? {
        val account = GoogleSignIn.getLastSignedInAccount(context) ?: return null

        val credential = GoogleAccountCredential.usingOAuth2(
            context,
            listOf(DriveScopes.DRIVE_FILE)
        )
        credential.selectedAccount = account.account

        return Drive.Builder(
            NetHttpTransport(),
            GsonFactory.getDefaultInstance(),
            credential
        )
            .setApplicationName("AI Convo AutoSave")
            .build()
    }

    private fun getOrCreateFolder(drive: Drive, folderName: String, parentId: String?): String {
        // Search for existing folder
        val query = if (parentId != null) {
            "name='$folderName' and '$parentId' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        } else {
            "name='$folderName' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        }

        val result = drive.files().list()
            .setQ(query)
            .setSpaces("drive")
            .setFields("files(id)")
            .execute()

        // Return existing folder ID if found
        if (result.files.isNotEmpty()) {
            return result.files[0].id
        }

        // Create new folder
        val folderMetadata = File().apply {
            name = folderName
            mimeType = "application/vnd.google-apps.folder"
            if (parentId != null) {
                parents = listOf(parentId)
            }
        }

        val folder = drive.files().create(folderMetadata)
            .setFields("id")
            .execute()

        return folder.id
    }
}
