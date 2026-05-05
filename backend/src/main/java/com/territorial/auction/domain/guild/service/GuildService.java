package com.territorial.auction.domain.guild.service;

import com.territorial.auction.domain.guild.dto.CreateGuildRequest;
import com.territorial.auction.domain.guild.dto.CreateGuildResponse;
import com.territorial.auction.domain.guild.dto.GuildApplicationListResponse;
import com.territorial.auction.domain.guild.dto.GuildDetailResponse;
import com.territorial.auction.domain.guild.dto.GuildListResponse;
import com.territorial.auction.domain.guild.dto.JoinGuildRequest;
import com.territorial.auction.domain.guild.dto.MyGuildResponse;
import com.territorial.auction.domain.guild.repository.GuildMemberRepository;
import com.territorial.auction.domain.guild.repository.GuildRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserTrophyRepository;
import com.territorial.auction.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuildService {

    private final GuildRepository guildRepository;
    private final GuildMemberRepository guildMemberRepository;
    private final UserRepository userRepository;
    private final TerritoryRepository territoryRepository;
    private final UserTrophyRepository userTrophyRepository;

    @Transactional
    public CreateGuildResponse createGuild(Long userId, CreateGuildRequest request) {
        throw new UnsupportedOperationException();
    }

    public GuildListResponse getGuilds(String search, Pageable pageable) {
        throw new UnsupportedOperationException();
    }

    public GuildDetailResponse getGuildDetail(Long guildId) {
        throw new UnsupportedOperationException();
    }

    public MyGuildResponse getMyGuild(Long userId) {
        throw new UnsupportedOperationException();
    }

    @Transactional
    public void joinGuild(Long userId, Long guildId, JoinGuildRequest request) {
        throw new UnsupportedOperationException();
    }

    @Transactional
    public void approveApplication(Long masterId, Long guildId, Long targetUserId) {
        throw new UnsupportedOperationException();
    }

    public GuildApplicationListResponse getApplications(Long masterId, Long guildId) {
        throw new UnsupportedOperationException();
    }
}
