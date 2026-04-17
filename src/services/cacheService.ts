import { redisClient } from "../config/redis";

export const getCache = async (key: string) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (
  key: string,
  value: any,
  ttl = 60
) => {
  await redisClient.setEx(key, ttl, JSON.stringify(value));
};