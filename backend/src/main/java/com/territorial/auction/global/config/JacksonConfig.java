package com.territorial.auction.global.config;

import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    // 서버 LocalDateTime은 UTC 기준으로 운영된다. 직렬화 시 'Z'를 붙여 클라이언트가 항상 UTC로
    // 파싱하도록 통일한다. 일부 DTO에만 적용돼 있던 @JsonFormat 'Z' 규칙을 전역으로 일원화 —
    // 누락된 필드(경매 endAt 등)에서 타임존 미표기로 클라이언트가 로컬 시간으로 오인하던 문제 방지.
    private static final DateTimeFormatter UTC_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer localDateTimeUtcCustomizer() {
        return builder ->
                builder.serializerByType(
                        LocalDateTime.class, new LocalDateTimeSerializer(UTC_FORMAT));
    }
}
