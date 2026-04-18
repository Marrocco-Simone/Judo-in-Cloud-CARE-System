package com.judoincloud.care

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private val PERMISSION_REQUEST_CODE = 100
    private val ALLOWED_ORIGIN = "care.judoincloud.com"
    private val BASE_URL = "https://care.judoincloud.com"
    private val MJPEG_PORT = 8081
    
    // UVC Bridge components
    private var uvcBridge: UvcBridge? = null
    private var mjpegServer: MjpegServer? = null
    private var usbCameraAvailable = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setupFullscreen()
        setContentView(R.layout.activity_main)
        
        webView = findViewById(R.id.webView)
        setupWebView()
        
        // Setup UVC bridge for external USB cameras
        setupUvcBridge()
        
        // Request permissions and load URL based on grant results
        requestPermissions()
    }

    private fun setupFullscreen() {
        supportActionBar?.hide()
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }

    private fun setupWebView() {
        webView.apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                
                // Allow mixed content for local MJPEG server (HTTP localhost inside HTTPS page)
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                allowContentAccess = true
                allowFileAccess = false
                
                userAgentString = settings.userAgentString + " JiC-CARE-Android"
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.let { req ->
                        val origin = req.origin?.host ?: ""
                        
                        // Only allow permissions from trusted origin
                        if (!origin.contains(ALLOWED_ORIGIN)) {
                            req.deny()
                            return
                        }
                        
                        // Check runtime permissions before granting
                        val hasCamera = ContextCompat.checkSelfPermission(
                            this@MainActivity, Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        
                        val hasAudio = ContextCompat.checkSelfPermission(
                            this@MainActivity, Manifest.permission.RECORD_AUDIO
                        ) == PackageManager.PERMISSION_GRANTED
                        
                        val grantedResources = req.resources.filter { resource ->
                            when (resource) {
                                PermissionRequest.RESOURCE_VIDEO_CAPTURE -> hasCamera
                                PermissionRequest.RESOURCE_AUDIO_CAPTURE -> hasAudio
                                else -> false
                            }
                        }.toTypedArray()
                        
                        if (grantedResources.isNotEmpty()) {
                            req.grant(grantedResources)
                        } else {
                            req.deny()
                        }
                    }
                }
                
                override fun onConsoleMessage(message: android.webkit.ConsoleMessage?): Boolean {
                    android.util.Log.d("WebView", "${message?.message()} -- From line ${message?.lineNumber()} of ${message?.sourceId()}")
                    return true
                }
            }
            
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                }
            }
        }
    }

    private fun setupUvcBridge() {
        try {
            mjpegServer = MjpegServer(MJPEG_PORT)
            mjpegServer?.start()
            
            uvcBridge = UvcBridge(this, mjpegServer!!) { isAvailable ->
                usbCameraAvailable = isAvailable
                runOnUiThread {
                    // Reload page with usbCameraUrl if camera becomes available
                    if (isAvailable && webView.url?.contains("usbCameraUrl") != true) {
                        val url = getCareUrl()
                        Toast.makeText(this, "Reloading with USB camera...", Toast.LENGTH_SHORT).show()
                        webView.loadUrl(url)
                    }
                }
            }
            uvcBridge?.start()
        } catch (e: Exception) {
            android.util.Log.e("UvcBridge", "Failed to setup UVC bridge: ${e.message}")
        }
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Build the CARE System URL with appropriate parameters based on:
     * - Audio permission status (fallback to useAudio=false if denied)
     * - USB camera availability (add usbCameraUrl if available)
     */
    private fun getCareUrl(): String {
        val params = mutableListOf<String>()
        
        // Audio fallback: if RECORD_AUDIO not granted, disable audio
        if (!hasAudioPermission()) {
            params.add("useAudio=false")
            android.util.Log.i("MainActivity", "Audio permission not granted, using useAudio=false fallback")
        }
        
        // USB camera: if UVC bridge detected a device, use local MJPEG stream
        if (usbCameraAvailable) {
            params.add("usbCameraUrl=http://127.0.0.1:$MJPEG_PORT")
            android.util.Log.i("MainActivity", "USB camera available, using usbCameraUrl=http://127.0.0.1:$MJPEG_PORT")
        }
        
        return if (params.isEmpty()) {
            BASE_URL
        } else {
            "$BASE_URL?${params.joinToString("&")}"
        }
    }

    private fun requestPermissions() {
        val permissionsToRequest = mutableListOf<String>()
        
        if (!hasCameraPermission()) {
            permissionsToRequest.add(Manifest.permission.CAMERA)
        }
        if (!hasAudioPermission()) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        }
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this, 
                permissionsToRequest.toTypedArray(), 
                PERMISSION_REQUEST_CODE
            )
        } else {
            // All permissions already granted, load URL with parameters
            webView.loadUrl(getCareUrl())
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            // Load URL with appropriate parameters based on actual permission results
            // If audio was denied, getCareUrl() will automatically add useAudio=false
            val url = getCareUrl()
            android.util.Log.i("MainActivity", "Loading URL after permission result: $url")
            webView.loadUrl(url)
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        setupFullscreen()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        uvcBridge?.stop()
        mjpegServer?.stop()
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.destroy()
        super.onDestroy()
    }
}
