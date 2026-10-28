package com.fieldops.dto.response;

import com.fieldops.entity.User;
import com.fieldops.entity.enums.Role;

public record UserDto(Long id, String name, String email, Role role) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
