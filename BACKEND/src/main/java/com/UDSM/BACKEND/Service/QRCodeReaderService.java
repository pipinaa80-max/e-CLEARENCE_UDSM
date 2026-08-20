package com.UDSM.BACKEND.Service;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.ReaderException;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

@Service
public class QRCodeReaderService {

    public String readQRCode(byte[] imageBytes) throws IOException {

        if (imageBytes == null || imageBytes.length == 0) {
            throw new IllegalArgumentException(
                    "QR code image cannot be empty"
            );
        }

        ByteArrayInputStream inputStream =
                new ByteArrayInputStream(imageBytes);

        BufferedImage bufferedImage =
                ImageIO.read(inputStream);

        if (bufferedImage == null) {
            throw new IOException(
                    "Unable to read the uploaded image"
            );
        }

        BufferedImageLuminanceSource source =
                new BufferedImageLuminanceSource(bufferedImage);

        HybridBinarizer binarizer =
                new HybridBinarizer(source);

        BinaryBitmap bitmap =
                new BinaryBitmap(binarizer);

        MultiFormatReader reader =
                new MultiFormatReader();

        try {

            Result result = reader.decode(bitmap);

            return result.getText();

        } catch (ReaderException e) {

            throw new IOException(
                    "Unable to decode QR code. Make sure the uploaded image contains a valid QR code.",
                    e
            );
        }
    }
}
