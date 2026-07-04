package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminAuctionSettingResponse;
import com.territorial.auction.domain.admin.entity.AdminSetting;
import com.territorial.auction.domain.admin.repository.AdminSettingRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSettingService {

    private final AdminSettingRepository adminSettingRepository;
    private final AdminAuditLogger adminAuditLogger;

    public AdminAuctionSettingResponse getAuctionSetting() {
        return new AdminAuctionSettingResponse(isAuctionEnabled());
    }

    @Transactional
    public AdminAuctionSettingResponse setAuctionEnabled(Long adminUserId, boolean enabled) {
        AdminSetting setting =
                adminSettingRepository
                        .findBySettingKey(AdminSetting.KEY_AUCTION_ENABLED)
                        .orElseGet(
                                () ->
                                        AdminSetting.builder()
                                                .settingKey(AdminSetting.KEY_AUCTION_ENABLED)
                                                .settingValue(Boolean.TRUE.toString())
                                                .build());
        setting.updateValue(Boolean.toString(enabled));
        adminSettingRepository.save(setting);

        adminAuditLogger.record(
                adminUserId, "GLOBAL_AUCTION_TOGGLE", "SETTING", null, Map.of("enabled", enabled));
        return new AdminAuctionSettingResponse(enabled);
    }

    private boolean isAuctionEnabled() {
        return adminSettingRepository
                .findBySettingKey(AdminSetting.KEY_AUCTION_ENABLED)
                .map(s -> Boolean.parseBoolean(s.getSettingValue()))
                .orElse(true);
    }
}
