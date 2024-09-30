import express from 'express';

const port = process.env.PORT || 5000;
const app = express();
const routes = require('./routes/index');

app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server listening on PORT ${port}`);
});

export default app;
