package com.territorial.auction.domain.guild.service;

import com.territorial.auction.domain.guild.dto.CreateGuildRequest;
import com.territorial.auction.domain.guild.dto.CreateGuildResponse;
import com.territorial.auction.domain.guild.dto.GuildApplicationListResponse;
import com.territorial.auction.domain.guild.dto.GuildDetailResponse;
import com.territorial.auction.domain.guild.dto.GuildListResponse;
import com.territorial.auction.domain.guild.dto.JoinGuildRequest;
import com.territorial.auction.domain.guild.dto.MyGuildResponse;
import com.territorial.auction.domain.guild.entity.Guild;
import com.territorial.auction.domain.guild.entity.GuildMember;
import com.territorial.auction.domain.guild.repository.GuildMemberRepository;
import com.territorial.auction.domain.guild.repository.GuildRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserTrophyRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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
        validateNotInGuild(userId);
        if (guildRepository.existsByName(request.name())) {
            throw new CustomException(ErrorCode.GUILD_NAME_DUPLICATED);
        }
        User user = findUserOrThrow(userId);
        Guild guild =
                guildRepository.save(
                        Guild.builder()
                                .name(request.name())
                                .description(request.description())
                                .emblem(request.emblem())
                                .master(user)
                                .build());
        guildMemberRepository.save(
                GuildMember.builder()
                        .guild(guild)
                        .user(user)
                        .role(GuildMember.Role.MASTER)
                        .status(GuildMember.Status.ACTIVE)
                        .build());
        return new CreateGuildResponse(
                guild.getId(),
                guild.getName(),
                user.getId(),
                user.getNickname(),
                1,
                guild.getCreatedAt());
    }

    public GuildListResponse getGuilds(String search, Pageable pageable) {
        Page<Guild> page =
                (search == null || search.isBlank())
                        ? guildRepository.findAllWithMaster(pageable)
                        : guildRepository.findByNameContainingWithMaster(search, pageable);
        List<GuildListResponse.GuildSummary> summaries =
                page.getContent().stream().map(this::toGuildSummary).toList();
        return new GuildListResponse(
                page.getTotalElements(),
                pageable.getPageNumber(),
                pageable.getPageSize(),
                summaries);
    }

    public GuildDetailResponse getGuildDetail(Long guildId) {
        Guild guild = findGuildWithMasterOrThrow(guildId);
        List<GuildMember> members =
                guildMemberRepository.findByGuildIdAndStatusWithUser(
                        guildId, GuildMember.Status.ACTIVE);
        long totalTerritoryCount =
                countTerritories(members.stream().map(m -> m.getUser().getId()).toList());
        List<GuildDetailResponse.MemberInfo> memberInfos =
                members.stream()
                        .map(
                                m ->
                                        new GuildDetailResponse.MemberInfo(
                                                m.getUser().getId(),
                                                m.getUser().getNickname(),
                                                m.getRole().name(),
                                                territoryRepository.countByOwnerId(
                                                        m.getUser().getId()),
                                                m.getJoinedAt()))
                        .toList();
        return new GuildDetailResponse(
                guild.getId(),
                guild.getName(),
                guild.getDescription(),
                guild.getEmblem(),
                new GuildDetailResponse.MasterInfo(
                        guild.getMaster().getId(), guild.getMaster().getNickname()),
                members.size(),
                totalTerritoryCount,
                memberInfos,
                guild.getCreatedAt());
    }

    public MyGuildResponse getMyGuild(Long userId) {
        GuildMember member =
                guildMemberRepository
                        .findByUser_IdAndStatus(userId, GuildMember.Status.ACTIVE)
                        .orElseThrow(() -> new CustomException(ErrorCode.NOT_IN_GUILD));
        Guild guild = findGuildWithMasterOrThrow(member.getGuild().getId());
        List<Long> activeUserIds = guildMemberRepository.findActiveUserIdsByGuildId(guild.getId());
        return new MyGuildResponse(
                guild.getId(),
                guild.getName(),
                guild.getDescription(),
                guild.getMaster().getNickname(),
                activeUserIds.size(),
                guild.getMaxMembers(),
                countTerritories(activeUserIds),
                sumTrophyPoints(activeUserIds),
                member.getRole().name(),
                member.getJoinedAt());
    }

    @Transactional
    public void joinGuild(Long userId, Long guildId, JoinGuildRequest request) {
        Guild guild = findGuildOrThrow(guildId);
        if (guildMemberRepository.existsByUser_IdAndStatus(userId, GuildMember.Status.ACTIVE)) {
            throw new CustomException(ErrorCode.ALREADY_IN_GUILD);
        }
        if (guildMemberRepository.existsByUser_IdAndGuild_IdAndStatus(
                userId, guildId, GuildMember.Status.PENDING)) {
            throw new CustomException(ErrorCode.ALREADY_APPLIED);
        }
        User user = findUserOrThrow(userId);
        guildMemberRepository.save(
                GuildMember.builder()
                        .guild(guild)
                        .user(user)
                        .role(GuildMember.Role.MEMBER)
                        .status(GuildMember.Status.PENDING)
                        .message(request != null ? request.message() : null)
                        .build());
    }

    @Transactional
    public void approveApplication(Long masterId, Long guildId, Long targetUserId) {
        Guild guild = findGuildWithMasterOrThrow(guildId);
        validateMaster(guild, masterId);
        GuildMember application =
                guildMemberRepository
                        .findByUser_IdAndGuild_IdAndStatus(
                                targetUserId, guildId, GuildMember.Status.PENDING)
                        .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        long activeCount =
                guildMemberRepository.countByGuild_IdAndStatus(guildId, GuildMember.Status.ACTIVE);
        if (activeCount >= guild.getMaxMembers()) {
            throw new CustomException(ErrorCode.GUILD_FULL);
        }
        application.approve();
    }

    public GuildApplicationListResponse getApplications(Long masterId, Long guildId) {
        Guild guild = findGuildWithMasterOrThrow(guildId);
        validateMaster(guild, masterId);
        List<GuildMember> applications =
                guildMemberRepository.findByGuildIdAndStatusWithUser(
                        guildId, GuildMember.Status.PENDING);
        List<GuildApplicationListResponse.ApplicationInfo> infos =
                applications.stream()
                        .map(
                                m -> {
                                    int score =
                                            (int)
                                                    userTrophyRepository.sumScoreByUserIdIn(
                                                            List.of(m.getUser().getId()));
                                    return new GuildApplicationListResponse.ApplicationInfo(
                                            m.getId(),
                                            m.getUser().getId(),
                                            m.getUser().getNickname(),
                                            score,
                                            m.getJoinedAt());
                                })
                        .toList();
        return new GuildApplicationListResponse(guildId, infos);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private Guild findGuildOrThrow(Long guildId) {
        return guildRepository
                .findById(guildId)
                .orElseThrow(() -> new CustomException(ErrorCode.GUILD_NOT_FOUND));
    }

    private Guild findGuildWithMasterOrThrow(Long guildId) {
        return guildRepository
                .findByIdWithMaster(guildId)
                .orElseThrow(() -> new CustomException(ErrorCode.GUILD_NOT_FOUND));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateNotInGuild(Long userId) {
        if (guildMemberRepository.existsByUser_IdAndStatusIn(
                userId, List.of(GuildMember.Status.ACTIVE, GuildMember.Status.PENDING))) {
            throw new CustomException(ErrorCode.ALREADY_IN_GUILD);
        }
    }

    private void validateMaster(Guild guild, Long requesterId) {
        if (!guild.getMaster().getId().equals(requesterId)) {
            throw new CustomException(ErrorCode.NOT_GUILD_MASTER);
        }
    }

    private GuildListResponse.GuildSummary toGuildSummary(Guild guild) {
        List<Long> activeUserIds = guildMemberRepository.findActiveUserIdsByGuildId(guild.getId());
        return new GuildListResponse.GuildSummary(
                guild.getId(),
                guild.getName(),
                guild.getMaster().getNickname(),
                activeUserIds.size(),
                guild.getMaxMembers(),
                sumTrophyPoints(activeUserIds),
                countTerritories(activeUserIds),
                guild.getRecruitingStatus().name());
    }

    private long sumTrophyPoints(List<Long> userIds) {
        return userIds.isEmpty() ? 0 : userTrophyRepository.sumScoreByUserIdIn(userIds);
    }

    private long countTerritories(List<Long> userIds) {
        return userIds.isEmpty() ? 0 : territoryRepository.countByOwner_IdIn(userIds);
    }
}
