package com.judoincloud.care

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build

/**
 * UVC Bridge for detecting and streaming from USB cameras.
 * 
 * Note: This is a simplified implementation that uses Android's USB Host API.
 * For full MJPEG streaming from UVC devices, a native library integration would be needed.
 * This implementation provides the architecture and detects USB camera attachment.
 */
class UvcBridge(
    private val context: Context,
    private val mjpegServer: MjpegServer,
    private val onAvailabilityChanged: (Boolean) -> Unit
) {
    private val usbManager: UsbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var isRunning = false
    private var connectedCamera: UsbDevice? = null
    
    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE) as? UsbDevice
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let { onUsbPermissionGranted(it) }
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE) as? UsbDevice
                    device?.let { onDeviceAttached(it) }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE) as? UsbDevice
                    device?.let { onDeviceDetached(it) }
                }
            }
        }
    }

    fun start() {
        if (isRunning) return
        
        isRunning = true
        
        // Register USB broadcast receiver
        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(usbReceiver, filter)
        }
        
        // Check for already connected USB devices
        checkExistingDevices()
        
        android.util.Log.i("UvcBridge", "UVC Bridge started")
    }

    fun stop() {
        isRunning = false
        
        try {
            context.unregisterReceiver(usbReceiver)
        } catch (e: Exception) {
            // Receiver may not be registered
        }
        
        connectedCamera = null
        onAvailabilityChanged(false)
        
        android.util.Log.i("UvcBridge", "UVC Bridge stopped")
    }

    private fun checkExistingDevices() {
        val deviceList = usbManager.deviceList
        for (device in deviceList.values) {
            if (isUvcDevice(device)) {
                onDeviceAttached(device)
                break
            }
        }
    }

    private fun isUvcDevice(device: UsbDevice): Boolean {
        // UVC devices typically have class 239 (Miscellaneous) with subclass 2 (Common Class) 
        // and protocol 1 (Interface Association Descriptor)
        // Or they may expose as class 14 (Video)
        
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            val ifaceClass = iface.interfaceClass
            val ifaceSubclass = iface.interfaceSubclass
            
            // UVC interface: class=14 (Video), subclass=1 (Video Control) or subclass=2 (Video Streaming)
            // Or class=239 (Misc), subclass=2, protocol=1
            if (ifaceClass == 14 || (ifaceClass == 239 && ifaceSubclass == 2)) {
                return true
            }
        }
        
        // Fallback: check if device name contains camera-related terms
        val deviceName = device.productName?.lowercase() ?: ""
        val manufacturer = device.manufacturerName?.lowercase() ?: ""
        
        return deviceName.contains("camera") || 
               deviceName.contains("webcam") ||
               deviceName.contains("uvc") ||
               manufacturer.contains("camera")
    }

    private fun onDeviceAttached(device: UsbDevice) {
        if (!isUvcDevice(device)) return
        
        android.util.Log.i("UvcBridge", "UVC device attached: ${device.productName} (${device.vendorId}:${device.productId})")
        
        if (usbManager.hasPermission(device)) {
            onUsbPermissionGranted(device)
        } else {
            requestUsbPermission(device)
        }
    }

    private fun onDeviceDetached(device: UsbDevice) {
        if (connectedCamera == device) {
            android.util.Log.i("UvcBridge", "UVC device detached: ${device.productName}")
            connectedCamera = null
            onAvailabilityChanged(false)
        }
    }

    private fun requestUsbPermission(device: UsbDevice) {
        val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        )
        usbManager.requestPermission(device, permissionIntent)
    }

    private fun onUsbPermissionGranted(device: UsbDevice) {
        android.util.Log.i("UvcBridge", "USB permission granted for: ${device.productName}")
        connectedCamera = device
        
        // Note: Full UVC streaming implementation would require native code
        // For now, we mark the camera as available so the UI can offer the USB option
        // The actual MJPEG streaming would be handled by a native UVC library
        onAvailabilityChanged(true)
        
        // Start a placeholder frame pusher for testing
        // In a full implementation, this would be replaced by actual UVC frame capture
        startPlaceholderStream()
    }

    private fun startPlaceholderStream() {
        // This is a placeholder that generates a simple test pattern
        // In production, this would be replaced by actual UVC frame capture
        Thread {
            var counter = 0
            while (isRunning && connectedCamera != null) {
                try {
                    // Generate a simple colored test frame as placeholder
                    // In real implementation, this would come from UVC native library
                    val jpegFrame = generateTestFrame(counter++)
                    mjpegServer.pushFrame(jpegFrame)
                    Thread.sleep(33) // ~30 fps
                } catch (e: Exception) {
                    android.util.Log.e("UvcBridge", "Error pushing frame: ${e.message}")
                    break
                }
            }
        }.start()
    }

    private fun generateTestFrame(counter: Int): ByteArray {
        // This is a minimal placeholder - creates a simple colored JPEG
        // In production, this would be replaced by actual camera frames
        
        // Simple 2x2 pixel JPEG (minimal valid JPEG)
        // This is just for testing the pipeline - in production, 
        // actual UVC frames would be captured via native code
        val minimalJpeg = byteArrayOf(
            0xFF.toByte(), 0xD8.toByte(), // SOI
            0xFF.toByte(), 0xE0.toByte(), 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // JFIF header
            0xFF.toByte(), 0xDB.toByte(), 0x00, 0x43, 0x00, // DQT
            0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07,
            0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B,
            0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E,
            0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22,
            0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31,
            0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C,
            0x2E, 0x33, 0x34, 0x32,
            0xFF.toByte(), 0xC0.toByte(), 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, // SOF0 (1x1 pixel)
            0xFF.toByte(), 0xC4.toByte(), 0x00, 0x1F, 0x00, // DHT
            0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
            0xFF.toByte(), 0xDA.toByte(), 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, // SOS
            0xFB.toByte(), 0xD5.toByte(), 0x59, 0x26, // Scan data
            0xFF.toByte(), 0xD9.toByte() // EOI
        )
        
        return minimalJpeg
    }

    companion object {
        private const val ACTION_USB_PERMISSION = "com.judoincloud.care.USB_PERMISSION"
    }
}
