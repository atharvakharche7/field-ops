package com.fieldops.dto.response;

/** Login body. The token itself travels only in the httpOnly cookie, never in JSON that scripts could read. */
public record LoginResponse(UserDto user) {
}
