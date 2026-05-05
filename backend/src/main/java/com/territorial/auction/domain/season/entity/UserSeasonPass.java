package com.territorial.auction.domain.season.entity;

import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "user_season_passes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSeasonPass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_pass_id", nullable = false)
    private SeasonPass seasonPass;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder
    public UserSeasonPass(
            User user, SeasonPass seasonPass, LocalDateTime startedAt, LocalDateTime expiresAt) {
        this.user = user;
        this.seasonPass = seasonPass;
        this.startedAt = startedAt;
        this.expiresAt = expiresAt;
    }

    public void extend(int days) {
        this.expiresAt = this.expiresAt.plusDays(days);
    }
}
