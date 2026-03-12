import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day at midnight UTC — expire trials/subscriptions that are past their end date
crons.daily(
  "expire-subscriptions",
  { hourUTC: 0, minuteUTC: 0 },
  internal.restaurants.expireSubscriptions
);

export default crons;
