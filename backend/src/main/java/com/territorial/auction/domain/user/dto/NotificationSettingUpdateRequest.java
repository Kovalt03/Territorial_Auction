package com.territorial.auction.domain.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NotificationSettingUpdateRequest {

    private Boolean isOutbidEnabled;
    private Boolean isAuctionStartEnabled;
    private Boolean isMarketingEnabled;
}
