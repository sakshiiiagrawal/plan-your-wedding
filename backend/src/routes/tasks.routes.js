const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');

router.get('/', tasksController.getAll);
router.get('/stats', tasksController.getStats);
router.get('/overdue', tasksController.getOverdue);
router.get('/upcoming', tasksController.getUpcoming);
router.get('/:id', tasksController.getById);
router.post('/', tasksController.create);
router.put('/:id', tasksController.update);
router.put('/:id/status', tasksController.updateStatus);
router.delete('/:id', tasksController.delete);

module.exports = router;
