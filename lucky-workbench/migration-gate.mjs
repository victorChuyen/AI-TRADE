// Temporary fail-closed boundary while legacy preview routes are replaced.
// No environment variable unlocks this gate. It is NOT a broker risk engine.
export function migrationGate(req, res, next) {
  const path = req.path.toLowerCase();
  if (!(path === '/api' || path.startsWith('/api/'))) return next();
  if (path === '/api/v1/me' && ['GET', 'HEAD'].includes(req.method)) {
    return res.json({
      user_id: null,
      role: 'LOCAL_REVIEW_ONLY',
      authenticated: false,
      entitlements: ['LAB_VIEW'],
      live_execution_unlocked: false,
      broker_connected: false,
      evidence_status: 'UNVERIFIED_PROTOTYPE',
    });
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return res.status(503).json({
    success: false,
    code: 'MIGRATION_READ_ONLY',
    connected: false,
    verified: false,
    live_execution_unlocked: false,
    message: 'Lucky đang kiểm định. Chưa có adapter broker được xác minh; thao tác ghi và xác thực tài khoản đang khóa.',
  });
}
