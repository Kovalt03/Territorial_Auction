package com.territorial.auction.domain.admin.dto;

import java.util.Map;

// {도달레벨: 비용}. 비용이 null이면 해당 레벨 지정 해제(공식 폴백).
public record AdminLevelCostsRequest(Map<Integer, Integer> costs) {}
