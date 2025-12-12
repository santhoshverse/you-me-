-- users (optional)
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  display_name VARCHAR(150),
  avatar_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- rooms
CREATE TABLE rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255),
  host_user_id BIGINT,
  is_private TINYINT(1) DEFAULT 0,
  settings JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- room_state
CREATE TABLE room_state (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL UNIQUE,
  is_screen_sharing TINYINT(1) DEFAULT 0,
  screen_sharer_peer_id VARCHAR(128) NULL,
  media JSON NULL,
  playback JSON NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- room_members
CREATE TABLE room_members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  user_id BIGINT NULL,
  peer_id VARCHAR(128) NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  role ENUM('host','moderator','guest') DEFAULT 'guest',
  INDEX (room_id)
);

-- messages
CREATE TABLE messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  user_id BIGINT NULL,
  text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (room_id)
);
