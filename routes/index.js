import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

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

router.get('/connect', (req, resp) => {
  AuthController.getConnect(req, resp);
});

router.get('/disconnect', (req, resp) => {
  AuthController.getDisconnect(req, resp);
});

router.get('/users/me', (req, resp) => {
  UsersController.getMe(req, resp);
});
module.exports = router;
