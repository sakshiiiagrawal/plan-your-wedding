const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

router.get('/users', requireAdmin, usersController.listUsers);
router.post('/create-user', requireAdmin, usersController.createUser);
router.delete('/users/:id', requireAdmin, usersController.deleteUser);

module.exports = router;
