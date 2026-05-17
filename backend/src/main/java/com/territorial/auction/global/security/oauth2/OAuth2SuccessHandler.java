package com.territorial.auction.global.security.oauth2;

import com.territorial.auction.global.security.jwt.JwtTokenProvider;
import com.territorial.auction.global.security.jwt.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    // TODO: 프론트엔드 redirect URI로 변경
    private static final String REDIRECT_URI = "http://localhost:5173/oauth2/callback";

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();

        String accessToken = jwtTokenProvider.createAccessToken(oAuth2User.getUserId());
        String refreshToken = jwtTokenProvider.createRefreshToken(oAuth2User.getUserId());
        refreshTokenService.save(oAuth2User.getUserId(), refreshToken);

        String redirectUrl =
                REDIRECT_URI + "?accessToken=" + accessToken + "&refreshToken=" + refreshToken;

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
