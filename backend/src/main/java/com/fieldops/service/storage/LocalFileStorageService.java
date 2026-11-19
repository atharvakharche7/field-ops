package com.fieldops.service.storage;

import com.fieldops.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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

/**
 * Development storage: photos go to the uploads/ folder on this machine.
 * Used when app.storage.type=local, which is also the default if the setting is missing.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    private final Path root;

    public LocalFileStorageService(@Value("${app.upload-dir}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload folder " + root, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        String fileName = FileStorageService.newFileName(file);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save photo", e);
        }
        return fileName;
    }

    @Override
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
}
