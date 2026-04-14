package com.territorial.auction.domain.map.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "continents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Continent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 7)
    private String themeColor;

    @Builder
    public Continent(String name, String themeColor) {
        this.name = name;
        this.themeColor = themeColor;
    }
}
