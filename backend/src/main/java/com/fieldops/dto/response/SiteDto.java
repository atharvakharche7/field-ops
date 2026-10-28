package com.fieldops.dto.response;

import com.fieldops.entity.Site;

import java.math.BigDecimal;

public record SiteDto(Long id, String code, String name, String city, BigDecimal latitude, BigDecimal longitude) {

    public static SiteDto from(Site s) {
        return new SiteDto(s.getId(), s.getCode(), s.getName(), s.getCity(), s.getLatitude(), s.getLongitude());
    }
}
