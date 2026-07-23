package com.rahulautospares.store

import android.app.Activity
import android.graphics.Color
import android.media.RingtoneManager
import android.media.Ringtone
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.content.Intent

class OrderAlertActivity : Activity() {

    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        val orderId = intent.getStringExtra("orderId") ?: "New Order"
        val amount = intent.getStringExtra("amount") ?: ""

        buildUI(orderId, amount)
        playAlertSound()
        vibratePhone()
    }

    private fun buildUI(orderId: String, amount: String) {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#060E06"))
            setPadding(60, 60, 60, 60)
        }

        val title = TextView(this).apply {
            text = "New Order!"
            textSize = 32f
            setTextColor(Color.parseColor("#22C55E"))
            gravity = Gravity.CENTER
        }

        val subtitle = TextView(this).apply {
            text = "$orderId  ·  Rs.$amount"
            textSize = 20f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 80)
        }

        val acceptBtn = Button(this).apply {
            text = "VIEW ORDER"
            setBackgroundColor(Color.parseColor("#22C55E"))
            setTextColor(Color.parseColor("#060E06"))
            setOnClickListener {
                stopAlert()
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                startActivity(launchIntent)
                finish()
            }
        }

        val dismissBtn = Button(this).apply {
            text = "DISMISS"
            setBackgroundColor(Color.parseColor("#1A1A1A"))
            setTextColor(Color.WHITE)
            setOnClickListener {
                stopAlert()
                finish()
            }
        }

        val btnParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            180
        ).apply { topMargin = 24 }

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(acceptBtn, btnParams)
        layout.addView(dismissBtn, btnParams)

        setContentView(layout)
    }

    private fun playAlertSound() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            ringtone = RingtoneManager.getRingtone(applicationContext, uri)
            ringtone?.play()
        } catch (e: Exception) {
        }
    }

    private fun vibratePhone() {
        try {
            val pattern = longArrayOf(0, 500, 250, 500, 250, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibrator = vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
            }
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } catch (e: Exception) {
        }
    }

    private fun stopAlert() {
        ringtone?.stop()
        vibrator?.cancel()
    }

    override fun onDestroy() {
        stopAlert()
        super.onDestroy()
    }
}
