package com.territorial.auction.domain.season.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "season_pass_level_rewards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SeasonPassLevelReward {

    public enum RewardTrack {
        FREE,
        PREMIUM
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private Integer level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RewardTrack track = RewardTrack.FREE;

    @Column(nullable = false, length = 100)
    private String rewardName;

    @Builder
    public SeasonPassLevelReward(
            Season season, Integer level, RewardTrack track, String rewardName) {
        this.season = season;
        this.level = level;
        this.track = track != null ? track : RewardTrack.FREE;
        this.rewardName = rewardName;
    }
}
