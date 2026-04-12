package com.territorial.auction.domain.social.service;

import com.territorial.auction.domain.social.repository.FriendRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SocialService {

    private final FriendRepository friendRepository;
}
