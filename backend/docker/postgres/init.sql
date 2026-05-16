-- =============================================
-- Territorial Auction - PostgreSQL Init Script
-- =============================================

-- users
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL     PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    email         VARCHAR(100)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    nickname      VARCHAR(30)   NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    status        VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE'
);

-- wallets
CREATE TABLE IF NOT EXISTS wallets (
    user_id        BIGINT  PRIMARY KEY REFERENCES users(id),
    available_ap   INTEGER NOT NULL DEFAULT 0,
    locked_ap      INTEGER NOT NULL DEFAULT 0,
    available_gp   INTEGER NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id                  BIGINT      PRIMARY KEY REFERENCES users(id),
    is_outbid_enabled        BOOLEAN     DEFAULT true,
    is_auction_start_enabled BOOLEAN     DEFAULT true,
    is_marketing_enabled     BOOLEAN     DEFAULT false,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- continents
CREATE TABLE IF NOT EXISTS continents (
    id          BIGSERIAL   PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    theme_color VARCHAR(7)  NOT NULL
);

-- territory_grades
CREATE TABLE IF NOT EXISTS territory_grades (
    id                      BIGSERIAL      PRIMARY KEY,
    grade                   VARCHAR(1)     NOT NULL UNIQUE,
    production_multiplier   NUMERIC(3,1)   NOT NULL,
    auction_price_multiplier NUMERIC(3,1)  NOT NULL,
    pre_built_count         INTEGER        NOT NULL DEFAULT 0,
    spawn_rate              NUMERIC(4,3)   NOT NULL,
    grid_size               INTEGER        NOT NULL
);

-- territories
CREATE TABLE IF NOT EXISTS territories (
    id                  BIGSERIAL   PRIMARY KEY,
    coord_x             INTEGER     NOT NULL,
    coord_y             INTEGER     NOT NULL,
    continent_id        BIGINT      REFERENCES continents(id),
    owner_id            BIGINT      REFERENCES users(id),
    current_color       VARCHAR(7),
    occupied_until      TIMESTAMPTZ,
    status              VARCHAR(10) NOT NULL,
    base_production_rate INTEGER    NOT NULL DEFAULT 1,
    last_produced_at    TIMESTAMPTZ,
    grade_id            BIGINT      REFERENCES territory_grades(id)
);

-- bonus_tiles
CREATE TABLE IF NOT EXISTS bonus_tiles (
    id           BIGSERIAL     PRIMARY KEY,
    territory_id BIGINT        UNIQUE REFERENCES territories(id),
    multiplier   NUMERIC(4,2)  NOT NULL,
    description  VARCHAR(100)
);

-- auctions
CREATE TABLE IF NOT EXISTS auctions (
    id                BIGSERIAL   PRIMARY KEY,
    territory_id      BIGINT      REFERENCES territories(id),
    current_bidder_id BIGINT      REFERENCES users(id),
    current_price     INTEGER     NOT NULL,
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    max_extend_until  TIMESTAMPTZ NOT NULL
);

-- auction_bids
CREATE TABLE IF NOT EXISTS auction_bids (
    id         BIGSERIAL   PRIMARY KEY,
    auction_id BIGINT      REFERENCES auctions(id),
    bidder_id  BIGINT      REFERENCES users(id),
    price      INTEGER     NOT NULL,
    bid_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_bid_at ON auction_bids (auction_id, bid_at ASC);

-- auction_histories
CREATE TABLE IF NOT EXISTS auction_histories (
    id           BIGSERIAL   PRIMARY KEY,
    auction_id   BIGINT      REFERENCES auctions(id),
    territory_id BIGINT      REFERENCES territories(id),
    winner_id    BIGINT      REFERENCES users(id),
    final_price  INTEGER     NOT NULL,
    won_at       TIMESTAMPTZ NOT NULL
);

-- color_histories
CREATE TABLE IF NOT EXISTS color_histories (
    id           BIGSERIAL   PRIMARY KEY,
    territory_id BIGINT      REFERENCES territories(id),
    user_id      BIGINT      REFERENCES users(id),
    color_code   VARCHAR(7)  NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- territory_production_logs
CREATE TABLE IF NOT EXISTS territory_production_logs (
    id           BIGSERIAL   PRIMARY KEY,
    territory_id BIGINT      REFERENCES territories(id),
    owner_id     BIGINT      REFERENCES users(id),
    amount       INTEGER     NOT NULL,
    reason       VARCHAR(30) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- chat_rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id        BIGSERIAL   PRIMARY KEY,
    type      VARCHAR(10) NOT NULL,
    target_id BIGINT
);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id        BIGSERIAL   PRIMARY KEY,
    room_id   BIGINT      REFERENCES chat_rooms(id),
    sender_id BIGINT      REFERENCES users(id),
    content   TEXT        NOT NULL,
    sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- interest_groups
CREATE TABLE IF NOT EXISTS interest_groups (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT REFERENCES users(id),
    continent_id BIGINT REFERENCES continents(id)
);

-- notification_logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      REFERENCES users(id),
    type       VARCHAR(20) NOT NULL,
    message    TEXT        NOT NULL,
    is_read    BOOLEAN     DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- land_tax_logs
CREATE TABLE IF NOT EXISTS land_tax_logs (
    id               BIGSERIAL   PRIMARY KEY,
    user_id          BIGINT      REFERENCES users(id),
    territory_count  INTEGER     NOT NULL,
    gp_charged       INTEGER     NOT NULL,
    status           VARCHAR(10) NOT NULL,
    charged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- items
CREATE TABLE IF NOT EXISTS items (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    item_type   VARCHAR(20)  NOT NULL,
    description VARCHAR(200),
    cost_ap     INTEGER,
    cost_gp     INTEGER,
    daily_limit INTEGER,
    gp_reward   INTEGER
);

-- user_items
CREATE TABLE IF NOT EXISTS user_items (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    item_id    BIGINT      NOT NULL REFERENCES items(id),
    quantity   INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_id)
);

-- item_purchases
CREATE TABLE IF NOT EXISTS item_purchases (
    id                   BIGSERIAL   PRIMARY KEY,
    user_id              BIGINT      REFERENCES users(id),
    item_id              BIGINT      REFERENCES items(id),
    quantity             INTEGER     NOT NULL DEFAULT 1,
    target_territory_id  BIGINT      REFERENCES territories(id),
    purchased_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- season_passes
CREATE TABLE IF NOT EXISTS season_passes (
    id               BIGSERIAL   PRIMARY KEY,
    name             VARCHAR(50) NOT NULL,
    cost_ap          INTEGER     NOT NULL,
    duration_days    INTEGER     NOT NULL DEFAULT 30,
    island_bonus_pct INTEGER     NOT NULL,
    extra_builders   INTEGER     NOT NULL DEFAULT 1,
    tax_exempt_bonus INTEGER     NOT NULL DEFAULT 2
);

-- user_season_passes
CREATE TABLE IF NOT EXISTS user_season_passes (
    id             BIGSERIAL   PRIMARY KEY,
    user_id        BIGINT      REFERENCES users(id),
    season_pass_id BIGINT      REFERENCES season_passes(id),
    started_at     TIMESTAMPTZ NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    is_active      BOOLEAN     NOT NULL DEFAULT true
);

-- home_islands
CREATE TABLE IF NOT EXISTS home_islands (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      UNIQUE NOT NULL REFERENCES users(id),
    grid_size  INTEGER     NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- building_types
CREATE TABLE IF NOT EXISTS building_types (
    id               BIGSERIAL   PRIMARY KEY,
    name             VARCHAR(30) NOT NULL,
    width            INTEGER     NOT NULL,
    height           INTEGER     NOT NULL,
    max_hp           INTEGER     NOT NULL,
    base_cost_gp     INTEGER     NOT NULL,
    zone_restriction INTEGER
);

-- building_instances
CREATE TABLE IF NOT EXISTS building_instances (
    id               BIGSERIAL PRIMARY KEY,
    territory_id     BIGINT    REFERENCES territories(id),
    island_id        BIGINT    REFERENCES home_islands(id),
    building_type_id BIGINT    NOT NULL REFERENCES building_types(id),
    user_id          BIGINT    REFERENCES users(id),  -- 보관함 소유자 (territory/island 없을 때)
    pos_x            INTEGER   NOT NULL,
    pos_y            INTEGER   NOT NULL,
    hp               INTEGER   NOT NULL,
    level            INTEGER   NOT NULL DEFAULT 1,
    zone             INTEGER   NOT NULL,
    is_destroyed     BOOLEAN   NOT NULL DEFAULT false
);

-- global_vaults
CREATE TABLE IF NOT EXISTS global_vaults (
    user_id          BIGINT  PRIMARY KEY REFERENCES users(id),
    stored_gp        INTEGER NOT NULL DEFAULT 0,
    capacity         INTEGER NOT NULL DEFAULT 500,
    last_transfer_at TIMESTAMPTZ
);

-- unit_types
CREATE TABLE IF NOT EXISTS unit_types (
    id                 BIGSERIAL   PRIMARY KEY,
    name               VARCHAR(30) NOT NULL,
    attack_power       INTEGER     NOT NULL,
    defense_power      INTEGER     NOT NULL,
    cost_gp            INTEGER     NOT NULL,
    food_cost_per_hour INTEGER     NOT NULL
);

-- unit_instances
CREATE TABLE IF NOT EXISTS unit_instances (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                BIGINT    NOT NULL REFERENCES users(id),
    unit_type_id           BIGINT    NOT NULL REFERENCES unit_types(id),
    quantity               INTEGER   NOT NULL,
    deployed_territory_id  BIGINT    REFERENCES territories(id)
);

-- attack_tokens
CREATE TABLE IF NOT EXISTS attack_tokens (
    user_id         BIGINT  PRIMARY KEY REFERENCES users(id),
    normal_count    INTEGER NOT NULL DEFAULT 0,
    precision_count INTEGER NOT NULL DEFAULT 0
);

-- siege_events
CREATE TABLE IF NOT EXISTS siege_events (
    id                  BIGSERIAL   PRIMARY KEY,
    attacker_id         BIGINT      NOT NULL REFERENCES users(id),
    defender_id         BIGINT      NOT NULL REFERENCES users(id),
    target_territory_id BIGINT      NOT NULL REFERENCES territories(id),
    target_building_id  BIGINT      NOT NULL REFERENCES building_instances(id),
    attack_zone         INTEGER     NOT NULL,
    status              VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    siege_start_at      TIMESTAMPTZ NOT NULL,
    resolve_at          TIMESTAMPTZ NOT NULL
);

-- siege_results
CREATE TABLE IF NOT EXISTS siege_results (
    id                   BIGSERIAL   PRIMARY KEY,
    siege_id             BIGINT      UNIQUE NOT NULL REFERENCES siege_events(id),
    is_attacker_win      BOOLEAN     NOT NULL,
    attacker_units_lost  INTEGER,
    defender_units_lost  INTEGER,
    looted_gp            INTEGER     NOT NULL DEFAULT 0,
    result_type          VARCHAR(15)
);

-- seasons
CREATE TABLE IF NOT EXISTS seasons (
    id            BIGSERIAL   PRIMARY KEY,
    season_number INTEGER     NOT NULL UNIQUE,
    started_at    TIMESTAMPTZ NOT NULL,
    ended_at      TIMESTAMPTZ
);

-- season_pass_progress
CREATE TABLE IF NOT EXISTS season_pass_progress (
    id        BIGSERIAL PRIMARY KEY,
    user_id   BIGINT    NOT NULL REFERENCES users(id),
    season_id BIGINT    NOT NULL REFERENCES seasons(id),
    level     INTEGER   NOT NULL DEFAULT 1,
    xp        INTEGER   NOT NULL DEFAULT 0,
    UNIQUE (user_id, season_id)
);

-- season_pass_level_rewards
CREATE TABLE IF NOT EXISTS season_pass_level_rewards (
    id          BIGSERIAL    PRIMARY KEY,
    season_id   BIGINT       NOT NULL REFERENCES seasons(id),
    level       INTEGER      NOT NULL,
    reward_name VARCHAR(100) NOT NULL
);

-- season_pass_reward_claims
CREATE TABLE IF NOT EXISTS season_pass_reward_claims (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    reward_id  BIGINT      NOT NULL REFERENCES season_pass_level_rewards(id),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_trophies
CREATE TABLE IF NOT EXISTS user_trophies (
    user_id    BIGINT      PRIMARY KEY REFERENCES users(id),
    score      INTEGER     NOT NULL DEFAULT 0,
    league     VARCHAR(10) NOT NULL DEFAULT 'BRONZE',
    season_id  BIGINT      NOT NULL REFERENCES seasons(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- trophy_logs
CREATE TABLE IF NOT EXISTS trophy_logs (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id),
    season_id   BIGINT      NOT NULL REFERENCES seasons(id),
    siege_id    BIGINT      REFERENCES siege_events(id),
    delta       INTEGER     NOT NULL,
    reason      VARCHAR(30) NOT NULL,
    score_after INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- season_rewards
CREATE TABLE IF NOT EXISTS season_rewards (
    id                     BIGSERIAL   PRIMARY KEY,
    user_id                BIGINT      NOT NULL REFERENCES users(id),
    season_id              BIGINT      NOT NULL REFERENCES seasons(id),
    league                 VARCHAR(10) NOT NULL,
    gp_reward              INTEGER     NOT NULL,
    attack_token_normal    INTEGER     NOT NULL DEFAULT 0,
    attack_token_precision INTEGER     NOT NULL DEFAULT 0,
    title_reward           VARCHAR(30),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- guilds
CREATE TABLE IF NOT EXISTS guilds (
    id                BIGSERIAL    PRIMARY KEY,
    name              VARCHAR(20)  NOT NULL UNIQUE,
    description       VARCHAR(200),
    emblem            VARCHAR(255),
    master_id         BIGINT       NOT NULL REFERENCES users(id),
    max_members       INTEGER      NOT NULL DEFAULT 30,
    recruiting_status VARCHAR(6)   NOT NULL DEFAULT 'OPEN',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- guild_members
CREATE TABLE IF NOT EXISTS guild_members (
    id        BIGSERIAL    PRIMARY KEY,
    guild_id  BIGINT       NOT NULL REFERENCES guilds(id),
    user_id   BIGINT       NOT NULL REFERENCES users(id),
    role      VARCHAR(10)  NOT NULL DEFAULT 'MEMBER',
    status    VARCHAR(10)  NOT NULL DEFAULT 'PENDING',
    message   VARCHAR(200),
    joined_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
