package com.judoincloud.care

import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Minimal MJPEG HTTP server for streaming USB camera frames locally.
 * Runs on localhost only (loopback) for internal consumption by WebView.
 */
class MjpegServer(private val port: Int = 8081) {
    private val clients = CopyOnWriteArrayList<OutputStream>()
    private var serverSocket: ServerSocket? = null
    private var running = false
    private var serverThread: Thread? = null

    fun start() {
        if (running) return
        
        running = true
        serverThread = Thread {
            try {
                serverSocket = ServerSocket(port)
                android.util.Log.i("MjpegServer", "Server started on port $port")
                
                while (running) {
                    try {
                        val client = serverSocket?.accept() ?: break
                        handleClient(client)
                    } catch (e: Exception) {
                        if (running) {
                            android.util.Log.e("MjpegServer", "Error accepting client: ${e.message}")
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MjpegServer", "Server error: ${e.message}")
            }
        }.apply { start() }
    }

    fun stop() {
        running = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            // Ignore
        }
        
        // Close all client connections
        clients.forEach { 
            try { it.close() } catch (e: Exception) { }
        }
        clients.clear()
        
        serverThread?.interrupt()
        android.util.Log.i("MjpegServer", "Server stopped")
    }

    fun pushFrame(jpegData: ByteArray) {
        if (!running || clients.isEmpty()) return
        
        val header = "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpegData.size}\r\n\r\n"
        val headerBytes = header.toByteArray()
        val footerBytes = "\r\n".toByteArray()
        
        clients.forEach { out ->
            try {
                out.write(headerBytes)
                out.write(jpegData)
                out.write(footerBytes)
                out.flush()
            } catch (e: Exception) {
                // Client disconnected
                clients.remove(out)
                try { out.close() } catch (e: Exception) { }
            }
        }
    }

    private fun handleClient(socket: Socket) {
        Thread {
            try {
                val out = socket.getOutputStream()
                
                // Send HTTP headers for MJPEG stream
                val headers = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n" +
                        "Cache-Control: no-cache\r\n" +
                        "Pragma: no-cache\r\n" +
                        "Connection: close\r\n\r\n"
                
                out.write(headers.toByteArray())
                out.flush()
                
                clients.add(out)
                android.util.Log.i("MjpegServer", "Client connected: ${socket.inetAddress}")
                
                // Keep connection alive until client disconnects or server stops
                while (running && !socket.isClosed) {
                    try {
                        Thread.sleep(100)
                    } catch (e: InterruptedException) {
                        break
                    }
                }
            } catch (e: Exception) {
                // Client disconnected or error
            } finally {
                try { socket.close() } catch (e: Exception) { }
            }
        }.start()
    }
}
