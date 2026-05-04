package com.territorial.auction.domain.season.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "season_pass_level_rewards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SeasonPassLevelReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private Integer level;

    @Column(nullable = false, length = 100)
    private String rewardName;

    @Builder
    public SeasonPassLevelReward(Season season, Integer level, String rewardName) {
        this.season = season;
        this.level = level;
        this.rewardName = rewardName;
    }
}
