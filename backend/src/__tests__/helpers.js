jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockPool = {
  query: mockQuery,
  connect: jest.fn(),
  end: jest.fn(),
};

jest.mock('../config/database', () => mockPool);

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisSetEx = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisHSet = jest.fn();
const mockRedisHGet = jest.fn();
const mockRedisHDel = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisExpire = jest.fn();
const mockRedisPublish = jest.fn();

const mockRedis = {
  get: mockRedisGet,
  set: mockRedisSet,
  setEx: mockRedisSetEx,
  del: mockRedisDel,
  hSet: mockRedisHSet,
  hGet: mockRedisHGet,
  hDel: mockRedisHDel,
  incr: mockRedisIncr,
  expire: mockRedisExpire,
  publish: mockRedisPublish,
  duplicate: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  connect: jest.fn(),
};

jest.mock('../config/redis', () => ({
  redis: mockRedis,
  connectRedis: jest.fn(),
}));

const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(
    { userId: payload.userId || 'test-user-id', phone: payload.phone || '256771234567', role: payload.role || 'customer' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const resetMocks = () => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  mockRedisGet.mockReset();
  mockRedisSet.mockReset();
  mockRedisSetEx.mockReset();
  mockRedisDel.mockReset();
  mockRedisHSet.mockReset();
  mockRedisHGet.mockReset();
  mockRedisHDel.mockReset();
  mockRedisIncr.mockReset();
  mockRedisExpire.mockReset();
  mockRedisPublish.mockReset();
};

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  resetMocks();
});

module.exports = {
  mockPool,
  mockQuery,
  mockRedis,
  mockRedisGet,
  mockRedisSet,
  mockRedisSetEx,
  mockRedisDel,
  mockRedisHSet,
  mockRedisHGet,
  mockRedisHDel,
  mockRedisIncr,
  mockRedisExpire,
  mockRedisPublish,
  generateToken,
  resetMocks,
};
