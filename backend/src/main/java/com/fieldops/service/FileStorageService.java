package com.fieldops.service;

import com.fieldops.exception.BadRequestException;
import com.fieldops.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/** Saves photos to the uploads/ folder and reads them back. Production would use S3-style storage instead. */
@Service
public class FileStorageService {

    static final long MAX_BYTES = 5 * 1024 * 1024;

    // Allowed types and the extension we save them with.
    private static final Map<String, String> EXTENSIONS = Map.of("image/jpeg", ".jpg", "image/png", ".png");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload folder " + root, e);
        }
    }

    /**
     * Checks a photo before anything is saved: allowed type, not empty, max 5 MB, and the
     * file's first bytes really are a JPEG or PNG. The type sent by the client can be faked,
     * so checking the bytes stops, say, a PDF renamed to photo.jpg.
     */
    public void validate(MultipartFile file) {
        String type = file.getContentType();
        if (type == null || !EXTENSIONS.containsKey(type)) {
            throw new BadRequestException("Only JPEG and PNG photos are allowed");
        }
        if (file.isEmpty()) {
            throw new BadRequestException("Photo is empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Photo is larger than 5 MB");
        }
        if (!hasImageSignature(file, type)) {
            throw new BadRequestException("File content is not a valid JPEG or PNG");
        }
    }

    /** Saves the file under a random UUID name and returns that name. Call validate() first. */
    public String store(MultipartFile file) {
        String fileName = UUID.randomUUID() + EXTENSIONS.get(file.getContentType());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save photo", e);
        }
        return fileName;
    }

    public Resource load(String fileName) {
        Path file = root.resolve(fileName).normalize();
        // Defence in depth: never serve anything outside the uploads folder.
        if (!file.startsWith(root) || !Files.isReadable(file)) {
            throw new NotFoundException("Photo not found");
        }
        try {
            return new UrlResource(file.toUri());
        } catch (MalformedURLException e) {
            throw new NotFoundException("Photo not found");
        }
    }

    // JPEG files start with FF D8 FF; PNG files start with 89 50 4E 47 ("\x89PNG").
    private boolean hasImageSignature(MultipartFile file, String type) {
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(4);
            if (head.length < 4) {
                return false;
            }
            if (type.equals("image/jpeg")) {
                return (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF;
            }
            return (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G';
        } catch (IOException e) {
            return false;
        }
    }
}
