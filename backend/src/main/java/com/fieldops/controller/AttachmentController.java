package com.fieldops.controller;

import com.fieldops.security.AppUser;
import com.fieldops.service.UpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final UpdateService updateService;

    // 6. Download a photo. Served through this endpoint (not as a public file) so the access check always runs.
    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        UpdateService.Photo photo = updateService.getPhoto(id, user);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                // "private": the phone may cache it, shared proxies may not.
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePrivate())
                .body(photo.file());
    }
}
