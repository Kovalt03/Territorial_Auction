package com.territorial.auction.domain.map.entity;

import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "territories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Territory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer coordX;

    @Column(nullable = false)
    private Integer coordY;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "continent_id")
    private Continent continent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(length = 7)
    private String currentColor;

    private LocalDateTime occupiedUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TerritoryStatus status = TerritoryStatus.IDLE;

    @Column(nullable = false)
    private Integer baseProductionRate = 1;

    private LocalDateTime lastProducedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id")
    private TerritoryGrade grade;

    @Builder
    public Territory(Integer coordX, Integer coordY, Continent continent, TerritoryGrade grade) {
        this.coordX = coordX;
        this.coordY = coordY;
        this.continent = continent;
        this.grade = grade;
    }

    public enum TerritoryStatus {
        BIDDING,
        OCCUPIED,
        IDLE
    }
}
