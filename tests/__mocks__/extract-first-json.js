module.exports = {
  extractJSON: jest.fn((text) => {
    try {
      // Simple JSON extraction - find first valid JSON object
      const match = text.match(/\{[^{}]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }),
};
