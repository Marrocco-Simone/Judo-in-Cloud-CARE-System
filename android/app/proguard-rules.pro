# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep WebView JS interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebViewClient
-keep class * extends android.webkit.WebViewClient

# Keep WebChromeClient  
-keep class * extends android.webkit.WebChromeClient

# Keep MainActivity
-keep class com.judoincloud.care.MainActivity { *; }
