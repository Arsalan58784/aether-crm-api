import mysql from 'mysql2/promise';
import { generateSalt, hashPassword } from './auth';

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'crm_db';

let pool: mysql.Pool | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Initialize database and tables
async function initializeDatabase() {
  if (isInitialized) return;

  console.log('Initializing MySQL CRM Database with Auth & Role support...');
  
  let connection;
  try {
    // 1. First connection without database to create the database if not exists
    connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();
    
    // 2. Setup pool with the database specified
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // 3. Create Tables
    // Users Table (Authentication) - role column is removed from default script but handled dynamically for backward compatibility
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // New RBAC Tables
    // 1. Roles Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Permissions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. User Roles (Junction Table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT,
        role_id INT,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Role Permissions (Junction Table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Contacts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(255),
        status ENUM('Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost') DEFAULT 'Lead',
        lead_score INT DEFAULT 50,
        source VARCHAR(100) DEFAULT 'Website',
        deal_value DECIMAL(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tasks Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_id INT NULL,
        title VARCHAR(255) NOT NULL,
        priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
        status ENUM('Pending', 'Completed') DEFAULT 'Pending',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Activities Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contact_id INT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Dynamic Database Migrations (Safe column audits)
    // Check and add 'assigned_to' column to contacts
    const [contactsCols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'contacts' AND COLUMN_NAME = 'assigned_to'
    `, [dbName]);
    if ((contactsCols as any).length === 0) {
      console.log("Migrating database: Adding 'assigned_to' column to contacts...");
      await pool.query(`ALTER TABLE contacts ADD COLUMN assigned_to INT NULL REFERENCES users(id) ON DELETE SET NULL`);
    }

    // Check and add 'assigned_to' column to tasks
    const [tasksCols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'assigned_to'
    `, [dbName]);
    if ((tasksCols as any).length === 0) {
      console.log("Migrating database: Adding 'assigned_to' column to tasks...");
      await pool.query(`ALTER TABLE tasks ADD COLUMN assigned_to INT NULL REFERENCES users(id) ON DELETE SET NULL`);
    }

    // Seed standard roles if empty
    const [roleRows] = await pool.query('SELECT COUNT(*) as count FROM roles');
    if ((roleRows as any)[0].count === 0) {
      console.log('Seeding standard CRM system roles...');
      await pool.query(`
        INSERT INTO roles (name, description) VALUES 
        ('Admin', 'Administrator with full system control and access to all capabilities.'),
        ('Manager', 'Manager who can view and edit records, manage activities, and administer users.'),
        ('Sales Rep', 'Sales Representative who can read and update leads and tasks assigned to them.')
      `);
    }

    // Seed standard permissions if empty
    const [permissionRows] = await pool.query('SELECT COUNT(*) as count FROM permissions');
    if ((permissionRows as any)[0].count === 0) {
      console.log('Seeding standard CRM permissions...');
      await pool.query(`
        INSERT INTO permissions (name, description) VALUES 
        ('contacts:read', 'Read contacts and leads'),
        ('contacts:create', 'Create new contacts and leads'),
        ('contacts:update', 'Update existing contacts and leads'),
        ('contacts:delete', 'Delete contacts and leads'),
        ('tasks:read', 'Read tasks'),
        ('tasks:create', 'Create tasks'),
        ('tasks:update', 'Update tasks'),
        ('tasks:delete', 'Delete tasks'),
        ('activities:read', 'Read activity logs'),
        ('users:manage', 'Manage users list and assign roles'),
        ('roles:manage', 'Manage system roles and permissions')
      `);
    }

    // Seed role-permission associations if empty
    const [rolePermRows] = await pool.query('SELECT COUNT(*) as count FROM role_permissions');
    if ((rolePermRows as any)[0].count === 0) {
      console.log('Seeding CRM role-permission matrix...');
      
      const [allRoles] = await pool.query('SELECT id, name FROM roles');
      const [allPerms] = await pool.query('SELECT id, name FROM permissions');
      
      const rolesMap = new Map((allRoles as any[]).map(r => [r.name, r.id]));
      const permsMap = new Map((allPerms as any[]).map(p => [p.name, p.id]));
      
      const adminId = rolesMap.get('Admin');
      const managerId = rolesMap.get('Manager');
      const repId = rolesMap.get('Sales Rep');
      
      // Admin gets all permissions
      for (const p of allPerms as any[]) {
        await pool.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminId, p.id]);
      }
      
      // Manager permissions (everything except roles:manage)
      const managerPerms = [
        'contacts:read', 'contacts:create', 'contacts:update', 'contacts:delete',
        'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete',
        'activities:read', 'users:manage'
      ];
      for (const name of managerPerms) {
        const id = permsMap.get(name);
        if (id) {
          await pool.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [managerId, id]);
        }
      }
      
      // Sales Rep permissions (limited)
      const repPerms = [
        'contacts:read', 'contacts:create', 'contacts:update',
        'tasks:read', 'tasks:create', 'tasks:update',
        'activities:read'
      ];
      for (const name of repPerms) {
        const id = permsMap.get(name);
        if (id) {
          await pool.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [repId, id]);
        }
      }
    }

    // Dynamic Database Migration: Check if 'role' column exists in 'users' table
    const [usersCols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `, [dbName]);

    let existingRolesToMigrate: Array<{ id: number, role: string }> = [];
    const hasRoleColumn = (usersCols as any).length > 0;
    if (hasRoleColumn) {
      console.log("Migration audit: 'role' column detected in 'users' table. Fetching current user role assignments...");
      const [existingUsers] = await pool.query('SELECT id, role FROM users');
      existingRolesToMigrate = existingUsers as any[];
    }

    // 4. Seed Users if Empty
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = (userRows as any)[0].count;

    if (userCount === 0) {
      console.log('Seeding CRM default user accounts...');
      const defaultUsers = [
        ['Sarah Jenkins', 'admin@aether.com', 'Admin'],
        ['Alexander Smith', 'manager@aether.com', 'Manager'],
        ['Marcus Vance', 'rep1@aether.com', 'Sales Rep'],
        ['Elena Rostova', 'rep2@aether.com', 'Sales Rep']
      ];
      
      const [allRoles] = await pool.query('SELECT id, name FROM roles');
      const rolesMap = new Map((allRoles as any[]).map(r => [r.name, r.id]));

      for (const u of defaultUsers) {
        const salt = generateSalt();
        const hash = hashPassword('Password123', salt);
        const [userResult] = await pool.query(
          `INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)`,
          [u[0], u[1], hash, salt]
        );
        const newUserId = (userResult as any).insertId;
        const roleId = rolesMap.get(u[2]);
        if (roleId) {
          await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [newUserId, roleId]);
        }
      }
    }

    // Migrate existing users if migration is active
    if (existingRolesToMigrate.length > 0) {
      console.log(`Migrating ${existingRolesToMigrate.length} user role assignments to user_roles junction table...`);
      const [allRoles] = await pool.query('SELECT id, name FROM roles');
      const rolesMap = new Map((allRoles as any[]).map(r => [r.name, r.id]));
      
      for (const u of existingRolesToMigrate) {
        const roleId = rolesMap.get(u.role);
        if (roleId) {
          await pool.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [u.id, roleId]);
        }
      }
      
      // Safely drop the old 'role' column to finish migration
      console.log("Dropping deprecated 'role' column from 'users' table...");
      await pool.query('ALTER TABLE users DROP COLUMN role');
    }

    // 5. Seed Contacts and Tasks if Contacts Table is Empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM contacts');
    const count = (rows as any)[0].count;

    if (count === 0) {
      console.log('Seeding CRM mock leads data...');

      // Seed Contacts
      const contactsToSeed = [
        ['Sarah Jenkins', 'sarah@acme.com', '(555) 019-2834', 'Acme Corp', 'Lead', 85, 'Website', 12500.00],
        ['Michael Chen', 'michael@techflow.io', '(555) 014-9922', 'TechFlow', 'Contacted', 72, 'Referral', 8200.00],
        ['David Ross', 'david@quantum.co', '(555) 017-8811', 'Quantum Labs', 'Proposal', 90, 'LinkedIn', 24000.00],
        ['Emily Taylor', 'emily@horizon.com', '(555) 012-3344', 'Horizon Group', 'Negotiation', 95, 'Cold Email', 45000.00],
        ['James Wilson', 'james@nexus.com', '(555) 015-7788', 'Nexus Media', 'Closed Won', 100, 'Website', 18000.00],
        ['Jessica Martinez', 'jessica@apex.co', '(555) 018-4455', 'Apex Digital', 'Closed Lost', 30, 'LinkedIn', 5000.00],
        ['Robert Kim', 'robert@bluesky.com', '(555) 011-2233', 'BlueSky Ventures', 'Lead', 60, 'Cold Call', 15000.00]
      ];

      for (const contact of contactsToSeed) {
        await pool.query(
          `INSERT INTO contacts (name, email, phone, company, status, lead_score, source, deal_value) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          contact
        );
      }

      // Seed Tasks
      const tasksToSeed = [
        [1, 'Send introduction email and company profile deck', 'High', 'Pending', new Date(Date.now() + 86400000)], // Tomorrow
        [2, 'Schedule discovery call to discuss pipeline requirements', 'Medium', 'Pending', new Date(Date.now() + 172800000)], // In 2 days
        [3, 'Submit updated enterprise contract proposal', 'High', 'Pending', new Date()], // Today
        [4, 'Finalize contract negotiation details with executive sponsor', 'High', 'Completed', new Date(Date.now() - 86400000)], // Yesterday
        [5, 'Onboard client and set up Slack workspace', 'High', 'Completed', new Date(Date.now() - 259200000)] // 3 days ago
      ];

      for (const task of tasksToSeed) {
        await pool.query(
          `INSERT INTO tasks (contact_id, title, priority, status, due_date) VALUES (?, ?, ?, ?, ?)`,
          task
        );
      }

      // Seed Activities
      const activitiesToSeed = [
        [5, 'Deal Closed', 'Successfully closed deal with Nexus Media for $18,000.00!'],
        [4, 'Stage Changed', 'Moved deal stage from Proposal to Negotiation'],
        [3, 'Task Completed', 'Completed task: Submit updated enterprise contract proposal'],
        [1, 'Lead Created', 'New website inquiry from Sarah Jenkins at Acme Corp'],
        [6, 'Stage Changed', 'Marked deal as Closed Lost (competitor pricing)']
      ];

      for (const activity of activitiesToSeed) {
        await pool.query(
          `INSERT INTO activities (contact_id, type, description) VALUES (?, ?, ?)`,
          activity
        );
      }

      // Link newly seeded contacts & tasks to seeded sales reps/admin dynamically
      const [usersList] = await pool.query(`
        SELECT u.id, u.name, r.name as role 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
      `);
      const reps = (usersList as any).filter((u: any) => u.role === 'Sales Rep');
      const admin = (usersList as any).find((u: any) => u.role === 'Admin');

      if (reps.length >= 2) {
        console.log('Mapping lead assignments to sales team accounts...');
        await pool.query('UPDATE contacts SET assigned_to = ? WHERE id IN (1, 3, 5)', [reps[0].id]);
        await pool.query('UPDATE contacts SET assigned_to = ? WHERE id IN (2, 4, 6)', [reps[1].id]);
        await pool.query('UPDATE contacts SET assigned_to = ? WHERE id = 7', [admin?.id || null]);
        
        // Link tasks to matching contact assignees
        await pool.query('UPDATE tasks t JOIN contacts c ON t.contact_id = c.id SET t.assigned_to = c.assigned_to');
      }

      console.log('CRM Database seeded and mapped successfully.');
    }

    // --- INTEGRATIONS & WEBHOOKS TABLE MIGRATIONS ---
    // 1. Integration Settings table (Incoming lead API authentication)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integration_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed default secret integration key if empty
    const [apiKeyRows] = await pool.query('SELECT COUNT(*) as count FROM integration_settings');
    if ((apiKeyRows as any)[0].count === 0) {
      console.log('Generating system-wide cryptographical secret third-party API Key...');
      const secureToken = 'aether_api_' + [...Array(32)].map(() => (~~(Math.random()*36)).toString(36)).join('');
      await pool.query('INSERT INTO integration_settings (api_key) VALUES (?)', [secureToken]);
    }

    // 2. Outgoing Webhooks Subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        secret VARCHAR(255) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Integration Transaction Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        direction ENUM('incoming', 'outgoing') NOT NULL,
        url VARCHAR(500) NULL,
        event_type VARCHAR(100) NOT NULL,
        payload TEXT NOT NULL,
        status_code INT NOT NULL,
        status_message VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // --- END OF INTEGRATIONS & WEBHOOKS TABLE MIGRATIONS ---

    isInitialized = true;
    console.log('MySQL CRM Database Initialized successfully with roles.');
  } catch (error) {
    console.error('Error during MySQL Database initialization:', error);
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    throw error;
  }
}

// Global thread-safe initialization hook
export async function getDBPool(): Promise<mysql.Pool> {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  
  await initPromise;
  
  if (!pool) {
    throw new Error('MySQL Pool failed to initialize');
  }
  
  return pool;
}

// Helper to query MySQL
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const dbPool = await getDBPool();
  const [results] = await dbPool.query(sql, params);
  return results as T;
}
