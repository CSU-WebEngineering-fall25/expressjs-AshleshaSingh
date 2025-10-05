// tests/unit/xkcdService.test.js
const XKCDService = require('../../src/services/xkcdService');
const fetch = require('node-fetch');

jest.mock('node-fetch');
const mockFetch = fetch;

describe('XKCDService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    XKCDService.cache.clear();
  });

  describe('getLatest', () => {
    test('should fetch and return latest comic with correct structure', async () => {
      const mockComic = {
        num: 2750,
        title: 'Test Comic',
        img: 'https://imgs.xkcd.com/comics/test.png',
        alt: 'Test alt text',
        transcript: 'Test transcript',
        year: '2023',
        month: '4',
        day: '1',
        safe_title: 'Test Comic'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getLatest();

      expect(mockFetch).toHaveBeenCalledWith('https://xkcd.com/info.0.json');
      expect(result).toEqual({
        id: 2750,
        title: 'Test Comic',
        img: 'https://imgs.xkcd.com/comics/test.png',
        alt: 'Test alt text',
        transcript: 'Test transcript',
        year: '2023',
        month: '4',
        day: '1',
        safe_title: 'Test Comic'
      });
    });

    test('should handle missing transcript gracefully', async () => {
      const mockComic = {
        num: 1,
        title: 'Test',
        img: 'https://test.com/test.png',
        alt: 'Alt text',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Test'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getLatest();
      expect(result.transcript).toBe('');
    });

    test('should cache results for performance', async () => {
      const mockComic = {
        num: 1,
        title: 'Cached',
        img: 'https://test.com/cached.png',
        alt: 'Cached comic',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Cached'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      await XKCDService.getLatest();
      await XKCDService.getLatest();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(XKCDService.getLatest()).rejects.toThrow('Failed to fetch latest comic: HTTP 500: Internal Server Error');
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(XKCDService.getLatest()).rejects.toThrow('Failed to fetch latest comic: Network error');
    });
  });

  describe('getById', () => {
    test('should fetch and cache comic by valid ID', async () => {
      const mockComic = {
        num: 614,
        title: 'Woodpecker',
        img: 'https://imgs.xkcd.com/comics/woodpecker.png',
        alt: "If you don't have an extension cord I can get that too.  Because we're friends!  Right?",
        transcript: '[[A man with a beret...]]', // abbreviated
        year: '2009',
        month: '7',
        day: '24',
        safe_title: 'Woodpecker'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockComic
      });

      const result = await XKCDService.getById(614);
      expect(result.id).toBe(614);
      expect(result.title).toBe('Woodpecker');
      expect(mockFetch).toHaveBeenCalledWith('https://xkcd.com/614/info.0.json');

      // Cache check: second call should not fetch
      await XKCDService.getById(614);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should validate ID parameter', async () => {
      await expect(XKCDService.getById(0)).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById(-1)).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById('invalid')).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById(1.5)).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById(NaN)).rejects.toThrow('Invalid comic ID');
    });

    test('should handle 404 for non-existent comic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(XKCDService.getById(999999)).rejects.toThrow('Comic not found');
    });

    test('should handle other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      });

      await expect(XKCDService.getById(614)).rejects.toThrow('Failed to fetch comic: HTTP 500: Server Error');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(XKCDService.getById(614)).rejects.toThrow('Failed to fetch comic: Network error');
    });

    test('should handle missing transcript gracefully', async () => {
      const mockComic = {
        num: 614,
        title: 'Test',
        img: 'https://test.com/test.png',
        alt: 'Alt text',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Test'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getById(614);
      expect(result.transcript).toBe('');
    });
  });

  describe('getRandom', () => {
    test('should return random comic with valid ID between 1 and latest.id', async () => {
      const mockLatest = {
        id: 2750,
        title: 'Latest',
        img: 'https://test.png',
        alt: 'Alt',
        transcript: '',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Latest'
      };
      const mockRandomComic = {
        id: 1500,
        title: 'Random',
        img: 'https://test.png',
        alt: 'Alt',
        transcript: '',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Random'
      };

      // Mock getLatest
      const getLatestSpy = jest.spyOn(XKCDService, 'getLatest').mockResolvedValueOnce(mockLatest);
      // Mock Math.random to return deterministic value for randomId = 1500
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValueOnce(1499 / 2750);
      // Mock getById
      const getByIdSpy = jest.spyOn(XKCDService, 'getById').mockResolvedValueOnce(mockRandomComic);

      const result = await XKCDService.getRandom();
      expect(result.id).toBe(1500);
      expect(result).toEqual(expect.objectContaining({ id: 1500, title: 'Random' }));
      expect(getLatestSpy).toHaveBeenCalledTimes(1);
      expect(getByIdSpy).toHaveBeenCalledTimes(1);
      expect(getByIdSpy).toHaveBeenCalledWith(1500);

      getLatestSpy.mockRestore();
      getByIdSpy.mockRestore();
      mockRandom.mockRestore();
    });

    test('should handle errors from getLatest or getById', async () => {
      jest.spyOn(XKCDService, 'getLatest').mockRejectedValueOnce(new Error('Latest fetch failed'));

      await expect(XKCDService.getRandom()).rejects.toThrow('Failed to fetch random comic: Latest fetch failed');
    });
  });

  describe('search', () => {
    const mockLatest = {
      id: 2750,
      title: 'Latest',
      img: 'https://test.png',
      alt: 'Alt',
      transcript: '',
      year: '2023',
      month: '1',
      day: '1',
      safe_title: 'Latest'
    };

    const createMockComic = (num, title, transcript = '') => ({
      num,
      title,
      img: 'https://imgs.xkcd.com/comics/test.png',
      alt: 'Test alt',
      transcript,
      year: '2023',
      month: '1',
      day: '1',
      safe_title: title
    });

    beforeEach(() => {
      jest.spyOn(XKCDService, 'getLatest').mockResolvedValue(mockLatest);
    });

    test('should search and return matching comics from last 100 with pagination', async () => {
      const mockComic1 = createMockComic(2750, 'Python Test', 'python code'); // match
      const mockComic2 = createMockComic(2749, 'Other Test', 'no match'); // no match
      const mockComic3 = createMockComic(2748, 'Python Alt', 'python script'); // match

      const getByIdSpy = jest.spyOn(XKCDService, 'getById');
      getByIdSpy.mockImplementation(async (id) => {
        const comics = {
          2750: mockComic1,
          2749: mockComic2,
          2748: mockComic3,
        };
        return comics[id] || createMockComic(id, 'No Match', 'no match'); // no 'python'
      });

      const result = await XKCDService.search('python', 1, 10);

      expect(result.query).toBe('python');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(2); // 2 matches
      expect(result.total).toBe(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        offset: 0
      });
      expect(result.results[0].title).toBe('Python Test');
      expect(result.results[1].title).toBe('Python Alt');

      expect(getByIdSpy).toHaveBeenCalledTimes(100); // full loop
      getByIdSpy.mockRestore();
    });

    test('should return empty results for no matches', async () => {
      const getByIdSpy = jest.spyOn(XKCDService, 'getById');
      getByIdSpy.mockImplementation(async (id) => createMockComic(id, 'No Match', 'no match'));

      const result = await XKCDService.search('nonexistent', 1, 10);

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);

      getByIdSpy.mockRestore();
    });

    test('should handle pagination correctly', async () => {
      const getByIdSpy = jest.spyOn(XKCDService, 'getById');
      getByIdSpy.mockImplementation(async (id) => createMockComic(id, 'Match', 'match')); // all match

      const result1 = await XKCDService.search('match', 1, 10);
      expect(result1.results.length).toBe(10);
      expect(result1.pagination.offset).toBe(0);

      const result2 = await XKCDService.search('match', 2, 10);
      expect(result2.results.length).toBe(10);
      expect(result2.pagination.offset).toBe(10);
      expect(result2.pagination.page).toBe(2);

      expect(getByIdSpy).toHaveBeenCalledTimes(200); // 2 searches * 100
      getByIdSpy.mockRestore();
    });

    test('should skip non-fetchable comics gracefully', async () => {
      const getByIdSpy = jest.spyOn(XKCDService, 'getById');
      getByIdSpy.mockImplementation(async (id) => {
        if (id === 2750) {
          return Promise.reject(new Error('Comic not found')); // skip
        }
        if (id === 2749) {
          return createMockComic(2749, 'Match', 'match'); // match
        }
        return createMockComic(id, 'No', 'no'); // non-match
      });

      const result = await XKCDService.search('match', 1, 10);
      expect(result.results.length).toBe(1); // Only the successful match

      getByIdSpy.mockRestore();
    });

    test('should validate query, page, limit', async () => {
      await expect(XKCDService.search('', 1, 10)).rejects.toThrow('Query must be between 1 and 100 characters');
      await expect(XKCDService.search('a'.repeat(101), 1, 10)).rejects.toThrow('Query must be between 1 and 100 characters');
      await expect(XKCDService.search('test', 0, 10)).rejects.toThrow('Page must be a positive integer');
      await expect(XKCDService.search('test', 1, 0)).rejects.toThrow('Limit must be between 1 and 50');
      await expect(XKCDService.search('test', 1, 51)).rejects.toThrow('Limit must be between 1 and 50');
    });

    test('should handle errors from getLatest or getById', async () => {
      jest.spyOn(XKCDService, 'getLatest').mockRejectedValueOnce(new Error('Latest failed'));

      await expect(XKCDService.search('test', 1, 10)).rejects.toThrow('Search failed: Latest failed');
    });
  });

  describe('processComic', () => {
    test('should process comic data correctly', () => {
      const rawComic = {
        num: 1,
        title: 'Barrel - Part 1',
        img: 'https://imgs.xkcd.com/comics/barrel_cropped_(1).jpg',
        alt: 'Don\'t we all.',
        transcript: 'Test transcript',
        year: '2006',
        month: '1',
        day: '1',
        safe_title: 'Barrel - Part 1'
      };

      const processed = XKCDService.processComic(rawComic);

      expect(processed).toEqual({
        id: 1,
        title: 'Barrel - Part 1',
        img: 'https://imgs.xkcd.com/comics/barrel_cropped_(1).jpg',
        alt: 'Don\'t we all.',
        transcript: 'Test transcript',
        year: '2006',
        month: '1',
        day: '1',
        safe_title: 'Barrel - Part 1'
      });
    });

    test('should handle missing transcript', () => {
      const rawComic = {
        num: 1,
        title: 'Test',
        img: 'https://test.com/test.png',
        alt: 'Alt text',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Test'
      };

      const processed = XKCDService.processComic(rawComic);
      expect(processed.transcript).toBe('');
    });
  });
});