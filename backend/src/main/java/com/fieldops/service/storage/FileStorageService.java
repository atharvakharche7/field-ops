package com.fieldops.service.storage;

import com.fieldops.exception.BadRequestException;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

/**
 * Where photos are kept. The rest of the app only talks to this interface, so it doesn't
 * know or care whether photos go to a local folder or to Supabase Storage.
 * The "app.storage.type" setting picks the implementation at startup:
 * "local" → LocalFileStorageService, "supabase" → SupabaseFileStorageService.
 */
public interface FileStorageService {

    long MAX_BYTES = 5 * 1024 * 1024;

    // Allowed types and the extension we save them with.
    Map<String, String> EXTENSIONS = Map.of("image/jpeg", ".jpg", "image/png", ".png");

    /** Saves the file and returns its stored name. Call validate() first. */
    String store(MultipartFile file);

    /** Reads a stored photo back. Throws NotFoundException if it's missing. */
    Resource load(String fileName);

    /**
     * Checks a photo before anything is saved: allowed type, not empty, max 5 MB, and the
     * file's first bytes really are a JPEG or PNG. The type sent by the client can be faked,
     * so checking the bytes stops, say, a PDF renamed to photo.jpg.
     * The rules are the same wherever photos are stored, so they live here once.
     */
    default void validate(MultipartFile file) {
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

    /** A random UUID name, so users can't overwrite files or guess other photos' names. */
    static String newFileName(MultipartFile file) {
        return UUID.randomUUID() + EXTENSIONS.get(file.getContentType());
    }

    // JPEG files start with FF D8 FF; PNG files start with 89 50 4E 47 ("\x89PNG").
    private static boolean hasImageSignature(MultipartFile file, String type) {
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
