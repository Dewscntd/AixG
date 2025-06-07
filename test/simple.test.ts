/**
 * Simple test to verify Jest setup
 */

describe('Simple Test Suite', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toMatch(/hello/);
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('async result');
    expect(result).toBe('async result');
  });

  it('should handle mock functions', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue('mocked');
    
    const result = mockFn('input');
    
    expect(result).toBe('mocked');
    expect(mockFn).toHaveBeenCalledWith('input');
  });
});
