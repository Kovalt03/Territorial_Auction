package com.territorial.auction.domain.user.repository;

import com.territorial.auction.domain.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByLoginId(String loginId);

    Optional<User> findByNickname(String nickname);

    boolean existsByLoginId(String loginId);

    boolean existsByNickname(String nickname);
}
