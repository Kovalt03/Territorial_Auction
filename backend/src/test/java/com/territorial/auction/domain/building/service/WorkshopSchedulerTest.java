package com.territorial.auction.domain.building.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkshopSchedulerTest {

    @InjectMocks private WorkshopScheduler workshopScheduler;

    @Mock private BuildingInstanceRepository buildingInstanceRepository;
    @Mock private WalletRepository walletRepository;

    @Nested
    @DisplayName("produceWorkshopGp")
    class ProduceWorkshopGp {

        @Test
        @DisplayName("활성 WORKSHOP 존재 → 소유자별 GP 합산 후 Wallet에 적립")
        void produceWorkshopGp_success() {
            // given
            Object[] row = {1L, 200};
            List<Object[]> rows = new ArrayList<>();
            rows.add(row);
            given(buildingInstanceRepository.sumWorkshopGpProductionGroupedByOwner(any()))
                    .willReturn(rows);

            Wallet wallet = mock(Wallet.class);
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            // when
            workshopScheduler.produceWorkshopGp();

            // then
            then(wallet).should().addGp(200);
        }

        @Test
        @DisplayName("활성 WORKSHOP 없음 → Wallet 미접근")
        void produceWorkshopGp_noActiveWorkshop() {
            // given
            given(buildingInstanceRepository.sumWorkshopGpProductionGroupedByOwner(any()))
                    .willReturn(List.of());

            // when
            workshopScheduler.produceWorkshopGp();

            // then
            then(walletRepository).should(never()).findById(any());
        }

        @Test
        @DisplayName("Wallet이 존재하지 않는 ownerId → 해당 행 무시, 다른 유저 정상 처리")
        void produceWorkshopGp_missingWallet_skipped() {
            // given
            Object[] row1 = {1L, 100};
            Object[] row2 = {2L, 150};
            List<Object[]> rows = new ArrayList<>();
            rows.add(row1);
            rows.add(row2);
            given(buildingInstanceRepository.sumWorkshopGpProductionGroupedByOwner(any()))
                    .willReturn(rows);

            Wallet wallet2 = mock(Wallet.class);
            given(walletRepository.findById(1L)).willReturn(Optional.empty());
            given(walletRepository.findById(2L)).willReturn(Optional.of(wallet2));

            // when
            workshopScheduler.produceWorkshopGp();

            // then
            then(wallet2).should().addGp(150);
        }
    }
}
