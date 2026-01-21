package com.aiconvo.autosave.ui

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.widget.Button
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.aiconvo.autosave.R
import com.aiconvo.autosave.service.ConversationVpnService
import com.aiconvo.autosave.utils.PreferencesManager
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import com.google.api.services.drive.DriveScopes
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var googleSignInClient: GoogleSignInClient

    private lateinit var statusText: TextView
    private lateinit var monitoringSwitch: Switch
    private lateinit var driveButton: Button
    private lateinit var accountText: TextView

    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            startVpnService()
        } else {
            Toast.makeText(this, "VPN permission denied", Toast.LENGTH_SHORT).show()
            monitoringSwitch.isChecked = false
        }
    }

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.let { handleSignInResult(it) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        preferencesManager = PreferencesManager(this)
        setupGoogleSignIn()
        setupViews()
        updateUI()
    }

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(DriveScopes.DRIVE_FILE))
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    private fun setupViews() {
        statusText = findViewById(R.id.statusText)
        monitoringSwitch = findViewById(R.id.monitoringSwitch)
        driveButton = findViewById(R.id.driveButton)
        accountText = findViewById(R.id.accountText)

        monitoringSwitch.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                requestVpnPermission()
            } else {
                stopVpnService()
            }
        }

        driveButton.setOnClickListener {
            if (isSignedIn()) {
                signOut()
            } else {
                signIn()
            }
        }
    }

    private fun requestVpnPermission() {
        val intent = VpnService.prepare(this)
        if (intent != null) {
            vpnPermissionLauncher.launch(intent)
        } else {
            startVpnService()
        }
    }

    private fun startVpnService() {
        lifecycleScope.launch {
            preferencesManager.setMonitoringEnabled(true)
            val intent = Intent(this@MainActivity, ConversationVpnService::class.java)
            startService(intent)
            updateUI()
        }
    }

    private fun stopVpnService() {
        lifecycleScope.launch {
            preferencesManager.setMonitoringEnabled(false)
            val intent = Intent(this@MainActivity, ConversationVpnService::class.java)
            stopService(intent)
            updateUI()
        }
    }

    private fun signIn() {
        val signInIntent = googleSignInClient.signInIntent
        googleSignInLauncher.launch(signInIntent)
    }

    private fun signOut() {
        googleSignInClient.signOut().addOnCompleteListener {
            lifecycleScope.launch {
                preferencesManager.clearDriveAccount()
                updateUI()
            }
        }
    }

    private fun handleSignInResult(data: Intent) {
        GoogleSignIn.getSignedInAccountFromIntent(data)
            .addOnSuccessListener { account ->
                lifecycleScope.launch {
                    preferencesManager.setDriveAccount(account.email ?: "")
                    updateUI()
                    Toast.makeText(
                        this@MainActivity,
                        "Connected to Google Drive",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
            .addOnFailureListener { e ->
                Toast.makeText(
                    this,
                    "Failed to sign in: ${e.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
    }

    private fun isSignedIn(): Boolean {
        return GoogleSignIn.getLastSignedInAccount(this) != null
    }

    private fun updateUI() {
        lifecycleScope.launch {
            val isMonitoring = preferencesManager.isMonitoringEnabled()
            val account = preferencesManager.getDriveAccount()

            monitoringSwitch.isChecked = isMonitoring
            statusText.text = if (isMonitoring) {
                "Monitoring active"
            } else {
                "Monitoring paused"
            }

            if (account.isNotEmpty()) {
                accountText.text = "Connected: $account"
                driveButton.text = "Disconnect Drive"
            } else {
                accountText.text = "Not connected"
                driveButton.text = "Connect Google Drive"
            }
        }
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }
}
