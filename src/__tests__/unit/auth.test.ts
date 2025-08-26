import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, authenticateApiKey, requireRole, requireAdmin, AuthenticatedRequest } from '../../utils/auth';

// Mock dependencies
const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
}));

jest.mock('../../config', () => ({
  jwt: { secret: 'test-secret' },
  apiKey: 'test-api-key',
}));

jest.mock('../../utils/logger', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../types', () => ({
  ApiResponse: {},
}));

describe('Auth Utils', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    const authenticateTokenMiddleware = authenticateToken as any;

    it('should return 401 when no authorization header is provided', () => {
      mockRequest.headers = {};

      authenticateTokenMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not have Bearer token', () => {
      mockRequest.headers = {
        authorization: 'InvalidTokenFormat',
      };

      authenticateTokenMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when JWT verification fails', () => {
      const mockError = new Error('Invalid token');
      const mockVerify = jwt.verify as any;

      // Mock jwt.verify to call the callback with an error
      mockVerify.mockImplementation((token: string, secret: string, callback: any) => {
        callback(mockError, null);
      });

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      authenticateTokenMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockVerify).toHaveBeenCalledWith(
        'invalid-token',
        'test-secret',
        expect.any(Function)
      );
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid or expired token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() and set req.user when JWT verification succeeds', () => {
      const mockDecoded = { id: '123', username: 'testuser', role: 'player' };
      const mockVerify = jwt.verify as any;

      // Mock jwt.verify to call the callback with decoded token
      mockVerify.mockImplementation((token: string, secret: string, callback: any) => {
        callback(null, mockDecoded);
      });

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      authenticateTokenMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockVerify).toHaveBeenCalledWith(
        'valid-token',
        'test-secret',
        expect.any(Function)
      );
      expect(mockRequest.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer header', () => {
      const mockDecoded = { id: '123', username: 'testuser', role: 'player' };
      const mockVerify = jwt.verify as any;

      mockVerify.mockImplementation((token: string, secret: string, callback: any) => {
        callback(null, mockDecoded);
      });

      mockRequest.headers = {
        authorization: 'Bearer my-jwt-token',
      };

      authenticateTokenMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockVerify).toHaveBeenCalledWith(
        'my-jwt-token',
        'test-secret',
        expect.any(Function)
      );
    });
  });

  describe('authenticateApiKey', () => {
    const authenticateApiKeyMiddleware = authenticateApiKey as any;

    it('should return 401 when no x-api-key header is provided', () => {
      mockRequest.headers = {};

      authenticateApiKeyMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Valid API key required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when x-api-key header does not match config apiKey', () => {
      mockRequest.headers = {
        'x-api-key': 'wrong-api-key',
      };

      authenticateApiKeyMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Valid API key required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when x-api-key header matches config apiKey', () => {
      mockRequest.headers = {
        'x-api-key': 'test-api-key',
      };

      authenticateApiKeyMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive header name', () => {
      mockRequest.headers = {
        'x-api-key': 'test-api-key',
      };

      authenticateApiKeyMiddleware(mockRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    const requireRoleMiddleware = requireRole(['admin', 'moderator']);

    it('should return 401 when req.user is not set', () => {
      mockRequest.user = undefined;

      requireRoleMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in required roles', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'player' };

      requireRoleMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user role is in required roles', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'admin' };

      requireRoleMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should work with multiple required roles', () => {
      const requireModeratorMiddleware = requireRole(['moderator']);
      mockRequest.user = { id: '123', username: 'testuser', role: 'moderator' };

      requireModeratorMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should require admin role', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'admin' };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject non-admin roles', () => {
      mockRequest.user = { id: '123', username: 'testuser', role: 'player' };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});