// One-time (idempotent) backfill: recompute ForumThread.commentCount from the actual number
// of comments in each thread. Needed because commentCount used to be a populate-virtual that
// was never tracked, so legacy threads have a stale/zero count. Safe to re-run anytime.
//
// Usage:  node scripts/backfillCommentCounts.js
require('dotenv').config();

const mongoose = require('mongoose');
const dns = require('dns');

// Same DNS fix as index.js so mongodb+srv SRV lookups work on this machine.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { ForumThread, Comment } = require('../models/forum');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count comments (top-level + replies) grouped by thread.
    const counts = await Comment.aggregate([
      { $group: { _id: '$thread', n: { $sum: 1 } } },
    ]);

    const ops = counts.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: { $set: { commentCount: c.n } } },
    }));

    if (ops.length) {
      const res = await ForumThread.bulkWrite(ops);
      console.log(`Updated ${res.modifiedCount} threads with their real comment counts.`);
    } else {
      console.log('No comments found.');
    }

    // Any thread with no comments at all → ensure a concrete 0.
    const zeroed = await ForumThread.updateMany(
      { commentCount: { $exists: false } },
      { $set: { commentCount: 0 } }
    );
    if (zeroed.modifiedCount) console.log(`Set commentCount=0 on ${zeroed.modifiedCount} empty threads.`);

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
