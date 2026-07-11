package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.StoragePolicy;
import com.territorial.auction.domain.building.dto.GlobalVaultResponse;
import com.territorial.auction.domain.building.dto.VaultTransferRequest;
import com.territorial.auction.domain.building.dto.VaultTransferResponse;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.GlobalVault;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.GlobalVaultRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GlobalVaultService {

    private static final int TRANSFER_COOLDOWN_MINUTES = 10;

    private final GlobalVaultRepository globalVaultRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final TerritoryRepository territoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public GlobalVaultResponse getVault(Long userId) {
        GlobalVault vault = findOrCreateVault(userId);
        LocalDateTime next = nextTransferAvailableAt(vault);
        boolean available = next == null || !LocalDateTime.now().isBefore(next);
        return new GlobalVaultResponse(
                vault.getStoredGp(),
                vault.getCapacity(),
                vault.getLastTransferAt(),
                next,
                available);
    }

    @Transactional
    public VaultTransferResponse transfer(Long userId, VaultTransferRequest request) {
        Territory territory = findTerritoryOrThrow(request.sourceTerritoryId());
        validateTerritoryOwner(territory, userId);

        GlobalVault vault = findOrCreateVault(userId);
        validateCooldown(vault);

        // 이 영토의 저장 공간(성 + 저장소). 성이 먼저 나온다.
        List<BuildingInstance> storages =
                buildingInstanceRepository.findStorageBuildingsByTerritoryIdWithLock(
                        territory.getId());
        if (storages.isEmpty()) {
            throw new CustomException(ErrorCode.STORAGE_NOT_FOUND);
        }

        if ("TO_VAULT".equals(request.direction())) {
            return transferToVault(vault, storages, request);
        } else {
            return transferFromVault(vault, storages, request);
        }
    }

    // ── private helpers ────────────────────────────────────────────────────────

    // 저장 공간 → 금고. 성부터 빼서 저장소에 위험을 남긴다.
    private VaultTransferResponse transferToVault(
            GlobalVault vault, List<BuildingInstance> storages, VaultTransferRequest request) {
        int amount = request.amount().intValue();
        if (StoragePolicy.totalGp(storages) < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        if (vault.getStoredGp() + amount > vault.getCapacity()) {
            throw new CustomException(ErrorCode.VAULT_CAPACITY_EXCEEDED);
        }
        StoragePolicy.drainGp(storages, amount);
        vault.receiveGp(amount);
        vault.recordTransfer();
        return buildResponse(request, storages, vault);
    }

    // 금고 → 저장 공간. 저장소부터 채워 즉시 약탈 위험을 감수하게 한다.
    private VaultTransferResponse transferFromVault(
            GlobalVault vault, List<BuildingInstance> storages, VaultTransferRequest request) {
        int amount = request.amount().intValue();
        if (vault.getStoredGp() < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        if (StoragePolicy.roomGp(storages) < amount) {
            throw new CustomException(ErrorCode.STORAGE_CAPACITY_EXCEEDED);
        }
        StoragePolicy.fillGp(storages, amount);
        vault.withdrawGp(amount);
        vault.recordTransfer();
        return buildResponse(request, storages, vault);
    }

    private VaultTransferResponse buildResponse(
            VaultTransferRequest request, List<BuildingInstance> storages, GlobalVault vault) {
        return new VaultTransferResponse(
                request.direction(),
                request.amount(),
                request.sourceTerritoryId(),
                StoragePolicy.totalGp(storages),
                vault.getStoredGp(),
                vault.getCapacity(),
                nextTransferAvailableAt(vault));
    }

    private GlobalVault findOrCreateVault(Long userId) {
        return globalVaultRepository.findById(userId).orElseGet(() -> createVault(userId));
    }

    private GlobalVault createVault(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return globalVaultRepository.save(GlobalVault.builder().user(user).build());
    }

    private Territory findTerritoryOrThrow(Long territoryId) {
        return territoryRepository
                .findById(territoryId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
    }

    private void validateTerritoryOwner(Territory territory, Long userId) {
        if (territory.getOwner() == null || !userId.equals(territory.getOwner().getId())) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    private void validateCooldown(GlobalVault vault) {
        LocalDateTime next = nextTransferAvailableAt(vault);
        if (next != null && LocalDateTime.now().isBefore(next)) {
            throw new CustomException(ErrorCode.TRANSFER_COOLDOWN_ACTIVE);
        }
    }

    private LocalDateTime nextTransferAvailableAt(GlobalVault vault) {
        if (vault.getLastTransferAt() == null) {
            return null;
        }
        return vault.getLastTransferAt().plusMinutes(TRANSFER_COOLDOWN_MINUTES);
    }
}
