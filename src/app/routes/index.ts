import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/presentation/routes/auth.route';
import { UserRoutes } from '../modules/User/presentation/routes/user.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
