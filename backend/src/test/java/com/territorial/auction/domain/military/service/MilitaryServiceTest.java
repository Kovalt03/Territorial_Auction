package com.territorial.auction.domain.military.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.military.dto.AttackTokenResponse;
import com.territorial.auction.domain.military.dto.DeclareSiegeRequest;
import com.territorial.auction.domain.military.dto.DeclareSiegeResponse;
import com.territorial.auction.domain.military.dto.DeployUnitRequest;
import com.territorial.auction.domain.military.dto.DeployUnitResponse;
import com.territorial.auction.domain.military.dto.MySiegeHistoryResponse;
import com.territorial.auction.domain.military.dto.ProduceUnitRequest;
import com.territorial.auction.domain.military.dto.ProduceUnitResponse;
import com.territorial.auction.domain.military.dto.RecallUnitRequest;
import com.territorial.auction.domain.military.dto.RecallUnitResponse;
import com.territorial.auction.domain.military.dto.SiegeEventListResponse;
import com.territorial.auction.domain.military.dto.SiegeResultResponse;
import com.territorial.auction.domain.military.dto.UnitListResponse;
import com.territorial.auction.domain.military.entity.AttackToken;
import com.territorial.auction.domain.military.entity.SiegeEvent;
import com.territorial.auction.domain.military.entity.SiegeResult;
import com.territorial.auction.domain.military.entity.UnitInstance;
import com.territorial.auction.domain.military.entity.UnitType;
import com.territorial.auction.domain.military.repository.AttackTokenRepository;
import com.territorial.auction.domain.military.repository.SiegeEventRepository;
import com.territorial.auction.domain.military.repository.SiegeResultRepository;
import com.territorial.auction.domain.military.repository.UnitInstanceRepository;
import com.territorial.auction.domain.military.repository.UnitTypeRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class MilitaryServiceTest {

    @InjectMocks private MilitaryService militaryService;

    @Mock private AttackTokenRepository attackTokenRepository;
    @Mock private UnitInstanceRepository unitInstanceRepository;
    @Mock private UnitTypeRepository unitTypeRepository;
    @Mock private SiegeEventRepository siegeEventRepository;
    @Mock private SiegeResultRepository siegeResultRepository;
    @Mock private UserRepository userRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private BuildingInstanceRepository buildingInstanceRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    // --- fixtures ---

    private User attacker;
    private User defender;
    private Territory territory;
    private UnitType unitType;
    private Wallet wallet;
    private AttackToken attackToken;

    @BeforeEach
    void setUp() {
        TransactionSynchronizationManager.initSynchronization();
        attacker =
                User.builder()
                        .username("attacker1")
                        .email("a@e.com")
                        .passwordHash("hash")
                        .nickname("공격자")
                        .build();
        ReflectionTestUtils.setField(attacker, "id", 1L);

        defender =
                User.builder()
                        .username("defender1")
                        .email("d@e.com")
                        .passwordHash("hash")
                        .nickname("방어자")
                        .build();
        ReflectionTestUtils.setField(defender, "id", 2L);

        territory = Territory.builder().coordX(3).coordY(4).continent(null).grade(null).build();
        ReflectionTestUtils.setField(territory, "id", 10L);

        unitType =
                UnitType.builder()
                        .name("INFANTRY")
                        .attackPower(10)
                        .defensePower(8)
                        .costGp(100)
                        .foodCost(2)
                        .level(1)
                        .build();
        ReflectionTestUtils.setField(unitType, "id", 1L);

        wallet = Wallet.builder().user(attacker).build();
        ReflectionTestUtils.setField(wallet, "availableGp", 5000);
        ReflectionTestUtils.setField(wallet, "availableFood", 500);

        attackToken = AttackToken.builder().user(attacker).build();
        ReflectionTestUtils.setField(attackToken, "normalCount", 3);
        ReflectionTestUtils.setField(attackToken, "precisionCount", 1);
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    // --- helper factories ---

    private UnitInstance idleInstance(int qty) {
        UnitInstance inst =
                UnitInstance.builder().user(attacker).unitType(unitType).quantity(qty).build();
        ReflectionTestUtils.setField(inst, "id", 100L);
        return inst;
    }

    private UnitInstance deployedInstance(int qty) {
        UnitInstance inst =
                UnitInstance.builder().user(attacker).unitType(unitType).quantity(qty).build();
        ReflectionTestUtils.setField(inst, "id", 101L);
        inst.deployTo(territory);
        return inst;
    }

    private SiegeEvent buildSiege(User atk, User def, Territory tgt, int zone) {
        LocalDateTime now = LocalDateTime.now();
        SiegeEvent siege =
                SiegeEvent.builder()
                        .attacker(atk)
                        .defender(def)
                        .targetTerritory(tgt)
                        .targetBuilding(null)
                        .attackZone(zone)
                        .siegeStartAt(now)
                        .resolveAt(now.plusMinutes(30))
                        .build();
        ReflectionTestUtils.setField(siege, "id", 99L);
        return siege;
    }

    private SiegeResult buildResult(SiegeEvent siege, boolean attackerWin) {
        SiegeResult result =
                SiegeResult.builder()
                        .siege(siege)
                        .isAttackerWin(attackerWin)
                        .attackerUnitsLost(5)
                        .defenderUnitsLost(10)
                        .lootedGp(300)
                        .resultType(SiegeResult.ResultType.LOOT)
                        .build();
        ReflectionTestUtils.setField(result, "id", 200L);
        return result;
    }

    // ==========================================================
    // GetAttackTokens
    // ==========================================================

    @Nested
    @DisplayName("GetAttackTokens")
    class GetAttackTokens {

        @Test
        @DisplayName("공격권 레코드 있음 → normalCount, precisionCount 반환")
        void getAttackTokens_found() {
            // given
            given(attackTokenRepository.findByUserId(1L)).willReturn(Optional.of(attackToken));

            // when
            AttackTokenResponse response = militaryService.getAttackTokens(1L);

            // then
            assertThat(response.normalCount()).isEqualTo(3);
            assertThat(response.precisionCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("공격권 레코드 없음 → (0, 0) 반환")
        void getAttackTokens_notFound() {
            // given
            given(attackTokenRepository.findByUserId(1L)).willReturn(Optional.empty());

            // when
            AttackTokenResponse response = militaryService.getAttackTokens(1L);

            // then
            assertThat(response.normalCount()).isEqualTo(0);
            assertThat(response.precisionCount()).isEqualTo(0);
        }
    }

    // ==========================================================
    // ProduceUnit
    // ==========================================================

    @Nested
    @DisplayName("ProduceUnit")
    class ProduceUnit {

        @Test
        @DisplayName("병영 있음 + GP/식량 충분 + idle 없음 → 새 인스턴스 save + GP/식량 차감 + 응답 반환")
        void produceUnit_success_newInstance() {
            // given
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 10);
            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(1));
            given(unitInstanceRepository.sumQuantityByUserId(1L)).willReturn(0);
            given(buildingInstanceRepository.findActiveCastleLevelsByOwnerId(1L))
                    .willReturn(List.of(2)); // 10 slots
            given(buildingInstanceRepository.sumResidenceCapacityByOwnerId(eq(1L), any()))
                    .willReturn(0);
            given(walletRepository.findByIdWithLock(1L)).willReturn(Optional.of(wallet));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.empty());
            given(userRepository.findById(1L)).willReturn(Optional.of(attacker));

            // when
            ProduceUnitResponse response = militaryService.produceUnit(1L, req);

            // then
            assertThat(response.unitTypeId()).isEqualTo(1L);
            assertThat(response.quantity()).isEqualTo(10);
            assertThat(response.gpRemaining()).isEqualTo(4000); // 5000 - 100*10
            then(unitInstanceRepository).should().save(any(UnitInstance.class));
        }

        @Test
        @DisplayName("병영 있음 + GP/식량 충분 + idle 이미 존재 → addQuantity 호출, save 미호출")
        void produceUnit_success_existingInstance() {
            // given
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 5);
            UnitInstance existing = idleInstance(20);
            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(1));
            given(unitInstanceRepository.sumQuantityByUserId(1L)).willReturn(0);
            given(buildingInstanceRepository.findActiveCastleLevelsByOwnerId(1L))
                    .willReturn(List.of(1)); // 5 slots
            given(buildingInstanceRepository.sumResidenceCapacityByOwnerId(eq(1L), any()))
                    .willReturn(0);
            given(walletRepository.findByIdWithLock(1L)).willReturn(Optional.of(wallet));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.of(existing));

            // when
            militaryService.produceUnit(1L, req);

            // then
            assertThat(existing.getQuantity()).isEqualTo(25);
            then(unitInstanceRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("병영 없음 → NO_BARRACKS")
        void produceUnit_noBarracks() {
            // given
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 10);
            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(false);

            // when / then
            assertThatThrownBy(() -> militaryService.produceUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NO_BARRACKS);
        }

        @Test
        @DisplayName("병영 레벨 부족 → BARRACKS_LEVEL_INSUFFICIENT")
        void produceUnit_barracksLevelInsufficient() {
            // given — unitType.level=1 이지만 병영 최고 레벨=0 (또는 없음)
            UnitType highLevelUnit =
                    UnitType.builder()
                            .name("KNIGHT")
                            .attackPower(30)
                            .defensePower(20)
                            .costGp(300)
                            .foodCost(10)
                            .level(3)
                            .build();
            ReflectionTestUtils.setField(highLevelUnit, "id", 3L);

            ProduceUnitRequest req = new ProduceUnitRequest(3L, 1);
            given(unitTypeRepository.findById(3L)).willReturn(Optional.of(highLevelUnit));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(2)); // 레벨 2 병영, 레벨 3 유닛 생산 불가

            // when / then
            assertThatThrownBy(() -> militaryService.produceUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BARRACKS_LEVEL_INSUFFICIENT);
        }

        @Test
        @DisplayName("유닛 상한 초과 → UNIT_CAPACITY_EXCEEDED")
        void produceUnit_unitCapacityExceeded() {
            // given — 현재 5마리, 상한 5, 추가 1 → 초과
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 1);
            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(1));
            given(unitInstanceRepository.sumQuantityByUserId(1L)).willReturn(5); // 현재 5마리
            given(buildingInstanceRepository.findActiveCastleLevelsByOwnerId(1L))
                    .willReturn(List.of(1)); // 5 slots
            given(buildingInstanceRepository.sumResidenceCapacityByOwnerId(eq(1L), any()))
                    .willReturn(0);

            // when / then
            assertThatThrownBy(() -> militaryService.produceUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.UNIT_CAPACITY_EXCEEDED);
        }

        @Test
        @DisplayName("GP 부족 → INSUFFICIENT_GP")
        void produceUnit_insufficientGp() {
            // given — qty=10, GP cost=1000 > 500 (wallet GP를 500으로 조정)
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 10);
            Wallet poorWallet = Wallet.builder().user(attacker).build();
            ReflectionTestUtils.setField(poorWallet, "availableGp", 500);
            ReflectionTestUtils.setField(poorWallet, "availableFood", 500);

            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(1));
            given(unitInstanceRepository.sumQuantityByUserId(1L)).willReturn(0);
            given(buildingInstanceRepository.findActiveCastleLevelsByOwnerId(1L))
                    .willReturn(List.of(2)); // 10 slots
            given(buildingInstanceRepository.sumResidenceCapacityByOwnerId(eq(1L), any()))
                    .willReturn(0);
            given(walletRepository.findByIdWithLock(1L)).willReturn(Optional.of(poorWallet));

            // when / then
            assertThatThrownBy(() -> militaryService.produceUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }

        @Test
        @DisplayName("식량 부족 → FOOD_INSUFFICIENT")
        void produceUnit_foodInsufficient() {
            // given — qty=5, food cost=10, wallet food=5
            ProduceUnitRequest req = new ProduceUnitRequest(1L, 5);
            Wallet hungryWallet = Wallet.builder().user(attacker).build();
            ReflectionTestUtils.setField(hungryWallet, "availableGp", 5000);
            ReflectionTestUtils.setField(hungryWallet, "availableFood", 5); // 5 < 10(=2*5)

            given(unitTypeRepository.findById(1L)).willReturn(Optional.of(unitType));
            given(buildingInstanceRepository.existsActiveBarracksByOwnerId(1L)).willReturn(true);
            given(buildingInstanceRepository.findMaxBarracksLevelByOwnerId(1L))
                    .willReturn(Optional.of(1));
            given(unitInstanceRepository.sumQuantityByUserId(1L)).willReturn(0);
            given(buildingInstanceRepository.findActiveCastleLevelsByOwnerId(1L))
                    .willReturn(List.of(1)); // 5 slots
            given(buildingInstanceRepository.sumResidenceCapacityByOwnerId(eq(1L), any()))
                    .willReturn(0);
            given(walletRepository.findByIdWithLock(1L)).willReturn(Optional.of(hungryWallet));

            // when / then
            assertThatThrownBy(() -> militaryService.produceUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.FOOD_INSUFFICIENT);
        }
    }

    // ==========================================================
    // DeployUnit
    // ==========================================================

    @Nested
    @DisplayName("DeployUnit")
    class DeployUnit {

        @BeforeEach
        void ownTerritory() {
            territory.occupy(attacker, LocalDateTime.now().minusHours(1));
        }

        @Test
        @DisplayName("영토 소유자 + idle 유닛 충분 → subtractQuantity 호출 + 응답 반환")
        void deployUnit_success() {
            // given
            DeployUnitRequest req = new DeployUnitRequest(10L, 1L, 20);
            UnitInstance idle = idleInstance(50);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.of(idle));
            given(
                            unitInstanceRepository.findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
                                    1L, 1L, 10L))
                    .willReturn(Optional.empty());
            given(userRepository.findById(1L)).willReturn(Optional.of(attacker));

            // when
            DeployUnitResponse response = militaryService.deployUnit(1L, req);

            // then
            assertThat(response.deployedCount()).isEqualTo(20);
            assertThat(response.territoryId()).isEqualTo(10L);
            assertThat(idle.getQuantity()).isEqualTo(30); // 50 - 20
        }

        @Test
        @DisplayName("영토 소유자 아님 → NOT_TERRITORY_OWNER")
        void deployUnit_notOwner() {
            // given — territory is owned by defender (id=2), not attacker (id=1)
            territory.occupy(defender, LocalDateTime.now().minusHours(1));
            DeployUnitRequest req = new DeployUnitRequest(10L, 1L, 20);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));

            // when / then
            assertThatThrownBy(() -> militaryService.deployUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }

        @Test
        @DisplayName("idle 유닛 부족 → INSUFFICIENT_UNITS")
        void deployUnit_insufficientUnits() {
            // given
            DeployUnitRequest req = new DeployUnitRequest(10L, 1L, 100);
            UnitInstance idle = idleInstance(5);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.of(idle));

            // when / then
            assertThatThrownBy(() -> militaryService.deployUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_UNITS);
        }
    }

    // ==========================================================
    // RecallUnit
    // ==========================================================

    @Nested
    @DisplayName("RecallUnit")
    class RecallUnit {

        @BeforeEach
        void ownTerritory() {
            territory.occupy(attacker, LocalDateTime.now().minusHours(1));
        }

        @Test
        @DisplayName("deployed 유닛 충분 → subtractQuantity 호출 + idle 추가")
        void recallUnit_success() {
            // given
            RecallUnitRequest req = new RecallUnitRequest(10L, 1L, 10);
            UnitInstance deployed = deployedInstance(30);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            unitInstanceRepository.findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
                                    1L, 1L, 10L))
                    .willReturn(Optional.of(deployed));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.empty());
            given(userRepository.findById(1L)).willReturn(Optional.of(attacker));

            // when
            RecallUnitResponse response = militaryService.recallUnit(1L, req);

            // then
            assertThat(response.recalledCount()).isEqualTo(10);
            assertThat(deployed.getQuantity()).isEqualTo(20); // 30 - 10
        }

        @Test
        @DisplayName("영토 소유자 아님 → NOT_TERRITORY_OWNER")
        void recallUnit_notOwner() {
            // given
            territory.occupy(defender, LocalDateTime.now().minusHours(1));
            RecallUnitRequest req = new RecallUnitRequest(10L, 1L, 10);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));

            // when / then
            assertThatThrownBy(() -> militaryService.recallUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }

        @Test
        @DisplayName("deployed 유닛 부족 → INSUFFICIENT_UNITS")
        void recallUnit_insufficientUnits() {
            // given
            RecallUnitRequest req = new RecallUnitRequest(10L, 1L, 50);
            UnitInstance deployed = deployedInstance(5);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            unitInstanceRepository.findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
                                    1L, 1L, 10L))
                    .willReturn(Optional.of(deployed));

            // when / then
            assertThatThrownBy(() -> militaryService.recallUnit(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_UNITS);
        }
    }

    // ==========================================================
    // DeclareSiege
    // ==========================================================

    @Nested
    @DisplayName("DeclareSiege")
    class DeclareSiege {

        private DeclareSiegeRequest validRequest;

        @BeforeEach
        void occupyByDefender() {
            territory.occupy(
                    defender, LocalDateTime.now().minusHours(2)); // occupiedUntil = 과거 → 보호 없음
            validRequest = new DeclareSiegeRequest(10L, null, 1, 1L, 10);
        }

        private void stubValidPath() {
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            siegeEventRepository.findRecentByTerritoryAndAttacker(
                                    10L, 1L, SiegeEvent.SiegeStatus.RESOLVED))
                    .willReturn(Collections.emptyList());
            given(attackTokenRepository.findByUserIdWithLock(1L))
                    .willReturn(Optional.of(attackToken));
            given(
                            unitInstanceRepository
                                    .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(1L, 1L))
                    .willReturn(Optional.of(idleInstance(50)));
            given(userRepository.findById(1L)).willReturn(Optional.of(attacker));
            given(siegeEventRepository.save(any(SiegeEvent.class)))
                    .willAnswer(
                            inv -> {
                                SiegeEvent saved = inv.getArgument(0);
                                ReflectionTestUtils.setField(saved, "id", 99L);
                                return saved;
                            });
        }

        @Test
        @DisplayName("모든 조건 통과 → SiegeEvent 저장 + DeclareSiegeResponse 반환")
        void declareSiege_success() {
            // given
            stubValidPath();

            // when
            DeclareSiegeResponse response = militaryService.declareSiege(1L, validRequest);

            // then
            assertThat(response.siegeId()).isEqualTo(99L);
            assertThat(response.attackTokenRemaining()).isEqualTo(2); // 3 - 1
            then(siegeEventRepository).should().save(any(SiegeEvent.class));
        }

        @Test
        @DisplayName("자기 영토 공격 → CANNOT_ATTACK_OWN_TERRITORY")
        void declareSiege_ownTerritory() {
            // given — territory owned by attacker (id=1)
            territory.occupy(attacker, LocalDateTime.now().minusHours(2));
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.CANNOT_ATTACK_OWN_TERRITORY);
        }

        @Test
        @DisplayName("영토 IDLE 상태 → TERRITORY_NOT_OCCUPIED")
        void declareSiege_territoryIdle() {
            // given — territory is IDLE (no owner)
            Territory idleTerritory =
                    Territory.builder().coordX(1).coordY(1).continent(null).grade(null).build();
            ReflectionTestUtils.setField(idleTerritory, "id", 10L);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(idleTerritory));

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.TERRITORY_NOT_OCCUPIED);
        }

        @Test
        @DisplayName("보호기간 중 → TERRITORY_PROTECTED")
        void declareSiege_territoryProtected() {
            // given — occupiedUntil is in the future
            ReflectionTestUtils.setField(
                    territory, "occupiedUntil", LocalDateTime.now().plusHours(1));
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.TERRITORY_PROTECTED);
        }

        @Test
        @DisplayName("공격 쿨다운 → ATTACK_COOLDOWN")
        void declareSiege_attackCooldown() {
            // given — recent RESOLVED siege where attacker lost, within 2-hour cooldown window
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            SiegeEvent lastSiege = buildSiege(attacker, defender, territory, 1);
            // resolveAt = 1 hour ago → still within 2-hour cooldown
            ReflectionTestUtils.setField(lastSiege, "resolveAt", LocalDateTime.now().minusHours(1));
            given(
                            siegeEventRepository.findRecentByTerritoryAndAttacker(
                                    10L, 1L, SiegeEvent.SiegeStatus.RESOLVED))
                    .willReturn(List.of(lastSiege));
            SiegeResult loseResult = buildResult(lastSiege, false);
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(loseResult));

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ATTACK_COOLDOWN);
        }

        @Test
        @DisplayName("이전 Zone 미클리어 → ZONE_NOT_CLEARED")
        void declareSiege_zoneNotCleared() {
            // given — attacking zone 2 but zone 1 not cleared
            DeclareSiegeRequest zone2Request = new DeclareSiegeRequest(10L, null, 2, 1L, 10);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            // findRecentByTerritoryAndAttacker returns a zone-1 siege that was lost
            SiegeEvent zone1Siege = buildSiege(attacker, defender, territory, 1);
            given(
                            siegeEventRepository.findRecentByTerritoryAndAttacker(
                                    10L, 1L, SiegeEvent.SiegeStatus.RESOLVED))
                    .willReturn(List.of(zone1Siege));
            // cooldown check: zone1Siege result → win=true so no cooldown
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.empty());

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, zone2Request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ZONE_NOT_CLEARED);
        }

        @Test
        @DisplayName("공격권 없음 → NO_ATTACK_TOKEN")
        void declareSiege_noAttackToken() {
            // given
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            siegeEventRepository.findRecentByTerritoryAndAttacker(
                                    10L, 1L, SiegeEvent.SiegeStatus.RESOLVED))
                    .willReturn(Collections.emptyList());
            given(attackTokenRepository.findByUserIdWithLock(1L)).willReturn(Optional.empty());

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NO_ATTACK_TOKEN);
        }

        @Test
        @DisplayName("normalCount=0 → NO_ATTACK_TOKEN")
        void declareSiege_normalTokenExhausted() {
            // given
            ReflectionTestUtils.setField(attackToken, "normalCount", 0);
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(
                            siegeEventRepository.findRecentByTerritoryAndAttacker(
                                    10L, 1L, SiegeEvent.SiegeStatus.RESOLVED))
                    .willReturn(Collections.emptyList());
            given(attackTokenRepository.findByUserIdWithLock(1L))
                    .willReturn(Optional.of(attackToken));

            // when / then
            assertThatThrownBy(() -> militaryService.declareSiege(1L, validRequest))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NO_ATTACK_TOKEN);
        }
    }

    // ==========================================================
    // GetSiegeResult
    // ==========================================================

    @Nested
    @DisplayName("GetSiegeResult")
    class GetSiegeResult {

        @Test
        @DisplayName("공격자로서 조회 → SiegeResultResponse 반환")
        void getSiegeResult_asAttacker() {
            // given
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1);
            siege.resolve();
            SiegeResult result = buildResult(siege, true);
            given(siegeEventRepository.findById(99L)).willReturn(Optional.of(siege));
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(result));

            // when
            SiegeResultResponse response = militaryService.getSiegeResult(1L, 99L);

            // then
            assertThat(response.siegeId()).isEqualTo(99L);
            assertThat(response.isAttackerWin()).isTrue();
        }

        @Test
        @DisplayName("방어자로서 조회 → SiegeResultResponse 반환")
        void getSiegeResult_asDefender() {
            // given
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1);
            siege.resolve();
            SiegeResult result = buildResult(siege, false);
            given(siegeEventRepository.findById(99L)).willReturn(Optional.of(siege));
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(result));

            // when
            SiegeResultResponse response = militaryService.getSiegeResult(2L, 99L); // defender id=2

            // then
            assertThat(response.isAttackerWin()).isFalse();
        }

        @Test
        @DisplayName("공성전 없음 → SIEGE_NOT_FOUND")
        void getSiegeResult_siegeNotFound() {
            // given
            given(siegeEventRepository.findById(99L)).willReturn(Optional.empty());

            // when / then
            assertThatThrownBy(() -> militaryService.getSiegeResult(1L, 99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.SIEGE_NOT_FOUND);
        }

        @Test
        @DisplayName("참여자 아님 → SIEGE_FORBIDDEN")
        void getSiegeResult_notParticipant() {
            // given — userId=3 is neither attacker(1) nor defender(2)
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1);
            given(siegeEventRepository.findById(99L)).willReturn(Optional.of(siege));

            // when / then
            assertThatThrownBy(() -> militaryService.getSiegeResult(3L, 99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.SIEGE_FORBIDDEN);
        }

        @Test
        @DisplayName("결과 아직 없음(PENDING) → SIEGE_RESULT_NOT_FOUND")
        void getSiegeResult_resultPending() {
            // given
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1); // status=PENDING
            given(siegeEventRepository.findById(99L)).willReturn(Optional.of(siege));
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.empty());

            // when / then
            assertThatThrownBy(() -> militaryService.getSiegeResult(1L, 99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.SIEGE_RESULT_NOT_FOUND);
        }
    }

    // ==========================================================
    // GetUnitList
    // ==========================================================

    @Nested
    @DisplayName("GetUnitList")
    class GetUnitList {

        @Test
        @DisplayName("유닛 없음 → 빈 리스트 + availableFood 반환")
        void getUnitList_empty() {
            // given
            given(unitInstanceRepository.findByUserId(1L)).willReturn(Collections.emptyList());
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            // when
            UnitListResponse response = militaryService.getUnitList(1L);

            // then
            assertThat(response.units()).isEmpty();
            assertThat(response.availableFood()).isEqualTo(500);
        }

        @Test
        @DisplayName("idle/deployed 혼재 → deployedCount/idleCount 정확히 계산, foodCost 단가 반환")
        void getUnitList_mixedInstances() {
            // given
            UnitInstance idle = idleInstance(30);
            UnitInstance deployed = deployedInstance(20);
            given(unitInstanceRepository.findByUserId(1L)).willReturn(List.of(idle, deployed));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            // when
            UnitListResponse response = militaryService.getUnitList(1L);

            // then
            assertThat(response.units()).hasSize(1);
            UnitListResponse.UnitDto dto = response.units().get(0);
            assertThat(dto.quantity()).isEqualTo(50); // 30 + 20
            assertThat(dto.deployedCount()).isEqualTo(20);
            assertThat(dto.idleCount()).isEqualTo(30);
            assertThat(dto.foodCost()).isEqualTo(2); // 유닛 타입 단가
            assertThat(response.availableFood()).isEqualTo(500);
        }
    }

    // ==========================================================
    // GetSiegeEvents
    // ==========================================================

    @Nested
    @DisplayName("GetSiegeEvents")
    class GetSiegeEvents {

        @Test
        @DisplayName("status=PENDING → Page 반환")
        void getSiegeEvents_pending() {
            // given
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1);
            PageRequest pageable = PageRequest.of(0, 20);
            Page<SiegeEvent> page = new PageImpl<>(List.of(siege), pageable, 1);
            given(siegeEventRepository.findByStatus(SiegeEvent.SiegeStatus.PENDING, pageable))
                    .willReturn(page);

            // when
            SiegeEventListResponse response = militaryService.getSiegeEvents("PENDING", pageable);

            // then
            assertThat(response.totalCount()).isEqualTo(1);
            assertThat(response.sieges()).hasSize(1);
            assertThat(response.sieges().get(0).siegeId()).isEqualTo(99L);
        }

        @Test
        @DisplayName("status 잘못됨(INVALID) → PENDING으로 기본값 처리")
        void getSiegeEvents_invalidStatus_fallbackToPending() {
            // given
            PageRequest pageable = PageRequest.of(0, 20);
            Page<SiegeEvent> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            given(siegeEventRepository.findByStatus(SiegeEvent.SiegeStatus.PENDING, pageable))
                    .willReturn(emptyPage);

            // when
            SiegeEventListResponse response = militaryService.getSiegeEvents("INVALID", pageable);

            // then
            assertThat(response.totalCount()).isEqualTo(0);
            then(siegeEventRepository)
                    .should()
                    .findByStatus(SiegeEvent.SiegeStatus.PENDING, pageable);
        }
    }

    // ==========================================================
    // GetMySiegeHistory
    // ==========================================================

    @Nested
    @DisplayName("GetMySiegeHistory")
    class GetMySiegeHistory {

        private TerritoryGrade grade;

        @BeforeEach
        void attachGrade() {
            grade =
                    TerritoryGrade.builder()
                            .grade("A")
                            .productionMultiplier(java.math.BigDecimal.ONE)
                            .auctionPriceMultiplier(java.math.BigDecimal.ONE)
                            .preBuiltCount(0)
                            .spawnRate(java.math.BigDecimal.ONE)
                            .gridSize(10)
                            .build();
            ReflectionTestUtils.setField(grade, "id", 1L);
            ReflectionTestUtils.setField(territory, "grade", grade);
        }

        @Test
        @DisplayName("ALL 필터: WIN/LOSE 모두 포함")
        void getMySiegeHistory_all() {
            // given
            SiegeEvent win = buildSiege(attacker, defender, territory, 1);
            SiegeEvent lose = buildSiege(attacker, defender, territory, 1);
            ReflectionTestUtils.setField(lose, "id", 100L);

            PageRequest pageable = PageRequest.of(0, 20);
            Page<SiegeEvent> page = new PageImpl<>(List.of(win, lose), pageable, 2);
            given(siegeEventRepository.findMyHistory(1L, SiegeEvent.SiegeStatus.RESOLVED, pageable))
                    .willReturn(page);

            SiegeResult winResult = buildResult(win, true);
            SiegeResult loseResult = buildResult(lose, false);
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(winResult));
            given(siegeResultRepository.findBySiegeId(100L)).willReturn(Optional.of(loseResult));

            // when
            MySiegeHistoryResponse response =
                    militaryService.getMySiegeHistory(1L, "ALL", pageable);

            // then
            assertThat(response.wins()).isEqualTo(1);
            assertThat(response.losses()).isEqualTo(1);
            assertThat(response.history()).hasSize(2);
        }

        @Test
        @DisplayName("WIN 필터: WIN만 반환")
        void getMySiegeHistory_winFilter() {
            // given
            SiegeEvent win = buildSiege(attacker, defender, territory, 1);
            SiegeEvent lose = buildSiege(attacker, defender, territory, 1);
            ReflectionTestUtils.setField(lose, "id", 100L);

            PageRequest pageable = PageRequest.of(0, 20);
            Page<SiegeEvent> page = new PageImpl<>(List.of(win, lose), pageable, 2);
            given(siegeEventRepository.findMyHistory(1L, SiegeEvent.SiegeStatus.RESOLVED, pageable))
                    .willReturn(page);

            SiegeResult winResult = buildResult(win, true);
            SiegeResult loseResult = buildResult(lose, false);
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(winResult));
            given(siegeResultRepository.findBySiegeId(100L)).willReturn(Optional.of(loseResult));

            // when
            MySiegeHistoryResponse response =
                    militaryService.getMySiegeHistory(1L, "WIN", pageable);

            // then
            assertThat(response.wins()).isEqualTo(1);
            assertThat(response.losses()).isEqualTo(1);
            assertThat(response.history()).hasSize(1);
            assertThat(response.history().get(0).result()).isEqualTo("WIN");
        }

        @Test
        @DisplayName("wins/losses 카운트 정확성 — 방어자 시점")
        void getMySiegeHistory_defenderPerspective() {
            // given — userId=2 (defender), attacker won → defender loses
            SiegeEvent siege = buildSiege(attacker, defender, territory, 1);

            PageRequest pageable = PageRequest.of(0, 20);
            Page<SiegeEvent> page = new PageImpl<>(List.of(siege), pageable, 1);
            given(siegeEventRepository.findMyHistory(2L, SiegeEvent.SiegeStatus.RESOLVED, pageable))
                    .willReturn(page);

            SiegeResult result = buildResult(siege, true); // attacker won
            given(siegeResultRepository.findBySiegeId(99L)).willReturn(Optional.of(result));

            // when
            MySiegeHistoryResponse response =
                    militaryService.getMySiegeHistory(2L, "ALL", pageable);

            // then
            assertThat(response.wins()).isEqualTo(0);
            assertThat(response.losses()).isEqualTo(1);
            assertThat(response.history().get(0).role()).isEqualTo("DEFENDER");
            assertThat(response.history().get(0).result()).isEqualTo("LOSE");
        }
    }
}
