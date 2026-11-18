package com.UDSM.BACKEND.Controller;


import com.UDSM.BACKEND.Service.QRCodeReaderService;
import com.UDSM.BACKEND.Service.QRCodeService;
import com.google.zxing.WriterException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/qr")
public class QRCodeController {

    private final QRCodeService qrCodeService;
    private final QRCodeReaderService qrCodeReaderService;

    public QRCodeController(
            QRCodeService qrCodeService,
            QRCodeReaderService qrCodeReaderService
    ) {
        this.qrCodeService = qrCodeService;
        this.qrCodeReaderService = qrCodeReaderService;
    }

    @GetMapping(value = "/generate", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generateQRCode(
            @RequestParam("text") String text
    ) throws WriterException, IOException {

        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        // Protect against DoS by capping allowable text length for QR generation
        if (text.length() > 1024) {
            return ResponseEntity.badRequest().build();
        }

        byte[] qrCode = qrCodeService.generateQRCode(text);

        return ResponseEntity
                .ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(qrCode);
    }

    @PostMapping(value = "/read", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> readQRCode(
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body("QR code image is required");
        }

        // Limit uploaded QR file size to 5MB to prevent memory exhaustion
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity
                    .badRequest()
                    .body("QR code image file size must not exceed 5MB");
        }

        String result = qrCodeReaderService.readQRCode(file.getBytes());

        return ResponseEntity.ok(result);
    }
}