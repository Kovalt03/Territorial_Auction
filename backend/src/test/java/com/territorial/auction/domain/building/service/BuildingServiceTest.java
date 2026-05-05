package com.territorial.auction.domain.building.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.building.dto.InventoryResponse;
import com.territorial.auction.domain.building.dto.IslandResponse;
import com.territorial.auction.domain.building.dto.MoveBuildingRequest;
import com.territorial.auction.domain.building.dto.MoveBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceBuildingRequest;
import com.territorial.auction.domain.building.dto.PlaceBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryRequest;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryResponse;
import com.territorial.auction.domain.building.dto.RepairBuildingResponse;
import com.territorial.auction.domain.building.dto.StoreBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse;
import com.territorial.auction.domain.building.dto.UpgradeBuildingResponse;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BuildingServiceTest {

    @InjectMocks private BuildingService buildingService;

    @Mock private BuildingInstanceRepository buildingInstanceRepository;
    @Mock private BuildingTypeRepository buildingTypeRepository;
    @Mock private HomeIslandRepository homeIslandRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private UserRepository userRepository;

    // ─── 공통 픽스처 ───────────────────────────────────────────────────────────

    private User sampleUser(Long id) {
        User user =
                User.builder()
                        .username("user" + id)
                        .email("user" + id + "@test.com")
                        .passwordHash("hashed")
                        .nickname("유저" + id)
                        .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private Wallet walletWithGp(User user, int gp) {
        Wallet wallet = Wallet.builder().user(user).build();
        ReflectionTestUtils.setField(wallet, "availableGp", gp);
        ReflectionTestUtils.setField(wallet, "availableAp", 0);
        return wallet;
    }

    private TerritoryGrade gradeA() {
        TerritoryGrade grade =
                TerritoryGrade.builder()
                        .grade("A")
                        .productionMultiplier(BigDecimal.ONE)
                        .auctionPriceMultiplier(BigDecimal.ONE)
                        .spawnRate(BigDecimal.valueOf(0.1))
                        .gridSize(10)
                        .build();
        return grade;
    }

    private Territory territoryOwnedBy(User owner, TerritoryGrade grade) {
        Territory t = Territory.builder().coordX(1).coordY(2).grade(grade).build();
        ReflectionTestUtils.setField(t, "id", 10L);
        ReflectionTestUtils.setField(t, "owner", owner);
        return t;
    }

    private BuildingType castle() {
        BuildingType bt =
                BuildingType.builder()
                        .name("CASTLE")
                        .width(2)
                        .height(2)
                        .maxHp(100)
                        .baseCostGp(1000)
                        .zoneRestriction(1)
                        .build();
        ReflectionTestUtils.setField(bt, "id", 1L);
        return bt;
    }

    private BuildingType storage() {
        BuildingType bt =
                BuildingType.builder()
                        .name("STORAGE")
                        .width(1)
                        .height(1)
                        .maxHp(60)
                        .baseCostGp(500)
                        .zoneRestriction(null)
                        .build();
        ReflectionTestUtils.setField(bt, "id", 2L);
        return bt;
    }

    private BuildingInstance placedInstance(
            BuildingType bt, Territory territory, int posX, int posY) {
        BuildingInstance bi =
                BuildingInstance.builder()
                        .buildingType(bt)
                        .territory(territory)
                        .posX(posX)
                        .posY(posY)
                        .hp(bt.getMaxHp())
                        .zone(1)
                        .build();
        ReflectionTestUtils.setField(bi, "id", 100L);
        ReflectionTestUtils.setField(bi, "level", 1);
        return bi;
    }

    private HomeIsland sampleIsland(User user) {
        HomeIsland island = HomeIsland.builder().user(user).build();
        ReflectionTestUtils.setField(island, "id", 1L);
        return island;
    }

    // ─── findTerritoryBuildings() ──────────────────────────────────────────────

    @Nested
    @DisplayName("findTerritoryBuildings()")
    class FindTerritoryBuildings {

        @Test
        @DisplayName("영토 건물 목록 정상 반환")
        void success() {
            Territory territory = territoryOwnedBy(sampleUser(1L), gradeA());
            BuildingType bt = storage();
            BuildingInstance bi = placedInstance(bt, territory, 0, 0);

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingInstanceRepository.findByTerritoryId(10L)).willReturn(List.of(bi));

            TerritoryBuildingResponse response = buildingService.findTerritoryBuildings(10L);

            assertThat(response.buildings()).hasSize(1);
            assertThat(response.buildings().get(0).posX()).isEqualTo(0);
        }

        @Test
        @DisplayName("존재하지 않는 영토 → TERRITORY_NOT_FOUND")
        void territory_not_found() {
            given(territoryRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> buildingService.findTerritoryBuildings(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.TERRITORY_NOT_FOUND);
        }
    }

    // ─── placeOnTerritory() ───────────────────────────────────────────────────

    @Nested
    @DisplayName("placeOnTerritory()")
    class PlaceOnTerritory {

        @Test
        @DisplayName("영토 점유자가 건물 배치 성공")
        void success() {
            User user = sampleUser(1L);
            TerritoryGrade grade = gradeA();
            Territory territory = territoryOwnedBy(user, grade);
            BuildingType bt = storage();

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingTypeRepository.findById(2L)).willReturn(Optional.of(bt));
            given(buildingInstanceRepository.findByTerritoryId(10L))
                    .willReturn(Collections.emptyList());
            given(walletRepository.findById(1L)).willReturn(Optional.of(walletWithGp(user, 2000)));
            given(buildingInstanceRepository.save(any()))
                    .willAnswer(
                            inv -> {
                                BuildingInstance saved = inv.getArgument(0);
                                ReflectionTestUtils.setField(saved, "id", 200L);
                                return saved;
                            });

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0);
            PlaceBuildingResponse response = buildingService.placeOnTerritory(1L, 10L, req);

            assertThat(response.buildingId()).isEqualTo(200L);
            assertThat(response.posX()).isEqualTo(0);
        }

        @Test
        @DisplayName("영토 점유자가 아님 → NOT_TERRITORY_OWNER")
        void not_owner() {
            User owner = sampleUser(1L);
            User other = sampleUser(2L);
            Territory territory = territoryOwnedBy(owner, gradeA());

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0);
            assertThatThrownBy(() -> buildingService.placeOnTerritory(2L, 10L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }

        @Test
        @DisplayName("GP 부족 → INSUFFICIENT_GP")
        void insufficient_gp() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage(); // baseCostGp=500

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingTypeRepository.findById(2L)).willReturn(Optional.of(bt));
            given(buildingInstanceRepository.findByTerritoryId(10L))
                    .willReturn(Collections.emptyList());
            given(walletRepository.findById(1L))
                    .willReturn(Optional.of(walletWithGp(user, 100))); // 100 < 500

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0);
            assertThatThrownBy(() -> buildingService.placeOnTerritory(1L, 10L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }

        @Test
        @DisplayName("겹치는 위치 배치 → INVALID_POSITION")
        void overlapping_position() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage(); // 1x1

            BuildingInstance existing = placedInstance(bt, territory, 0, 0);

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingTypeRepository.findById(2L)).willReturn(Optional.of(bt));
            given(buildingInstanceRepository.findByTerritoryId(10L)).willReturn(List.of(existing));

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0); // same position
            assertThatThrownBy(() -> buildingService.placeOnTerritory(1L, 10L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_POSITION);
        }

        @Test
        @DisplayName("Castle을 zone1이 아닌 곳에 배치 → ZONE_RESTRICTION_VIOLATED")
        void zone_restriction_violated() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA()); // gridSize=10
            BuildingType castleType = castle(); // zoneRestriction=1

            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingTypeRepository.findById(1L)).willReturn(Optional.of(castleType));
            given(buildingInstanceRepository.findByTerritoryId(10L))
                    .willReturn(Collections.emptyList());

            // posX=0, posY=0 is in zone 2-3, castle needs zone 1
            PlaceBuildingRequest req = new PlaceBuildingRequest(1L, 0, 0);
            assertThatThrownBy(() -> buildingService.placeOnTerritory(1L, 10L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ZONE_RESTRICTION_VIOLATED);
        }
    }

    // ─── upgrade() ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("upgrade()")
    class Upgrade {

        @Test
        @DisplayName("건물 업그레이드 성공")
        void success() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage(); // baseCostGp=500
            BuildingInstance bi = placedInstance(bt, territory, 0, 0); // level=1
            Wallet wallet = walletWithGp(user, 2000);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            UpgradeBuildingResponse response = buildingService.upgrade(1L, 100L);

            assertThat(response.newLevel()).isEqualTo(2);
        }

        @Test
        @DisplayName("건물 없음 → BUILDING_NOT_FOUND")
        void not_found() {
            given(buildingInstanceRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> buildingService.upgrade(1L, 999L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BUILDING_NOT_FOUND);
        }

        @Test
        @DisplayName("점유자 아님 → NOT_TERRITORY_OWNER")
        void not_owner() {
            User owner = sampleUser(1L);
            Territory territory = territoryOwnedBy(owner, gradeA());
            BuildingType bt = storage();
            BuildingInstance bi = placedInstance(bt, territory, 0, 0);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));

            assertThatThrownBy(() -> buildingService.upgrade(2L, 100L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }

        @Test
        @DisplayName("GP 부족 → INSUFFICIENT_GP")
        void insufficient_gp() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage(); // baseCostGp=500, level1 upgrade cost=500
            BuildingInstance bi = placedInstance(bt, territory, 0, 0);
            Wallet wallet = walletWithGp(user, 100); // too low

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            assertThatThrownBy(() -> buildingService.upgrade(1L, 100L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }
    }

    // ─── repair() ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("repair()")
    class Repair {

        @Test
        @DisplayName("파괴된 건물 수리 성공")
        void success() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage();
            BuildingInstance bi = placedInstance(bt, territory, 0, 0);
            ReflectionTestUtils.setField(bi, "isDestroyed", true);
            Wallet wallet = walletWithGp(user, 2000);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            RepairBuildingResponse response = buildingService.repair(1L, 100L);

            assertThat(response.hp()).isEqualTo(bt.getMaxHp());
        }

        @Test
        @DisplayName("파괴되지 않은 건물 수리 시도 → INVALID_INPUT")
        void not_destroyed() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingInstance bi = placedInstance(storage(), territory, 0, 0);
            // isDestroyed = false by default

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));

            assertThatThrownBy(() -> buildingService.repair(1L, 100L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_INPUT);
        }
    }

    // ─── getIsland() ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getIsland()")
    class GetIsland {

        @Test
        @DisplayName("섬 정보 정상 반환")
        void success() {
            User user = sampleUser(1L);
            HomeIsland island = sampleIsland(user);

            given(homeIslandRepository.findByUserId(1L)).willReturn(Optional.of(island));
            given(buildingInstanceRepository.findByIslandId(1L))
                    .willReturn(Collections.emptyList());

            IslandResponse response = buildingService.getIsland(1L);

            assertThat(response.islandId()).isEqualTo(1L);
            assertThat(response.buildings()).isEmpty();
        }

        @Test
        @DisplayName("섬 없음 → ISLAND_NOT_FOUND")
        void not_found() {
            given(homeIslandRepository.findByUserId(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> buildingService.getIsland(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ISLAND_NOT_FOUND);
        }
    }

    // ─── placeOnIsland() ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("placeOnIsland()")
    class PlaceOnIsland {

        @Test
        @DisplayName("섬 건물 배치 성공")
        void success() {
            User user = sampleUser(1L);
            HomeIsland island = sampleIsland(user);
            BuildingType bt = storage();

            given(homeIslandRepository.findByUserId(1L)).willReturn(Optional.of(island));
            given(buildingTypeRepository.findById(2L)).willReturn(Optional.of(bt));
            given(buildingInstanceRepository.findByIslandId(1L))
                    .willReturn(Collections.emptyList());
            given(walletRepository.findById(1L)).willReturn(Optional.of(walletWithGp(user, 2000)));
            given(buildingInstanceRepository.save(any()))
                    .willAnswer(
                            inv -> {
                                BuildingInstance saved = inv.getArgument(0);
                                ReflectionTestUtils.setField(saved, "id", 201L);
                                return saved;
                            });

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0);
            PlaceBuildingResponse response = buildingService.placeOnIsland(1L, req);

            assertThat(response.buildingId()).isEqualTo(201L);
        }

        @Test
        @DisplayName("GP 부족 → INSUFFICIENT_GP")
        void insufficient_gp() {
            User user = sampleUser(1L);
            HomeIsland island = sampleIsland(user);
            BuildingType bt = storage();

            given(homeIslandRepository.findByUserId(1L)).willReturn(Optional.of(island));
            given(buildingTypeRepository.findById(2L)).willReturn(Optional.of(bt));
            given(buildingInstanceRepository.findByIslandId(1L))
                    .willReturn(Collections.emptyList());
            given(walletRepository.findById(1L)).willReturn(Optional.of(walletWithGp(user, 10)));

            PlaceBuildingRequest req = new PlaceBuildingRequest(2L, 0, 0);
            assertThatThrownBy(() -> buildingService.placeOnIsland(1L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }
    }

    // ─── getInventory() ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("getInventory()")
    class GetInventory {

        @Test
        @DisplayName("보관함 아이템 정상 반환")
        void success() {
            User user = sampleUser(1L);
            BuildingType bt = storage();
            BuildingInstance stored =
                    BuildingInstance.builder()
                            .buildingType(bt)
                            .owner(user)
                            .posX(-1)
                            .posY(-1)
                            .hp(bt.getMaxHp())
                            .zone(0)
                            .build();
            ReflectionTestUtils.setField(stored, "id", 300L);

            given(buildingInstanceRepository.findStoredByOwnerId(1L)).willReturn(List.of(stored));

            InventoryResponse response = buildingService.getInventory(1L);

            assertThat(response.items()).hasSize(1);
        }

        @Test
        @DisplayName("보관함 비어있음 → 빈 목록 반환")
        void empty_inventory() {
            given(buildingInstanceRepository.findStoredByOwnerId(1L))
                    .willReturn(Collections.emptyList());

            InventoryResponse response = buildingService.getInventory(1L);

            assertThat(response.items()).isEmpty();
        }
    }

    // ─── store() ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("store()")
    class Store {

        @Test
        @DisplayName("건물 보관 성공")
        void success() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage();
            BuildingInstance bi = placedInstance(bt, territory, 2, 2);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(userRepository.findById(1L)).willReturn(Optional.of(user));

            StoreBuildingResponse response = buildingService.store(1L, 100L);

            assertThat(response.buildingId()).isEqualTo(100L);
        }

        @Test
        @DisplayName("Castle은 보관 불가 → CASTLE_CANNOT_BE_STORED")
        void castle_cannot_be_stored() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingInstance bi = placedInstance(castle(), territory, 4, 4);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));

            assertThatThrownBy(() -> buildingService.store(1L, 100L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.CASTLE_CANNOT_BE_STORED);
        }

        @Test
        @DisplayName("점유자 아님 → NOT_TERRITORY_OWNER")
        void not_owner() {
            User owner = sampleUser(1L);
            Territory territory = territoryOwnedBy(owner, gradeA());
            BuildingInstance bi = placedInstance(storage(), territory, 0, 0);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));

            assertThatThrownBy(() -> buildingService.store(2L, 100L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    // ─── move() ───────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("move()")
    class Move {

        @Test
        @DisplayName("건물 이동 성공")
        void success() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA());
            BuildingType bt = storage();
            BuildingInstance bi = placedInstance(bt, territory, 0, 0);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(buildingInstanceRepository.findByTerritoryId(10L)).willReturn(List.of(bi));

            MoveBuildingRequest req = new MoveBuildingRequest(3, 3);
            MoveBuildingResponse response = buildingService.move(1L, 100L, req);

            assertThat(response.posX()).isEqualTo(3);
            assertThat(response.posY()).isEqualTo(3);
        }

        @Test
        @DisplayName("범위 밖 이동 → INVALID_POSITION")
        void out_of_bounds() {
            User user = sampleUser(1L);
            Territory territory = territoryOwnedBy(user, gradeA()); // gridSize=10
            BuildingInstance bi = placedInstance(storage(), territory, 0, 0);

            given(buildingInstanceRepository.findById(100L)).willReturn(Optional.of(bi));
            given(buildingInstanceRepository.findByTerritoryId(10L)).willReturn(List.of(bi));

            MoveBuildingRequest req = new MoveBuildingRequest(15, 15); // out of 10x10 grid
            assertThatThrownBy(() -> buildingService.move(1L, 100L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_POSITION);
        }
    }

    // ─── placeFromInventory() ─────────────────────────────────────────────────

    @Nested
    @DisplayName("placeFromInventory()")
    class PlaceFromInventory {

        @Test
        @DisplayName("보관함 건물 배치 성공")
        void success() {
            User user = sampleUser(1L);
            TerritoryGrade grade = gradeA();
            Territory territory = territoryOwnedBy(user, grade);
            BuildingType bt = storage();
            BuildingInstance stored =
                    BuildingInstance.builder()
                            .buildingType(bt)
                            .owner(user)
                            .posX(-1)
                            .posY(-1)
                            .hp(bt.getMaxHp())
                            .zone(0)
                            .build();
            ReflectionTestUtils.setField(stored, "id", 300L);

            given(buildingInstanceRepository.findById(300L)).willReturn(Optional.of(stored));
            given(territoryRepository.findById(10L)).willReturn(Optional.of(territory));
            given(buildingInstanceRepository.findByTerritoryId(10L))
                    .willReturn(Collections.emptyList());

            PlaceFromInventoryRequest req = new PlaceFromInventoryRequest(10L, 0, 0);
            PlaceFromInventoryResponse response = buildingService.placeFromInventory(1L, 300L, req);

            assertThat(response.buildingId()).isEqualTo(300L);
            assertThat(response.posX()).isEqualTo(0);
        }

        @Test
        @DisplayName("보관함에 없는 아이템 → BUILDING_NOT_FOUND")
        void not_in_inventory() {
            given(buildingInstanceRepository.findById(999L)).willReturn(Optional.empty());

            PlaceFromInventoryRequest req = new PlaceFromInventoryRequest(10L, 0, 0);
            assertThatThrownBy(() -> buildingService.placeFromInventory(1L, 999L, req))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BUILDING_NOT_FOUND);
        }
    }
}
