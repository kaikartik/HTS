const db = require('../config/db');
const bcrypt = require('bcrypt');

// 1. User Registration (FR-01)
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, role_id, team_id } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Please provide name, email, password, and role_id.' });
        }

        // Check if email already exists
        const [existingUser] = await db.query('SELECT user_id FROM USER WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        // Hash password securely with bcrypt (SRS requirement)
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user into database
        const query = `
            INSERT INTO USER (name, email, password_hash, phone, role_id, team_id, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `;
        const [result] = await db.query(query, [name, email, passwordHash, phone || null, role_id, team_id || null]);

        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};

// 2. User Login (FR-02)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password.' });
        }

        // Find user by email
        const [users] = await db.query('SELECT * FROM USER WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
        }

        // Compare password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Success response (Exclude password hash from sent data)
        res.json({
            message: 'Login successful!',
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role_id: user.role_id,
                team_id: user.team_id
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
};