import sha1 from 'sha1';
import DBClient from '../utils/db';

class UsersController {
  static async postNew(req, resp) {
    const { email, password } = req.body;

    if (!email) {
      return resp.status(400).json({
        error: 'Missing email',
      });
    }
    if (!password) {
      return resp.status(400).json({
        error: 'Missing password',
      });
    }

    const user = await DBClient.userCollection.findOne({ email });
    if (user) {
      return resp.status(400).json({
        error: 'Already exist',
      });
    }

    const hashPwd = sha1(password);
    const newUser = await DBClient.userCollection.insertOne({
      email,
      password: hashPwd,
    });

    return resp.status(201).json({
      id: newUser.insertedId,
      email,
    });
  }
}

module.exports = UsersController;
