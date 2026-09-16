// Netlify Serverless Function Router for /api/* routes
import authHandler from '../../api/auth.js';
import attendanceHandler from '../../api/attendance.js';
import announcementsHandler from '../../api/announcements.js';
import avatarHandler from '../../api/avatar.js';
import calendarHandler from '../../api/calendar.js';
import employeesHandler from '../../api/employees.js';
import leavesHandler from '../../api/leaves.js';
import messagesHandler from '../../api/messages.js';
import notificationsHandler from '../../api/notifications.js';
import statsHandler from '../../api/stats.js';
import tasksHandler from '../../api/tasks.js';
import threadsHandler from '../../api/threads.js';
import warningsHandler from '../../api/warnings.js';

const routeMap = {
  auth: authHandler,
  attendance: attendanceHandler,
  announcements: announcementsHandler,
  avatar: avatarHandler,
  calendar: calendarHandler,
  employees: employeesHandler,
  leaves: leavesHandler,
  messages: messagesHandler,
  notifications: notificationsHandler,
  stats: statsHandler,
  tasks: tasksHandler,
  threads: threadsHandler,
  warnings: warningsHandler,
};

export async function handler(event, context) {
  // Extract target route name
  // Path can be /api/auth, /.netlify/functions/api/auth, etc.
  const pathParts = (event.path || '').split('/').filter(Boolean);
  let apiName = '';

  const apiIdx = pathParts.indexOf('api');
  if (apiIdx !== -1 && pathParts.length > apiIdx + 1) {
    apiName = pathParts[apiIdx + 1];
  } else if (pathParts.length > 0) {
    apiName = pathParts[pathParts.length - 1];
  }

  const vercelHandler = routeMap[apiName];

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (!vercelHandler) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `API route /api/${apiName} not found` }),
    };
  }

  // Parse query & body
  const query = event.queryStringParameters || {};
  let body = {};
  if (event.body) {
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
        : (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
    } catch {
      body = event.body;
    }
  }

  const req = {
    method: event.httpMethod || 'GET',
    headers: event.headers || {},
    query,
    body,
    url: event.path,
  };

  let statusCode = 200;
  let responseBody = '';

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(name, val) {
      headers[name] = val;
      return res;
    },
    getHeader(name) {
      return headers[name];
    },
    json(data) {
      headers['Content-Type'] = 'application/json';
      responseBody = JSON.stringify(data);
      return res;
    },
    send(data) {
      if (typeof data === 'object') return res.json(data);
      responseBody = String(data);
      return res;
    },
    end(data) {
      if (data !== undefined) responseBody = String(data);
      return res;
    },
  };

  try {
    await vercelHandler(req, res);
    return {
      statusCode,
      headers,
      body: responseBody,
    };
  } catch (err) {
    console.error(`[Netlify API Error] /api/${apiName}:`, err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
}
