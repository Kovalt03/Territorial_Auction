package com.territorial.auction.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank
                @Size(min = 4, max = 50)
                @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "영문, 숫자만 사용 가능합니다.")
                String username,
        @NotBlank @Email String email,
        @NotBlank
                @Size(min = 8, max = 20)
                @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d).+$", message = "영문과 숫자를 모두 포함해야 합니다.")
                String password,
        @NotBlank @Size(min = 2, max = 30) String nickname) {}
