package com.territorial.auction.domain.building.entity;

import com.territorial.auction.domain.building.BuildingPolicy;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "building_instances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuildingInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "territory_id")
    private Territory territory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "island_id")
    private HomeIsland island;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_type_id", nullable = false)
    private BuildingType buildingType;

    // 보관함 소유자 — territory/island 둘 다 null일 때(보관 상태) 사용
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User owner;

    @Column(name = "pos_x", nullable = false)
    private Integer posX;

    @Column(name = "pos_y", nullable = false)
    private Integer posY;

    @Column(nullable = false)
    private Integer hp;

    @Column(nullable = false)
    private Integer level = 1;

    @Column(nullable = false)
    private Integer zone;

    @Column(nullable = false)
    private boolean isDestroyed = false;

    // STORAGE 건물만 사용 — DB 스키마에 정의된 필드
    @Column(nullable = false)
    private Integer storedGp = 0;

    // WORKSHOP 파괴 후 일정 시간 생산 중단 — null이면 디버프 없음
    @Column private LocalDateTime workshopDebuffUntil;

    @Builder
    public BuildingInstance(
            Territory territory,
            HomeIsland island,
            BuildingType buildingType,
            User owner,
            Integer posX,
            Integer posY,
            Integer hp,
            Integer zone) {
        this.territory = territory;
        this.island = island;
        this.buildingType = buildingType;
        this.owner = owner;
        this.posX = posX;
        this.posY = posY;
        this.hp = hp;
        this.zone = zone;
    }

    public void upgrade() {
        this.level++;
        this.hp = BuildingPolicy.scaledMaxHp(this.buildingType.getMaxHp(), this.level);
    }

    // 레벨별 지정 HP가 있으면 현재 HP를 그 값으로 맞춘다(업그레이드 직후 풀피).
    public void applyLevelMaxHp(int maxHp) {
        this.hp = maxHp;
    }

    public void repair() {
        this.hp = BuildingPolicy.scaledMaxHp(this.buildingType.getMaxHp(), this.level);
        this.isDestroyed = false;
    }

    public void store(User user) {
        this.owner = user;
        this.territory = null;
        this.island = null;
        this.posX = -1;
        this.posY = -1;
        this.zone = 0;
    }

    public void movePosition(int posX, int posY, int zone) {
        this.posX = posX;
        this.posY = posY;
        this.zone = zone;
    }

    public void placeOnTerritory(Territory territory, int posX, int posY, int zone) {
        this.territory = territory;
        this.island = null;
        this.owner = null;
        this.posX = posX;
        this.posY = posY;
        this.zone = zone;
    }

    public void placeOnIsland(HomeIsland island, int posX, int posY, int zone) {
        this.island = island;
        this.territory = null;
        this.owner = null;
        this.posX = posX;
        this.posY = posY;
        this.zone = zone;
    }

    public boolean isInInventory() {
        return this.territory == null && this.island == null;
    }

    public Long ownerId() {
        if (territory != null && territory.getOwner() != null) {
            return territory.getOwner().getId();
        }
        if (island != null) {
            return island.getUser().getId();
        }
        if (owner != null) {
            return owner.getId();
        }
        return null;
    }

    public void applyWorkshopDebuff(LocalDateTime until) {
        this.workshopDebuffUntil = until;
    }

    public boolean isWorkshopDebuffActive(LocalDateTime now) {
        return workshopDebuffUntil != null && workshopDebuffUntil.isAfter(now);
    }

    public void takeDamage(int damage) {
        this.hp = Math.max(0, this.hp - damage);
        if (this.hp == 0) {
            this.isDestroyed = true;
        }
    }

    public int loot(int amount) {
        int actual = Math.min(amount, this.storedGp);
        this.storedGp -= actual;
        return actual;
    }

    public void addStoredGp(int amount) {
        this.storedGp += amount;
    }

    public LocalDateTime storedAt() {
        return LocalDateTime.now();
    }
}
