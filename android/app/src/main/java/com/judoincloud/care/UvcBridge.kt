package com.judoincloud.care

import android.content.Context
import android.hardware.usb.UsbDevice
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.serenegiant.usb.IFrameCallback
import com.serenegiant.usb.USBMonitor
import com.serenegiant.usb.UVCCamera
import java.nio.ByteBuffer

/**
 * UVC Bridge for detecting and streaming from USB cameras.
 *
 * Uses UVCCamera library (org.uvccamera) to capture frames from USB UVC cameras
 * and pushes JPEG frames to the MJPEG server for WebView consumption.
 */
class UvcBridge(
    private val context: Context,
    private val mjpegServer: MjpegServer,
    private val onAvailabilityChanged: (Boolean) -> Unit
) {
    private var isRunning = false
    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private var connectedDevice: UsbDevice? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var frameCount = 0

    private val frameCallback = IFrameCallback { frame ->
        if (!isRunning || frame == null) return@IFrameCallback

        try {
            // Frame is in NV21 format, convert to JPEG
            val data = ByteArray(frame.remaining())
            frame.get(data)
            frame.clear()

            val jpegData = FrameConverter.convertNv21ToJpeg(data, actualWidth, actualHeight, JPEG_QUALITY)
            mjpegServer.pushFrame(jpegData)

            frameCount++
            if (frameCount == 1) {
                mainHandler.post {
                    Toast.makeText(context, "First frame received! (${jpegData.size} bytes)", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("UvcBridge", "Error processing frame: ${e.message}")
        }
    }

    private val onDeviceConnectListener = object : USBMonitor.OnDeviceConnectListener {
        override fun onAttach(device: UsbDevice?) {
            device?.let {
                android.util.Log.i("UvcBridge", "USB device attached: ${it.productName}")
                if (isUvcDevice(it)) {
                    mainHandler.post {
                        Toast.makeText(context, "USB Camera detected: ${it.productName}", Toast.LENGTH_SHORT).show()
                    }
                    usbMonitor?.requestPermission(it)
                }
            }
        }

        override fun onDettach(device: UsbDevice?) {
            device?.let {
                android.util.Log.i("UvcBridge", "USB device detached: ${it.productName}")
                if (connectedDevice?.deviceId == it.deviceId) {
                    stopCamera()
                    mainHandler.post { onAvailabilityChanged(false) }
                }
            }
        }

        override fun onConnect(
            device: UsbDevice?,
            ctrlBlock: USBMonitor.UsbControlBlock?,
            createNew: Boolean
        ) {
            android.util.Log.i("UvcBridge", "USB device connected: ${device?.productName}")
            mainHandler.post {
                Toast.makeText(context, "USB Camera connected!", Toast.LENGTH_SHORT).show()
            }
            device?.let { connectedDevice = it }
            ctrlBlock?.let { startCamera(it) }
        }

        override fun onDisconnect(device: UsbDevice?, ctrlBlock: USBMonitor.UsbControlBlock?) {
            android.util.Log.i("UvcBridge", "USB device disconnected: ${device?.productName}")
            stopCamera()
            mainHandler.post { onAvailabilityChanged(false) }
        }

        override fun onCancel(device: UsbDevice?) {
            android.util.Log.i("UvcBridge", "USB permission cancelled for: ${device?.productName}")
            mainHandler.post {
                Toast.makeText(context, "USB permission denied", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun start() {
        if (isRunning) return

        isRunning = true

        try {
            usbMonitor = USBMonitor(context, onDeviceConnectListener)
            usbMonitor?.register()
            android.util.Log.i("UvcBridge", "UVC Bridge started")
        } catch (e: Exception) {
            android.util.Log.e("UvcBridge", "Failed to start USBMonitor: ${e.message}")
        }
    }

    fun stop() {
        isRunning = false

        stopCamera()

        try {
            usbMonitor?.unregister()
            usbMonitor?.destroy()
            usbMonitor = null
        } catch (e: Exception) {
            android.util.Log.e("UvcBridge", "Error stopping USBMonitor: ${e.message}")
        }

        connectedDevice = null
        android.util.Log.i("UvcBridge", "UVC Bridge stopped")
    }

    private fun startCamera(ctrlBlock: USBMonitor.UsbControlBlock) {
        Thread {
            try {
                // Small delay to ensure USB interface is ready
                Thread.sleep(500)

                // Ensure any previous camera is fully closed
                stopCamera()
                Thread.sleep(200)

                uvcCamera = UVCCamera()
                uvcCamera?.open(ctrlBlock)

                // Get supported sizes and pick the best one
                val supportedSizes = uvcCamera?.supportedSizeList
                android.util.Log.i("UvcBridge", "Supported sizes: $supportedSizes")

                var width = PREVIEW_WIDTH
                var height = PREVIEW_HEIGHT

                // Try to find a supported resolution
                if (supportedSizes != null && supportedSizes.isNotEmpty()) {
                    // Look for 640x480 or closest match
                    val preferred = supportedSizes.find { it.width == 640 && it.height == 480 }
                    val fallback = supportedSizes.firstOrNull()

                    val selected = preferred ?: fallback
                    if (selected != null) {
                        width = selected.width
                        height = selected.height
                    }
                    android.util.Log.i("UvcBridge", "Selected size: ${width}x${height}")
                }

                // Try MJPEG first, then YUYV
                var formatUsed = "MJPEG"
                try {
                    uvcCamera?.setPreviewSize(width, height, UVCCamera.FRAME_FORMAT_MJPEG)
                } catch (e: Exception) {
                    try {
                        uvcCamera?.setPreviewSize(width, height, UVCCamera.FRAME_FORMAT_YUYV)
                        formatUsed = "YUYV"
                    } catch (e2: Exception) {
                        // Try default
                        uvcCamera?.setPreviewSize(width, height, 0)
                        formatUsed = "DEFAULT"
                    }
                }

                android.util.Log.i("UvcBridge", "Using $formatUsed format at ${width}x${height}")

                // Set frame callback
                uvcCamera?.setFrameCallback(frameCallback, UVCCamera.PIXEL_FORMAT_NV21)
                uvcCamera?.startPreview()

                // Update actual dimensions used
                actualWidth = width
                actualHeight = height

                mainHandler.post {
                    onAvailabilityChanged(true)
                    Toast.makeText(context, "Camera: ${width}x${height} ($formatUsed)", Toast.LENGTH_SHORT).show()
                }
                android.util.Log.i("UvcBridge", "Camera preview started at ${width}x${height}")
            } catch (e: Exception) {
                android.util.Log.e("UvcBridge", "Failed to start camera: ${e.message}")
                mainHandler.post {
                    Toast.makeText(context, "Camera error: ${e.message}", Toast.LENGTH_LONG).show()
                }
                stopCamera()
                // Fall back to placeholder
                mainHandler.post { onAvailabilityChanged(true) }
                startPlaceholderStream()
            }
        }.start()
    }

    private var actualWidth = PREVIEW_WIDTH
    private var actualHeight = PREVIEW_HEIGHT

    @Synchronized
    private fun stopCamera() {
        try {
            uvcCamera?.let { camera ->
                try { camera.stopPreview() } catch (e: Exception) {}
                try { camera.setFrameCallback(null, 0) } catch (e: Exception) {}
                try { camera.close() } catch (e: Exception) {}
                try { camera.destroy() } catch (e: Exception) {}
            }
            uvcCamera = null
            frameCount = 0
        } catch (e: Exception) {
            android.util.Log.e("UvcBridge", "Error stopping camera: ${e.message}")
        }
    }

    private fun isUvcDevice(device: UsbDevice): Boolean {
        // UVC devices have class 14 (Video) or class 239 (Misc) with subclass 2
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            val ifaceClass = iface.interfaceClass
            val ifaceSubclass = iface.interfaceSubclass

            if (ifaceClass == 14 || (ifaceClass == 239 && ifaceSubclass == 2)) {
                return true
            }
        }

        // Fallback: check device name
        val deviceName = device.productName?.lowercase() ?: ""
        val manufacturer = device.manufacturerName?.lowercase() ?: ""

        return deviceName.contains("camera") ||
               deviceName.contains("webcam") ||
               deviceName.contains("uvc") ||
               manufacturer.contains("camera")
    }

    private fun startPlaceholderStream() {
        android.util.Log.w("UvcBridge", "Starting placeholder stream (UVC capture unavailable)")

        Thread {
            var counter = 0
            while (isRunning && connectedDevice != null) {
                try {
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
        val minimalJpeg = byteArrayOf(
            0xFF.toByte(), 0xD8.toByte(),
            0xFF.toByte(), 0xE0.toByte(), 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
            0xFF.toByte(), 0xDB.toByte(), 0x00, 0x43, 0x00,
            0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07,
            0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B,
            0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E,
            0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22,
            0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31,
            0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C,
            0x2E, 0x33, 0x34, 0x32,
            0xFF.toByte(), 0xC0.toByte(), 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
            0xFF.toByte(), 0xC4.toByte(), 0x00, 0x1F, 0x00,
            0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
            0xFF.toByte(), 0xDA.toByte(), 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
            0xFB.toByte(), 0xD5.toByte(), 0x59, 0x26,
            0xFF.toByte(), 0xD9.toByte()
        )

        return minimalJpeg
    }

    companion object {
        private const val PREVIEW_WIDTH = 640
        private const val PREVIEW_HEIGHT = 480
        private const val JPEG_QUALITY = 85
    }
}
