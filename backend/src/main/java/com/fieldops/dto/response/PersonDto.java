package com.fieldops.dto.response;

import com.fieldops.entity.User;

/** Just id and name, for "assigned to" fields. */
public record PersonDto(Long id, String name) {

    public static PersonDto from(User u) {
        return u == null ? null : new PersonDto(u.getId(), u.getName());
    }
}
