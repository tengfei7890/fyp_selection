import app from '@/app';
import { env } from '@/config';

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 FYP API 已启动: http://localhost:${env.port}`);
});
