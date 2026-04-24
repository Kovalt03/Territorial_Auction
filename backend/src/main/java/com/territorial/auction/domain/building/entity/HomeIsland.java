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

    @Column(nullable = false)
    private Integer gridSize = 10;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public HomeIsland(User user, Integer level, Integer gridSize) {
        this.user = user;
        this.level = level != null ? level : 1;
        this.gridSize = gridSize != null ? gridSize : 10;
    }
}
