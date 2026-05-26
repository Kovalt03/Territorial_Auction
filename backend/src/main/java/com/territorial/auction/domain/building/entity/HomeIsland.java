package com.territorial.auction.domain.building.entity;

import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "home_islands")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class HomeIsland {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer level = 1;

    @Getter(AccessLevel.NONE)
    @Column(nullable = false)
    private Integer gridSize = 10;

    @Getter(AccessLevel.NONE)
    @Column(length = 5)
    private String grade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "island_grade_id")
    private IslandGrade islandGrade;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column private LocalDateTime lastHarvestAt;

    @Builder
    public HomeIsland(User user, Integer level, IslandGrade islandGrade) {
        this.user = user;
        this.level = level != null ? level : 1;
        this.islandGrade = islandGrade;
        this.gridSize = islandGrade != null ? islandGrade.getGridSize() : 10;
        this.grade = islandGrade != null ? islandGrade.getName() : "D";
        this.lastHarvestAt = LocalDateTime.now();
    }

    public int getGridSize() {
        return islandGrade != null ? islandGrade.getGridSize() : gridSize;
    }

    public String getGrade() {
        return islandGrade != null ? islandGrade.getName() : (grade != null ? grade : "D");
    }

    public int getZone1Radius() {
        return islandGrade != null ? islandGrade.getZone1Radius() : 2;
    }

    public int getZone2Radius() {
        return islandGrade != null ? islandGrade.getZone2Radius() : 4;
    }

    public void recordHarvest() {
        this.lastHarvestAt = LocalDateTime.now();
    }

    public void upgradeIsland(IslandGrade newGrade) {
        this.islandGrade = newGrade;
        this.gridSize = newGrade.getGridSize();
        this.grade = newGrade.getName();
    }
}
