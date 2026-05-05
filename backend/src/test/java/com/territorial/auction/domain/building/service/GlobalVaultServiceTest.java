package com.territorial.auction.domain.building.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.building.dto.GlobalVaultResponse;
import com.territorial.auction.domain.building.dto.VaultTransferRequest;
import com.territorial.auction.domain.building.dto.VaultTransferResponse;
import com.territorial.auction.domain.building.entity.GlobalVault;
import com.territorial.auction.domain.building.repository.GlobalVaultRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class GlobalVaultServiceTest {

    @InjectMocks private GlobalVaultService globalVaultService;

    @Mock private GlobalVaultRepository globalVaultRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private WalletRepository walletRepository;

    private User user;
    private Wallet wallet;
    private GlobalVault vault;
    private Territory territory;

    @BeforeEach
    void setUp() {
        user =
                User.builder()
                        .username("testuser")
                        .email("test@test.com")
                        .passwordHash("hashed")
                        .nickname("테스터")
                        .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        wallet = Wallet.builder().user(user).build();
        ReflectionTestUtils.setField(wallet, "availableGp", 10000);

        vault = GlobalVault.builder().user(user).build();
        ReflectionTestUtils.setField(vault, "storedGp", 5000);
        ReflectionTestUtils.setField(vault, "capacity", 50000);

        territory = Territory.builder().coordX(1).coordY(1).build();
        ReflectionTestUtils.setField(territory, "id", 42L);
        ReflectionTestUtils.setField(territory, "owner", user);
    }

    // ─── getVault() ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getVault()")
    class GetVault {

        @Test
        @DisplayName("최초 조회 (lastTransferAt=null) → isTransferAvailable=true")
        void noLastTransfer_isAvailable() {
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));

            GlobalVaultResponse response = globalVaultService.getVault(1L);

            assertThat(response.storedGP()).isEqualTo(5000);
            assertThat(response.capacity()).isEqualTo(50000);
            assertThat(response.lastTransferAt()).isNull();
            assertThat(response.nextTransferAvailableAt()).isNull();
            assertThat(response.isTransferAvailable()).isTrue();
        }

        @Test
        @DisplayName("쿨다운 중 → isTransferAvailable=false, nextTransferAvailableAt 반환")
        void cooldownActive_isNotAvailable() {
            LocalDateTime recent = LocalDateTime.now().minusMinutes(5);
            ReflectionTestUtils.setField(vault, "lastTransferAt", recent);
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));

            GlobalVaultResponse response = globalVaultService.getVault(1L);

            assertThat(response.isTransferAvailable()).isFalse();
            assertThat(response.nextTransferAvailableAt()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("쿨다운 만료 → isTransferAvailable=true")
        void cooldownExpired_isAvailable() {
            LocalDateTime past = LocalDateTime.now().minusMinutes(15);
            ReflectionTestUtils.setField(vault, "lastTransferAt", past);
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));

            GlobalVaultResponse response = globalVaultService.getVault(1L);

            assertThat(response.isTransferAvailable()).isTrue();
        }

        @Test
        @DisplayName("금고 없음 → USER_NOT_FOUND")
        void vaultNotFound() {
            given(globalVaultRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> globalVaultService.getVault(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_NOT_FOUND);
        }
    }

    // ─── transfer() ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("transfer() — TO_VAULT")
    class TransferToVault {

        @Test
        @DisplayName("영토→금고 이전 성공 — 지갑 GP 감소, 금고 GP 증가")
        void toVault_success() {
            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 42L, 3000L);
            VaultTransferResponse response = globalVaultService.transfer(1L, request);

            assertThat(response.direction()).isEqualTo("TO_VAULT");
            assertThat(response.transferredAmount()).isEqualTo(3000L);
            assertThat(response.territoryStorageAfter()).isEqualTo(7000L); // 10000 - 3000
            assertThat(response.vaultStoredAfter()).isEqualTo(8000L); // 5000 + 3000
            assertThat(response.nextTransferAvailableAt()).isNotNull();
        }

        @Test
        @DisplayName("지갑 GP 부족 → INSUFFICIENT_GP")
        void toVault_insufficientWalletGp() {
            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 42L, 20000L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }

        @Test
        @DisplayName("금고 용량 초과 → VAULT_CAPACITY_EXCEEDED")
        void toVault_capacityExceeded() {
            ReflectionTestUtils.setField(vault, "storedGp", 49000);
            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 42L, 5000L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.VAULT_CAPACITY_EXCEEDED);
        }
    }

    @Nested
    @DisplayName("transfer() — FROM_VAULT")
    class TransferFromVault {

        @Test
        @DisplayName("금고→영토 이전 성공 — 금고 GP 감소, 지갑 GP 증가")
        void fromVault_success() {
            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            VaultTransferRequest request = new VaultTransferRequest("FROM_VAULT", 42L, 2000L);
            VaultTransferResponse response = globalVaultService.transfer(1L, request);

            assertThat(response.direction()).isEqualTo("FROM_VAULT");
            assertThat(response.territoryStorageAfter()).isEqualTo(12000L); // 10000 + 2000
            assertThat(response.vaultStoredAfter()).isEqualTo(3000L); // 5000 - 2000
        }

        @Test
        @DisplayName("금고 GP 부족 → INSUFFICIENT_GP")
        void fromVault_insufficientVaultGp() {
            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            VaultTransferRequest request = new VaultTransferRequest("FROM_VAULT", 42L, 9999L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INSUFFICIENT_GP);
        }
    }

    @Nested
    @DisplayName("transfer() — 공통 검증")
    class TransferValidation {

        @Test
        @DisplayName("영토 없음 → TERRITORY_NOT_FOUND")
        void territoryNotFound() {
            given(territoryRepository.findById(999L)).willReturn(Optional.empty());

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 999L, 1000L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.TERRITORY_NOT_FOUND);
        }

        @Test
        @DisplayName("영토 점유자 아님 → NOT_TERRITORY_OWNER")
        void notTerritoryOwner() {
            User other =
                    User.builder()
                            .username("other")
                            .email("other@test.com")
                            .passwordHash("hash")
                            .nickname("타인")
                            .build();
            ReflectionTestUtils.setField(other, "id", 2L);
            ReflectionTestUtils.setField(territory, "owner", other);

            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 42L, 1000L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOT_TERRITORY_OWNER);
        }

        @Test
        @DisplayName("쿨다운 중 이전 시도 → TRANSFER_COOLDOWN_ACTIVE")
        void cooldownActive() {
            LocalDateTime recent = LocalDateTime.now().minusMinutes(3);
            ReflectionTestUtils.setField(vault, "lastTransferAt", recent);

            given(territoryRepository.findById(42L)).willReturn(Optional.of(territory));
            given(globalVaultRepository.findById(1L)).willReturn(Optional.of(vault));

            VaultTransferRequest request = new VaultTransferRequest("TO_VAULT", 42L, 1000L);
            assertThatThrownBy(() -> globalVaultService.transfer(1L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.TRANSFER_COOLDOWN_ACTIVE);
        }
    }
}
