-- Apple Style Website Engine CMS Database Schema

CREATE DATABASE IF NOT EXISTS pins_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pins_cms;

-- Site data table: stores the entire material JSON structure
CREATE TABLE IF NOT EXISTS site_data (
  id INT PRIMARY KEY DEFAULT 1,
  material JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

-- Media table: tracks uploaded images
CREATE TABLE IF NOT EXISTS media (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_filename (filename),
  INDEX idx_uploaded_at (uploaded_at)
);

-- Initialize site_data with empty material structure
INSERT INTO site_data (id, material) VALUES (1, '{}')
ON DUPLICATE KEY UPDATE id = id;
