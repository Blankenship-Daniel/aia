module.exports = {
  parse: jest.fn((text) => {
    try {
      return JSON.parse(text);
    } catch {
      // Return a cleaned up version for dirty JSON
      const cleaned = text
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote unquoted keys
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing array commas
      return JSON.parse(cleaned);
    }
  }),
};
