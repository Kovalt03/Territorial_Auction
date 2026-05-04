package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.dto.GlobalVaultResponse;
import com.territorial.auction.domain.building.dto.VaultTransferRequest;
import com.territorial.auction.domain.building.dto.VaultTransferResponse;
import com.territorial.auction.domain.building.entity.GlobalVault;
import com.territorial.auction.domain.building.repository.GlobalVaultRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GlobalVaultService {

    private static final int TRANSFER_COOLDOWN_MINUTES = 10;

    private final GlobalVaultRepository globalVaultRepository;
    private final TerritoryRepository territoryRepository;
    private final WalletRepository walletRepository;

    public GlobalVaultResponse getVault(Long userId) {
        GlobalVault vault = findVaultOrThrow(userId);
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

        GlobalVault vault = findVaultOrThrow(userId);
        validateCooldown(vault);

        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if ("TO_VAULT".equals(request.direction())) {
            return transferToVault(vault, wallet, request);
        } else {
            return transferFromVault(vault, wallet, request);
        }
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private VaultTransferResponse transferToVault(
            GlobalVault vault, Wallet wallet, VaultTransferRequest request) {
        int amount = request.amount().intValue();
        if (wallet.getAvailableGp() < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        if (vault.getStoredGp() + amount > vault.getCapacity()) {
            throw new CustomException(ErrorCode.VAULT_CAPACITY_EXCEEDED);
        }
        wallet.spendGp(amount);
        vault.receiveGp(amount);
        vault.recordTransfer();
        return buildResponse(request, wallet, vault);
    }

    private VaultTransferResponse transferFromVault(
            GlobalVault vault, Wallet wallet, VaultTransferRequest request) {
        int amount = request.amount().intValue();
        if (vault.getStoredGp() < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        vault.withdrawGp(amount);
        wallet.addGp(amount);
        vault.recordTransfer();
        return buildResponse(request, wallet, vault);
    }

    private VaultTransferResponse buildResponse(
            VaultTransferRequest request, Wallet wallet, GlobalVault vault) {
        return new VaultTransferResponse(
                request.direction(),
                request.amount(),
                request.sourceTerritoryId(),
                wallet.getAvailableGp(),
                vault.getStoredGp(),
                vault.getCapacity(),
                nextTransferAvailableAt(vault));
    }

    private GlobalVault findVaultOrThrow(Long userId) {
        return globalVaultRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
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
