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
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private var pendingPermissionRequest: PermissionRequest? = null
    private val PERMISSION_REQUEST_CODE = 100
    private val ALLOWED_ORIGIN = "care.judoincloud.com"
    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setupFullscreen()
        setContentView(R.layout.activity_main)
        
        webView = findViewById(R.id.webView)
        setupWebView()
        
        // Richiedi permessi prima di caricare la pagina
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
                
                // Strict security settings
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
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
                        
                        val grantedResources = req.resources.filter { resource ->
                            resource == PermissionRequest.RESOURCE_VIDEO_CAPTURE ||
                            resource == PermissionRequest.RESOURCE_AUDIO_CAPTURE
                        }.toTypedArray()
                        
                        if (grantedResources.isNotEmpty()) {
                            req.grant(grantedResources)
                        } else {
                            req.deny()
                        }
                    }
                }
                
                override fun onConsoleMessage(message: android.webkit.ConsoleMessage?): Boolean {
                    if (BuildConfig.DEBUG) {
                        android.util.Log.d("WebView", "${message?.message()} -- From line ${message?.lineNumber()} of ${message?.sourceId()}")
                    }
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

    private fun requestPermissions() {
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest, PERMISSION_REQUEST_CODE)
        } else {
            // All permissions already granted, load URL
            webView.loadUrl("https://care.judoincloud.com")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            // Load URL regardless of permission result - web app will request again if needed
            webView.loadUrl("https://care.judoincloud.com")
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
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.destroy()
        super.onDestroy()
    }
}
