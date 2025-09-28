'use strict';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const ok = (data, status = 200) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(data),
});

const err = (msg, status = 400) => ok({ ok: false, error: msg }, status);

function loadAdmins() {
  try {
    const p = path.join(__dirname, '_admin_users.json');
    const txt = fs.readFileSync(p, 'utf8');
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return err('JSON inválido', 400);
  }

  const rawId =
    payload.email ?? payload.correo ?? payload.user ?? payload.usuario ?? '';
  const password =
    payload.password ?? payload.pass ?? payload.contrasena ?? payload['contraseña'] ?? '';

  if (!rawId || !password) return err('Faltan credenciales', 400);

  // Normaliza: usa la parte antes de @ como "user"
  const userId = String(rawId).toLowerCase().trim().split('@')[0];

  const admins = loadAdmins();
  if (!admins.length) return err('Configuración de usuarios no disponible', 500);

  const found = admins.find((a) => String(a.user).toLowerCase() === userId);
  if (!found) return err('Usuario no autorizado', 403);

  if (password !== String(found.pass)) return err('Credenciales inválidas', 401);

  const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
  const token = jwt.sign(
    {
      sub: found.user,
      role: found.role,
      name: found.displayName,
      puesto: found.puesto,
    },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  return ok({
    ok: true,
    token,
    user: {
      user: found.user,
      email: `${found.user}@sityps.org.mx`,
      role: found.role,
      displayName: found.displayName,
      puesto: found.puesto,
    },
  });
};
