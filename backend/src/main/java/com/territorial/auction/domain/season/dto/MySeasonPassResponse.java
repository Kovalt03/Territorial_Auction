package com.territorial.auction.domain.season.dto;

import com.territorial.auction.domain.season.entity.SeasonPass;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import java.time.LocalDateTime;

public record MySeasonPassResponse(Boolean hasSeasonPass, SeasonPassInfo seasonPassInfo) {

    public record SeasonPassInfo(
            Long seasonPassId,
            String name,
            LocalDateTime startedAt,
            LocalDateTime expiresAt,
            BenefitInfo benefitInfo) {}

    public record BenefitInfo(int islandBonusPct, int extraBuilders, int taxExemptBonus) {}

    public static MySeasonPassResponse from(UserSeasonPass userSeasonPass) {
        if (userSeasonPass == null) {
            return new MySeasonPassResponse(false, null);
        }

        SeasonPass pass = userSeasonPass.getSeasonPass();

        return new MySeasonPassResponse(
                true,
                new SeasonPassInfo(
                        pass.getId(),
                        pass.getName(),
                        userSeasonPass.getStartedAt(),
                        userSeasonPass.getExpiresAt(),
                        new BenefitInfo(
                                pass.getIslandBonusPct(),
                                pass.getExtraBuilders(),
                                pass.getTaxExemptBonus())));
    }
}
