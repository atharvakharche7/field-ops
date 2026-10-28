package com.fieldops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "sites")
@Getter
@Setter
@NoArgsConstructor
public class Site {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 60)
    private String city;

    // DECIMAL(9,6): up to 3 digits before the point and 6 after, about 10 cm precision.
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    public Site(String code, String name, String city, BigDecimal latitude, BigDecimal longitude) {
        this.code = code;
        this.name = name;
        this.city = city;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
