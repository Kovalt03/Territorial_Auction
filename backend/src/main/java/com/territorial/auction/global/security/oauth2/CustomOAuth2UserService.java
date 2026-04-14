package com.territorial.auction.global.security.oauth2;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.of(registrationId, oAuth2User.getAttributes());

        User user = saveOrUpdate(userInfo, registrationId);

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }

    private User saveOrUpdate(OAuth2UserInfo userInfo, String provider) {
        // loginId = "provider:providerId" (e.g. "google:1234567890")
        String loginId = provider + ":" + userInfo.getId();

        return userRepository.findByLoginId(loginId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .loginId(loginId)
                                .passwordHash("")
                                .nickname(generateNickname(userInfo.getName()))
                                .build()
                ));
    }

    private String generateNickname(String name) {
        return name + "_" + System.currentTimeMillis() % 10000;
    }
}
