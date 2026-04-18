package com.judoincloud.care

import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import java.io.ByteArrayOutputStream

object FrameConverter {

    fun convertNv21ToJpeg(
        data: ByteArray,
        width: Int,
        height: Int,
        quality: Int = 85
    ): ByteArray {
        val yuvImage = YuvImage(data, ImageFormat.NV21, width, height, null)
        val outputStream = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, width, height), quality, outputStream)
        return outputStream.toByteArray()
    }

    fun convertYuyvToNv21(yuyv: ByteArray, width: Int, height: Int): ByteArray {
        val frameSize = width * height
        val nv21 = ByteArray(frameSize * 3 / 2)

        var yIndex = 0
        var uvIndex = frameSize

        for (j in 0 until height) {
            for (i in 0 until width step 2) {
                val index = (j * width + i) * 2

                val y0 = yuyv[index].toInt() and 0xFF
                val u = yuyv[index + 1].toInt() and 0xFF
                val y1 = yuyv[index + 2].toInt() and 0xFF
                val v = yuyv[index + 3].toInt() and 0xFF

                nv21[yIndex++] = y0.toByte()
                nv21[yIndex++] = y1.toByte()

                if (j % 2 == 0) {
                    nv21[uvIndex++] = v.toByte()
                    nv21[uvIndex++] = u.toByte()
                }
            }
        }

        return nv21
    }

    fun convertYuyvToJpeg(
        yuyv: ByteArray,
        width: Int,
        height: Int,
        quality: Int = 85
    ): ByteArray {
        val nv21 = convertYuyvToNv21(yuyv, width, height)
        return convertNv21ToJpeg(nv21, width, height, quality)
    }
}
