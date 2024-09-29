import express from 'express';
import AppController from '../controllers/AppController';

const router = express.Router();

router.get('/status', (req, resp) => {
  AppController.getStatus(req, resp);
});
router.get('/stats', (req, resp) => {
  AppController.getstats(req, resp);
});

module.exports = router;
