const UserModel = require('../../db/models/User');

// Middleware для проверки регистрации пользователя
async function authMiddleware(ctx, next) {
  console.log('[Auth Middleware] Processing update from:', ctx.user?.user_id);
  
  const maxUserId = ctx.user?.user_id;
  
  if (!maxUserId) {
    console.log('[Auth Middleware] No user_id found, skipping');
    return next();
  }

  // Проверяем или создаём пользователя
  console.log('[Auth Middleware] Finding or creating user:', maxUserId);
  const user = await UserModel.findOrCreate(maxUserId, ctx.user?.username);
  console.log('[Auth Middleware] User loaded:', user.id, user.username || 'no username');
  
  // В MAX Bot API ctx.state может не существовать,
  // поэтому сохраняем пользователя прямо в ctx
  ctx.userState = user;
  ctx.state = ctx.state || {};
  ctx.state.user = user;
  
  // Проверяем является ли админом
  const config = require('../../config');
  const isAdmin = config.botAdmins.includes(maxUserId);
  ctx.state.isAdmin = isAdmin;
  ctx.isAdmin = isAdmin;
  
  console.log('[Auth Middleware] User authorized, isAdmin:', isAdmin, 'adminIds:', config.botAdmins);
  return next();
}

module.exports = authMiddleware;
