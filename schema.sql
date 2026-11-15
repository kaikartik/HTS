-- =========================================================================
-- Helpdesk Ticketing System (HTS) - Full Schema & Initial Seed Data
-- =========================================================================

CREATE DATABASE IF NOT EXISTS helpdesk_db;
USE helpdesk_db;

-- 1. ROLE Table
CREATE TABLE ROLE (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. TEAM Table
CREATE TABLE TEAM (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- 3. USER Table
CREATE TABLE USER (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id INT NOT NULL,
    team_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_assigned_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES ROLE(role_id),
    FOREIGN KEY (team_id) REFERENCES TEAM(team_id)
);

-- 4. CATEGORY Table
CREATE TABLE CATEGORY (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    default_team_id INT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES CATEGORY(category_id),
    FOREIGN KEY (default_team_id) REFERENCES TEAM(team_id)
);

-- 5. SLA_POLICY Table
CREATE TABLE SLA_POLICY (
    sla_id INT AUTO_INCREMENT PRIMARY KEY,
    priority VARCHAR(20) NOT NULL,
    response_mins INT NOT NULL,
    resolution_mins INT NOT NULL,
    is_24x7 BOOLEAN DEFAULT FALSE
);

-- 6. TICKET Table
CREATE TABLE TICKET (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'New',
    priority VARCHAR(20) DEFAULT 'Medium',
    channel VARCHAR(30) DEFAULT 'Portal',
    requester_id INT NOT NULL,
    assignee_id INT NULL,
    team_id INT NOT NULL,
    category_id INT NOT NULL,
    sla_id INT NOT NULL,
    hold_started_at TIMESTAMP NULL,
    paused_minutes INT DEFAULT 0,
    warned_75 BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_response_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    response_due TIMESTAMP NULL,
    resolution_due TIMESTAMP NULL,
    is_breached BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (requester_id) REFERENCES USER(user_id),
    FOREIGN KEY (assignee_id) REFERENCES USER(user_id),
    FOREIGN KEY (team_id) REFERENCES TEAM(team_id),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    FOREIGN KEY (sla_id) REFERENCES SLA_POLICY(sla_id)
);

-- 7. COMMENT Table
CREATE TABLE COMMENT (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    author_id INT NOT NULL,
    body TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES TICKET(ticket_id),
    FOREIGN KEY (author_id) REFERENCES USER(user_id)
);

-- 8. ATTACHMENT Table
CREATE TABLE ATTACHMENT (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    comment_id INT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    size_bytes INT NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES TICKET(ticket_id),
    FOREIGN KEY (comment_id) REFERENCES COMMENT(comment_id),
    FOREIGN KEY (uploaded_by) REFERENCES USER(user_id)
);

-- 9. TICKET_HISTORY Table
CREATE TABLE TICKET_HISTORY (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    changed_by INT NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES TICKET(ticket_id),
    FOREIGN KEY (changed_by) REFERENCES USER(user_id)
);

-- 10. FEEDBACK Table
CREATE TABLE FEEDBACK (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL UNIQUE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES TICKET(ticket_id)
);

-- 11. KB_ARTICLE Table
CREATE TABLE KB_ARTICLE (
    article_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category_id INT NOT NULL,
    author_id INT NOT NULL,
    status VARCHAR(30) DEFAULT 'Published',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    FOREIGN KEY (author_id) REFERENCES USER(user_id)
);

-- 12. BUSINESS_HOURS Table
CREATE TABLE BUSINESS_HOURS (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week VARCHAR(15) NOT NULL,
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '18:00:00',
    is_working_day BOOLEAN DEFAULT TRUE
);

-- 13. HOLIDAYS Table
CREATE TABLE HOLIDAYS (
    holiday_id INT AUTO_INCREMENT PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL
);

-- 14. NOTIFICATIONS Table
CREATE TABLE NOTIFICATIONS (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ticket_id INT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(user_id),
    FOREIGN KEY (ticket_id) REFERENCES TICKET(ticket_id)
);

-- =========================================================================
-- INITIAL SEED DATA (Required for foreign key references)
-- =========================================================================

-- Insert Default Roles
INSERT INTO ROLE (role_name) VALUES ('Requester'), ('Agent'), ('Supervisor'), ('Admin');

-- Insert Default Team
INSERT INTO TEAM (team_name, email) VALUES ('IT Support Team', 'it-support@helpdesk.com');

-- Insert Default Category
INSERT INTO CATEGORY (name, parent_id, default_team_id) VALUES ('Network / IT', NULL, 1);

-- Insert Default SLA Policies
INSERT INTO SLA_POLICY (priority, response_mins, resolution_mins, is_24x7) VALUES 
('Critical', 30, 240, TRUE),
('High', 60, 480, FALSE),
('Medium', 240, 1440, FALSE),
('Low', 480, 2880, FALSE);
