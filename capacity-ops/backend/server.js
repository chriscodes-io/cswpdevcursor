require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Capacity Ops API + static site → http://localhost:${PORT}`);
  console.log(`  Homepage:  http://localhost:${PORT}/`);
  console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
});
