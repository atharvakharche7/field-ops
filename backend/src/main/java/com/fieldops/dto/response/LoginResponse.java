package com.fieldops.dto.response;

public record LoginResponse(String token, UserDto user) {
}
