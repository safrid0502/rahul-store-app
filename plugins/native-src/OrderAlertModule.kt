package com.rahulautospares.store

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OrderAlertModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OrderAlertModule"

    @ReactMethod
    fun showOrderAlert(orderId: String, amount: String) {
        val intent = Intent(reactApplicationContext, OrderAlertActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("orderId", orderId)
            putExtra("amount", amount)
        }
        reactApplicationContext.startActivity(intent)
    }
}
