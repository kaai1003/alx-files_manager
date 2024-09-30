import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

router.get('/status', (req, resp) => {
  AppController.getStatus(req, resp);
});
router.get('/stats', (req, resp) => {
  AppController.getstats(req, resp);
});

router.post('/users', (req, resp) => {
  UsersController.postNew(req, resp);
});
module.exports = router;
