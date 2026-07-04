package com.territorial.auction.domain.user.repository;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.UserStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    // 관리자 유저 검색: status 필터(nullable) + 닉네임/username 부분 일치(nullable)
    @Query(
            "SELECT u FROM User u WHERE (:status IS NULL OR u.status = :status) "
                    + "AND (:keyword IS NULL "
                    + "OR LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) "
                    + "OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<User> searchForAdmin(
            @Param("status") UserStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);
}
