package com.territorial.auction.domain.military.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.military.entity.SiegeEvent;
import com.territorial.auction.domain.military.entity.SiegeResult;
import com.territorial.auction.domain.military.entity.UnitInstance;
import com.territorial.auction.domain.military.entity.UnitType;
import com.territorial.auction.domain.military.event.CastleDestroyedEvent;
import com.territorial.auction.domain.military.event.SiegeVictoryEvent;
import com.territorial.auction.domain.military.repository.SiegeResultRepository;
import com.territorial.auction.domain.military.repository.UnitInstanceRepository;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class SiegeServiceTest {

    @InjectMocks private SiegeService siegeService;

    @Mock private SiegeResultRepository siegeResultRepository;
    @Mock private UnitInstanceRepository unitInstanceRepository;
    @Mock private BuildingInstanceRepository buildingInstanceRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private SiegeEvent event;
    private User attacker;
    private User defender;
    private Territory territory;

    @BeforeEach
    void setUp() {
        TransactionSynchronizationManager.initSynchronization();
        // 공격자 패배 케이스에서 findActiveSeason이 호출되지 않으므로 UnnecessaryStubbingException 방지
        lenient()
                .when(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        attacker = mock(User.class);
        given(attacker.getId()).willReturn(1L);

        defender = mock(User.class);
        given(defender.getId()).willReturn(2L);

        territory = mock(Territory.class);
        given(territory.getId()).willReturn(10L);

        event = mock(SiegeEvent.class);
        given(event.getId()).willReturn(100L);
        given(event.getAttacker()).willReturn(attacker);
        given(event.getDefender()).willReturn(defender);
        given(event.getTargetTerritory()).willReturn(territory);
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    private UnitInstance makeUnit(int attackPower, int defensePower, int quantity) {
        UnitType unitType =
                UnitType.builder()
                        .name("INFANTRY")
                        .attackPower(attackPower)
                        .defensePower(defensePower)
                        .costGp(100)
                        .foodCost(1)
                        .level(1)
                        .build();
        return UnitInstance.builder().user(attacker).unitType(unitType).quantity(quantity).build();
    }

    private BuildingInstance makeBuilding(
            String typeName,
            int maxHp,
            int currentHp,
            Integer defensePower,
            int storedGp,
            int zone) {
        BuildingType buildingType =
                BuildingType.builder()
                        .name(typeName)
                        .width(1)
                        .height(1)
                        .maxHp(maxHp)
                        .baseCostGp(100)
                        .zoneRestriction(null)
                        .defensePower(defensePower)
                        .build();
        BuildingInstance building =
                BuildingInstance.builder()
                        .territory(territory)
                        .buildingType(buildingType)
                        .posX(0)
                        .posY(0)
                        .hp(currentHp)
                        .zone(zone)
                        .build();
        ReflectionTestUtils.setField(building, "storedGp", storedGp);
        return building;
    }

    @Nested
    @DisplayName("resolveOneSiege")
    class ResolveOneSiege {

        @Test
        @DisplayName("Zone 3 공격 성공 → LOOT, Storage storedGp 50% 약탈 후 공격자 Wallet 이전")
        void resolveOneSiege_zone3_attackerWins_loots() {
            // given
            given(event.getAttackZone()).willReturn(3);

            UnitInstance attackerUnit = makeUnit(100, 0, 10); // ATK = 1000
            UnitInstance defenderUnit = makeUnit(0, 50, 5); // DEF = 250 → 공격자 승

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of(defenderUnit));

            // storedGp=1000, defensePower=null → DEF 계산에서 제외, loot 대상
            BuildingInstance storage = makeBuilding("STORAGE", 200, 200, null, 1000, 3);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of(storage));

            Wallet wallet = mock(Wallet.class);
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            // when
            siegeService.resolveOneSiege(event);

            // then — 500GP(50%) 약탈
            then(wallet).should().addGp(500);
            assertThat(storage.getStoredGp()).isEqualTo(500);

            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getIsAttackerWin()).isTrue();
            assertThat(captor.getValue().getResultType()).isEqualTo(SiegeResult.ResultType.LOOT);
            assertThat(captor.getValue().getLootedGp()).isEqualTo(500);
            then(event).should().resolve();
        }

        @Test
        @DisplayName("Zone 3 공격 성공, Storage storedGp = 0 → lootedGp = 0, Wallet 미접근")
        void resolveOneSiege_zone3_emptyStorage_lootedGpZero() {
            // given
            given(event.getAttackZone()).willReturn(3);

            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());
            BuildingInstance emptyStorage = makeBuilding("STORAGE", 200, 200, null, 0, 3);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of(emptyStorage));

            // when
            siegeService.resolveOneSiege(event);

            // then — totalLooted=0, walletRepository 미호출
            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getLootedGp()).isZero();
            then(walletRepository).should(never()).findById(any());
        }

        @Test
        @DisplayName("Zone 2 공격 성공 → DEBUFF, Zone 2 건물 HP maxHp/2 감소")
        void resolveOneSiege_zone2_attackerWins_debuffs() {
            // given
            given(event.getAttackZone()).willReturn(2);

            UnitInstance attackerUnit = makeUnit(100, 0, 10); // ATK = 1000
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());

            // Workshop maxHp=200, HP=200 → 데미지 100 → 잔여 HP=100
            BuildingInstance workshop = makeBuilding("WORKSHOP", 200, 200, null, 0, 2);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 2))
                    .willReturn(List.of(workshop));

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(workshop.getHp()).isEqualTo(100);
            assertThat(workshop.isDestroyed()).isFalse();
            assertThat(workshop.getWorkshopDebuffUntil()).isNull(); // 파괴 안 됐으면 디버프 없음

            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getResultType()).isEqualTo(SiegeResult.ResultType.DEBUFF);
        }

        @Test
        @DisplayName("Zone 2 공격 성공, WORKSHOP HP 0 → isDestroyed=true, workshopDebuffUntil 설정")
        void resolveOneSiege_zone2_workshopDestroyed_debuffApplied() {
            // given
            given(event.getAttackZone()).willReturn(2);

            UnitInstance attackerUnit = makeUnit(100, 0, 10); // ATK = 1000
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());

            // Workshop maxHp=100, HP=50 → 데미지 50 → HP 0 → isDestroyed=true
            BuildingInstance workshop = makeBuilding("WORKSHOP", 100, 50, null, 0, 2);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 2))
                    .willReturn(List.of(workshop));

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(workshop.isDestroyed()).isTrue();
            assertThat(workshop.getWorkshopDebuffUntil()).isNotNull();
            assertThat(workshop.getWorkshopDebuffUntil()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("Zone 1 일반 공격 성공, Castle HP 잔존 → AUCTION 결과, CastleDestroyedEvent 미발행")
        void resolveOneSiege_zone1_normalAttack_castleNotDestroyed_noEvent() {
            // given
            given(event.getAttackZone()).willReturn(1);
            given(event.getTargetBuilding()).willReturn(null);

            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());

            // Castle maxHp=200, HP=200, 건물 1개 → 데미지 100/1=100 → 잔여 HP=100
            BuildingInstance castle = makeBuilding("CASTLE", 200, 200, null, 0, 1);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 1))
                    .willReturn(List.of(castle));

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(castle.getHp()).isEqualTo(100);
            assertThat(castle.isDestroyed()).isFalse();
            then(eventPublisher).should(never()).publishEvent(any());

            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getResultType()).isEqualTo(SiegeResult.ResultType.AUCTION);
        }

        @Test
        @DisplayName("Zone 1 일반 공격 성공, Castle HP 0 → CastleDestroyedEvent 발행")
        void resolveOneSiege_zone1_normalAttack_castleDestroyed_publishesEvent() {
            // given
            given(event.getAttackZone()).willReturn(1);
            given(event.getTargetBuilding()).willReturn(null);

            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());

            // Castle HP=50, 데미지 100 → HP 0 → isDestroyed=true
            BuildingInstance castle = makeBuilding("CASTLE", 200, 50, null, 0, 1);
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 1))
                    .willReturn(List.of(castle));

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(castle.isDestroyed()).isTrue();
            ArgumentCaptor<CastleDestroyedEvent> captor =
                    ArgumentCaptor.forClass(CastleDestroyedEvent.class);
            then(eventPublisher).should().publishEvent(captor.capture());
            assertThat(captor.getValue().territoryId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("Zone 1 정밀 공격 (targetBuilding 지정) → 해당 건물만 maxHp/2 데미지, 이벤트 미발행")
        void resolveOneSiege_zone1_precisionAttack_onlyTargetBuildingDamaged() {
            // given
            // Castle maxHp=200, HP=200 → 데미지 100 → 잔여 HP=100, 파괴 안 됨
            BuildingInstance targetCastle = makeBuilding("CASTLE", 200, 200, null, 0, 1);

            given(event.getAttackZone()).willReturn(1);
            given(event.getTargetBuilding()).willReturn(targetCastle);

            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 1))
                    .willReturn(List.of(targetCastle));

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(targetCastle.getHp()).isEqualTo(100);
            assertThat(targetCastle.isDestroyed()).isFalse();
            then(eventPublisher).should(never()).publishEvent(any());
        }

        @Test
        @DisplayName("ATK <= DEF → 공격자 패배, 결과 효과 없음, 이벤트 미발행")
        void resolveOneSiege_defenderWins_noResultEffect() {
            // given
            given(event.getAttackZone()).willReturn(3);

            UnitInstance attackerUnit = makeUnit(10, 0, 10); // ATK = 100
            UnitInstance defenderUnit = makeUnit(0, 50, 5); // DEF = 250 → 방어자 승

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of(defenderUnit));
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of());

            // when
            siegeService.resolveOneSiege(event);

            // then
            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            SiegeResult result = captor.getValue();
            assertThat(result.getIsAttackerWin()).isFalse();
            assertThat(result.getResultType()).isNull();
            assertThat(result.getLootedGp()).isZero();
            assertThat(result.getDefenderUnitsLost()).isZero();
            then(eventPublisher).should(never()).publishEvent(any());
        }

        @Test
        @DisplayName("공격자 패배 시 유닛 손실률 50% ceil 적용")
        void resolveOneSiege_defenderWins_attackerLoseFiftyPercent() {
            // given
            given(event.getAttackZone()).willReturn(3);

            // ATK = 10*5 = 50, DEF = 50*5 = 250 → 패배
            // 공격자 손실: ceil(5 * 0.5) = 3
            UnitInstance attackerUnit = makeUnit(10, 0, 5);
            UnitInstance defenderUnit = makeUnit(0, 50, 5);

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of(defenderUnit));
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of());

            // when
            siegeService.resolveOneSiege(event);

            // then — 공격자 5-3=2, 방어자 변동 없음
            assertThat(attackerUnit.getQuantity()).isEqualTo(2);
            assertThat(defenderUnit.getQuantity()).isEqualTo(5);

            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getAttackerUnitsLost()).isEqualTo(3);
        }

        @Test
        @DisplayName("공격자 승리 시 쌍방 유닛 손실률 30% ceil 적용")
        void resolveOneSiege_attackerWins_bothSideLooseThirtyPercent() {
            // given
            given(event.getAttackZone()).willReturn(3);

            // ATK = 100*10 = 1000, DEF = 10*7 = 70 → 공격자 승
            // 공격자 손실: ceil(10 * 0.3) = 3, 방어자 손실: ceil(7 * 0.3) = 3
            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            UnitInstance defenderUnit = makeUnit(0, 10, 7);

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of(defenderUnit));
            // 빈 Storage → totalLooted=0 → wallet 미호출
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of());

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(attackerUnit.getQuantity()).isEqualTo(7); // 10 - 3
            assertThat(defenderUnit.getQuantity()).isEqualTo(4); // 7 - 3

            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getAttackerUnitsLost()).isEqualTo(3);
            assertThat(captor.getValue().getDefenderUnitsLost()).isEqualTo(3);
        }

        @Test
        @DisplayName("유닛 손실 후 quantity <= 0 → UnitInstance 삭제")
        void resolveOneSiege_unitQuantityZero_unitDeleted() {
            // given
            given(event.getAttackZone()).willReturn(3);

            // ATK = 100*10 = 1000, DEF = 10*1 = 10 → 공격자 승
            // 방어자 손실: ceil(1 * 0.3) = 1 → quantity 0 → 삭제
            UnitInstance attackerUnit = makeUnit(100, 0, 10);
            UnitInstance defenderUnit = makeUnit(0, 10, 1);

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of(defenderUnit));
            // 빈 Storage → totalLooted=0 → wallet 미호출
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of());

            // when
            siegeService.resolveOneSiege(event);

            // then
            assertThat(defenderUnit.getQuantity()).isZero();
            then(unitInstanceRepository).should().delete(defenderUnit);
        }

        @Test
        @DisplayName("건물 defensePower가 DEF에 합산됨 → 건물 방어력만으로 공격자 패배")
        void resolveOneSiege_buildingDefensePowerContributesToDef() {
            // given
            given(event.getAttackZone()).willReturn(1);

            // ATK = 10*5 = 50, 유닛 DEF = 0, WALL defensePower=100 → 총 DEF=100 → 공격자 패배
            UnitInstance attackerUnit = makeUnit(10, 0, 5);
            BuildingInstance wall = makeBuilding("WALL", 200, 200, 100, 0, 1);

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 1))
                    .willReturn(List.of(wall));

            // when
            siegeService.resolveOneSiege(event);

            // then — 공격자 패배, 이벤트 미발행
            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getIsAttackerWin()).isFalse();
            then(eventPublisher).should(never()).publishEvent(any());
        }

        @Test
        @DisplayName("건물 defensePower null → DEF 합산에서 제외, 공격자 승리")
        void resolveOneSiege_buildingWithNullDefensePower_notCountedInDef() {
            // given
            given(event.getAttackZone()).willReturn(3);

            // ATK = 10*5 = 50, STORAGE defensePower=null → DEF=0 → 공격자 승
            UnitInstance attackerUnit = makeUnit(10, 0, 5);
            BuildingInstance storage = makeBuilding("STORAGE", 200, 200, null, 0, 3);

            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of(storage));

            // when
            siegeService.resolveOneSiege(event);

            // then — DEF=0이므로 공격자 승, storedGp=0이므로 wallet 미호출
            ArgumentCaptor<SiegeResult> captor = ArgumentCaptor.forClass(SiegeResult.class);
            then(siegeResultRepository).should().save(captor.capture());
            assertThat(captor.getValue().getIsAttackerWin()).isTrue();
            then(walletRepository).should(never()).findById(any());
        }

        @Test
        @DisplayName("공격자 승리 + 활성 시즌 존재 → SiegeVictoryEvent 발행 (attackerId, seasonId 포함)")
        void resolveOneSiege_attackerWins_activeSeason_publishesSiegeVictoryEvent() {
            // given
            given(event.getAttackZone()).willReturn(3);

            Season season = mock(Season.class);
            given(season.getId()).willReturn(99L);
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.of(season));

            UnitInstance attackerUnit = makeUnit(100, 0, 10); // ATK=1000, DEF=0 → 공격자 승
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(1L, 10L))
                    .willReturn(List.of(attackerUnit));
            given(unitInstanceRepository.findByUserIdAndDeployedTerritoryId(2L, 10L))
                    .willReturn(List.of());
            given(buildingInstanceRepository.findActiveByTerritoryIdAndZone(10L, 3))
                    .willReturn(List.of());

            // when
            siegeService.resolveOneSiege(event);

            // then
            ArgumentCaptor<SiegeVictoryEvent> captor =
                    ArgumentCaptor.forClass(SiegeVictoryEvent.class);
            then(eventPublisher).should().publishEvent(captor.capture());
            assertThat(captor.getValue().attackerId()).isEqualTo(1L);
            assertThat(captor.getValue().seasonId()).isEqualTo(99L);
        }
    }
}
