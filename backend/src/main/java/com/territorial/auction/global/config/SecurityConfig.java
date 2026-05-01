package com.territorial.auction.global.config;

import com.territorial.auction.global.security.CustomUserDetailsService;
import com.territorial.auction.global.security.jwt.JwtAuthenticationFilter;
import com.territorial.auction.global.security.jwt.JwtTokenProvider;
import com.territorial.auction.global.security.oauth2.CustomOAuth2UserService;
import com.territorial.auction.global.security.oauth2.OAuth2FailureHandler;
import com.territorial.auction.global.security.oauth2.OAuth2SuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2FailureHandler oAuth2FailureHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        exceptions ->
                                exceptions.authenticationEntryPoint(
                                        (request, response, ex) -> {
                                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                            response.setContentType(
                                                    "application/json;charset=UTF-8");
                                            response.getWriter()
                                                    .write(
                                                            "{\"status\":\"UNAUTHORIZED\","
                                                                    + "\"message\":\"인증이 필요합니다.\"}");
                                        }))
                .authorizeHttpRequests(
                        // spotless:off
                        auth ->
                                auth.requestMatchers("/api/v1/auth/logout").authenticated()
                                    .requestMatchers("/api/v1/auth/**", "/oauth2/**", "/login/**").permitAll()
                                    .requestMatchers(HttpMethod.GET, "/api/v1/auctions", "/api/v1/auctions/**").permitAll()
                                    .anyRequest().authenticated())
                        // spotless:on
                .oauth2Login(
                        oauth2 ->
                                oauth2.userInfoEndpoint(
                                                endpoint ->
                                                        endpoint.userService(
                                                                customOAuth2UserService))
                                        .successHandler(oAuth2SuccessHandler)
                                        .failureHandler(oAuth2FailureHandler))
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
