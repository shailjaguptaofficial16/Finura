/**
 * Finura Database Seeding Script
 * Populates MongoDB with standard demo datasets and admin credentials.
 * Usage: node scripts/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Goal = require('../models/Goal');
const CreditApplication = require('../models/CreditApplication');
const Budget = require('../models/Budget');
const Liability = require('../models/Liability');
const RecurringTransaction = require('../models/RecurringTransaction');
const Notification = require('../models/Notification');
const {
  seedUsers,
  seedAccounts,
  seedTransactions,
  seedInvestments,
  seedGoals,
  seedCreditApplications,
  seedBudgets,
  seedLiabilities,
  seedRecurringTransactions,
  seedNotifications,
} = require('../data/seedData');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ FATAL: MONGO_URI is missing in environment. Cannot seed database.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // Remove existing seed users and their data
    const seedEmails = seedUsers.map((u) => u.email.toLowerCase());
    const existingUsers = await User.find({ email: { $in: seedEmails } });
    const userIds = existingUsers.map((u) => u._id);

    await Transaction.deleteMany({ user: { $in: userIds } });
    await Account.deleteMany({ user: { $in: userIds } });
    await Investment.deleteMany({ user: { $in: userIds } });
    await Goal.deleteMany({ user: { $in: userIds } });
    await CreditApplication.deleteMany({ user: { $in: userIds } });
    await Budget.deleteMany({ user: { $in: userIds } });
    await Liability.deleteMany({ user: { $in: userIds } });
    await RecurringTransaction.deleteMany({ user: { $in: userIds } });
    await Notification.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ email: { $in: seedEmails } });

    console.log('Cleared existing demo datasets.');

    // Seed Users (password hashing handled by User schema pre-save hook)
    const createdUsers = [];
    for (const userData of seedUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`Created user: ${user.name} (${user.email}) [${user.role}]`);
    }

    const primaryUser = createdUsers[0]; // Sarah Jenkins (demo@finura.com)

    // Seed Accounts for primary demo user
    const accountsWithUser = seedAccounts.map((acc) => ({
      ...acc,
      user: primaryUser._id,
    }));
    const createdAccounts = await Account.insertMany(accountsWithUser);
    console.log(`✅ Seeded ${createdAccounts.length} multi-account cards.`);

    const primaryAccount = createdAccounts.find((a) => a.isDefault) || createdAccounts[0];

    // Seed Transactions linked to primary account
    const transactionsWithUser = seedTransactions.map((tx) => ({
      ...tx,
      user: primaryUser._id,
      accountId: primaryAccount._id,
    }));
    await Transaction.insertMany(transactionsWithUser);
    console.log(`✅ Seeded ${transactionsWithUser.length} transactions linked to account.`);

    // Seed Investments for primary demo user
    const investmentsWithUser = seedInvestments.map((inv) => ({
      ...inv,
      user: primaryUser._id,
    }));
    await Investment.insertMany(investmentsWithUser);
    console.log(`✅ Seeded ${investmentsWithUser.length} investments.`);

    // Seed Goals for primary demo user
    const goalsWithUser = seedGoals.map((goal) => ({
      ...goal,
      user: primaryUser._id,
    }));
    await Goal.insertMany(goalsWithUser);
    console.log(`✅ Seeded ${goalsWithUser.length} goals.`);

    // Seed Credit Applications
    const creditWithUser = seedCreditApplications.map((app) => ({
      ...app,
      user: primaryUser._id,
    }));
    await CreditApplication.insertMany(creditWithUser);
    console.log(`✅ Seeded ${creditWithUser.length} credit applications.`);

    await Budget.insertMany(seedBudgets.map((budget) => ({ ...budget, user: primaryUser._id })));
    await Liability.insertMany(seedLiabilities.map((liability) => ({ ...liability, user: primaryUser._id })));
    await RecurringTransaction.insertMany(seedRecurringTransactions.map((recurring) => ({ ...recurring, user: primaryUser._id, account: primaryAccount._id })));
    await Notification.insertMany(seedNotifications.map((notification) => ({ ...notification, user: primaryUser._id })));
    console.log('✅ Seeded budgets, liabilities, recurring payment, and AI-ready notifications.');

    console.log('🎉 Database seeding completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedDB();
