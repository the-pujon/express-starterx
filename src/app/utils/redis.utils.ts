/* eslint-disable no-console */
// import redisClient from "../config/redis.config";
import { getRedisClient } from "../config/redis.config";

export const cacheData = async (
  key: string,
  value: unknown,
  ttl: number,
): Promise<void> => {
  try {
    const redisClient = await getRedisClient();
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    console.log(`Data cached for key: ${key}`);
  } catch (error) {
    console.error(`Failed to cache data for key: ${key}`, error);
  }
};

export const getCachedData = async (key: string): Promise<unknown | null> => {
  try {
    const redisClient = await getRedisClient();
    const cachedData = await redisClient.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error(`Failed to get cached data for key: ${key}`, error);
    return null;
  }
};


export const deleteCachedData = async (pattern: string): Promise<boolean> => {
  try {
    const redisClient = await getRedisClient();
    const matchingKeys = await redisClient.keys(pattern);
    if (matchingKeys.length > 0) {
      await Promise.all(matchingKeys.map((key) => redisClient.del(key)));
      console.log('Successfully deleted cached data');
    }
    return true;
  } catch (error) {
    console.error('Error deleting cached data:', error);
    return false;
  }
};

export const clearAllCachedData = async () => {
  const redisClient = await getRedisClient();
    await redisClient.flushAll();
}
