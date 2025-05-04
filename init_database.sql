-- SQLGenAI Database Initialization Script
-- This script creates all the necessary tables for the SQLGenAI application

-- Drop database if it exists and create a new one
DROP DATABASE IF EXISTS sqlgenai;
CREATE DATABASE sqlgenai;
USE sqlgenai;

-- User table
CREATE TABLE `user` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(128),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,
    is_admin TINYINT(1) DEFAULT 0,
    company VARCHAR(100),
    job_title VARCHAR(100),
    auth_token VARCHAR(128) UNIQUE
);

-- Subscription table
CREATE TABLE `subscription` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    is_annual TINYINT(1) DEFAULT 0,
    subscription_id VARCHAR(100) UNIQUE,
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- Payment History table
CREATE TABLE `payment_history` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_id INT NOT NULL,
    amount FLOAT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    FOREIGN KEY (subscription_id) REFERENCES `subscription`(id)
);

-- Database Connection table
CREATE TABLE `database_connection` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    db_type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- Database Schema table
CREATE TABLE `database_schema` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    connection_id INT NOT NULL,
    schema_name VARCHAR(100) NOT NULL,
    schema_data TEXT NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES `database_connection`(id)
);

-- Query History table
CREATE TABLE `query_history` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    connection_id INT NOT NULL,
    natural_language_query TEXT NOT NULL,
    generated_sql TEXT NOT NULL,
    execution_time FLOAT,
    is_successful TINYINT(1) DEFAULT 1,
    error_message TEXT,
    is_favorite TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    FOREIGN KEY (connection_id) REFERENCES `database_connection`(id)
);

-- Create an admin user (password: admin123)
INSERT INTO `user` (email, username, password_hash, first_name, last_name, is_admin)
VALUES ('admin@sqlgenai.com', 'admin', 'pbkdf2:sha256:150000$lLVTH7YW$d6a8e6d9b97a0d6efd37b448debcf7a2f5ee4ec6b0b4845cd8107d36ad72e94c', 'Admin', 'User', 1);

-- Create a basic subscription for the admin user
INSERT INTO `subscription` (user_id, plan_id, status, start_date, end_date, subscription_id)
VALUES (1, 'enterprise', 'active', CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 YEAR), 'admin-subscription-001');
