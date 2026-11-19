package com.fieldops.service.storage;

import com.fieldops.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * Production storage: photos go to a private Supabase Storage bucket (the same idea as AWS S3).
 * Used when app.storage.type=supabase. Free hosts like Render wipe their disk on every restart,
 * so the uploads/ folder can't be used there.
 *
 * The bucket is private and the service key stays on this server, so the only way to see a photo
 * is still GET /api/attachments/{id}, which runs the access check first.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "supabase")
public class SupabaseFileStorageService implements FileStorageService {

    private final RestClient restClient;

    public SupabaseFileStorageService(@Value("${app.supabase.url}") String supabaseUrl,
                                      @Value("${app.supabase.service-key}") String serviceKey,
                                      @Value("${app.supabase.bucket}") String bucket) {
        if (supabaseUrl.isBlank() || serviceKey.isBlank()) {
            // Fail at startup, not on the first photo upload.
            throw new IllegalStateException("STORAGE_TYPE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_KEY");
        }
        RestClient.Builder builder = RestClient.builder()
                // Every call below is relative to this, e.g. POST .../object/attachments/<fileName>
                .baseUrl(supabaseUrl.replaceAll("/+$", "") + "/storage/v1/object/" + bucket)
                .defaultHeader("apikey", serviceKey);
        // Older Supabase keys are JWTs (they start with "eyJ") and also go in the Authorization header.
        // Newer "sb_secret_..." keys go only in the apikey header.
        if (serviceKey.startsWith("eyJ")) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceKey);
        }
        this.restClient = builder.build();
    }

    @Override
    public String store(MultipartFile file) {
        String fileName = FileStorageService.newFileName(file);
        try {
            restClient.post()
                    .uri("/{fileName}", fileName)
                    .contentType(MediaType.parseMediaType(file.getContentType()))
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity(); // throws if Supabase answers with an error status
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read photo", e);
        }
        return fileName;
    }

    @Override
    public Resource load(String fileName) {
        byte[] bytes = restClient.get()
                .uri("/{fileName}", fileName)
                .retrieve()
                // Supabase answers a missing file with 400 or 404, depending on the case.
                .onStatus(s -> s.value() == 400 || s.value() == 404, (req, res) -> {
                    throw new NotFoundException("Photo not found");
                })
                .body(byte[].class);
        if (bytes == null) {
            throw new NotFoundException("Photo not found");
        }
        return new ByteArrayResource(bytes);
    }
}
