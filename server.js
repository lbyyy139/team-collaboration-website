const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// JWT密钥
const JWT_SECRET = 'team-collab-secret-2024';

// 内存数据库
let users = [];
let projects = [];
let tasks = [];
let currentId = { user: 1, project: 1, task: 1 };

// 生成ID
function generateId(type) {
    return currentId[type]++;
}

// ========== 新增：根路径路由 ==========
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Team Collaboration Hub API 部署成功！',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            '认证相关': [
                'POST /api/register - 用户注册',
                'POST /api/login - 用户登录'
            ],
            '项目管理': [
                'GET  /api/projects - 获取用户项目',
                'POST /api/projects - 创建项目'
            ],
            '任务管理': [
                'GET  /api/projects/:projectId/tasks - 获取项目任务',
                'POST /api/projects/:projectId/tasks - 创建任务',
                'PUT  /api/tasks/:taskId - 更新任务状态',
                'DELETE /api/tasks/:taskId - 删除任务'
            ],
            '系统检查': [
                'GET  /api/health - 健康检查'
            ]
        },
        documentation: '请使用上述API端点进行访问',
        github: 'https://github.com/lbyyy139/ISYS3001-MSD425GXUST27-Collaboration-Hub'
    });
});

// ========== 原有的API路由 ==========

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: '所有字段都是必填的' 
            });
        }

        // 检查用户是否存在
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被注册'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const user = {
            id: generateId('user'),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date()
        };
        users.push(user);

        // 生成token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: '注册成功！',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '邮箱和密码是必填的'
            });
        }

        // 查找用户
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: '密码错误'
            });
        }

        // 生成token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: '登录成功！',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 验证token中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: '需要登录'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: '令牌无效'
            });
        }
        req.user = user;
        next();
    });
};

// 获取用户项目
app.get('/api/projects', authenticateToken, (req, res) => {
    try {
        const userProjects = projects.filter(project => project.userId === req.user.userId);
        
        res.json({
            success: true,
            data: userProjects,
            total: userProjects.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取项目失败'
        });
    }
});

// 创建项目
app.post('/api/projects', authenticateToken, (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: '项目名称是必填的'
            });
        }

        const project = {
            id: generateId('project'),
            name,
            description: description || '',
            userId: req.user.userId,
            createdAt: new Date()
        };

        projects.push(project);

        res.status(201).json({
            success: true,
            message: '项目创建成功',
            data: project
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建项目失败'
        });
    }
});

// 获取项目任务
app.get('/api/projects/:projectId/tasks', authenticateToken, (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const projectTasks = tasks.filter(task => task.projectId === projectId);

        res.json({
            success: true,
            data: projectTasks,
            total: projectTasks.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取任务失败'
        });
    }
});

// 创建任务
app.post('/api/projects/:projectId/tasks', authenticateToken, (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const { title, description, priority, assignee } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: '任务标题是必填的'
            });
        }

        const user = users.find(u => u.id === req.user.userId);

        const task = {
            id: generateId('task'),
            projectId,
            title,
            description: description || '',
            assignee: assignee || user.username,
            priority: priority || 'medium',
            status: 'todo',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        tasks.push(task);

        res.status(201).json({
            success: true,
            message: '任务创建成功',
            data: task
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '创建任务失败'
        });
    }
});

// 更新任务状态
app.put('/api/tasks/:taskId', authenticateToken, (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const { status } = req.body;

        const validStatuses = ['todo', 'inprogress', 'done'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: '无效的任务状态'
            });
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: '任务未找到'
            });
        }

        task.status = status;
        task.updatedAt = new Date();

        res.json({
            success: true,
            message: '任务状态更新成功',
            data: task
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '更新任务失败'
        });
    }
});

// 删除任务
app.delete('/api/tasks/:taskId', authenticateToken, (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const taskIndex = tasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '任务未找到'
            });
        }

        tasks.splice(taskIndex, 1);

        res.json({
            success: true,
            message: '任务删除成功'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '删除任务失败'
        });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        data: {
            users: users.length,
            projects: projects.length,
            tasks: tasks.length
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
});

module.exports = app;