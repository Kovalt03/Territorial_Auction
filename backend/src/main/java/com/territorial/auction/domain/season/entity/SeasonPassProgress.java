package com.territorial.auction.domain.season.entity;

import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "season_pass_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "season_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SeasonPassProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @Column(nullable = false)
    private int level;

    @Column(nullable = false)
    private int xp;

    @Builder
    public SeasonPassProgress(User user, Season season) {
        this.user = user;
        this.season = season;
        this.level = 1;
        this.xp = 0;
    }
}
