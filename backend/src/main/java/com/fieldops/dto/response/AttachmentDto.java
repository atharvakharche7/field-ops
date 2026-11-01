package com.fieldops.dto.response;

import com.fieldops.entity.Attachment;

/** The app loads the photo from url, sending its token, so photos are never public. */
public record AttachmentDto(Long id, String url, String contentType) {

    public static AttachmentDto from(Attachment a) {
        return new AttachmentDto(a.getId(), "/api/attachments/" + a.getId(), a.getContentType());
    }
}
